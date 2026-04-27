import { findKawariIdentityForUser } from "./kawari-identity.repository";
import { fetchKawariLeaveRequests } from "./kawari-leave.adapter";
import {
  readKawariLeaveCache,
  saveKawariLeaveCacheFailure,
  saveKawariLeaveCacheSuccess,
  type KawariLeaveCacheFile,
} from "./kawari-leave-cache.repository";

export type KawariLeaveSyncInput = {
  atmsUserId?: string | null;
  atmsEmail?: string | null;
};

export type KawariLeaveSyncResult = {
  ok: boolean;
  syncedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  requestCount: number;
  identityDisplayName: string | null;
  cache: KawariLeaveCacheFile;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Kawari leave sync error.";
}

export async function syncKawariLeaveCache(
  input: KawariLeaveSyncInput = {},
): Promise<KawariLeaveSyncResult> {
  const identity = await findKawariIdentityForUser({
    atmsUserId: input.atmsUserId,
    atmsEmail: input.atmsEmail,
  });

  if (!identity) {
    const cache = await saveKawariLeaveCacheFailure(
      "No enabled Kawari identity mapping was found for this ATMS user.",
    );

    return {
      ok: false,
      syncedAt: cache.syncedAt,
      failedAt: cache.failedAt,
      errorMessage: cache.errorMessage,
      requestCount: cache.requests.length,
      identityDisplayName: null,
      cache,
    };
  }

  try {
    const requests = await fetchKawariLeaveRequests("team", {
      identity,
    });

    const cache = await saveKawariLeaveCacheSuccess(requests);

    return {
      ok: true,
      syncedAt: cache.syncedAt,
      failedAt: cache.failedAt,
      errorMessage: null,
      requestCount: cache.requests.length,
      identityDisplayName: identity.displayName,
      cache,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const cache = await saveKawariLeaveCacheFailure(errorMessage);

    return {
      ok: false,
      syncedAt: cache.syncedAt,
      failedAt: cache.failedAt,
      errorMessage,
      requestCount: cache.requests.length,
      identityDisplayName: identity.displayName,
      cache,
    };
  }
}

export async function getKawariLeaveCacheStatus(): Promise<KawariLeaveSyncResult> {
  const cache = await readKawariLeaveCache();

  return {
    ok: cache.status === "success" && cache.requests.length > 0,
    syncedAt: cache.syncedAt,
    failedAt: cache.failedAt,
    errorMessage: cache.errorMessage,
    requestCount: cache.requests.length,
    identityDisplayName: null,
    cache,
  };
}