export type KawariIdentitySyncMode = "self" | "approver";

export type KawariIdentityMapRecord = {
  id: string;
  atmsUserId: string;
  atmsEmail: string;
  displayName: string;
  kawariUserId: string;
  kawariApproverIds: string[];
  syncMode: KawariIdentitySyncMode;
  canSyncTeamCalendar: boolean;
  isDefaultSyncIdentity: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type KawariResolvedIdentity = {
  atmsUserId: string;
  atmsEmail: string;
  displayName: string;
  kawariUserId: string;
  kawariApproverIds: string[];
  syncMode: KawariIdentitySyncMode;
  canSyncTeamCalendar: boolean;
};

export type KawariIdentityLookupInput = {
  atmsUserId?: string | null;
  atmsEmail?: string | null;
};