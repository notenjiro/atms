import {
  LEAVE_TYPES,
  type LeaveDayPortion,
  type LeaveRequest,
  type LeaveStatus,
} from "@/modules/leave/leave.types";

import type { KawariResolvedIdentity } from "./kawari-identity.types";
import { kawariRequest } from "./kawari.client";
import type { KawariResponse } from "./kawari.types";

type KawariLeaveMode = "self" | "team";
type KawariLeaveRaw = Record<string, unknown>;

type KawariLeavePayload = {
  myUser?: unknown;
  myLeaveRequests?: unknown[];
  leaveRequests?: unknown[];
  data?: unknown;
};

type KawariLeaveResponse = KawariLeaveRaw[] | KawariLeavePayload;
type LeaveTypeId = LeaveRequest["leaveTypeId"];

export type FetchKawariLeaveRequestsOptions = {
  identity?: KawariResolvedIdentity | null;
};

const KAWARI_LEAVE_TYPE_MAP: Record<string, { id: LeaveTypeId; name: string }> = {
  "5bbc6cf2bea1f637d0e9b528": { id: "L001", name: "Annual Leave" },
  "5bbc6cf2bea1f637d0e9b52a": { id: "L003", name: "Sick Leave" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeId(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function getValue(obj: Record<string, unknown>, keys: string[]): unknown {
  const wanted = new Set(keys.map((key) => key.trim()));

  for (const [key, value] of Object.entries(obj)) {
    if (wanted.has(key.trim())) return value;
  }

  return undefined;
}

function getString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  const value = getValue(obj, keys);

  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return undefined;
}

function getIdString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  const value = getString(obj, keys);
  return value ? normalizeId(value) : undefined;
}

function getNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  const value = getValue(obj, keys);

  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function getBoolean(obj: Record<string, unknown>, keys: string[]): boolean | undefined {
  const value = getValue(obj, keys);
  return typeof value === "boolean" ? value : undefined;
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;

  const compact = value.replace(/\s+/g, "");
  const parsed = new Date(compact);

  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const directMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return directMatch?.[0];
}

function normalizeDateTime(value?: string): string | undefined {
  if (!value) return undefined;

  const compact = value.replace(/\s+/g, "");
  const parsed = new Date(compact);

  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  return undefined;
}

function normalizeStatus(value?: string, isCancel?: boolean): LeaveStatus {
  if (isCancel) return "cancelled";

  switch (value?.trim().toUpperCase()) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "CANCEL":
    case "CANCELLED":
    case "CANCELED":
      return "cancelled";
    case "DRAFT":
      return "draft";
    default:
      return "pending";
  }
}

function normalizePortion(value?: string): LeaveDayPortion {
  switch (value?.trim().toUpperCase()) {
    case "AM":
    case "HALF-AM":
    case "MORNING":
      return "half-am";
    case "PM":
    case "HALF-PM":
    case "AFTERNOON":
      return "half-pm";
    default:
      return "full";
  }
}

function getDefaultLeaveType(): { id: LeaveTypeId; name: string } {
  const annual = LEAVE_TYPES.find((leaveType) => leaveType.id === "L001");
  const fallback = annual ?? LEAVE_TYPES[0];

  return { id: fallback.id, name: fallback.name };
}

function mapLeaveType(raw: KawariLeaveRaw): { id: LeaveTypeId; name: string } {
  const kawariLeaveTypeId = getIdString(raw, [
    "leave_type_id",
    "leaveTypeId",
    "leave_type",
    "leaveType",
    "type_id",
    "typeId",
    "type",
  ]);

  if (kawariLeaveTypeId) {
    const mapped = KAWARI_LEAVE_TYPE_MAP[kawariLeaveTypeId];

    if (mapped) return mapped;

    const leaveType = LEAVE_TYPES.find((item) => item.id === kawariLeaveTypeId);

    if (leaveType) return { id: leaveType.id, name: leaveType.name };
  }

  return getDefaultLeaveType();
}

function resolveEmployeeName(raw: KawariLeaveRaw, employeeId: string): string {
  const directName = getString(raw, [
    "employee_name",
    "employeeName",
    "user_name",
    "userName",
    "full_name",
    "fullName",
    "display_name",
    "displayName",
    "name",
  ]);

  if (directName && directName !== employeeId) return directName;

  const user = raw.user;

  if (isRecord(user)) {
    const userName =
      getString(user, ["full_name", "fullName", "display_name", "displayName", "name"]) ??
      [getString(user, ["first_name", "firstName"]), getString(user, ["last_name", "lastName"])]
        .filter(Boolean)
        .join(" ")
        .trim();

    if (userName && userName !== employeeId) return userName;
  }

  return "Unknown Staff";
}

function normalizeRecord(raw: KawariLeaveRaw): LeaveRequest | null {
  const id = getIdString(raw, ["_id", "id", "leave_request_id", "leaveRequestId"]);
  const employeeId = getIdString(raw, ["user_id", "userId", "employee_id", "employeeId"]);

  const startDate =
    normalizeDate(getString(raw, ["start_date", "startDate", "from_date", "fromDate"])) ??
    normalizeDate(getString(raw, ["date", "leave_date", "leaveDate"]));

  const endDate =
    normalizeDate(getString(raw, ["end_date", "endDate", "to_date", "toDate"])) ??
    normalizeDate(getString(raw, ["date", "leave_date", "leaveDate"])) ??
    startDate;

  if (!id || !employeeId || !startDate || !endDate) return null;

  const leaveType = mapLeaveType(raw);
  const isCancel = getBoolean(raw, ["is_cancel", "isCancel"]) ?? false;
  const status = normalizeStatus(getString(raw, ["status"]), isCancel);
  const submittedAt =
    normalizeDateTime(getString(raw, ["submitted", "created", "createdAt"])) ??
    new Date().toISOString();
  const updatedAt = normalizeDateTime(getString(raw, ["updated", "updatedAt"])) ?? submittedAt;
  const leaveTime = getString(raw, ["leave_time", "leaveTime"]);

  return {
    id,
    employeeId,
    employeeName: resolveEmployeeName(raw, employeeId),
    leaveTypeId: leaveType.id,
    leaveTypeName: leaveType.name,
    startDate,
    endDate,
    startPortion: normalizePortion(getString(raw, ["start_portion", "startPortion"]) ?? leaveTime),
    endPortion: normalizePortion(getString(raw, ["end_portion", "endPortion"]) ?? leaveTime),
    totalDays: getNumber(raw, ["total_days", "totalDays", "days", "leave_days", "leaveDays"]) ?? 1,
    status,
    approver: {
      role: "lead",
      name: getIdString(raw, ["approver_id", "approverId"]),
    },
    submittedAt,
    approvedAt: status === "approved" ? updatedAt : undefined,
    rejectedAt: status === "rejected" ? updatedAt : undefined,
    cancelledAt: status === "cancelled" ? updatedAt : undefined,
    createdAt: submittedAt,
    updatedAt,
  };
}

function extractNestedPayload(payload: unknown): unknown {
  if (isRecord(payload) && isRecord(payload.data)) return payload.data;
  return payload;
}

function shouldIncludeSelfRecord(
  record: KawariLeaveRaw,
  identity: KawariResolvedIdentity | null | undefined,
): boolean {
  if (!identity) return false;

  const employeeId = getIdString(record, ["user_id", "userId", "employee_id", "employeeId"]);
  return employeeId === normalizeId(identity.kawariUserId);
}

function shouldIncludeApproverRecord(
  record: KawariLeaveRaw,
  identity: KawariResolvedIdentity | null | undefined,
): boolean {
  if (!identity?.canSyncTeamCalendar) return false;

  const approverId = getIdString(record, ["approver_id", "approverId"]);
  if (!approverId) return false;

  const allowed = new Set(identity.kawariApproverIds.map(normalizeId));
  return allowed.has(approverId);
}

function extractPayloadArray(
  payload: unknown,
  mode: KawariLeaveMode,
  identity: KawariResolvedIdentity | null | undefined,
): KawariLeaveRaw[] {
  const resolvedPayload = extractNestedPayload(payload);

  if (Array.isArray(resolvedPayload)) return resolvedPayload.filter(isRecord);
  if (!isRecord(resolvedPayload)) return [];

  const source =
    mode === "self" ? resolvedPayload.myLeaveRequests : resolvedPayload.leaveRequests;

  if (!Array.isArray(source)) return [];

  const filtered = source.filter(isRecord).filter((record) => {
    if (mode === "self") return shouldIncludeSelfRecord(record, identity);
    return shouldIncludeApproverRecord(record, identity);
  });

  const deduped = new Map<string, KawariLeaveRaw>();

  for (const record of filtered) {
    const id = getIdString(record, ["_id", "id", "leave_request_id", "leaveRequestId"]);
    if (id) deduped.set(id, record);
  }

  return [...deduped.values()];
}

function isWithinSyncWindow(request: LeaveRequest): boolean {
  const currentYear = new Date().getFullYear();
  const from = `${currentYear}-01-01`;
  const to = `${currentYear + 1}-12-31`;

  return request.endDate >= from && request.startDate <= to;
}

function isVisibleCalendarStatus(request: LeaveRequest): boolean {
  return request.status === "approved" || request.status === "pending";
}

export function normalizeKawariLeavePayload(
  payload: unknown,
  mode: KawariLeaveMode,
  identity: KawariResolvedIdentity | null | undefined,
): LeaveRequest[] {
  return extractPayloadArray(payload, mode, identity)
    .map(normalizeRecord)
    .filter((item): item is LeaveRequest => item !== null)
    .filter(isWithinSyncWindow)
    .filter(isVisibleCalendarStatus);
}

export async function fetchKawariLeaveRequests(
  mode: KawariLeaveMode,
  options: FetchKawariLeaveRequestsOptions = {},
): Promise<LeaveRequest[]> {
  const response: KawariResponse<KawariLeaveResponse> = await kawariRequest({
    path: "/leave-requests",
    method: "GET",
    query: { "team-calendar": mode === "team" },
    timeoutMs: 60_000,
  });

  return normalizeKawariLeavePayload(response.data, mode, options.identity);
}