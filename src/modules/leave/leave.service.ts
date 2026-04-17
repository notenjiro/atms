import { randomUUID } from "node:crypto";

import { NotFoundError, ValidationError } from "@/lib/errors";

import {
  addLeaveRequest,
  findLeaveRequestById,
  listLeaveQuotaBalances,
  listLeaveRequests,
  saveLeaveQuotaBalances,
  updateLeaveRequest,
  upsertLeaveQuotaBalance,
} from "./leave.repository";
import {
  createLeaveRequestSchema,
  updateLeaveRequestSchema,
} from "./leave.schemas";
import {
  LEAVE_TYPES,
  type CreateLeaveRequestInput,
  type LeaveCalendarEvent,
  type LeaveDashboardSummary,
  type LeaveDayPortion,
  type LeaveFile,
  type LeaveQuotaBalance,
  type LeaveRequest,
  type LeaveRequestFilters,
  type LeaveStatus,
  type UpdateLeaveRequestInput,
} from "./leave.types";

type LeaveActor = {
  employeeId: string;
  employeeName: string;
  approverName?: string;
  approverEmail?: string;
};

const DEFAULT_APPROVER_ROLE = "lead" as const;
const DEFAULT_MANUAL_QUOTA_LEAVE_IDS = new Set(["L001", "L003", "L004"]);

function getNowIsoString(): string {
  return new Date().toISOString();
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function parseDateUtc(value: string): Date {
  return new Date(`${toDateOnly(value)}T00:00:00.000Z`);
}

function isSameDate(a: string, b: string): boolean {
  return toDateOnly(a) === toDateOnly(b);
}

function getLeaveTypeDefinition(leaveTypeId: string) {
  return LEAVE_TYPES.find((leaveType) => leaveType.id === leaveTypeId);
}

function getDayPortionWeight(portion: LeaveDayPortion): number {
  if (portion === "full") {
    return 1;
  }

  return 0.5;
}

function roundLeaveDays(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateTotalLeaveDays(
  startDate: string,
  endDate: string,
  startPortion: LeaveDayPortion,
  endPortion: LeaveDayPortion,
): number {
  const start = parseDateUtc(startDate);
  const end = parseDateUtc(endDate);

  if (end < start) {
    throw new ValidationError("End date must be on or after the start date.");
  }

  const startOnly = toDateOnly(startDate);
  const endOnly = toDateOnly(endDate);

  if (isSameDate(startOnly, endOnly)) {
    if (startPortion === "full" && endPortion === "full") {
      return 1;
    }

    if (startPortion !== endPortion) {
      return 1;
    }

    return 0.5;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const daySpan =
    Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

  let totalDays = daySpan;

  if (startPortion !== "full") {
    totalDays -= 0.5;
  }

  if (endPortion !== "full") {
    totalDays -= 0.5;
  }

  if (totalDays <= 0) {
    throw new ValidationError("Total leave days must be greater than zero.");
  }

  return roundLeaveDays(totalDays);
}

function buildDefaultQuotaBalances(): LeaveQuotaBalance[] {
  const now = getNowIsoString();

  return LEAVE_TYPES.filter((leaveType) =>
    DEFAULT_MANUAL_QUOTA_LEAVE_IDS.has(leaveType.id),
  ).map((leaveType) => ({
    leaveTypeId: leaveType.id,
    entitledDays: leaveType.quotaDays,
    carriedForwardDays: 0,
    usedDays: 0,
    pendingDays: 0,
    remainingDays: leaveType.quotaDays,
    asOfDate: toDateOnly(now),
    source: leaveType.quotaSource,
    updatedAt: now,
  }));
}

function mergeQuotaBalancesWithDefaults(
  storedBalances: LeaveQuotaBalance[],
): LeaveQuotaBalance[] {
  const defaultMap = new Map(
    buildDefaultQuotaBalances().map((balance) => [balance.leaveTypeId, balance]),
  );

  for (const balance of storedBalances) {
    defaultMap.set(balance.leaveTypeId, balance);
  }

  return LEAVE_TYPES.map((leaveType) => {
    const existing = defaultMap.get(leaveType.id);

    if (existing) {
      return existing;
    }

    return {
      leaveTypeId: leaveType.id,
      entitledDays: leaveType.quotaDays,
      carriedForwardDays: 0,
      usedDays: 0,
      pendingDays: 0,
      remainingDays:
        typeof leaveType.quotaDays === "number" ? leaveType.quotaDays : undefined,
      asOfDate: toDateOnly(getNowIsoString()),
      source: leaveType.quotaSource,
      updatedAt: getNowIsoString(),
    };
  });
}

function recomputeQuotaBalancesFromRequests(
  requests: LeaveRequest[],
  baseBalances: LeaveQuotaBalance[],
): LeaveQuotaBalance[] {
  const balances = mergeQuotaBalancesWithDefaults(baseBalances).map((balance) => ({
    ...balance,
    usedDays: 0,
    pendingDays: 0,
  }));

  const balanceMap = new Map(balances.map((balance) => [balance.leaveTypeId, balance]));

  for (const request of requests) {
    const balance = balanceMap.get(request.leaveTypeId);

    if (!balance) {
      continue;
    }

    if (request.status === "approved") {
      balance.usedDays = roundLeaveDays(balance.usedDays + request.totalDays);
    }

    if (request.status === "pending") {
      balance.pendingDays = roundLeaveDays(
        balance.pendingDays + request.totalDays,
      );
    }
  }

  const now = getNowIsoString();

  return balances.map((balance) => {
    const entitled = balance.entitledDays ?? 0;
    const carriedForward = balance.carriedForwardDays ?? 0;
    const hasQuota =
      typeof balance.entitledDays === "number" ||
      typeof balance.carriedForwardDays === "number";

    return {
      ...balance,
      remainingDays: hasQuota
        ? roundLeaveDays(
            entitled + carriedForward - balance.usedDays - balance.pendingDays,
          )
        : balance.remainingDays,
      asOfDate: toDateOnly(now),
      updatedAt: now,
    };
  });
}

function matchesLeaveRequestFilters(
  request: LeaveRequest,
  filters?: LeaveRequestFilters,
): boolean {
  if (!filters) {
    return true;
  }

  if (filters.employeeId && request.employeeId !== filters.employeeId) {
    return false;
  }

  if (filters.status && request.status !== filters.status) {
    return false;
  }

  if (filters.leaveTypeId && request.leaveTypeId !== filters.leaveTypeId) {
    return false;
  }

  if (
    filters.approverRole &&
    request.approver.role !== filters.approverRole
  ) {
    return false;
  }

  if (filters.fromDate && toDateOnly(request.endDate) < toDateOnly(filters.fromDate)) {
    return false;
  }

  if (filters.toDate && toDateOnly(request.startDate) > toDateOnly(filters.toDate)) {
    return false;
  }

  return true;
}

function sortLeaveRequestsDescending(requests: LeaveRequest[]): LeaveRequest[] {
  return [...requests].sort((a, b) => {
    const dateCompare =
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

function buildLeaveCalendarEvents(requests: LeaveRequest[]): LeaveCalendarEvent[] {
  const events: LeaveCalendarEvent[] = [];

  for (const request of requests) {
    const start = parseDateUtc(request.startDate);
    const end = parseDateUtc(request.endDate);

    for (
      let current = new Date(start);
      current <= end;
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const currentDate = current.toISOString().slice(0, 10);

      let portion: LeaveDayPortion = "full";

      if (isSameDate(currentDate, request.startDate) && isSameDate(currentDate, request.endDate)) {
        if (request.startPortion === "full" && request.endPortion === "full") {
          portion = "full";
        } else if (request.startPortion === request.endPortion) {
          portion = request.startPortion;
        } else {
          portion = "full";
        }
      } else if (isSameDate(currentDate, request.startDate)) {
        portion = request.startPortion;
      } else if (isSameDate(currentDate, request.endDate)) {
        portion = request.endPortion;
      }

      events.push({
        id: `${request.id}:${currentDate}`,
        leaveRequestId: request.id,
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        leaveTypeId: request.leaveTypeId,
        leaveTypeName: request.leaveTypeName,
        date: currentDate,
        status: request.status,
        portion,
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

async function recalculateAndPersistQuotaBalances(): Promise<LeaveQuotaBalance[]> {
  const [requests, quotaBalances] = await Promise.all([
    listLeaveRequests(),
    listLeaveQuotaBalances(),
  ]);

  const nextBalances = recomputeQuotaBalancesFromRequests(requests, quotaBalances);

  await saveLeaveQuotaBalances(nextBalances);

  return nextBalances;
}

export async function ensureLeaveQuotaBalances(): Promise<LeaveQuotaBalance[]> {
  const existing = await listLeaveQuotaBalances();

  if (existing.length > 0) {
    return recomputeQuotaBalancesFromRequests(await listLeaveRequests(), existing);
  }

  const defaults = buildDefaultQuotaBalances();
  const merged = mergeQuotaBalancesWithDefaults(defaults);

  await saveLeaveQuotaBalances(merged);

  return merged;
}

export async function listLeaveRequestsService(
  filters?: LeaveRequestFilters,
): Promise<LeaveRequest[]> {
  const requests = await listLeaveRequests();

  return sortLeaveRequestsDescending(
    requests.filter((request) => matchesLeaveRequestFilters(request, filters)),
  );
}

export async function getLeaveRequestByIdService(
  id: string,
): Promise<LeaveRequest> {
  const request = await findLeaveRequestById(id);

  if (!request) {
    throw new NotFoundError("Leave request not found.");
  }

  return request;
}

export async function createLeaveRequestService(
  actor: LeaveActor,
  input: CreateLeaveRequestInput,
): Promise<LeaveRequest> {
  const parsedInput = createLeaveRequestSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new ValidationError("Invalid leave request input.");
  }

  const leaveType = getLeaveTypeDefinition(parsedInput.data.leaveTypeId);

  if (!leaveType) {
    throw new ValidationError("Leave type not found.");
  }

  const startPortion = parsedInput.data.startPortion ?? "full";
  const endPortion = parsedInput.data.endPortion ?? "full";

  const totalDays = calculateTotalLeaveDays(
    parsedInput.data.startDate,
    parsedInput.data.endDate,
    startPortion,
    endPortion,
  );

  await ensureLeaveQuotaBalances();

  const now = getNowIsoString();

  const request: LeaveRequest = {
    id: randomUUID(),
    employeeId: actor.employeeId,
    employeeName: actor.employeeName,
    leaveTypeId: leaveType.id,
    leaveTypeName: leaveType.name,
    startDate: toDateOnly(parsedInput.data.startDate),
    endDate: toDateOnly(parsedInput.data.endDate),
    startPortion,
    endPortion,
    totalDays,
    remarks: parsedInput.data.remarks?.trim() || undefined,
    status: "pending",
    approver: {
      role: DEFAULT_APPROVER_ROLE,
      name: actor.approverName,
      email: actor.approverEmail,
    },
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await addLeaveRequest(request);
  await recalculateAndPersistQuotaBalances();

  return request;
}

export async function updateLeaveRequestService(
  id: string,
  input: UpdateLeaveRequestInput,
): Promise<LeaveRequest> {
  const parsedInput = updateLeaveRequestSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new ValidationError("Invalid leave request update input.");
  }

  const existing = await getLeaveRequestByIdService(id);

  const nextLeaveTypeId = parsedInput.data.leaveTypeId ?? existing.leaveTypeId;
  const nextLeaveType = getLeaveTypeDefinition(nextLeaveTypeId);

  if (!nextLeaveType) {
    throw new ValidationError("Leave type not found.");
  }

  const nextStartDate = toDateOnly(parsedInput.data.startDate ?? existing.startDate);
  const nextEndDate = toDateOnly(parsedInput.data.endDate ?? existing.endDate);
  const nextStartPortion = parsedInput.data.startPortion ?? existing.startPortion;
  const nextEndPortion = parsedInput.data.endPortion ?? existing.endPortion;

  const nextTotalDays = calculateTotalLeaveDays(
    nextStartDate,
    nextEndDate,
    nextStartPortion,
    nextEndPortion,
  );

  const now = getNowIsoString();
  const nextStatus = parsedInput.data.status ?? existing.status;

  const updatedRequest: LeaveRequest = {
    ...existing,
    leaveTypeId: nextLeaveType.id,
    leaveTypeName: nextLeaveType.name,
    startDate: nextStartDate,
    endDate: nextEndDate,
    startPortion: nextStartPortion,
    endPortion: nextEndPortion,
    totalDays: nextTotalDays,
    remarks:
      typeof parsedInput.data.remarks === "string"
        ? parsedInput.data.remarks.trim() || undefined
        : existing.remarks,
    status: nextStatus,
    approver: parsedInput.data.approver
      ? {
          ...existing.approver,
          ...parsedInput.data.approver,
        }
      : existing.approver,
    approvedAt:
      nextStatus === "approved"
        ? parsedInput.data.approvedAt ?? existing.approvedAt ?? now
        : undefined,
    rejectedAt:
      nextStatus === "rejected"
        ? parsedInput.data.rejectedAt ?? existing.rejectedAt ?? now
        : undefined,
    rejectedReason:
      nextStatus === "rejected"
        ? parsedInput.data.rejectedReason ?? existing.rejectedReason
        : undefined,
    cancelledAt:
      nextStatus === "cancelled"
        ? parsedInput.data.cancelledAt ?? existing.cancelledAt ?? now
        : undefined,
    updatedAt: now,
  };

  await updateLeaveRequest(updatedRequest);
  await recalculateAndPersistQuotaBalances();

  return updatedRequest;
}

export async function approveLeaveRequestService(
  id: string,
  approver?: { name?: string; email?: string },
): Promise<LeaveRequest> {
  return updateLeaveRequestService(id, {
    status: "approved",
    approvedAt: getNowIsoString(),
    approver: {
      role: DEFAULT_APPROVER_ROLE,
      name: approver?.name,
      email: approver?.email,
    },
  });
}

export async function rejectLeaveRequestService(
  id: string,
  rejectedReason: string,
  approver?: { name?: string; email?: string },
): Promise<LeaveRequest> {
  if (!rejectedReason.trim()) {
    throw new ValidationError("Rejected reason is required.");
  }

  return updateLeaveRequestService(id, {
    status: "rejected",
    rejectedAt: getNowIsoString(),
    rejectedReason: rejectedReason.trim(),
    approver: {
      role: DEFAULT_APPROVER_ROLE,
      name: approver?.name,
      email: approver?.email,
    },
  });
}

export async function cancelLeaveRequestService(
  id: string,
): Promise<LeaveRequest> {
  return updateLeaveRequestService(id, {
    status: "cancelled",
    cancelledAt: getNowIsoString(),
  });
}

export async function listLeaveQuotaBalancesService(): Promise<
  LeaveQuotaBalance[]
> {
  const existing = await listLeaveQuotaBalances();

  if (existing.length === 0) {
    return ensureLeaveQuotaBalances();
  }

  return recomputeQuotaBalancesFromRequests(
    await listLeaveRequests(),
    existing,
  );
}

export async function overrideLeaveQuotaBalanceFromApiService(
  input: LeaveQuotaBalance,
): Promise<LeaveQuotaBalance> {
  const leaveType = getLeaveTypeDefinition(input.leaveTypeId);

  if (!leaveType) {
    throw new ValidationError("Leave type not found.");
  }

  const sanitized: LeaveQuotaBalance = {
    ...input,
    source: "api",
    updatedAt: input.updatedAt ?? getNowIsoString(),
    asOfDate: input.asOfDate ?? toDateOnly(getNowIsoString()),
    usedDays: roundLeaveDays(input.usedDays),
    pendingDays: roundLeaveDays(input.pendingDays),
    entitledDays:
      typeof input.entitledDays === "number"
        ? roundLeaveDays(input.entitledDays)
        : input.entitledDays,
    carriedForwardDays:
      typeof input.carriedForwardDays === "number"
        ? roundLeaveDays(input.carriedForwardDays)
        : input.carriedForwardDays,
    remainingDays:
      typeof input.remainingDays === "number"
        ? roundLeaveDays(input.remainingDays)
        : input.remainingDays,
  };

  await upsertLeaveQuotaBalance(sanitized);

  return sanitized;
}

export async function getLeaveDashboardSummaryService(
  employeeId?: string,
): Promise<LeaveDashboardSummary> {
  const [allRequests, storedBalances] = await Promise.all([
    listLeaveRequests(),
    ensureLeaveQuotaBalances(),
  ]);

  const requests = employeeId
    ? allRequests.filter((request) => request.employeeId === employeeId)
    : allRequests;

  const recomputedBalances = recomputeQuotaBalancesFromRequests(
    requests,
    storedBalances,
  );

  const cards = LEAVE_TYPES.map((leaveType) => {
    const balance = recomputedBalances.find(
      (item) => item.leaveTypeId === leaveType.id,
    );

    return {
      leaveTypeId: leaveType.id,
      leaveTypeName: leaveType.name,
      entitledDays: balance?.entitledDays ?? leaveType.quotaDays,
      carriedForwardDays: balance?.carriedForwardDays ?? 0,
      usedDays: balance?.usedDays ?? 0,
      pendingDays: balance?.pendingDays ?? 0,
      remainingDays:
        balance?.remainingDays ??
        (typeof leaveType.quotaDays === "number" ? leaveType.quotaDays : undefined),
      source: balance?.source ?? leaveType.quotaSource,
    };
  });

  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  const approvedThisMonthDays = roundLeaveDays(
    requests
      .filter((request) => {
        if (request.status !== "approved" || !request.approvedAt) {
          return false;
        }

        const approvedDate = new Date(request.approvedAt);

        return (
          approvedDate.getUTCFullYear() === currentYear &&
          approvedDate.getUTCMonth() === currentMonth
        );
      })
      .reduce((sum, request) => sum + request.totalDays, 0),
  );

  const pendingApprovalCount = requests.filter(
    (request) => request.status === "pending",
  ).length;

  const annual = cards.find((card) => card.leaveTypeId === "L001");
  const sick = cards.find((card) => card.leaveTypeId === "L003");
  const personal = cards.find((card) => card.leaveTypeId === "L004");

  return {
    cards,
    pendingApprovalCount,
    approvedThisMonthDays,
    remainingAnnualLeaveDays: annual?.remainingDays,
    remainingSickLeaveDays: sick?.remainingDays,
    remainingPersonalLeaveDays: personal?.remainingDays,
  };
}

export async function getLeaveCalendarEventsService(
  filters?: LeaveRequestFilters,
): Promise<LeaveCalendarEvent[]> {
  const requests = await listLeaveRequestsService(filters);
  return buildLeaveCalendarEvents(requests);
}

export async function getLeaveBootstrapService(
  employeeId?: string,
): Promise<{
  summary: LeaveDashboardSummary;
  requests: LeaveRequest[];
  quotaBalances: LeaveQuotaBalance[];
  calendarEvents: LeaveCalendarEvent[];
}> {
  await ensureLeaveQuotaBalances();

  const requests = await listLeaveRequestsService(
    employeeId ? { employeeId } : undefined,
  );

  const quotaBalances = await listLeaveQuotaBalancesService();
  const summary = await getLeaveDashboardSummaryService(employeeId);
  const calendarEvents = await getLeaveCalendarEventsService(
    employeeId ? { employeeId } : undefined,
  );

  return {
    summary,
    requests,
    quotaBalances,
    calendarEvents,
  };
}

export async function seedDefaultLeaveDataService(): Promise<LeaveFile> {
  const existingRequests = await listLeaveRequests();
  const existingBalances = await listLeaveQuotaBalances();

  if (existingRequests.length > 0 || existingBalances.length > 0) {
    return {
      requests: existingRequests,
      quotaBalances: await recalculateAndPersistQuotaBalances(),
    };
  }

  const quotaBalances = mergeQuotaBalancesWithDefaults(buildDefaultQuotaBalances());

  await saveLeaveQuotaBalances(quotaBalances);

  return {
    requests: [],
    quotaBalances,
  };
}