import { randomUUID } from "node:crypto";

import { NotFoundError, ValidationError } from "@/lib/errors";

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

  if (typeof filters.isActive === "boolean" && item.isActive !== filters.isActive) {
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
    {
      id: randomUUID(),
      code: "C-2001-26-04-11",
      name: "Customer Support Retainer",
      category: "Support",
      isChargeable: true,
      customerName: "CMC Client A",
      source: "local",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      code: "C-2002-26-04-12",
      name: "Application Enhancement",
      category: "Project",
      isChargeable: true,
      customerName: "CMC Client B",
      source: "local",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      code: "NC-3001-26-04-01",
      name: "Internal Improvement",
      category: "Internal",
      isChargeable: false,
      customerName: "Internal",
      source: "local",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      code: "C-2003-26-04-15",
      name: "Monthly Report Delivery",
      category: "Reporting",
      isChargeable: true,
      customerName: "CMC Client C",
      source: "local",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export async function listTimesheetProjectsService(
  filters?: TimesheetProjectFilters,
): Promise<TimesheetProject[]> {
  const items = await listTimesheetProjects();

  return sortProjects(items.filter((item) => matchesTimesheetProjectFilters(item, filters)));
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
  const parsedProjects = externalProjects.map((project) => {
    const parsed = externalTimesheetProjectSchema.safeParse(project);

    if (!parsed.success) {
      throw new ValidationError("Invalid external timesheet project payload.");
    }

    return parsed.data;
  });

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
): Promise<TimesheetProjectListResult> {
  const existing = await listTimesheetProjects();

  if (existing.length === 0) {
    await seedDemoTimesheetProjectsService();
  }

  return listTimesheetProjectsResultService(filters);
}