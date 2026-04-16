import { ConflictError, NotFoundError } from "@/lib/errors";
import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";

import { projectAccountsFileSchema } from "./project-account.schemas";
import type {
  ProjectAccount,
  ProjectAccountsFile,
} from "./project-account.types";

const DEFAULT_PROJECT_ACCOUNTS_FILE: ProjectAccountsFile = {
  items: [],
};

export async function readProjectAccountsFile(): Promise<ProjectAccountsFile> {
  const data = await readJsonFile<ProjectAccountsFile>(
    dataPaths.projectAccounts,
    DEFAULT_PROJECT_ACCOUNTS_FILE,
  );

  const parsed = projectAccountsFileSchema.safeParse(data);

  if (!parsed.success) {
    console.error(
      "Invalid project-accounts.json format",
      parsed.error.flatten().fieldErrors,
    );
    return DEFAULT_PROJECT_ACCOUNTS_FILE;
  }

  return parsed.data;
}

export async function listProjectAccounts(): Promise<ProjectAccount[]> {
  const data = await readProjectAccountsFile();
  return data.items;
}

export async function findProjectAccountById(
  id: string,
): Promise<ProjectAccount | null> {
  const items = await listProjectAccounts();
  return items.find((item) => item.id === id) ?? null;
}

export async function findProjectAccountByCode(
  code: string,
): Promise<ProjectAccount | null> {
  const normalizedCode = code.trim().toLowerCase();
  const items = await listProjectAccounts();

  return (
    items.find((item) => item.code.trim().toLowerCase() === normalizedCode) ??
    null
  );
}

export async function saveProjectAccounts(
  items: ProjectAccount[],
): Promise<void> {
  await writeJsonFile<ProjectAccountsFile>(dataPaths.projectAccounts, {
    items,
  });
}

export async function addProjectAccount(
  newProjectAccount: ProjectAccount,
): Promise<ProjectAccount> {
  const items = await listProjectAccounts();

  const duplicatedCode = items.some(
    (item) =>
      item.code.trim().toLowerCase() ===
      newProjectAccount.code.trim().toLowerCase(),
  );

  if (duplicatedCode) {
    throw new ConflictError("A project account with this code already exists.");
  }

  const nextItems = [...items, newProjectAccount];

  await saveProjectAccounts(nextItems);

  return newProjectAccount;
}

export async function updateProjectAccount(
  updatedProjectAccount: ProjectAccount,
): Promise<ProjectAccount> {
  const items = await listProjectAccounts();

  const index = items.findIndex((item) => item.id === updatedProjectAccount.id);

  if (index === -1) {
    throw new NotFoundError("Project account not found.");
  }

  const duplicatedCode = items.some(
    (item) =>
      item.id !== updatedProjectAccount.id &&
      item.code.trim().toLowerCase() ===
        updatedProjectAccount.code.trim().toLowerCase(),
  );

  if (duplicatedCode) {
    throw new ConflictError("A project account with this code already exists.");
  }

  items[index] = updatedProjectAccount;

  await saveProjectAccounts(items);

  return updatedProjectAccount;
}