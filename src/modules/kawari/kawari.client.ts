import { Buffer } from "node:buffer";

import { ExternalServiceError, ValidationError } from "@/lib/errors";
import { kawariConfig } from "@/lib/env";

import type {
  KawariHealthResult,
  KawariRequestOptions,
  KawariResponse,
} from "./kawari.types";

type KawariAuthContext = {
  authorizationHeader?: string;
  cookieHeader?: string;
};

type KawariTokenState = {
  token: string | null;
  expiresAt: number | null;
  refreshPromise: Promise<string> | null;
};

const kawariTokenState: KawariTokenState = {
  token: null,
  expiresAt: null,
  refreshPromise: null,
};

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function buildBasicAuthHeader(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

function normalizeResponseHeaders(headers: Headers): Record<string, string> {
  const normalized: Record<string, string> = {};

  headers.forEach((value, key) => {
    normalized[key] = value;
  });

  return normalized;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readNestedValue(data: unknown, path: string): unknown {
  if (!path.trim()) {
    return undefined;
  }

  const segments = path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current: unknown = data;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function assertKawariConfigured(): void {
  if (!kawariConfig.enabled) {
    throw new ValidationError("Kawari integration is disabled.");
  }

  if (!kawariConfig.baseUrl.trim()) {
    throw new ValidationError("KAWARI_BASE_URL is not configured.");
  }

  if (kawariConfig.authMode === "token") {
    if (!kawariConfig.accessToken.trim()) {
      throw new ValidationError("KAWARI_ACCESS_TOKEN is not configured.");
    }
    return;
  }

  if (!kawariConfig.username.trim() || !kawariConfig.password.trim()) {
    throw new ValidationError("Kawari credentials are not configured.");
  }
}

function getBrowserLikeHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
    Origin: "https://kawari.iamconsulting.co.th",
    Referer: "https://kawari.iamconsulting.co.th/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "sec-ch-ua":
      '"Chromium";v="146", "Not-A.Brand";v="24", "Microsoft Edge";v="146"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0",
  };
}

function clearCachedToken(): void {
  kawariTokenState.token = null;
  kawariTokenState.expiresAt = null;
}

function isCachedTokenValid(): boolean {
  if (!kawariTokenState.token || !kawariTokenState.expiresAt) {
    return false;
  }

  return Date.now() < kawariTokenState.expiresAt;
}

function setCachedToken(token: string): void {
  kawariTokenState.token = token;
  kawariTokenState.expiresAt = Date.now() + 10 * 60 * 1000;
}

async function loginAndGetFreshToken(): Promise<string> {
  const usernameField = kawariConfig.loginUsernameField || "email";
  const passwordField = kawariConfig.loginPasswordField || "password";

  const url = buildUrl(kawariConfig.baseUrl, kawariConfig.loginPath);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), kawariConfig.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...getBrowserLikeHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        [usernameField]: kawariConfig.username,
        [passwordField]: kawariConfig.password,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      clearCachedToken();

      throw new ExternalServiceError("Kawari login failed.", {
        status: String(response.status),
        statusText: response.statusText,
        path: kawariConfig.loginPath,
      });
    }

    const tokenValue = readNestedValue(data, kawariConfig.tokenField);

    if (typeof tokenValue === "string" && tokenValue.trim()) {
      setCachedToken(tokenValue.trim());
      return tokenValue.trim();
    }

    throw new ExternalServiceError("Kawari token not found.", {
      path: kawariConfig.loginPath,
      tokenField: kawariConfig.tokenField,
    });
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      clearCachedToken();

      throw new ExternalServiceError("Kawari login timed out.", {
        timeoutMs: String(kawariConfig.timeoutMs),
        path: kawariConfig.loginPath,
      });
    }

    clearCachedToken();

    throw new ExternalServiceError("Unable to authenticate with Kawari.", {
      path: kawariConfig.loginPath,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function getManagedLoginToken(): Promise<string> {
  if (isCachedTokenValid() && kawariTokenState.token) {
    return kawariTokenState.token;
  }

  if (!kawariTokenState.refreshPromise) {
    kawariTokenState.refreshPromise = loginAndGetFreshToken().finally(() => {
      kawariTokenState.refreshPromise = null;
    });
  }

  return kawariTokenState.refreshPromise;
}

async function getKawariAuthContext(
  forceRefresh = false,
): Promise<KawariAuthContext> {
  if (kawariConfig.authMode === "token") {
    return {
      authorizationHeader: `bearer ${kawariConfig.accessToken.trim()}`,
    };
  }

  if (kawariConfig.authMode === "basic") {
    return {
      authorizationHeader: buildBasicAuthHeader(
        kawariConfig.username,
        kawariConfig.password,
      ),
    };
  }

  if (forceRefresh) {
    clearCachedToken();
  }

  const token = await getManagedLoginToken();

  return {
    authorizationHeader: `bearer ${token}`,
  };
}

async function performKawariRequest<T = unknown>(
  options: KawariRequestOptions,
  forceRefresh = false,
): Promise<KawariResponse<T>> {
  const timeoutMs = options.timeoutMs ?? kawariConfig.timeoutMs;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const authContext = await getKawariAuthContext(forceRefresh);
    const url = buildUrl(kawariConfig.baseUrl, options.path, options.query);

    const headers: Record<string, string> = {
      ...getBrowserLikeHeaders(),
      ...options.headers,
    };

    if (authContext.authorizationHeader) {
      headers.Authorization = authContext.authorizationHeader;
    }

    if (authContext.cookieHeader) {
      headers.Cookie = authContext.cookieHeader;
    }

    let body: string | undefined;

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      credentials: "include",
      signal: controller.signal,
      cache: "no-store",
    });

    const data = (await parseResponseBody(response)) as T;

    if (!response.ok) {
      throw new ExternalServiceError("Kawari request failed.", {
        status: String(response.status),
        statusText: response.statusText,
        path: options.path,
      });
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: normalizeResponseHeaders(response.headers),
      data,
    };
  } catch (error) {
    if (
      error instanceof ExternalServiceError ||
      error instanceof ValidationError
    ) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ExternalServiceError("Kawari request timed out.", {
        timeoutMs: String(timeoutMs),
        path: options.path,
      });
    }

    throw new ExternalServiceError("Unable to reach Kawari.", {
      path: options.path,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function kawariRequest<T = unknown>(
  options: KawariRequestOptions,
): Promise<KawariResponse<T>> {
  assertKawariConfigured();

  try {
    return await performKawariRequest<T>(options, false);
  } catch (error) {
    const externalError = error instanceof ExternalServiceError ? error : null;
    const status = externalError?.details?.status;

    if (kawariConfig.authMode === "token") {
      throw error;
    }

    if (status !== "401" && status !== "403") {
      throw error;
    }

    clearCachedToken();

    return performKawariRequest<T>(options, true);
  }
}

export async function getKawariHealth(): Promise<KawariHealthResult> {
  const baseUrlConfigured = Boolean(kawariConfig.baseUrl.trim());
  const credentialsConfigured =
    kawariConfig.authMode === "token"
      ? Boolean(kawariConfig.accessToken.trim())
      : Boolean(kawariConfig.username.trim() && kawariConfig.password.trim());

  if (!kawariConfig.enabled || !baseUrlConfigured || !credentialsConfigured) {
    return {
      enabled: kawariConfig.enabled,
      authMode: kawariConfig.authMode,
      baseUrlConfigured,
      credentialsConfigured,
      reachable: false,
      status: null,
      statusText: null,
      checkedPath: kawariConfig.healthPath,
    };
  }

  try {
    const response = await kawariRequest({
      path: kawariConfig.healthPath,
      method: "GET",
    });

    return {
      enabled: kawariConfig.enabled,
      authMode: kawariConfig.authMode,
      baseUrlConfigured,
      credentialsConfigured,
      reachable: true,
      status: response.status,
      statusText: response.statusText,
      checkedPath: kawariConfig.healthPath,
    };
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      return {
        enabled: kawariConfig.enabled,
        authMode: kawariConfig.authMode,
        baseUrlConfigured,
        credentialsConfigured,
        reachable: false,
        status: null,
        statusText: error.message,
        checkedPath: kawariConfig.healthPath,
      };
    }

    throw error;
  }
}