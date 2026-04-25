import { generateId } from "@/lib/id";
import { ValidationError } from "@/lib/errors";

import { findIssueById } from "./issue.repository";
import { appendIssueHistory } from "./issue-history.repository";
import {
  addIssueWorklog,
  listIssueWorklogsByIssueId,
  type IssueWorklogItem,
} from "./issue-worklog.repository";

export type CreateIssueWorklogInput = {
  issueId: string;
  actorId: string;
  actorName: string;
  actorEmail?: string;
  hours: number;
  isBillable: boolean;
  description?: string;
  workDate?: string;
};

function nowIsoDateTime(): string {
  return new Date().toISOString();
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeHours(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export async function listIssueWorklogsService(
  issueId: string,
): Promise<IssueWorklogItem[]> {
  return listIssueWorklogsByIssueId(issueId);
}

export async function createIssueWorklogService(
  input: CreateIssueWorklogInput,
): Promise<IssueWorklogItem> {
  const issue = await findIssueById(input.issueId);

  if (!issue) {
    throw new ValidationError("Issue not found.");
  }

  const hours = sanitizeHours(input.hours);

  if (hours <= 0) {
    throw new ValidationError("Worklog hours must be greater than zero.");
  }

  const timestamp = nowIsoDateTime();

  const item: IssueWorklogItem = {
    id: generateId(),
    issueId: issue.id,
    actorId: input.actorId,
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    hours,
    isBillable: Boolean(input.isBillable),
    description: input.description?.trim() || undefined,
    workDate: input.workDate?.trim() || todayIsoDate(),
    createdAt: timestamp,
  };

  const created = await addIssueWorklog(item);

  await appendIssueHistory({
    issueId: issue.id,
    action: "worklog_added",
    field: "worklog",
    from: undefined,
    to: `${created.actorName}: ${created.hours}h ${
      created.isBillable ? "billable" : "non-billable"
    }`,
    actorId: created.actorId,
    actorName: created.actorName,
    createdAt: timestamp,
  });

  return created;
}

export function summarizeIssueWorklogs(items: IssueWorklogItem[]) {
  const byPersonMap = new Map<
    string,
    {
      actorId: string;
      actorName: string;
      actorEmail?: string;
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
      entries: number;
    }
  >();

  let totalHours = 0;
  let billableHours = 0;
  let nonBillableHours = 0;

  for (const item of items) {
    totalHours += item.hours;

    if (item.isBillable) {
      billableHours += item.hours;
    } else {
      nonBillableHours += item.hours;
    }

    const key = item.actorId || item.actorName;

    if (!byPersonMap.has(key)) {
      byPersonMap.set(key, {
        actorId: item.actorId,
        actorName: item.actorName,
        actorEmail: item.actorEmail,
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        entries: 0,
      });
    }

    const row = byPersonMap.get(key)!;

    row.totalHours += item.hours;
    row.entries += 1;

    if (item.isBillable) {
      row.billableHours += item.hours;
    } else {
      row.nonBillableHours += item.hours;
    }
  }

  return {
    totalHours,
    billableHours,
    nonBillableHours,
    totalManDays: totalHours / 8,
    billableManDays: billableHours / 8,
    nonBillableManDays: nonBillableHours / 8,
    byPerson: [...byPersonMap.values()].sort((a, b) =>
      a.actorName.localeCompare(b.actorName),
    ),
  };
}