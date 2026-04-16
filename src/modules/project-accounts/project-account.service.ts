import { ZodError } from "zod";

import { nowIsoDateTime, todayIsoDate } from "@/lib/date";
import { generateId, generateProjectAccountCode } from "@/lib/id";
import { ValidationError } from "@/lib/errors";

import {
  addProjectAccount,
  findProjectAccountByCode,
  findProjectAccountById,
  listProjectAccounts,
  updateProjectAccount,
} from "./project-account.repository";
import {
  createProjectAccountSchema,
  updateProjectAccountSchema,
} from "./project-account.schemas";
import type {
  CreateProjectAccountInput,
  ProjectAccount,
  ProjectAccountAlertSettings,
  ProjectAccountStatus,
  UpdateProjectAccountInput,
} from "./project-account.types";

const DEFAULT_ALERT_SETTINGS: ProjectAccountAlertSettings = {
  enabled: false,
  daysBeforeExpiry: 30,
  channels: ["email"],
  recipients: [],
};

function roundManDays(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeAlertSettings(
  alertSettings?: Partial<ProjectAccountAlertSettings>,
): ProjectAccountAlertSettings {
  return {
    enabled: alertSettings?.enabled ?? DEFAULT_ALERT_SETTINGS.enabled,
    daysBeforeExpiry:
      alertSettings?.daysBeforeExpiry ?? DEFAULT_ALERT_SETTINGS.daysBeforeExpiry,
    channels:
      alertSettings?.channels && alertSettings.channels.length > 0
        ? alertSettings.channels
        : DEFAULT_ALERT_SETTINGS.channels,
    recipients: alertSettings?.recipients ?? DEFAULT_ALERT_SETTINGS.recipients,
  };
}

function calculateRemainingManDays(
  allocatedManDays: number,
  usedManDays: number,
): number {
  return roundManDays(allocatedManDays - usedManDays);
}

function deriveStatus(
  endDate: string,
  remainingManDays: number,
): ProjectAccountStatus {
  const today = todayIsoDate();

  if (endDate < today) {
    return "expired";
  }

  if (remainingManDays <= 0) {
    return "inactive";
  }

  return "active";
}

function assertManDayBalance(
  allocatedManDays: number,
  usedManDays: number,
): void {
  if (usedManDays > allocatedManDays) {
    throw new ValidationError(
      "Used man-days cannot exceed allocated man-days.",
    );
  }
}

function formatZodErrors(error: ZodError): string[] {
  const fieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;

  return Object.entries(fieldErrors).flatMap(([field, messages]) =>
    (messages ?? []).map((msg: string) => `${field}: ${msg}`),
  );
}

export async function getProjectAccounts(): Promise<ProjectAccount[]> {
  const items = await listProjectAccounts();

  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status.localeCompare(b.status);
    }

    return a.projectName.localeCompare(b.projectName);
  });
}

export async function getProjectAccountById(
  id: string,
): Promise<ProjectAccount | null> {
  return findProjectAccountById(id);
}

export async function createProjectAccount(
  input: CreateProjectAccountInput,
): Promise<ProjectAccount> {
  const parsed = createProjectAccountSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError("Invalid project account payload.", {
      details: formatZodErrors(parsed.error),
    });
  }

  const {
    projectName,
    customerName,
    contractNo,
    startDate,
    endDate,
    allocatedManDays,
    usedManDays = 0,
    note,
    alertSettings,
  } = parsed.data;

  assertManDayBalance(allocatedManDays, usedManDays);

  const existingItems = await listProjectAccounts();
  const code = generateProjectAccountCode(existingItems.length + 1);

  const duplicatedCode = await findProjectAccountByCode(code);

  if (duplicatedCode) {
    throw new ValidationError(
      "Unable to generate a unique project account code.",
    );
  }

  const remainingManDays = calculateRemainingManDays(
    allocatedManDays,
    usedManDays,
  );

  const timestamp = nowIsoDateTime();

  const projectAccount: ProjectAccount = {
    id: generateId(),
    code,
    projectName,
    customerName,
    contractNo,
    startDate,
    endDate,
    allocatedManDays: roundManDays(allocatedManDays),
    usedManDays: roundManDays(usedManDays),
    remainingManDays,
    status: deriveStatus(endDate, remainingManDays),
    note,
    alertSettings: normalizeAlertSettings(alertSettings),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return addProjectAccount(projectAccount);
}

export async function editProjectAccount(
  id: string,
  input: UpdateProjectAccountInput,
): Promise<ProjectAccount> {
  const parsed = updateProjectAccountSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError("Invalid project account update payload.", {
      details: formatZodErrors(parsed.error),
    });
  }

  const existing = await findProjectAccountById(id);

  if (!existing) {
    throw new ValidationError("Project account not found.");
  }

  const nextAllocatedManDays =
    parsed.data.allocatedManDays ?? existing.allocatedManDays;
  const nextUsedManDays = parsed.data.usedManDays ?? existing.usedManDays;
  const nextStartDate = parsed.data.startDate ?? existing.startDate;
  const nextEndDate = parsed.data.endDate ?? existing.endDate;

  if (nextEndDate < nextStartDate) {
    throw new ValidationError("End date must be on or after the start date.");
  }

  assertManDayBalance(nextAllocatedManDays, nextUsedManDays);

  const remainingManDays = calculateRemainingManDays(
    nextAllocatedManDays,
    nextUsedManDays,
  );

  const updated: ProjectAccount = {
    ...existing,
    ...parsed.data,
    allocatedManDays: roundManDays(nextAllocatedManDays),
    usedManDays: roundManDays(nextUsedManDays),
    remainingManDays,
    status:
      parsed.data.status ?? deriveStatus(nextEndDate, remainingManDays),
    alertSettings: parsed.data.alertSettings
      ? normalizeAlertSettings(parsed.data.alertSettings)
      : existing.alertSettings,
    updatedAt: nowIsoDateTime(),
  };

  return updateProjectAccount(updated);
}