import { randomUUID } from "node:crypto";

import { NotFoundError, ValidationError } from "@/lib/errors";
import { listProjectAccounts } from "@/modules/project-accounts/project-account.repository";
import { kawariRequest } from "@/modules/kawari/kawari.client";

import {
  addTimesheetProject,
  findTimesheetProjectByCode,
  findTimesheetProjectById,
  listTimesheetProjects,
  replaceTimesheetProjects,
  updateTimesheetProject,
} from "./timesheet-project.repository";
import {
  createTimesheetProjectSchema,
  externalTimesheetProjectSchema,
  updateTimesheetProjectSchema,
} from "./timesheet-project.schemas";
import type {
  CreateTimesheetProjectInput,
  ExternalTimesheetProject,
  TimesheetProject,
  TimesheetProjectFilters,
  TimesheetProjectListResult,
  UpdateTimesheetProjectInput,
} from "./timesheet-project.types";

type ProjectAccountLike = {
  id: string;
  projectName: string;
  customerName: string;
  contractNo: string;
} & Record<string, unknown>;

type KawariApproverRaw = {
  _id?: string;
  first_name?: string;
  last_name?: string;
  nick_name?: string;
  email?: string;
};

type KawariMonthlyProjectRaw = {
  _id?: string;
  project_code?: string;
  name?: string;
  project_type?: string;
  project_status?: string;
  project_approver_ids?: string[];
  approvers?: KawariApproverRaw[];
};

type KawariMonthlyTimesheetResponse =
  | KawariMonthlyProjectRaw[]
  | {
      projects?: KawariMonthlyProjectRaw[];
      items?: KawariMonthlyProjectRaw[];
      data?:
        | KawariMonthlyProjectRaw[]
        | {
            projects?: KawariMonthlyProjectRaw[];
            items?: KawariMonthlyProjectRaw[];
          };
    };

function getNowIsoString(): string {
  return new Date().toISOString();
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase();
}

function sortProjects(items: TimesheetProject[]): TimesheetProject[] {
  return [...items].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    const codeCompare = a.code.localeCompare(b.code);

    if (codeCompare !== 0) {
      return codeCompare;
    }

    return a.name.localeCompare(b.name);
  });
}

function matchesTimesheetProjectFilters(
  item: TimesheetProject,
  filters?: TimesheetProjectFilters,
): boolean {
  if (!filters) {
    return true;
  }

  if (
    typeof filters.isActive === "boolean" &&
    item.isActive !== filters.isActive
  ) {
    return false;
  }

  if (
    typeof filters.isChargeable === "boolean" &&
    item.isChargeable !== filters.isChargeable
  ) {
    return false;
  }

  if (filters.category && filters.category !== "all") {
    if (filters.category === "chargeable" && !item.isChargeable) {
      return false;
    }

    if (filters.category === "non-charge" && item.isChargeable) {
      return false;
    }
  }

  if (filters.search) {
    const keyword = normalizeKeyword(filters.search);

    const haystack = [
      item.code,
      item.name,
      item.category,
      item.customerName,
      ...(item.approverNames ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(keyword)) {
      return false;
    }
  }

  return true;
}

function buildTimesheetProjectListResult(
  items: TimesheetProject[],
): TimesheetProjectListResult {
  return {
    items,
    total: items.length,
  };
}

function mapExternalTimesheetProjectToInternal(
  externalProject: ExternalTimesheetProject,
): TimesheetProject {
  const now = getNowIsoString();

  return {
    id: randomUUID(),
    code: externalProject.projectCode.trim(),
    name: externalProject.projectName.trim(),
    category: externalProject.category?.trim() || undefined,
    isChargeable: externalProject.chargeType === "chargeable",
    customerName: externalProject.customerName?.trim() || undefined,
    source: "customer-api",
    isActive: externalProject.status !== "inactive",
    createdAt: now,
    updatedAt: now,
  };
}

function getDemoTimesheetProjects(): TimesheetProject[] {
  const now = getNowIsoString();

  return [
    {
      id: randomUUID(),
      code: "I-1000-26-01-01",
      name: "Presales 2026",
      category: "Presales",
      isChargeable: false,
      customerName: "Internal",
      source: "local",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function isMongoObjectIdLike(value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }

  return /^[a-f0-9]{24}$/i.test(value.trim());
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeApproverName(item: KawariApproverRaw): string {
  const firstName = normalizeString(item.first_name);
  const lastName = normalizeString(item.last_name);
  const nickName = normalizeString(item.nick_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || nickName || normalizeString(item.email);
}

function resolveProjectAccountMatch(
  accounts: ProjectAccountLike[],
  project: KawariMonthlyProjectRaw,
): ProjectAccountLike | null {
  const projectCode = normalizeString(project.project_code);
  const projectName = normalizeString(project.name);

  const byCode = accounts.find(
    (account: ProjectAccountLike) =>
      normalizeString(account.contractNo) === projectCode,
  );

  if (byCode) {
    return byCode;
  }

  const byName = accounts.find(
    (account: ProjectAccountLike) =>
      normalizeString(account.projectName) === projectName,
  );

  return byName ?? null;
}

function extractApproverIds(project: KawariMonthlyProjectRaw): string[] {
  const directIds = Array.isArray(project.project_approver_ids)
    ? project.project_approver_ids
        .map((item: string) => normalizeString(item))
        .filter(Boolean)
    : [];

  if (directIds.length > 0) {
    return Array.from(new Set(directIds));
  }

  const fallbackIds = Array.isArray(project.approvers)
    ? project.approvers
        .map((item: KawariApproverRaw) => normalizeString(item._id))
        .filter(Boolean)
    : [];

  return Array.from(new Set(fallbackIds));
}

function extractApproverNames(project: KawariMonthlyProjectRaw): string[] {
  const names = Array.isArray(project.approvers)
    ? project.approvers
        .map((item: KawariApproverRaw) => normalizeApproverName(item))
        .filter(Boolean)
    : [];

  return Array.from(new Set(names));
}

function mapKawariMonthlyProjectToTimesheetProject(
  project: KawariMonthlyProjectRaw,
  accounts: ProjectAccountLike[],
): TimesheetProject | null {
  const projectId = normalizeString(project._id);
  const projectCode = normalizeString(project.project_code);
  const projectName = normalizeString(project.name);

  if (!projectId || !projectName) {
    return null;
  }

  if (!projectCode || isMongoObjectIdLike(projectCode)) {
    return null;
  }

  const matchedAccount = resolveProjectAccountMatch(accounts, project);
  const approverIds = extractApproverIds(project);
  const approverNames = extractApproverNames(project);

  const now = getNowIsoString();
  const projectType = normalizeString(project.project_type);
  const projectStatus = normalizeString(project.project_status).toUpperCase();

  return {
    id: projectId,
    projectId,
    code: projectCode,
    name: projectName,
    category: projectType || undefined,
    isChargeable: projectType !== "COMMON",
    customerName: matchedAccount?.customerName || undefined,
    approverIds,
    approverNames,
    source: "kawari-monthly",
    isActive: projectStatus !== "INACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

function extractMonthlyProjectsPayload(
  payload: KawariMonthlyTimesheetResponse,
): KawariMonthlyProjectRaw[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.projects)) {
    return payload.projects;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as {
      projects?: KawariMonthlyProjectRaw[];
      items?: KawariMonthlyProjectRaw[];
    };

    if (Array.isArray(nested.projects)) {
      return nested.projects;
    }

    if (Array.isArray(nested.items)) {
      return nested.items;
    }
  }

  return [];
}

async function getKawariMonthlyTimesheetProjects(
  monthKey: string,
): Promise<TimesheetProject[]> {
  const accounts = (await listProjectAccounts()) as ProjectAccountLike[];

  const response = await kawariRequest<KawariMonthlyTimesheetResponse>({
    path: `/timesheets/my/${monthKey}`,
    method: "GET",
  });

  const rawProjects = extractMonthlyProjectsPayload(response.data);

  const mapped = rawProjects
    .map((project: KawariMonthlyProjectRaw) =>
      mapKawariMonthlyProjectToTimesheetProject(project, accounts),
    )
    .filter((item: TimesheetProject | null): item is TimesheetProject => item !== null);

  const deduplicated = new Map<string, TimesheetProject>();

  for (const item of mapped) {
    const key = item.code.trim().toLowerCase();
    const existing = deduplicated.get(key);

    if (!existing) {
      deduplicated.set(key, item);
      continue;
    }

    deduplicated.set(key, {
      ...existing,
      approverIds: Array.from(
        new Set([...(existing.approverIds ?? []), ...(item.approverIds ?? [])]),
      ),
      approverNames: Array.from(
        new Set([
          ...(existing.approverNames ?? []),
          ...(item.approverNames ?? []),
        ]),
      ),
    });
  }

  return sortProjects([...deduplicated.values()]);
}

export async function listTimesheetProjectsService(
  filters?: TimesheetProjectFilters,
): Promise<TimesheetProject[]> {
  const items = await listTimesheetProjects();

  return sortProjects(
    items.filter((item: TimesheetProject) =>
      matchesTimesheetProjectFilters(item, filters),
    ),
  );
}

export async function listTimesheetProjectsResultService(
  filters?: TimesheetProjectFilters,
): Promise<TimesheetProjectListResult> {
  const items = await listTimesheetProjectsService(filters);
  return buildTimesheetProjectListResult(items);
}

export async function getTimesheetProjectByIdService(
  id: string,
): Promise<TimesheetProject> {
  const item = await findTimesheetProjectById(id);

  if (!item) {
    throw new NotFoundError("Timesheet project not found.");
  }

  return item;
}

export async function getTimesheetProjectByCodeService(
  code: string,
): Promise<TimesheetProject> {
  const item = await findTimesheetProjectByCode(code);

  if (!item) {
    throw new NotFoundError("Timesheet project not found.");
  }

  return item;
}

export async function createTimesheetProjectService(
  input: CreateTimesheetProjectInput,
): Promise<TimesheetProject> {
  const parsedInput = createTimesheetProjectSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new ValidationError("Invalid timesheet project input.");
  }

  const existing = await findTimesheetProjectByCode(parsedInput.data.code);

  if (existing) {
    throw new ValidationError("Project code already exists.");
  }

  const now = getNowIsoString();

  const item: TimesheetProject = {
    id: randomUUID(),
    code: parsedInput.data.code.trim(),
    name: parsedInput.data.name.trim(),
    category: parsedInput.data.category?.trim() || undefined,
    isChargeable: parsedInput.data.isChargeable ?? true,
    customerName: parsedInput.data.customerName?.trim() || undefined,
    source: parsedInput.data.source ?? "local",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await addTimesheetProject(item);

  return item;
}

export async function updateTimesheetProjectService(
  id: string,
  input: UpdateTimesheetProjectInput,
): Promise<TimesheetProject> {
  const parsedInput = updateTimesheetProjectSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new ValidationError("Invalid timesheet project update input.");
  }

  const existing = await getTimesheetProjectByIdService(id);
  const nextCode = parsedInput.data.code?.trim() ?? existing.code;

  if (nextCode !== existing.code) {
    const duplicate = await findTimesheetProjectByCode(nextCode);

    if (duplicate && duplicate.id !== existing.id) {
      throw new ValidationError("Project code already exists.");
    }
  }

  const updatedItem: TimesheetProject = {
    ...existing,
    code: nextCode,
    name: parsedInput.data.name?.trim() ?? existing.name,
    category:
      typeof parsedInput.data.category === "string"
        ? parsedInput.data.category.trim() || undefined
        : existing.category,
    isChargeable:
      typeof parsedInput.data.isChargeable === "boolean"
        ? parsedInput.data.isChargeable
        : existing.isChargeable,
    customerName:
      typeof parsedInput.data.customerName === "string"
        ? parsedInput.data.customerName.trim() || undefined
        : existing.customerName,
    isActive:
      typeof parsedInput.data.isActive === "boolean"
        ? parsedInput.data.isActive
        : existing.isActive,
    updatedAt: getNowIsoString(),
  };

  await updateTimesheetProject(updatedItem);

  return updatedItem;
}

export async function seedDemoTimesheetProjectsService(): Promise<TimesheetProject[]> {
  const existing = await listTimesheetProjects();

  if (existing.length > 0) {
    return sortProjects(existing);
  }

  const demoProjects = getDemoTimesheetProjects();

  await replaceTimesheetProjects(demoProjects);

  return sortProjects(demoProjects);
}

export async function syncExternalTimesheetProjectsService(
  externalProjects: ExternalTimesheetProject[],
): Promise<TimesheetProject[]> {
  const parsedProjects = externalProjects.map(
    (project: ExternalTimesheetProject) => {
      const parsed = externalTimesheetProjectSchema.safeParse(project);

      if (!parsed.success) {
        throw new ValidationError("Invalid external timesheet project payload.");
      }

      return parsed.data;
    },
  );

  const normalizedProjects = parsedProjects.map((project) =>
    mapExternalTimesheetProjectToInternal(project),
  );

  const deduplicatedMap = new Map<string, TimesheetProject>();

  for (const item of normalizedProjects) {
    deduplicatedMap.set(item.code.trim().toLowerCase(), item);
  }

  const finalItems = sortProjects([...deduplicatedMap.values()]);

  await replaceTimesheetProjects(finalItems);

  return finalItems;
}

export async function getTimesheetProjectPickerBootstrapService(
  filters?: TimesheetProjectFilters,
  monthKey?: string,
): Promise<TimesheetProjectListResult> {
  const resolvedMonthKey =
    typeof monthKey === "string" && /^\d{4}-\d{2}$/.test(monthKey)
      ? monthKey
      : new Date().toISOString().slice(0, 7);

  try {
    const kawariItems = await getKawariMonthlyTimesheetProjects(
      resolvedMonthKey,
    );
    const filtered = kawariItems.filter((item: TimesheetProject) =>
      matchesTimesheetProjectFilters(item, filters),
    );

    return buildTimesheetProjectListResult(filtered);
  } catch (error) {
    console.error("Falling back to local timesheet project bootstrap:", error);

    const existing = await listTimesheetProjects();

    if (existing.length === 0) {
      await seedDemoTimesheetProjectsService();
    }

    return listTimesheetProjectsResultService(filters);
  }
}