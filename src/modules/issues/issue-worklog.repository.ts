import path from "node:path";

import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";

export type IssueWorklogItem = {
  id: string;
  issueId: string;
  actorId: string;
  actorName: string;
  actorEmail?: string;
  hours: number;
  isBillable: boolean;
  description?: string;
  workDate: string;
  createdAt: string;
};

type IssueWorklogsFile = {
  items: IssueWorklogItem[];
};

const WORKLOGS_FILE_PATH = path.join(process.cwd(), "data", "issue-worklogs.json");

const DEFAULT_WORKLOGS_FILE: IssueWorklogsFile = {
  items: [],
};

function isIssueWorklogItem(value: unknown): value is IssueWorklogItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.issueId === "string" &&
    typeof item.actorId === "string" &&
    typeof item.actorName === "string" &&
    typeof item.hours === "number" &&
    Number.isFinite(item.hours) &&
    typeof item.isBillable === "boolean" &&
    typeof item.workDate === "string" &&
    typeof item.createdAt === "string"
  );
}

function normalizeWorklogsFile(data: unknown): IssueWorklogsFile {
  if (!data || typeof data !== "object") {
    return DEFAULT_WORKLOGS_FILE;
  }

  const maybeFile = data as { items?: unknown };

  if (!Array.isArray(maybeFile.items)) {
    return DEFAULT_WORKLOGS_FILE;
  }

  return {
    items: maybeFile.items.filter(isIssueWorklogItem),
  };
}

async function readWorklogsFile(): Promise<IssueWorklogsFile> {
  try {
    const data = await readJsonFile<unknown>(
      WORKLOGS_FILE_PATH,
      DEFAULT_WORKLOGS_FILE,
    );

    return normalizeWorklogsFile(data);
  } catch {
    return DEFAULT_WORKLOGS_FILE;
  }
}

async function writeWorklogsFile(data: IssueWorklogsFile): Promise<void> {
  await writeJsonFile<IssueWorklogsFile>(
    WORKLOGS_FILE_PATH,
    normalizeWorklogsFile(data),
  );
}

export async function listIssueWorklogsByIssueId(
  issueId: string,
): Promise<IssueWorklogItem[]> {
  const data = await readWorklogsFile();

  return data.items
    .filter((item) => item.issueId === issueId)
    .sort((a, b) => b.workDate.localeCompare(a.workDate));
}

export async function addIssueWorklog(
  item: IssueWorklogItem,
): Promise<IssueWorklogItem> {
  const data = await readWorklogsFile();

  await writeWorklogsFile({
    items: [...data.items, item],
  });

  return item;
}