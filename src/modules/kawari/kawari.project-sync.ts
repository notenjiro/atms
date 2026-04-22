import { kawariConfig } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import {
  createProjectAccount,
  editProjectAccount,
} from "@/modules/project-accounts/project-account.service";
import { listProjectAccounts } from "@/modules/project-accounts/project-account.repository";
import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

import { kawariRequest } from "./kawari.client";
import type {
  KawariClientRaw,
  KawariProjectCandidate,
  KawariProjectRaw,
  KawariProjectSyncApplyResult,
  KawariProjectSyncPreview,
  KawariProjectSyncPreviewItem,
} from "./kawari.types";

type KawariProjectsResponse = {
  projects?: KawariProjectRaw[];
};

type KawariClientsResponse = {
  clients?: KawariClientRaw[];
};

function asTrimmedString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeDate(value: string): string {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeClientDisplayName(client: KawariClientRaw | null): string {
  if (!client) {
    return "Unknown Client";
  }

  const thaiName = asTrimmedString(client.name_th);
  const englishName = asTrimmedString(client.name);

  return thaiName || englishName || "Unknown Client";
}

function normalizeProjectCandidate(
  project: KawariProjectRaw,
  client: KawariClientRaw | null,
): KawariProjectCandidate | null {
  const externalId = asTrimmedString(project._id);
  const projectCode = asTrimmedString(project.project_code);
  const projectName = asTrimmedString(project.name);
  const projectStatus = asTrimmedString(project.project_status);
  const projectType = asTrimmedString(project.project_type);
  const startDate = normalizeDate(asTrimmedString(project.start_date));
  const endDate = normalizeDate(asTrimmedString(project.end_date));
  const clientId = asTrimmedString(project.client_id);
  const primaryProjectManagerName = asTrimmedString(
    project.key_project_manager,
  );
  const primaryProjectManagerId = asTrimmedString(project.key_project_manager_id);
  const projectManagerIds = Array.isArray(project.project_manager_ids)
    ? project.project_manager_ids
        .map((item: string) => asTrimmedString(item))
        .filter(Boolean)
    : [];
  const canEditInKawari = Boolean(project.can_edit);

  if (!externalId || !projectName || !startDate || !endDate) {
    return null;
  }

  return {
    externalId,
    projectCode,
    projectName,
    projectStatus,
    projectType,
    startDate,
    endDate,
    clientId,
    customerName: normalizeClientDisplayName(client),
    clientCode: asTrimmedString(client?.client_code),
    primaryProjectManagerName,
    primaryProjectManagerId,
    projectManagerIds,
    canEditInKawari,
    raw: project,
    clientRaw: client,
  };
}

function buildClientMap(clients: KawariClientRaw[]): Map<string, KawariClientRaw> {
  const map = new Map<string, KawariClientRaw>();

  for (const client of clients) {
    const id = asTrimmedString(client._id);

    if (!id) {
      continue;
    }

    map.set(id, client);
  }

  return map;
}

function findExistingProjectAccount(
  items: ProjectAccount[],
  candidate: KawariProjectCandidate,
): ProjectAccount | null {
  const externalIdKey = candidate.externalId.toLowerCase();
  const projectCodeKey = candidate.projectCode.toLowerCase();
  const projectNameKey = candidate.projectName.toLowerCase();
  const customerNameKey = candidate.customerName.toLowerCase();

  const byExternalId = items.find((item) => {
    const maybeExternalId = String(
      (item as Record<string, unknown>).externalId ?? "",
    )
      .trim()
      .toLowerCase();

    return maybeExternalId && maybeExternalId === externalIdKey;
  });

  if (byExternalId) {
    return byExternalId;
  }

  const byProjectCode = items.find((item) => {
    const itemContract = String(
      (item as Record<string, unknown>).contractNo ?? "",
    )
      .trim()
      .toLowerCase();

    return projectCodeKey && itemContract === projectCodeKey;
  });

  if (byProjectCode) {
    return byProjectCode;
  }

  const byNameAndCustomer = items.find((item) => {
    const itemProjectName = String(
      (item as Record<string, unknown>).projectName ?? "",
    )
      .trim()
      .toLowerCase();
    const itemCustomerName = String(
      (item as Record<string, unknown>).customerName ?? "",
    )
      .trim()
      .toLowerCase();

    return itemProjectName === projectNameKey && itemCustomerName === customerNameKey;
  });

  return byNameAndCustomer ?? null;
}

function hasProjectChanges(
  existing: ProjectAccount,
  candidate: KawariProjectCandidate,
): boolean {
  const maybeExternalId = String(
    (existing as Record<string, unknown>).externalId ?? "",
  ).trim();
  const maybeClientId = String(
    (existing as Record<string, unknown>).clientId ?? "",
  ).trim();
  const maybeProjectStatus = String(
    (existing as Record<string, unknown>).projectStatus ?? "",
  ).trim();
  const maybeProjectType = String(
    (existing as Record<string, unknown>).projectType ?? "",
  ).trim();
  const maybePrimaryPmName = String(
    (existing as Record<string, unknown>).primaryProjectManagerName ?? "",
  ).trim();
  const maybePrimaryPmId = String(
    (existing as Record<string, unknown>).primaryProjectManagerId ?? "",
  ).trim();
  const maybeClientCode = String(
    (existing as Record<string, unknown>).clientCode ?? "",
  ).trim();

  return (
    existing.projectName !== candidate.projectName ||
    existing.customerName !== candidate.customerName ||
    existing.contractNo !== candidate.projectCode ||
    existing.startDate !== candidate.startDate ||
    existing.endDate !== candidate.endDate ||
    maybeExternalId !== candidate.externalId ||
    maybeClientId !== candidate.clientId ||
    maybeProjectStatus !== candidate.projectStatus ||
    maybeProjectType !== candidate.projectType ||
    maybePrimaryPmName !== candidate.primaryProjectManagerName ||
    maybePrimaryPmId !== candidate.primaryProjectManagerId ||
    maybeClientCode !== candidate.clientCode
  );
}

async function fetchKawariProjectsAndClients(
  projectsPath?: string,
  clientsPath?: string,
): Promise<{
  projectsPath: string;
  clientsPath: string;
  rawProjects: KawariProjectRaw[];
  rawClients: KawariClientRaw[];
  candidates: KawariProjectCandidate[];
}> {
  const resolvedProjectsPath = projectsPath?.trim() || kawariConfig.projectsPath;
  const resolvedClientsPath = clientsPath?.trim() || kawariConfig.clientsPath;

  if (!resolvedProjectsPath) {
    throw new ValidationError("Kawari projects path is not configured.");
  }

  if (!resolvedClientsPath) {
    throw new ValidationError("Kawari clients path is not configured.");
  }

  const [projectsResponse, clientsResponse] = await Promise.all([
    kawariRequest<KawariProjectsResponse>({
      path: resolvedProjectsPath,
      method: "GET",
    }),
    kawariRequest<KawariClientsResponse>({
      path: resolvedClientsPath,
      method: "GET",
    }),
  ]);

  const rawProjects: KawariProjectRaw[] = Array.isArray(projectsResponse.data?.projects)
    ? projectsResponse.data.projects
    : [];
  const rawClients: KawariClientRaw[] = Array.isArray(clientsResponse.data?.clients)
    ? clientsResponse.data.clients
    : [];

  const clientMap = buildClientMap(rawClients);

  const candidates: KawariProjectCandidate[] = rawProjects
    .map((project: KawariProjectRaw) => {
      const clientId = asTrimmedString(project.client_id);
      const client = clientMap.get(clientId) ?? null;

      return normalizeProjectCandidate(project, client);
    })
    .filter(
      (item: KawariProjectCandidate | null): item is KawariProjectCandidate =>
        item !== null,
    );

  return {
    projectsPath: resolvedProjectsPath,
    clientsPath: resolvedClientsPath,
    rawProjects,
    rawClients,
    candidates,
  };
}

export async function previewKawariProjectAccountSync(input?: {
  projectsPath?: string;
  clientsPath?: string;
}): Promise<KawariProjectSyncPreview> {
  const [existingItems, fetched] = await Promise.all([
    listProjectAccounts(),
    fetchKawariProjectsAndClients(input?.projectsPath, input?.clientsPath),
  ]);

  const previewItems: KawariProjectSyncPreviewItem[] = fetched.candidates.map(
    (candidate: KawariProjectCandidate) => {
      const existing = findExistingProjectAccount(existingItems, candidate);

      if (!existing) {
        return {
          action: "create",
          reason: "No matching project account found in ATMS.",
          externalId: candidate.externalId,
          projectCode: candidate.projectCode,
          projectName: candidate.projectName,
          customerName: candidate.customerName,
          mapped: candidate,
          existing: null,
        };
      }

      if (!hasProjectChanges(existing, candidate)) {
        return {
          action: "skip",
          reason: "Project account already matches Kawari data.",
          externalId: candidate.externalId,
          projectCode: candidate.projectCode,
          projectName: candidate.projectName,
          customerName: candidate.customerName,
          mapped: candidate,
          existing,
        };
      }

      return {
        action: "update",
        reason: "Matching project account found and fields have changed.",
        externalId: candidate.externalId,
        projectCode: candidate.projectCode,
        projectName: candidate.projectName,
        customerName: candidate.customerName,
        mapped: candidate,
        existing,
      };
    },
  );

  const createCount = previewItems.filter((item) => item.action === "create").length;
  const updateCount = previewItems.filter((item) => item.action === "update").length;
  const skipCount = previewItems.filter((item) => item.action === "skip").length;

  return {
    sourceProjectsPath: fetched.projectsPath,
    sourceClientsPath: fetched.clientsPath,
    totalRawProjects: fetched.rawProjects.length,
    totalRawClients: fetched.rawClients.length,
    totalCandidates: fetched.candidates.length,
    createCount,
    updateCount,
    skipCount,
    items: previewItems,
  };
}

export async function applyKawariProjectAccountSync(input?: {
  projectsPath?: string;
  clientsPath?: string;
  limit?: number;
}): Promise<KawariProjectSyncApplyResult> {
  const preview = await previewKawariProjectAccountSync({
    projectsPath: input?.projectsPath,
    clientsPath: input?.clientsPath,
  });

  const applicableItems =
    typeof input?.limit === "number" && input.limit > 0
      ? preview.items.slice(0, input.limit)
      : preview.items;

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of applicableItems) {
    if (!item.mapped) {
      skippedCount += 1;
      continue;
    }

    if (item.action === "skip") {
      skippedCount += 1;
      continue;
    }

    const payload = {
      projectName: item.mapped.projectName,
      customerName: item.mapped.customerName,
      contractNo: item.mapped.projectCode || item.mapped.externalId,
      startDate: item.mapped.startDate,
      endDate: item.mapped.endDate,
      allocatedManDays: 0,
      usedManDays: 0,
      externalId: item.mapped.externalId,
      clientId: item.mapped.clientId,
      clientCode: item.mapped.clientCode,
      projectStatus: item.mapped.projectStatus,
      projectType: item.mapped.projectType,
      primaryProjectManagerName: item.mapped.primaryProjectManagerName,
      primaryProjectManagerId: item.mapped.primaryProjectManagerId,
      projectManagerIds: item.mapped.projectManagerIds,
      canEditInKawari: item.mapped.canEditInKawari,
    };

    if (item.action === "create") {
      await createProjectAccount(payload as never);
      createdCount += 1;
      continue;
    }

    if (item.action === "update" && item.existing) {
      await editProjectAccount(item.existing.id, payload as never);
      updatedCount += 1;
      continue;
    }

    skippedCount += 1;
  }

  return {
    sourceProjectsPath: preview.sourceProjectsPath,
    sourceClientsPath: preview.sourceClientsPath,
    createdCount,
    updatedCount,
    skippedCount,
    items: applicableItems,
  };
}