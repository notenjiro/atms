// src/modules/timesheet/timesheet.service.ts
import { randomUUID } from "node:crypto";
import path from "node:path";

import { readJsonFile } from "@/lib/fs/json-store";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  approveTimesheetMonthService,
  rejectTimesheetMonthService,
} from "@/modules/timesheet-month/timesheet-month.service";

import {
  addTimesheetEntry,
  findTimesheetEntryById,
  listTimesheetEntries,
  removeTimesheetEntry,
  updateTimesheetEntry,
} from "./timesheet.repository";
import {
  createTimesheetEntrySchema,
  updateTimesheetEntrySchema,
} from "./timesheet.schemas";
import type {
  CreateTimesheetEntryInput,
  SaveTimesheetMonthBoardInput,
  TimesheetApprovalSummary,
  TimesheetBootstrap,
  TimesheetDailySummary,
  TimesheetEntry,
  TimesheetEntryFilters,
  TimesheetOverviewSummary,
  TimesheetPolicySettings,
  TimesheetStatus,
  UpdateTimesheetEntryInput,
} from "./timesheet.types";

type TimesheetActor = {
  employeeId: string;
  employeeName: string;
};

type TimesheetApprover = {
  name?: string;
  email?: string;
};

const DEFAULT_APPROVER_ROLE = "lead" as const;
const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "settings.json");

const DEFAULT_TIMESHEET_POLICY_SETTINGS: TimesheetPolicySettings = {
  hoursPerDay: 8,
  allowWeekend: false,
  lockAfterDays: 3,
};

function getNowIsoString(): string {
  return new Date().toISOString();
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDateUtc(value: string): Date {
  return new Date(`${toDateOnly(value)}T00:00:00.000Z`);
}

function getUtcTodayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUtcDayDifference(fromDateOnly: string, toDateOnlyValue: string): number {
  const from = parseDateUtc(fromDateOnly);
  const to = parseDateUtc(toDateOnlyValue);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((to.getTime() - from.getTime()) / millisecondsPerDay);
}

function isWeekendDate(dateOnly: string): boolean {
  const day = parseDateUtc(dateOnly).getUTCDay();
  return day === 0 || day === 6;
}

async function getTimesheetPolicySettings(): Promise<TimesheetPolicySettings> {
  const data = await readJsonFile<Record<string, unknown>>(SETTINGS_FILE_PATH, {});

  const timesheet =
    typeof data.timesheet === "object" && data.timesheet !== null
      ? (data.timesheet as Record<string, unknown>)
      : {};

  const rawHoursPerDay =
    typeof timesheet.hoursPerDay === "number"
      ? timesheet.hoursPerDay
      : DEFAULT_TIMESHEET_POLICY_SETTINGS.hoursPerDay;

  const rawLockAfterDays =
    typeof timesheet.lockAfterDays === "number"
      ? timesheet.lockAfterDays
      : DEFAULT_TIMESHEET_POLICY_SETTINGS.lockAfterDays;

  return {
    hoursPerDay:
      Number.isFinite(rawHoursPerDay) && rawHoursPerDay > 0
        ? rawHoursPerDay
        : DEFAULT_TIMESHEET_POLICY_SETTINGS.hoursPerDay,
    allowWeekend:
      typeof timesheet.allowWeekend === "boolean"
        ? timesheet.allowWeekend
        : DEFAULT_TIMESHEET_POLICY_SETTINGS.allowWeekend,
    lockAfterDays:
      Number.isFinite(rawLockAfterDays) && rawLockAfterDays >= 0
        ? Math.floor(rawLockAfterDays)
        : DEFAULT_TIMESHEET_POLICY_SETTINGS.lockAfterDays,
  };
}

function sortTimesheetEntriesDescending(items: TimesheetEntry[]): TimesheetEntry[] {
  return [...items].sort((a, b) => {
    const workDateCompare = b.workDate.localeCompare(a.workDate);

    if (workDateCompare !== 0) {
      return workDateCompare;
    }

    const updatedCompare =
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

    if (updatedCompare !== 0) {
      return updatedCompare;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

function matchesTimesheetFilters(
  item: TimesheetEntry,
  filters?: TimesheetEntryFilters,
): boolean {
  if (!filters) {
    return true;
  }

  if (filters.employeeId && item.employeeId !== filters.employeeId) {
    return false;
  }

  if (filters.status && item.status !== filters.status) {
    return false;
  }

  if (filters.source && item.source !== filters.source) {
    return false;
  }

  if (
    typeof filters.isBillable === "boolean" &&
    item.isBillable !== filters.isBillable
  ) {
    return false;
  }

  if (filters.projectAccountId && item.projectAccountId !== filters.projectAccountId) {
    return false;
  }

  if (filters.fromDate && item.workDate < toDateOnly(filters.fromDate)) {
    return false;
  }

  if (filters.toDate && item.workDate > toDateOnly(filters.toDate)) {
    return false;
  }

  return true;
}

function buildDailySummaries(items: TimesheetEntry[]): TimesheetDailySummary[] {
  const map = new Map<string, TimesheetDailySummary>();

  for (const item of items) {
    const key = item.workDate;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        workDate: key,
        totalHours: roundHours(item.hours),
        billableHours: item.isBillable ? roundHours(item.hours) : 0,
        nonBillableHours: item.isBillable ? 0 : roundHours(item.hours),
        entryCount: 1,
      });
      continue;
    }

    existing.totalHours = roundHours(existing.totalHours + item.hours);

    if (item.isBillable) {
      existing.billableHours = roundHours(existing.billableHours + item.hours);
    } else {
      existing.nonBillableHours = roundHours(
        existing.nonBillableHours + item.hours,
      );
    }

    existing.entryCount += 1;
  }

  return [...map.values()].sort((a, b) => b.workDate.localeCompare(a.workDate));
}

function buildOverviewSummary(items: TimesheetEntry[]): TimesheetOverviewSummary {
  let totalHours = 0;
  let billableHours = 0;
  let nonBillableHours = 0;
  let submittedCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let draftCount = 0;

  for (const item of items) {
    totalHours += item.hours;

    if (item.isBillable) {
      billableHours += item.hours;
    } else {
      nonBillableHours += item.hours;
    }

    if (item.status === "submitted") {
      submittedCount += 1;
    }

    if (item.status === "approved") {
      approvedCount += 1;
    }

    if (item.status === "rejected") {
      rejectedCount += 1;
    }

    if (item.status === "draft") {
      draftCount += 1;
    }
  }

  return {
    totalHours: roundHours(totalHours),
    billableHours: roundHours(billableHours),
    nonBillableHours: roundHours(nonBillableHours),
    submittedCount,
    approvedCount,
    rejectedCount,
    draftCount,
  };
}

function buildApprovalSummary(items: TimesheetEntry[]): TimesheetApprovalSummary {
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  const pendingCount = items.filter((item) => item.status === "submitted").length;

  const approvedThisMonthCount = items.filter((item) => {
    if (item.status !== "approved" || !item.approvedAt) {
      return false;
    }

    const approvedDate = new Date(item.approvedAt);

    return (
      approvedDate.getUTCFullYear() === currentYear &&
      approvedDate.getUTCMonth() === currentMonth
    );
  }).length;

  const rejectedThisMonthCount = items.filter((item) => {
    if (item.status !== "rejected" || !item.rejectedAt) {
      return false;
    }

    const rejectedDate = new Date(item.rejectedAt);

    return (
      rejectedDate.getUTCFullYear() === currentYear &&
      rejectedDate.getUTCMonth() === currentMonth
    );
  }).length;

  return {
    pendingCount,
    approvedThisMonthCount,
    rejectedThisMonthCount,
  };
}

function validateMonthKey(month: string): string {
  const normalizedMonth = month.trim();

  if (!/^\d{4}-\d{2}$/.test(normalizedMonth)) {
    throw new ValidationError("month must be in YYYY-MM format.");
  }

  return normalizedMonth;
}

function buildMonthDateRange(month: string): {
  fromDate: string;
  toDate: string;
} {
  const normalizedMonth = validateMonthKey(month);
  const [year, monthIndex] = normalizedMonth.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();

  return {
    fromDate: `${normalizedMonth}-01`,
    toDate: `${normalizedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

function isContentMutationInput(input: UpdateTimesheetEntryInput): boolean {
  return (
    typeof input.workDate === "string" ||
    typeof input.hours === "number" ||
    typeof input.unit === "string" ||
    typeof input.taskName === "string" ||
    typeof input.description === "string" ||
    typeof input.projectAccountId === "string" ||
    typeof input.projectAccountName === "string" ||
    typeof input.customerName === "string" ||
    typeof input.isBillable === "boolean" ||
    typeof input.source === "string"
  );
}

function assertWorkDateAllowed(
  workDate: string,
  settings: TimesheetPolicySettings,
): void {
  const normalizedWorkDate = toDateOnly(workDate);

  if (!settings.allowWeekend && isWeekendDate(normalizedWorkDate)) {
    throw new ValidationError(
      "Weekend timesheet entries are disabled by current settings.",
    );
  }

  const today = getUtcTodayDateOnly();
  const ageInDays = getUtcDayDifference(normalizedWorkDate, today);

  if (ageInDays > settings.lockAfterDays) {
    throw new ValidationError(
      `Timesheet entries older than ${settings.lockAfterDays} day(s) are locked by current settings.`,
    );
  }
}

async function assertDailyHoursWithinLimit(input: {
  employeeId: string;
  workDate: string;
  hours: number;
  excludeEntryId?: string;
  items?: TimesheetEntry[];
  settings: TimesheetPolicySettings;
}): Promise<void> {
  const items =
    input.items ??
    (await listTimesheetEntriesService({
      employeeId: input.employeeId,
      fromDate: input.workDate,
      toDate: input.workDate,
    }));

  const totalHoursForDay = items
    .filter((item) => item.id !== input.excludeEntryId)
    .reduce((sum, item) => sum + item.hours, 0);

  const nextTotalHours = roundHours(totalHoursForDay + input.hours);

  if (nextTotalHours > input.settings.hoursPerDay) {
    throw new ValidationError(
      `Daily hours exceed the current limit of ${input.settings.hoursPerDay} hour(s).`,
    );
  }
}

async function validateCreateOrReplaceTimesheetEntry(
  actor: TimesheetActor,
  input: {
    workDate: string;
    hours: number;
  },
  settings: TimesheetPolicySettings,
  options?: {
    excludeEntryId?: string;
    items?: TimesheetEntry[];
  },
): Promise<void> {
  const normalizedWorkDate = toDateOnly(input.workDate);

  assertWorkDateAllowed(normalizedWorkDate, settings);

  await assertDailyHoursWithinLimit({
    employeeId: actor.employeeId,
    workDate: normalizedWorkDate,
    hours: roundHours(input.hours),
    excludeEntryId: options?.excludeEntryId,
    items: options?.items,
    settings,
  });
}

async function validateMonthBoardEntries(
  actor: TimesheetActor,
  entries: SaveTimesheetMonthBoardInput["entries"],
  settings: TimesheetPolicySettings,
): Promise<void> {
  const dailyHoursMap = new Map<string, number>();

  for (const entry of entries) {
    const workDate = toDateOnly(entry.workDate);
    const hours = roundHours(entry.hours);

    assertWorkDateAllowed(workDate, settings);

    dailyHoursMap.set(workDate, roundHours((dailyHoursMap.get(workDate) ?? 0) + hours));
  }

  for (const [workDate, totalHours] of dailyHoursMap.entries()) {
    if (totalHours > settings.hoursPerDay) {
      throw new ValidationError(
        `Daily hours exceed the current limit of ${settings.hoursPerDay} hour(s) on ${workDate}.`,
      );
    }
  }
}

async function deleteTimesheetEntriesByFiltersService(
  filters: TimesheetEntryFilters,
): Promise<void> {
  const items = await listTimesheetEntriesService(filters);

  for (const item of items) {
    await removeTimesheetEntry(item.id);
  }
}

async function replaceTimesheetMonthEntriesService(
  actor: TimesheetActor,
  month: string,
  entries: SaveTimesheetMonthBoardInput["entries"],
): Promise<TimesheetEntry[]> {
  const normalizedMonth = validateMonthKey(month);
  const { fromDate, toDate } = buildMonthDateRange(normalizedMonth);
  const settings = await getTimesheetPolicySettings();

  await validateMonthBoardEntries(actor, entries, settings);

  await deleteTimesheetEntriesByFiltersService({
    employeeId: actor.employeeId,
    fromDate,
    toDate,
  });

  const createdItems: TimesheetEntry[] = [];

  for (const entry of entries) {
    const item = await createTimesheetEntryService(actor, {
      workDate: entry.workDate,
      hours: entry.hours,
      unit: entry.unit,
      taskName: entry.taskName,
      description: entry.description,
      projectAccountId: entry.projectAccountId,
      projectAccountName: entry.projectAccountName,
      customerName: entry.customerName,
      isBillable: entry.isBillable,
      source: entry.source,
    });

    createdItems.push(item);
  }

  return sortTimesheetEntriesDescending(createdItems);
}

async function getTimesheetMonthEntriesService(
  employeeId: string,
  month: string,
): Promise<TimesheetEntry[]> {
  const normalizedMonth = validateMonthKey(month);
  const { fromDate, toDate } = buildMonthDateRange(normalizedMonth);

  return listTimesheetEntriesService({
    employeeId,
    fromDate,
    toDate,
  });
}

export async function getTimesheetPolicySettingsService(): Promise<TimesheetPolicySettings> {
  return getTimesheetPolicySettings();
}

export async function listTimesheetEntriesService(
  filters?: TimesheetEntryFilters,
): Promise<TimesheetEntry[]> {
  const items = await listTimesheetEntries();

  return sortTimesheetEntriesDescending(
    items.filter((item) => matchesTimesheetFilters(item, filters)),
  );
}

export async function getTimesheetEntryByIdService(
  id: string,
): Promise<TimesheetEntry> {
  const item = await findTimesheetEntryById(id);

  if (!item) {
    throw new NotFoundError("Timesheet entry not found.");
  }

  return item;
}

export async function createTimesheetEntryService(
  actor: TimesheetActor,
  input: CreateTimesheetEntryInput,
): Promise<TimesheetEntry> {
  const parsedInput = createTimesheetEntrySchema.safeParse(input);

  if (!parsedInput.success) {
    throw new ValidationError("Invalid timesheet entry input.");
  }

  const settings = await getTimesheetPolicySettings();

  await validateCreateOrReplaceTimesheetEntry(
    actor,
    {
      workDate: parsedInput.data.workDate,
      hours: parsedInput.data.hours,
    },
    settings,
  );

  const now = getNowIsoString();

  const item: TimesheetEntry = {
    id: randomUUID(),
    employeeId: actor.employeeId,
    employeeName: actor.employeeName,
    workDate: toDateOnly(parsedInput.data.workDate),
    hours: roundHours(parsedInput.data.hours),
    unit: parsedInput.data.unit ?? "hour",
    taskName: parsedInput.data.taskName.trim(),
    description: parsedInput.data.description?.trim() || undefined,
    projectAccountId: parsedInput.data.projectAccountId?.trim() || undefined,
    projectAccountName: parsedInput.data.projectAccountName?.trim() || undefined,
    customerName: parsedInput.data.customerName?.trim() || undefined,
    isBillable: parsedInput.data.isBillable ?? true,
    source: parsedInput.data.source ?? "manual",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  await addTimesheetEntry(item);

  return item;
}

export async function updateTimesheetEntryService(
  id: string,
  input: UpdateTimesheetEntryInput,
): Promise<TimesheetEntry> {
  const parsedInput = updateTimesheetEntrySchema.safeParse(input);

  if (!parsedInput.success) {
    throw new ValidationError("Invalid timesheet entry update input.");
  }

  const existing = await getTimesheetEntryByIdService(id);
  const now = getNowIsoString();

  const nextStatus = parsedInput.data.status ?? existing.status;
  const nextWorkDate = toDateOnly(parsedInput.data.workDate ?? existing.workDate);
  const nextHours =
    typeof parsedInput.data.hours === "number"
      ? roundHours(parsedInput.data.hours)
      : existing.hours;

  if (isContentMutationInput(parsedInput.data)) {
    const settings = await getTimesheetPolicySettings();

    await validateCreateOrReplaceTimesheetEntry(
      {
        employeeId: existing.employeeId,
        employeeName: existing.employeeName,
      },
      {
        workDate: nextWorkDate,
        hours: nextHours,
      },
      settings,
      {
        excludeEntryId: existing.id,
      },
    );
  }

  const updatedItem: TimesheetEntry = {
    ...existing,
    workDate: nextWorkDate,
    hours: nextHours,
    unit: parsedInput.data.unit ?? existing.unit,
    taskName: parsedInput.data.taskName?.trim() ?? existing.taskName,
    description:
      typeof parsedInput.data.description === "string"
        ? parsedInput.data.description.trim() || undefined
        : existing.description,
    projectAccountId:
      typeof parsedInput.data.projectAccountId === "string"
        ? parsedInput.data.projectAccountId.trim() || undefined
        : existing.projectAccountId,
    projectAccountName:
      typeof parsedInput.data.projectAccountName === "string"
        ? parsedInput.data.projectAccountName.trim() || undefined
        : existing.projectAccountName,
    customerName:
      typeof parsedInput.data.customerName === "string"
        ? parsedInput.data.customerName.trim() || undefined
        : existing.customerName,
    isBillable:
      typeof parsedInput.data.isBillable === "boolean"
        ? parsedInput.data.isBillable
        : existing.isBillable,
    source: parsedInput.data.source ?? existing.source,
    status: nextStatus,
    approverRole:
      parsedInput.data.approverRole ??
      (nextStatus === "approved" || nextStatus === "rejected"
        ? DEFAULT_APPROVER_ROLE
        : existing.approverRole),
    submittedAt:
      nextStatus === "submitted"
        ? parsedInput.data.submittedAt ?? existing.submittedAt ?? now
        : existing.submittedAt,
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
    updatedAt: now,
  };

  await updateTimesheetEntry(updatedItem);

  return updatedItem;
}

export async function deleteTimesheetEntryService(id: string): Promise<void> {
  const existing = await getTimesheetEntryByIdService(id);
  const settings = await getTimesheetPolicySettings();

  assertWorkDateAllowed(existing.workDate, settings);

  await removeTimesheetEntry(id);
}

export async function submitTimesheetEntryService(
  id: string,
): Promise<TimesheetEntry> {
  const existing = await getTimesheetEntryByIdService(id);

  if (existing.status === "approved") {
    throw new ValidationError("Approved timesheet entries cannot be submitted again.");
  }

  const settings = await getTimesheetPolicySettings();

  assertWorkDateAllowed(existing.workDate, settings);

  await assertDailyHoursWithinLimit({
    employeeId: existing.employeeId,
    workDate: existing.workDate,
    hours: existing.hours,
    excludeEntryId: existing.id,
    settings,
  });

  return updateTimesheetEntryService(id, {
    status: "submitted",
    submittedAt: getNowIsoString(),
  });
}

export async function approveTimesheetEntryService(
  id: string,
  _approver?: TimesheetApprover,
): Promise<TimesheetEntry> {
  const existing = await getTimesheetEntryByIdService(id);

  if (existing.status !== "submitted") {
    throw new ValidationError("Only submitted timesheet entries can be approved.");
  }

  return updateTimesheetEntryService(id, {
    status: "approved",
    approverRole: DEFAULT_APPROVER_ROLE,
    approvedAt: getNowIsoString(),
  });
}

export async function rejectTimesheetEntryService(
  id: string,
  rejectedReason: string,
  _approver?: TimesheetApprover,
): Promise<TimesheetEntry> {
  const existing = await getTimesheetEntryByIdService(id);

  if (existing.status !== "submitted") {
    throw new ValidationError("Only submitted timesheet entries can be rejected.");
  }

  if (!rejectedReason.trim()) {
    throw new ValidationError("Rejected reason is required.");
  }

  return updateTimesheetEntryService(id, {
    status: "rejected",
    approverRole: DEFAULT_APPROVER_ROLE,
    rejectedAt: getNowIsoString(),
    rejectedReason: rejectedReason.trim(),
  });
}

export async function saveTimesheetMonthBoardService(
  input: SaveTimesheetMonthBoardInput,
): Promise<TimesheetEntry[]> {
  const actor = {
    employeeId: input.employeeId.trim(),
    employeeName: input.employeeName.trim(),
  };

  if (!actor.employeeId || !actor.employeeName) {
    throw new ValidationError("employeeId and employeeName are required.");
  }

  if (!Array.isArray(input.entries) || input.entries.length === 0) {
    throw new ValidationError("entries must contain at least one item.");
  }

  return replaceTimesheetMonthEntriesService(actor, input.month, input.entries);
}

export async function submitTimesheetMonthBoardService(
  input: SaveTimesheetMonthBoardInput,
): Promise<TimesheetEntry[]> {
  const items = await saveTimesheetMonthBoardService(input);
  const submittedAt = getNowIsoString();
  const settings = await getTimesheetPolicySettings();

  const updatedItems: TimesheetEntry[] = [];

  for (const item of items) {
    assertWorkDateAllowed(item.workDate, settings);

    const updatedItem = await updateTimesheetEntryService(item.id, {
      status: "submitted",
      submittedAt,
    });

    updatedItems.push(updatedItem);
  }

  return sortTimesheetEntriesDescending(updatedItems);
}

export async function approveTimesheetMonthBoardService(input: {
  employeeId: string;
  month: string;
  approver?: TimesheetApprover;
}): Promise<TimesheetEntry[]> {
  const employeeId = input.employeeId.trim();
  const month = validateMonthKey(input.month);

  if (!employeeId) {
    throw new ValidationError("employeeId is required.");
  }

  const items = await getTimesheetMonthEntriesService(employeeId, month);

  if (items.length === 0) {
    throw new ValidationError("No timesheet entries found for this month.");
  }

  const invalidItems = items.filter((item) => item.status !== "submitted");

  if (invalidItems.length > 0) {
    throw new ValidationError("Only submitted month entries can be approved.");
  }

  const approvedItems: TimesheetEntry[] = [];

  for (const item of items) {
    const updatedItem = await approveTimesheetEntryService(item.id, input.approver);
    approvedItems.push(updatedItem);
  }

  await approveTimesheetMonthService(employeeId, month);

  return sortTimesheetEntriesDescending(approvedItems);
}

export async function rejectTimesheetMonthBoardService(input: {
  employeeId: string;
  month: string;
  reason: string;
  approver?: TimesheetApprover;
}): Promise<TimesheetEntry[]> {
  const employeeId = input.employeeId.trim();
  const month = validateMonthKey(input.month);
  const reason = input.reason.trim();

  if (!employeeId) {
    throw new ValidationError("employeeId is required.");
  }

  if (!reason) {
    throw new ValidationError("Rejected reason is required.");
  }

  const items = await getTimesheetMonthEntriesService(employeeId, month);

  if (items.length === 0) {
    throw new ValidationError("No timesheet entries found for this month.");
  }

  const invalidItems = items.filter((item) => item.status !== "submitted");

  if (invalidItems.length > 0) {
    throw new ValidationError("Only submitted month entries can be rejected.");
  }

  const rejectedItems: TimesheetEntry[] = [];

  for (const item of items) {
    const updatedItem = await rejectTimesheetEntryService(
      item.id,
      reason,
      input.approver,
    );
    rejectedItems.push(updatedItem);
  }

  await rejectTimesheetMonthService(employeeId, month, reason);

  return sortTimesheetEntriesDescending(rejectedItems);
}

export async function listTimesheetDailySummariesService(
  filters?: TimesheetEntryFilters,
): Promise<TimesheetDailySummary[]> {
  const items = await listTimesheetEntriesService(filters);
  return buildDailySummaries(items);
}

export async function getTimesheetOverviewSummaryService(
  filters?: TimesheetEntryFilters,
): Promise<TimesheetOverviewSummary> {
  const items = await listTimesheetEntriesService(filters);
  return buildOverviewSummary(items);
}

export async function getTimesheetApprovalSummaryService(
  filters?: TimesheetEntryFilters,
): Promise<TimesheetApprovalSummary> {
  const items = await listTimesheetEntriesService(filters);
  return buildApprovalSummary(items);
}

export async function getTimesheetBootstrapService(
  employeeId?: string,
): Promise<TimesheetBootstrap> {
  const filters = employeeId ? ({ employeeId } satisfies TimesheetEntryFilters) : undefined;

  const [items, policy] = await Promise.all([
    listTimesheetEntriesService(filters),
    getTimesheetPolicySettings(),
  ]);

  const dailySummaries = buildDailySummaries(items);
  const overview = buildOverviewSummary(items);
  const approval = buildApprovalSummary(items);

  return {
    items,
    dailySummaries,
    overview,
    approval,
    policy,
  };
}

export async function getTimesheetEntriesByStatusService(
  status: TimesheetStatus,
  employeeId?: string,
): Promise<TimesheetEntry[]> {
  return listTimesheetEntriesService({
    status,
    employeeId,
  });
}