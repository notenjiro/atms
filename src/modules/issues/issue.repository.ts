import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";
import { NotFoundError } from "@/lib/errors";

import { issueSchema } from "./issue.schemas";
import type { Issue, IssuePriority, IssueSource, IssueStatus, IssuesFile } from "./issue.types";

const DEFAULT_ISSUES_FILE: IssuesFile = {
  items: [],
};

function isIssueStatus(value: unknown): value is IssueStatus {
  return (
    value === "open" ||
    value === "in_progress" ||
    value === "pending" ||
    value === "resolved" ||
    value === "closed" ||
    value === "cancelled"
  );
}

function isIssuePriority(value: unknown): value is IssuePriority {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  );
}

function isIssueSource(value: unknown): value is IssueSource {
  return (
    value === "manual" ||
    value === "servicenow" ||
    value === "email" ||
    value === "phone"
  );
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeLegacyIssueItem(value: unknown): Issue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;

  const id = asTrimmedString(raw.id);
  const issueNo = asTrimmedString(raw.issueNo);
  const customerName = asTrimmedString(raw.customerName);
  const reporterId = asTrimmedString(raw.reporterId);
  const reporterName = asTrimmedString(raw.reporterName);
  const openedAt = asTrimmedString(raw.openedAt);
  const createdAt = asTrimmedString(raw.createdAt);
  const updatedAt = asTrimmedString(raw.updatedAt);

  if (
    !id ||
    !issueNo ||
    !customerName ||
    !reporterId ||
    !reporterName ||
    !openedAt ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  const normalized: Issue = {
    id,
    issueNo,
    title:
      asTrimmedString(raw.title) ??
      asTrimmedString(raw.externalTicketNo) ??
      `Issue ${issueNo}`,
    description: asTrimmedString(raw.description) ?? "",
    customerName,
    projectAccountId: asTrimmedString(raw.projectAccountId),
    projectAccountCode: asTrimmedString(raw.projectAccountCode),
    projectAccountName: asTrimmedString(raw.projectAccountName),
    status: isIssueStatus(raw.status) ? raw.status : "open",
    priority: isIssuePriority(raw.priority) ? raw.priority : "medium",
    source: isIssueSource(raw.source) ? raw.source : "manual",
    ownerName: asTrimmedString(raw.ownerName),
    ownerEmail: asTrimmedString(raw.ownerEmail),
    reporterId,
    reporterName,
    reporterEmail: asTrimmedString(raw.reporterEmail),
    externalTicketNo: asTrimmedString(raw.externalTicketNo),
    openedAt,
    resolvedAt: asTrimmedString(raw.resolvedAt),
    closedAt: asTrimmedString(raw.closedAt),
    cancelledAt: asTrimmedString(raw.cancelledAt),
    createdAt,
    updatedAt,
  };

  const parsed = issueSchema.safeParse(normalized);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function extractIssueItems(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (Array.isArray(record.items)) {
      return record.items;
    }

    if (record.data && typeof record.data === "object") {
      const nested = record.data as Record<string, unknown>;

      if (Array.isArray(nested.items)) {
        return nested.items;
      }
    }
  }

  return [];
}

async function readIssuesFile(): Promise<IssuesFile> {
  const raw = await readJsonFile<unknown>(dataPaths.issues, DEFAULT_ISSUES_FILE);
  const items = extractIssueItems(raw);

  if (items.length === 0) {
    return DEFAULT_ISSUES_FILE;
  }

  const normalizedItems: Issue[] = items
    .map((item) => normalizeLegacyIssueItem(item))
    .filter((item): item is Issue => item !== null);

  return {
    items: normalizedItems,
  };
}

async function writeIssuesFile(data: IssuesFile): Promise<void> {
  await writeJsonFile<IssuesFile>(dataPaths.issues, data);
}

export async function listIssues(): Promise<Issue[]> {
  const data = await readIssuesFile();
  return data.items;
}

export async function findIssueById(id: string): Promise<Issue | null> {
  const items = await listIssues();
  return items.find((item) => item.id === id) ?? null;
}

export async function addIssue(issue: Issue): Promise<Issue> {
  const data = await readIssuesFile();

  const nextData: IssuesFile = {
    ...data,
    items: [...data.items, issue],
  };

  await writeIssuesFile(nextData);

  return issue;
}

export async function updateIssue(issue: Issue): Promise<Issue> {
  const data = await readIssuesFile();

  const index = data.items.findIndex((item) => item.id === issue.id);

  if (index === -1) {
    throw new NotFoundError("Issue not found.");
  }

  const nextItems = [...data.items];
  nextItems[index] = issue;

  await writeIssuesFile({
    ...data,
    items: nextItems,
  });

  return issue;
}