import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";
import { generateId } from "@/lib/id";

export type IssueHistoryAction =
  | "created"
  | "updated"
  | "status_changed"
  | "worklog_added"
  | "comment_added";

export type IssueHistoryItem = {
  id: string;
  issueId: string;
  action: IssueHistoryAction;
  field?: string;
  from?: string;
  to?: string;
  actorId: string;
  actorName: string;
  createdAt: string;
};

type IssueHistoryFile = {
  items: IssueHistoryItem[];
};

const DEFAULT_ISSUE_HISTORY_FILE: IssueHistoryFile = {
  items: [],
};

function isIssueHistoryAction(value: unknown): value is IssueHistoryAction {
  return (
    value === "created" ||
    value === "updated" ||
    value === "status_changed" ||
    value === "worklog_added" ||
    value === "comment_added"
  );
}

function isIssueHistoryItem(value: unknown): value is IssueHistoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.issueId === "string" &&
    isIssueHistoryAction(item.action) &&
    typeof item.actorId === "string" &&
    typeof item.actorName === "string" &&
    typeof item.createdAt === "string"
  );
}

function normalizeIssueHistoryFile(data: unknown): IssueHistoryFile {
  if (!data || typeof data !== "object") {
    return DEFAULT_ISSUE_HISTORY_FILE;
  }

  const maybeFile = data as { items?: unknown };

  if (!Array.isArray(maybeFile.items)) {
    return DEFAULT_ISSUE_HISTORY_FILE;
  }

  return {
    items: maybeFile.items.filter(isIssueHistoryItem),
  };
}

async function readIssueHistoryFile(): Promise<IssueHistoryFile> {
  try {
    const data = await readJsonFile<unknown>(
      dataPaths.issueHistory,
      DEFAULT_ISSUE_HISTORY_FILE,
    );

    return normalizeIssueHistoryFile(data);
  } catch {
    return DEFAULT_ISSUE_HISTORY_FILE;
  }
}

async function writeIssueHistoryFile(data: IssueHistoryFile): Promise<void> {
  await writeJsonFile<IssueHistoryFile>(
    dataPaths.issueHistory,
    normalizeIssueHistoryFile(data),
  );
}

export async function appendIssueHistory(
  input: Omit<IssueHistoryItem, "id">,
): Promise<IssueHistoryItem> {
  const [item] = await appendManyIssueHistory([input]);
  return item;
}

export async function appendManyIssueHistory(
  inputs: Array<Omit<IssueHistoryItem, "id">>,
): Promise<IssueHistoryItem[]> {
  if (inputs.length === 0) {
    return [];
  }

  const data = await readIssueHistoryFile();

  const newItems: IssueHistoryItem[] = inputs.map((input) => ({
    id: generateId(),
    issueId: input.issueId,
    action: input.action,
    field: input.field,
    from: input.from,
    to: input.to,
    actorId: input.actorId,
    actorName: input.actorName,
    createdAt: input.createdAt,
  }));

  await writeIssueHistoryFile({
    items: [...data.items, ...newItems],
  });

  return newItems;
}

export async function listIssueHistoryByIssueId(
  issueId: string,
): Promise<IssueHistoryItem[]> {
  const data = await readIssueHistoryFile();

  return data.items
    .filter((item) => item.issueId === issueId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}