import type {
  CreateProjectAccountInput,
  ProjectAccount,
  UpdateProjectAccountInput,
} from "./project-account.types";

import {
  findProjectAccountById,
  listProjectAccounts,
  saveProjectAccounts,
} from "./project-account.repository";

import { NotFoundError } from "@/lib/errors";

function nowIsoDateTime(): string {
  return new Date().toISOString();
}

function generateId(): string {
  return crypto.randomUUID();
}

function calculateRemaining(
  allocated: number,
  used: number,
): number {
  return Math.max(allocated - used, 0);
}

function normalizeAlertSettings(
  input?: CreateProjectAccountInput["alertSettings"],
): ProjectAccount["alertSettings"] {
  return {
    enabled: input?.enabled ?? false,
    daysBeforeExpiry: input?.daysBeforeExpiry ?? 30,
    channels: input?.channels ?? [],
    recipients: input?.recipients ?? [],
  };
}

function getArchiveCutoffDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function isArchivedByRule(item: ProjectAccount): boolean {
  const endDate = new Date(item.endDate);
  const cutoff = getArchiveCutoffDate();

  const inactiveByStatus =
    item.status === "done" || item.status === "inactive";

  const expiredByPeriod = endDate.getTime() < cutoff.getTime();

  return Boolean(item.archivedAt) || inactiveByStatus || expiredByPeriod;
}

function sortProjectAccounts(items: ProjectAccount[]): ProjectAccount[] {
  return [...items].sort((a, b) => {
    const projectCompare = a.projectName.localeCompare(b.projectName);
    if (projectCompare !== 0) {
      return projectCompare;
    }

    return a.contractNo.localeCompare(b.contractNo);
  });
}

export async function getProjectAccounts(): Promise<ProjectAccount[]> {
  return listProjectAccounts();
}

export async function getProjectAccountsView(): Promise<{
  allItems: ProjectAccount[];
  activeItems: ProjectAccount[];
  archivedItems: ProjectAccount[];
}> {
  const items = await listProjectAccounts();

  const activeItems: ProjectAccount[] = [];
  const archivedItems: ProjectAccount[] = [];

  for (const item of items) {
    if (isArchivedByRule(item)) {
      archivedItems.push(item);
    } else {
      activeItems.push(item);
    }
  }

  return {
    allItems: sortProjectAccounts(items),
    activeItems: sortProjectAccounts(activeItems),
    archivedItems: sortProjectAccounts(archivedItems),
  };
}

export async function getProjectAccountById(
  id: string,
): Promise<ProjectAccount> {
  const item = await findProjectAccountById(id);

  if (!item) {
    throw new NotFoundError("Project account not found.");
  }

  return item;
}

export async function createProjectAccount(
  input: CreateProjectAccountInput,
): Promise<ProjectAccount> {
  const items = await listProjectAccounts();

  const allocatedManDays = Number(input.allocatedManDays ?? 0);
  const usedManDays = Number(input.usedManDays ?? 0);

  const newItem: ProjectAccount = {
    id: generateId(),
    code: input.contractNo?.trim() || generateId(),

    projectName: input.projectName,
    customerName: input.customerName,
    contractNo: input.contractNo,

    startDate: input.startDate,
    endDate: input.endDate,

    allocatedManDays,
    usedManDays,
    remainingManDays: calculateRemaining(allocatedManDays, usedManDays),

    status: input.status ?? "active",
    note: input.note,

    alertSettings: normalizeAlertSettings(input.alertSettings),

    archivedAt: undefined,

    createdAt: nowIsoDateTime(),
    updatedAt: nowIsoDateTime(),

    // Kawari mapping fields
    externalId: input.externalId,
    clientId: input.clientId,
    clientCode: input.clientCode,
    projectStatus: input.projectStatus,
    projectType: input.projectType,
    primaryProjectManagerName: input.primaryProjectManagerName,
    primaryProjectManagerId: input.primaryProjectManagerId,
    projectManagerIds: input.projectManagerIds,
    canEditInKawari: input.canEditInKawari,

    // Kawari detail fields
    overrideTotalResourceMandays: input.overrideTotalResourceMandays,
    totalManDays: input.totalManDays,
    projectServiceContractPrice: input.projectServiceContractPrice,
    projectOtherServiceContractPrice: input.projectOtherServiceContractPrice,
  };

  items.push(newItem);
  await saveProjectAccounts(items);

  return newItem;
}

export async function editProjectAccount(
  id: string,
  input: UpdateProjectAccountInput,
): Promise<ProjectAccount> {
  const items = await listProjectAccounts();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new NotFoundError("Project account not found.");
  }

  const existing = items[index];

  const allocatedManDays =
    input.allocatedManDays ?? existing.allocatedManDays;
  const usedManDays = input.usedManDays ?? existing.usedManDays;

  const updated: ProjectAccount = {
    ...existing,
    ...input,

    allocatedManDays,
    usedManDays,
    remainingManDays:
      input.remainingManDays ??
      calculateRemaining(allocatedManDays, usedManDays),

    alertSettings: input.alertSettings
      ? {
          ...existing.alertSettings,
          ...input.alertSettings,
        }
      : existing.alertSettings,

    updatedAt: nowIsoDateTime(),
  };

  items[index] = updated;
  await saveProjectAccounts(items);

  return updated;
}

export async function updateProjectAccount(
  id: string,
  input: UpdateProjectAccountInput,
): Promise<ProjectAccount> {
  return editProjectAccount(id, input);
}

export async function archiveProjectAccount(
  id: string,
): Promise<ProjectAccount> {
  const existing = await findProjectAccountById(id);

  if (!existing) {
    throw new NotFoundError("Project account not found.");
  }

  if (existing.archivedAt) {
    return existing;
  }

  return updateProjectAccount(id, {
    archivedAt: nowIsoDateTime(),
  });
}

export async function restoreProjectAccount(
  id: string,
): Promise<ProjectAccount> {
  const existing = await findProjectAccountById(id);

  if (!existing) {
    throw new NotFoundError("Project account not found.");
  }

  if (!existing.archivedAt) {
    return existing;
  }

  return updateProjectAccount(id, {
    archivedAt: undefined,
  });
}