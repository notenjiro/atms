import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";
import { NotFoundError } from "@/lib/errors";

import { issuesFileSchema } from "./issue.schemas";
import type { Issue, IssuesFile } from "./issue.types";

const DEFAULT_ISSUES_FILE: IssuesFile = {
  items: [],
};

async function readIssuesFile(): Promise<IssuesFile> {
  const data = await readJsonFile<IssuesFile>(
    dataPaths.issues,
    DEFAULT_ISSUES_FILE,
  );

  const parsed = issuesFileSchema.safeParse(data);

  if (!parsed.success) {
    console.error(
      "Invalid issues.json format",
      parsed.error.flatten().fieldErrors,
    );

    return DEFAULT_ISSUES_FILE;
  }

  return parsed.data;
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