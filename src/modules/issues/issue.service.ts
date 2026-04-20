import { ZodError } from "zod";

import { nowIsoDateTime } from "@/lib/date";
import { generateId, generateIssueNo } from "@/lib/id";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getProjectAccountById } from "@/modules/project-accounts/project-account.service";

import {
  addIssue,
  findIssueById,
  listIssues,
  updateIssue,
} from "./issue.repository";
import {
  appendIssueHistory,
  appendManyIssueHistory,
} from "./issue-history.repository";
import { createIssueSchema, updateIssueSchema } from "./issue.schemas";
import type {
  CreateIssueInput,
  Issue,
  IssueFilters,
  IssueSummary,
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

async function appendCreatedHistory(issue: Issue, actor: IssueActor): Promise<void> {
  await appendIssueHistory({
    issueId: issue.id,
    action: "created",
    actorId: actor.reporterId,
    actorName: actor.reporterName,
    createdAt: nowIsoDateTime(),
  });
}

async function appendUpdatedHistory(
  before: Issue,
  after: Issue,
  actor?: IssueHistoryActor,
): Promise<void> {
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

  const historyInputs: Array<
    Omit<import("./issue-history.repository").IssueHistoryItem, "id">
  > = [];

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

  await appendManyIssueHistory(historyInputs);
}

export async function listIssuesService(filters?: IssueFilters): Promise<Issue[]> {
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
    const projectAccount = await getProjectAccountById(parsed.data.projectAccountId);

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
      const projectAccount = await getProjectAccountById(parsed.data.projectAccountId);

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
    ownerName:
      typeof parsed.data.ownerName === "string"
        ? parsed.data.ownerName || undefined
        : existing.ownerName,
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