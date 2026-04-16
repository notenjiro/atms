import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

import { authConfig } from "@/lib/env";
import type { SessionData } from "./auth.types";

const COOKIE_NAME = authConfig.cookieName;
const SECRET = authConfig.sessionSecret;

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

function encodeSession(session: SessionData): string {
  const payload = JSON.stringify(session);
  const base64 = Buffer.from(payload).toString("base64url");
  const signature = sign(base64);

  return `${base64}.${signature}`;
}

function decodeSession(value: string): SessionData | null {
  const [base64, signature] = value.split(".");

  if (!base64 || !signature) {
    return null;
  }

  const expectedSignature = sign(base64);

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const json = Buffer.from(base64, "base64url").toString("utf8");
    return JSON.parse(json) as SessionData;
  } catch {
    return null;
  }
}

export async function createSession(session: SessionData): Promise<void> {
  const store = await cookies();

  const encoded = encodeSession(session);

  store.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();

  const cookie = store.get(COOKIE_NAME);

  if (!cookie) {
    return null;
  }

  return decodeSession(cookie.value);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();

  store.delete(COOKIE_NAME);
}