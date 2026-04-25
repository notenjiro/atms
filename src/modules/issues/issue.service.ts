import path from "node:path";

import { ZodError } from "zod";

import { nowIsoDateTime } from "@/lib/date";
import { generateId, generateIssueNo } from "@/lib/id";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { readJsonFile } from "@/lib/fs/json-store";
import { getProjectAccountById } from "@/modules/project-accounts/project-account.service";

import {
  addIssue,
  findIssueById,
  listIssues,
  saveIssues,
  updateIssue,
} from "./issue.repository";
import {
  appendIssueHistory,
  appendManyIssueHistory,
  type IssueHistoryItem,
} from "./issue-history.repository";
import { createIssueSchema, updateIssueSchema } from "./issue.schemas";
import type {
  CreateIssueInput,
  Issue,
  IssueFilters,
  IssuePolicySettings,
  IssueSummary,
  ServiceNowIssueSyncInput,
  ServiceNowIssueSyncResult,
  UpdateIssueInput,
} from "./issue.types";

type IssueActor = {
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
};

type IssueHistoryActor = {
  actorId: string;
  actorName: string;
};

type ServiceNowIssueBulkSyncResult = {
  created: number;
  updated: number;
  skipped: number;
  items: Issue[];
};

const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "settings.json");

const DEFAULT_ISSUE_POLICY_SETTINGS: IssuePolicySettings = {
  requireOwnerToStartProgress: true,
  requireOwnerToResolve: true,
  allowReopenClosed: true,
  slaHoursLow: 72,
  slaHoursMedium: 24,
  slaHoursHigh: 8,
  slaHoursCritical: 4,
};

function formatZodErrors(error: ZodError): string[] {
  const fieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;

  return Object.entries(fieldErrors).flatMap(([field, messages]) =>
    (messages ?? []).map((message: string) => `${field}: ${message}`),
  );
}

function sortIssues(items: Issue[]): Issue[] {
  return [...items].sort((a, b) => {
    const openedCompare = b.openedAt.localeCompare(a.openedAt);

    if (openedCompare !== 0) {
      return openedCompare;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

function matchesIssueFilters(item: Issue, filters?: IssueFilters): boolean {
  if (!filters) {
    return true;
  }

  const search = filters.search?.trim().toLowerCase();

  if (search) {
    const haystack = [
      item.issueNo,
      item.title,
      item.description,
      item.customerName,
      item.projectAccountCode,
      item.projectAccountName,
      item.ownerName,
      item.reporterName,
      item.externalTicketNo,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(search)) {
      return false;
    }
  }

  if (filters.status && item.status !== filters.status) {
    return false;
  }

  if (filters.priority && item.priority !== filters.priority) {
    return false;
  }

  if (filters.source && item.source !== filters.source) {
    return false;
  }

  if (
    filters.projectAccountId &&
    item.projectAccountId !== filters.projectAccountId
  ) {
    return false;
  }

  if (
    filters.customerName &&
    item.customerName.toLowerCase() !== filters.customerName.trim().toLowerCase()
  ) {
    return false;
  }

  if (filters.reporterId && item.reporterId !== filters.reporterId) {
    return false;
  }

  if (
    filters.ownerName &&
    (item.ownerName ?? "").trim().toLowerCase() !==
      filters.ownerName.trim().toLowerCase()
  ) {
    return false;
  }

  return true;
}

function buildIssueSummary(items: Issue[]): IssueSummary {
  return {
    total: items.length,
    open: items.filter((item) => item.status === "open").length,
    inProgress: items.filter((item) => item.status === "in_progress").length,
    pending: items.filter((item) => item.status === "pending").length,
    resolved: items.filter((item) => item.status === "resolved").length,
    closed: items.filter((item) => item.status === "closed").length,
    critical: items.filter((item) => item.priority === "critical").length,
  };
}

function getNextIssueSequence(items: Issue[]): number {
  const numbers = items
    .map((item) => item.issueNo.match(/ISS-(\d+)/i)?.[1])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (numbers.length === 0) {
    return 0;
  }

  return Math.max(...numbers);
}

function clearClosedTimestamps(nextStatus: Issue["status"]): Pick<
  Issue,
  "resolvedAt" | "closedAt" | "cancelledAt"
> {
  if (nextStatus === "resolved") {
    return {
      resolvedAt: nowIsoDateTime(),
      closedAt: undefined,
      cancelledAt: undefined,
    };
  }

  if (nextStatus === "closed") {
    const timestamp = nowIsoDateTime();

    return {
      resolvedAt: timestamp,
      closedAt: timestamp,
      cancelledAt: undefined,
    };
  }

  if (nextStatus === "cancelled") {
    return {
      resolvedAt: undefined,
      closedAt: undefined,
      cancelledAt: nowIsoDateTime(),
    };
  }

  return {
    resolvedAt: undefined,
    closedAt: undefined,
    cancelledAt: undefined,
  };
}

function normalizeHistoryValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return String(value);
}

function hasOwner(issue: Pick<Issue, "ownerName">): boolean {
  return Boolean(issue.ownerName?.trim());
}

function getAllowedNextStatuses(
  currentStatus: Issue["status"],
  settings: IssuePolicySettings,
): Issue["status"][] {
  switch (currentStatus) {
    case "open":
      return ["open", "in_progress", "cancelled"];
    case "in_progress":
      return ["in_progress", "pending", "resolved"];
    case "pending":
      return ["pending", "in_progress", "cancelled"];
    case "resolved":
      return ["resolved", "closed", "open"];
    case "closed":
      return settings.allowReopenClosed ? ["closed", "open"] : ["closed"];
    case "cancelled":
      return settings.allowReopenClosed ? ["cancelled", "open"] : ["cancelled"];
    default:
      return [currentStatus];
  }
}

function assertStatusTransitionAllowed(
  currentStatus: Issue["status"],
  nextStatus: Issue["status"],
  settings: IssuePolicySettings,
): void {
  const allowedStatuses = getAllowedNextStatuses(currentStatus, settings);

  if (!allowedStatuses.includes(nextStatus)) {
    throw new ValidationError(
      `Status transition from ${currentStatus} to ${nextStatus} is not allowed by current settings.`,
    );
  }
}

function assertOwnerRulesForStatus(
  issueLike: Pick<Issue, "status" | "ownerName">,
  nextStatus: Issue["status"],
  settings: IssuePolicySettings,
): void {
  if (
    nextStatus === "in_progress" &&
    settings.requireOwnerToStartProgress &&
    !hasOwner(issueLike)
  ) {
    throw new ValidationError(
      "Owner is required before moving an issue to In Progress.",
    );
  }

  if (
    (nextStatus === "resolved" || nextStatus === "closed") &&
    settings.requireOwnerToResolve &&
    !hasOwner(issueLike)
  ) {
    throw new ValidationError(
      "Owner is required before resolving or closing an issue.",
    );
  }
}

function sanitizeSlaHours(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

async function getIssuePolicySettings(): Promise<IssuePolicySettings> {
  const data = await readJsonFile<Record<string, unknown>>(
    SETTINGS_FILE_PATH,
    {},
  );

  const issue =
    typeof data.issue === "object" && data.issue !== null
      ? (data.issue as Record<string, unknown>)
      : {};

  return {
    requireOwnerToStartProgress:
      typeof issue.requireOwnerToStartProgress === "boolean"
        ? issue.requireOwnerToStartProgress
        : DEFAULT_ISSUE_POLICY_SETTINGS.requireOwnerToStartProgress,
    requireOwnerToResolve:
      typeof issue.requireOwnerToResolve === "boolean"
        ? issue.requireOwnerToResolve
        : DEFAULT_ISSUE_POLICY_SETTINGS.requireOwnerToResolve,
    allowReopenClosed:
      typeof issue.allowReopenClosed === "boolean"
        ? issue.allowReopenClosed
        : DEFAULT_ISSUE_POLICY_SETTINGS.allowReopenClosed,
    slaHoursLow: sanitizeSlaHours(
      issue.slaHoursLow,
      DEFAULT_ISSUE_POLICY_SETTINGS.slaHoursLow,
    ),
    slaHoursMedium: sanitizeSlaHours(
      issue.slaHoursMedium,
      DEFAULT_ISSUE_POLICY_SETTINGS.slaHoursMedium,
    ),
    slaHoursHigh: sanitizeSlaHours(
      issue.slaHoursHigh,
      DEFAULT_ISSUE_POLICY_SETTINGS.slaHoursHigh,
    ),
    slaHoursCritical: sanitizeSlaHours(
      issue.slaHoursCritical,
      DEFAULT_ISSUE_POLICY_SETTINGS.slaHoursCritical,
    ),
  };
}

async function appendCreatedHistory(
  issue: Issue,
  actor: IssueActor,
): Promise<void> {
  await appendIssueHistory({
    issueId: issue.id,
    action: "created",
    actorId: actor.reporterId,
    actorName: actor.reporterName,
    createdAt: nowIsoDateTime(),
  });
}

function buildUpdatedHistoryInputs(
  before: Issue,
  after: Issue,
  actor?: IssueHistoryActor,
): Array<Omit<IssueHistoryItem, "id">> {
  const actorId = actor?.actorId ?? "system";
  const actorName = actor?.actorName ?? "System";
  const timestamp = nowIsoDateTime();

  const fieldsToTrack: Array<keyof Issue> = [
    "title",
    "description",
    "customerName",
    "projectAccountId",
    "projectAccountCode",
    "projectAccountName",
    "priority",
    "source",
    "ownerName",
    "ownerEmail",
    "externalTicketNo",
    "resolvedAt",
    "closedAt",
    "cancelledAt",
  ];

  const historyInputs: Array<Omit<IssueHistoryItem, "id">> = [];

  if (before.status !== after.status) {
    historyInputs.push({
      issueId: after.id,
      action: "status_changed",
      field: "status",
      from: before.status,
      to: after.status,
      actorId,
      actorName,
      createdAt: timestamp,
    });
  }

  for (const field of fieldsToTrack) {
    const previous = normalizeHistoryValue(before[field]);
    const next = normalizeHistoryValue(after[field]);

    if (previous === next) {
      continue;
    }

    historyInputs.push({
      issueId: after.id,
      action: "updated",
      field,
      from: previous,
      to: next,
      actorId,
      actorName,
      createdAt: timestamp,
    });
  }

  return historyInputs;
}

async function appendUpdatedHistory(
  before: Issue,
  after: Issue,
  actor?: IssueHistoryActor,
): Promise<void> {
  const historyInputs = buildUpdatedHistoryInputs(before, after, actor);
  await appendManyIssueHistory(historyInputs);
}

function getServiceNowIssueTimestamps(
  input: ServiceNowIssueSyncInput,
): Pick<Issue, "resolvedAt" | "closedAt" | "cancelledAt"> {
  if (input.status === "cancelled") {
    return {
      resolvedAt: undefined,
      closedAt: undefined,
      cancelledAt: input.closedAt ?? input.openedAt,
    };
  }

  if (input.status === "closed") {
    const closedAt = input.closedAt ?? input.openedAt;

    return {
      resolvedAt: closedAt,
      closedAt,
      cancelledAt: undefined,
    };
  }

  if (input.status === "resolved") {
    return {
      resolvedAt: input.closedAt ?? input.openedAt,
      closedAt: input.closedAt,
      cancelledAt: undefined,
    };
  }

  return {
    resolvedAt: undefined,
    closedAt: input.closedAt,
    cancelledAt: undefined,
  };
}

function buildServiceNowComparableIssue(item: Issue) {
  return {
    issueNo: item.issueNo,
    title: item.title,
    description: item.description,
    customerName: item.customerName,
    projectAccountId: item.projectAccountId,
    projectAccountCode: item.projectAccountCode,
    projectAccountName: item.projectAccountName,
    status: item.status,
    priority: item.priority,
    source: item.source,
    ownerName: item.ownerName,
    ownerEmail: item.ownerEmail,
    externalTicketNo: item.externalTicketNo,
    openedAt: item.openedAt,
    resolvedAt: item.resolvedAt,
    closedAt: item.closedAt,
    cancelledAt: item.cancelledAt,
  };
}

function getServiceNowIssueKey(ticketNo: string): string {
  return ticketNo.trim().toLowerCase();
}

export async function getIssuePolicySettingsService(): Promise<IssuePolicySettings> {
  return getIssuePolicySettings();
}

export async function listIssuesService(
  filters?: IssueFilters,
): Promise<Issue[]> {
  const items = await listIssues();

  return sortIssues(items.filter((item) => matchesIssueFilters(item, filters)));
}

export async function getIssueByIdService(id: string): Promise<Issue | null> {
  return findIssueById(id);
}

export async function getIssueSummaryService(
  filters?: IssueFilters,
): Promise<IssueSummary> {
  const items = await listIssuesService(filters);

  return buildIssueSummary(items);
}

export async function createIssueService(
  actor: IssueActor,
  input: CreateIssueInput,
): Promise<Issue> {
  const parsed = createIssueSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError("Invalid issue payload.", {
      details: formatZodErrors(parsed.error),
    });
  }

  const allItems = await listIssues();
  const timestamp = nowIsoDateTime();
  const issueNo = generateIssueNo(getNextIssueSequence(allItems));

  let customerName = parsed.data.customerName?.trim() ?? "";
  let projectAccountId: string | undefined;
  let projectAccountCode: string | undefined;
  let projectAccountName: string | undefined;

  if (parsed.data.projectAccountId) {
    const projectAccount = await getProjectAccountById(
      parsed.data.projectAccountId,
    );

    if (!projectAccount) {
      throw new ValidationError("Selected project account was not found.");
    }

    projectAccountId = projectAccount.id;
    projectAccountCode = projectAccount.code;
    projectAccountName = projectAccount.projectName;
    customerName = projectAccount.customerName;
  }

  if (!customerName) {
    throw new ValidationError("Customer name is required.");
  }

  const issue: Issue = {
    id: generateId(),
    issueNo,
    title: parsed.data.title,
    description: parsed.data.description,
    customerName,
    projectAccountId,
    projectAccountCode,
    projectAccountName,
    status: "open",
    priority: parsed.data.priority,
    source: parsed.data.source ?? "manual",
    ownerName: parsed.data.ownerName || undefined,
    ownerEmail: parsed.data.ownerEmail || undefined,
    reporterId: actor.reporterId,
    reporterName: actor.reporterName,
    reporterEmail: actor.reporterEmail,
    externalTicketNo: parsed.data.externalTicketNo || undefined,
    openedAt: timestamp,
    resolvedAt: undefined,
    closedAt: undefined,
    cancelledAt: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const created = await addIssue(issue);
  await appendCreatedHistory(created, actor);

  return created;
}

export async function updateIssueService(
  id: string,
  input: UpdateIssueInput,
  actor?: IssueHistoryActor,
): Promise<Issue> {
  const parsed = updateIssueSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError("Invalid issue update payload.", {
      details: formatZodErrors(parsed.error),
    });
  }

  const existing = await findIssueById(id);

  if (!existing) {
    throw new NotFoundError("Issue not found.");
  }

  const settings = await getIssuePolicySettings();

  let customerName = parsed.data.customerName ?? existing.customerName;
  let projectAccountId = existing.projectAccountId;
  let projectAccountCode = existing.projectAccountCode;
  let projectAccountName = existing.projectAccountName;

  if (typeof parsed.data.projectAccountId === "string") {
    if (parsed.data.projectAccountId.trim() === "") {
      projectAccountId = undefined;
      projectAccountCode = undefined;
      projectAccountName = undefined;
    } else {
      const projectAccount = await getProjectAccountById(
        parsed.data.projectAccountId,
      );

      if (!projectAccount) {
        throw new ValidationError("Selected project account was not found.");
      }

      projectAccountId = projectAccount.id;
      projectAccountCode = projectAccount.code;
      projectAccountName = projectAccount.projectName;
      customerName = projectAccount.customerName;
    }
  }

  if (!projectAccountId && !customerName.trim()) {
    throw new ValidationError(
      "Customer name is required when no project account is selected.",
    );
  }

  const nextStatus = parsed.data.status ?? existing.status;

  assertStatusTransitionAllowed(existing.status, nextStatus, settings);

  const nextOwnerName =
    typeof parsed.data.ownerName === "string"
      ? parsed.data.ownerName || undefined
      : existing.ownerName;

  assertOwnerRulesForStatus(
    {
      status: existing.status,
      ownerName: nextOwnerName,
    },
    nextStatus,
    settings,
  );

  const statusTimestamps =
    nextStatus === existing.status
      ? {
          resolvedAt: existing.resolvedAt,
          closedAt: existing.closedAt,
          cancelledAt: existing.cancelledAt,
        }
      : clearClosedTimestamps(nextStatus);

  const updated: Issue = {
    ...existing,
    ...parsed.data,
    customerName: customerName.trim(),
    projectAccountId,
    projectAccountCode,
    projectAccountName,
    ownerName: nextOwnerName,
    ownerEmail:
      typeof parsed.data.ownerEmail === "string"
        ? parsed.data.ownerEmail || undefined
        : existing.ownerEmail,
    externalTicketNo:
      typeof parsed.data.externalTicketNo === "string"
        ? parsed.data.externalTicketNo || undefined
        : existing.externalTicketNo,
    status: nextStatus,
    openedAt:
      nextStatus === "open" && existing.status !== "open"
        ? nowIsoDateTime()
        : existing.openedAt,
    resolvedAt: statusTimestamps.resolvedAt,
    closedAt: statusTimestamps.closedAt,
    cancelledAt: statusTimestamps.cancelledAt,
    updatedAt: nowIsoDateTime(),
  };

  const saved = await updateIssue(updated);
  await appendUpdatedHistory(existing, saved, actor);

  return saved;
}

export async function upsertServiceNowIssueService(
  input: ServiceNowIssueSyncInput,
): Promise<ServiceNowIssueSyncResult> {
  const result = await upsertServiceNowIssuesBulkService([input]);

  return (
    result.items[0]
      ? {
          item: result.items[0],
          action:
            result.created > 0
              ? "created"
              : result.updated > 0
                ? "updated"
                : "skipped",
        }
      : {
          item: (await listIssues())[0],
          action: "skipped",
        }
  );
}

export async function upsertServiceNowIssuesBulkService(
  inputs: ServiceNowIssueSyncInput[],
): Promise<ServiceNowIssueBulkSyncResult> {
  if (inputs.length === 0) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      items: [],
    };
  }

  const allItems = await listIssues();
  const timestamp = nowIsoDateTime();

  const existingServiceNowMap = new Map<string, Issue>();

  for (const item of allItems) {
    if (item.source !== "servicenow" || !item.externalTicketNo) {
      continue;
    }

    existingServiceNowMap.set(
      getServiceNowIssueKey(item.externalTicketNo),
      item,
    );
  }

  const incomingMap = new Map<string, ServiceNowIssueSyncInput>();

  for (const input of inputs) {
    const ticketNo = input.externalTicketNo.trim();

    if (!ticketNo) {
      continue;
    }

    incomingMap.set(getServiceNowIssueKey(ticketNo), input);
  }

  const nextItems = [...allItems];
  const changedItems: Issue[] = [];
  const historyInputs: Array<Omit<IssueHistoryItem, "id">> = [];

  let created = 0;
  let updated = 0;
  let skipped = inputs.length - incomingMap.size;

  for (const input of incomingMap.values()) {
    const ticketNo = input.externalTicketNo.trim();
    const key = getServiceNowIssueKey(ticketNo);
    const existing = existingServiceNowMap.get(key);
    const serviceNowTimestamps = getServiceNowIssueTimestamps(input);

    if (!existing) {
      const issue: Issue = {
        id: generateId(),
        issueNo: input.issueNo,
        title: input.title,
        description: input.description,
        customerName: input.customerName,
        projectAccountId: input.projectAccountId,
        projectAccountCode: input.projectAccountCode,
        projectAccountName: input.projectAccountName,
        status: input.status,
        priority: input.priority,
        source: "servicenow",
        ownerName: input.ownerName,
        ownerEmail: input.ownerEmail,
        reporterId: "system",
        reporterName: "ServiceNow Import",
        reporterEmail: undefined,
        externalTicketNo: ticketNo,
        openedAt: input.openedAt,
        resolvedAt: serviceNowTimestamps.resolvedAt,
        closedAt: serviceNowTimestamps.closedAt,
        cancelledAt: serviceNowTimestamps.cancelledAt,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      nextItems.push(issue);
      changedItems.push(issue);
      existingServiceNowMap.set(key, issue);
      created += 1;

      historyInputs.push({
        issueId: issue.id,
        action: "created",
        actorId: "system",
        actorName: "ServiceNow Import",
        createdAt: timestamp,
      });

      continue;
    }

    const nextIssue: Issue = {
      ...existing,
      issueNo: input.issueNo,
      title: input.title,
      description: input.description,
      customerName: input.customerName,
      projectAccountId: input.projectAccountId,
      projectAccountCode: input.projectAccountCode,
      projectAccountName: input.projectAccountName,
      status: input.status,
      priority: input.priority,
      source: "servicenow",
      ownerName: input.ownerName,
      ownerEmail: input.ownerEmail,
      externalTicketNo: ticketNo,
      openedAt: input.openedAt,
      resolvedAt: serviceNowTimestamps.resolvedAt,
      closedAt: serviceNowTimestamps.closedAt,
      cancelledAt: serviceNowTimestamps.cancelledAt,
      updatedAt: timestamp,
    };

    const beforeComparable = buildServiceNowComparableIssue(existing);
    const afterComparable = buildServiceNowComparableIssue(nextIssue);

    if (JSON.stringify(beforeComparable) === JSON.stringify(afterComparable)) {
      skipped += 1;
      changedItems.push(existing);
      continue;
    }

    const index = nextItems.findIndex((item) => item.id === existing.id);

    if (index >= 0) {
      nextItems[index] = nextIssue;
    }

    existingServiceNowMap.set(key, nextIssue);
    changedItems.push(nextIssue);
    updated += 1;

    historyInputs.push(
      ...buildUpdatedHistoryInputs(existing, nextIssue, {
        actorId: "system",
        actorName: "ServiceNow Import",
      }),
    );
  }

  if (created > 0 || updated > 0) {
    await saveIssues(nextItems);
  }

  if (historyInputs.length > 0) {
    await appendManyIssueHistory(historyInputs);
  }

  return {
    created,
    updated,
    skipped,
    items: changedItems,
  };
}