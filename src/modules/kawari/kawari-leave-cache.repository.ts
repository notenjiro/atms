import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";
import type { LeaveRequest } from "@/modules/leave/leave.types";

export type KawariLeaveCacheStatus = "never_synced" | "success" | "failed";

export type KawariLeaveCacheFile = {
  status: KawariLeaveCacheStatus;
  syncedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  mode: "team";
  requests: LeaveRequest[];
};

type RawKawariLeaveCacheFile = Omit<KawariLeaveCacheFile, "requests"> & {
  requests?: unknown;
  items?: unknown;
};

const DEFAULT_KAWARI_LEAVE_CACHE: KawariLeaveCacheFile = {
  status: "never_synced",
  syncedAt: null,
  failedAt: null,
  errorMessage: null,
  mode: "team",
  requests: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRequests(value: unknown): LeaveRequest[] {
  if (Array.isArray(value)) {
    return value as LeaveRequest[];
  }

  if (isRecord(value) && Array.isArray(value.requests)) {
    return value.requests as LeaveRequest[];
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return value.items as LeaveRequest[];
  }

  return [];
}

function normalizeCache(raw: RawKawariLeaveCacheFile): KawariLeaveCacheFile {
  const requests = normalizeRequests(raw.requests ?? raw.items);

  return {
    status: raw.status ?? DEFAULT_KAWARI_LEAVE_CACHE.status,
    syncedAt: raw.syncedAt ?? null,
    failedAt: raw.failedAt ?? null,
    errorMessage: raw.errorMessage ?? null,
    mode: "team",
    requests,
  };
}

export async function readKawariLeaveCache(): Promise<KawariLeaveCacheFile> {
  const raw = await readJsonFile<RawKawariLeaveCacheFile>(
    dataPaths.kawariLeaveCache,
    DEFAULT_KAWARI_LEAVE_CACHE,
  );

  return normalizeCache(raw);
}

export async function saveKawariLeaveCacheSuccess(
  requests: LeaveRequest[],
): Promise<KawariLeaveCacheFile> {
  const normalizedRequests = normalizeRequests(requests);

  const nextCache: KawariLeaveCacheFile = {
    status: "success",
    syncedAt: new Date().toISOString(),
    failedAt: null,
    errorMessage: null,
    mode: "team",
    requests: normalizedRequests,
  };

  await writeJsonFile(dataPaths.kawariLeaveCache, nextCache);

  return nextCache;
}

export async function saveKawariLeaveCacheFailure(
  errorMessage: string,
): Promise<KawariLeaveCacheFile> {
  const current = await readKawariLeaveCache();

  const nextCache: KawariLeaveCacheFile = {
    ...current,
    status: current.syncedAt ? "success" : "failed",
    failedAt: new Date().toISOString(),
    errorMessage,
  };

  await writeJsonFile(dataPaths.kawariLeaveCache, nextCache);

  return nextCache;
}