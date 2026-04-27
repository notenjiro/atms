import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";

import type {
  KawariIdentityLookupInput,
  KawariIdentityMapRecord,
  KawariResolvedIdentity,
} from "./kawari-identity.types";

const DEFAULT_KAWARI_IDENTITY_MAP: KawariIdentityMapRecord[] = [];

function normalizeId(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRecord(record: KawariIdentityMapRecord): KawariIdentityMapRecord {
  return {
    ...record,
    atmsEmail: normalizeEmail(record.atmsEmail),
    kawariUserId: normalizeId(record.kawariUserId),
    kawariApproverIds: record.kawariApproverIds.map(normalizeId).filter(Boolean),
  };
}

function toResolvedIdentity(
  record: KawariIdentityMapRecord,
): KawariResolvedIdentity {
  return {
    atmsUserId: record.atmsUserId,
    atmsEmail: record.atmsEmail,
    displayName: record.displayName,
    kawariUserId: record.kawariUserId,
    kawariApproverIds: record.kawariApproverIds,
    syncMode: record.syncMode,
    canSyncTeamCalendar: record.canSyncTeamCalendar,
  };
}

export async function listKawariIdentityMap(): Promise<KawariIdentityMapRecord[]> {
  const records = await readJsonFile<KawariIdentityMapRecord[]>(
    dataPaths.kawariIdentityMap,
    DEFAULT_KAWARI_IDENTITY_MAP,
  );

  return records.map(normalizeRecord);
}

export async function saveKawariIdentityMap(
  records: KawariIdentityMapRecord[],
): Promise<KawariIdentityMapRecord[]> {
  const normalized = records.map(normalizeRecord);

  await writeJsonFile(dataPaths.kawariIdentityMap, normalized);

  return normalized;
}

export async function findKawariIdentityForUser(
  input: KawariIdentityLookupInput,
): Promise<KawariResolvedIdentity | null> {
  const records = await listKawariIdentityMap();

  const atmsUserId = input.atmsUserId?.trim();
  const atmsEmail = input.atmsEmail ? normalizeEmail(input.atmsEmail) : null;

  const exact = records.find((record) => {
    if (!record.enabled) {
      return false;
    }

    if (atmsUserId && record.atmsUserId === atmsUserId) {
      return true;
    }

    if (atmsEmail && normalizeEmail(record.atmsEmail) === atmsEmail) {
      return true;
    }

    return false;
  });

  if (exact) {
    return toResolvedIdentity(exact);
  }

  const fallback = records.find(
    (record) => record.enabled && record.isDefaultSyncIdentity,
  );

  return fallback ? toResolvedIdentity(fallback) : null;
}