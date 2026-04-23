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

type KawariProjectsResponse =
  | KawariProjectRaw[]
  | {
      projects?: KawariProjectRaw[];
      items?: KawariProjectRaw[];
      data?:
        | KawariProjectRaw[]
        | {
            projects?: KawariProjectRaw[];
            items?: KawariProjectRaw[];
          };
    };

type KawariClientsResponse =
  | KawariClientRaw[]
  | {
      clients?: KawariClientRaw[];
      items?: KawariClientRaw[];
      data?:
        | KawariClientRaw[]
        | {
            clients?: KawariClientRaw[];
            items?: KawariClientRaw[];
          };
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

function getSafeStartDate(raw: KawariProjectRaw): string {
  const candidates = [
    asTrimmedString(raw.start_date),
    asTrimmedString((raw as Record<string, unknown>).contract_start_date),
    asTrimmedString((raw as Record<string, unknown>).created),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeDate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "2000-01-01";
}

function getSafeEndDate(raw: KawariProjectRaw): string {
  const candidates = [
    asTrimmedString(raw.end_date),
    asTrimmedString((raw as Record<string, unknown>).contract_end_date),
    asTrimmedString((raw as Record<string, unknown>).updated),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeDate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "2099-12-31";
}

function normalizeClientDisplayName(client: KawariClientRaw | null): string {
  if (!client) {
    return "Unknown Client";
  }

  const thaiName = asTrimmedString(client.name_th);
  const englishName = asTrimmedString(client.name);

  return thaiName || englishName || "Unknown Client";
}

function extractProjectsPayload(
  payload: KawariProjectsResponse,
): KawariProjectRaw[] {
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
      projects?: KawariProjectRaw[];
      items?: KawariProjectRaw[];
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

function extractClientsPayload(
  payload: KawariClientsResponse,
): KawariClientRaw[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.clients)) {
    return payload.clients;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as {
      clients?: KawariClientRaw[];
      items?: KawariClientRaw[];
    };

    if (Array.isArray(nested.clients)) {
      return nested.clients;
    }

    if (Array.isArray(nested.items)) {
      return nested.items;
    }
  }

  return [];
}

function extractProjectCode(project: KawariProjectRaw): string {
  const directCode = asTrimmedString(project.project_code);

  if (directCode) {
    return directCode;
  }

  const altContractNo = asTrimmedString(
    (project as Record<string, unknown>).contract_no,
  );

  if (altContractNo) {
    return altContractNo;
  }

  const altCode = asTrimmedString(
    (project as Record<string, unknown>).code,
  );

  if (altCode) {
    return altCode;
  }

  return "";
}

function buildClientMap(
  clients: KawariClientRaw[],
): Map<string, KawariClientRaw> {
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

function normalizeProjectCandidate(
  project: KawariProjectRaw,
  client: KawariClientRaw | null,
): KawariProjectCandidate | null {
  const externalId = asTrimmedString(project._id);
  const projectCode = extractProjectCode(project);
  const projectName = asTrimmedString(project.name);
  const projectStatus = asTrimmedString(project.project_status);
  const projectType = asTrimmedString(project.project_type);
  const startDate = getSafeStartDate(project);
  const endDate = getSafeEndDate(project);
  const clientId = asTrimmedString(project.client_id);
  const primaryProjectManagerName = asTrimmedString(
    project.key_project_manager,
  );
  const primaryProjectManagerId = asTrimmedString(
    project.key_project_manager_id,
  );
  const projectManagerIds = Array.isArray(project.project_manager_ids)
    ? project.project_manager_ids
        .map((item: string) => asTrimmedString(item))
        .filter(Boolean)
    : [];
  const canEditInKawari = Boolean(project.can_edit);

  if (!externalId || !projectName) {
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

function buildPreviewDedupeKey(candidate: KawariProjectCandidate): string {
  return `${candidate.externalId.toLowerCase()}::${candidate.projectCode.toLowerCase()}`;
}

function dedupeCandidates(
  items: KawariProjectCandidate[],
): KawariProjectCandidate[] {
  const deduped = new Map<string, KawariProjectCandidate>();

  for (const item of items) {
    const key = buildPreviewDedupeKey(item);

    if (!deduped.has(key)) {
      deduped.set(key, item);
      continue;
    }

    const existing = deduped.get(key)!;

    deduped.set(key, {
      ...existing,
      projectCode: existing.projectCode || item.projectCode,
      projectStatus: existing.projectStatus || item.projectStatus,
      projectType: existing.projectType || item.projectType,
      startDate:
        existing.startDate !== "2000-01-01" ? existing.startDate : item.startDate,
      endDate:
        existing.endDate !== "2099-12-31" ? existing.endDate : item.endDate,
      customerName:
        existing.customerName !== "Unknown Client"
          ? existing.customerName
          : item.customerName,
      clientCode: existing.clientCode || item.clientCode,
      primaryProjectManagerName:
        existing.primaryProjectManagerName || item.primaryProjectManagerName,
      primaryProjectManagerId:
        existing.primaryProjectManagerId || item.primaryProjectManagerId,
      projectManagerIds: Array.from(
        new Set([...existing.projectManagerIds, ...item.projectManagerIds]),
      ),
      canEditInKawari: existing.canEditInKawari || item.canEditInKawari,
    });
  }

  return [...deduped.values()];
}

function findExistingProjectAccount(
  items: ProjectAccount[],
  candidate: KawariProjectCandidate,
): ProjectAccount | null {
  const externalIdKey = candidate.externalId.toLowerCase();
  const projectCodeKey = candidate.projectCode.toLowerCase();

  const byExternalId = items.find((item) => {
    const maybeExternalId = String(item.externalId ?? "")
      .trim()
      .toLowerCase();

    return maybeExternalId && maybeExternalId === externalIdKey;
  });

  if (byExternalId) {
    return byExternalId;
  }

  if (!projectCodeKey) {
    return null;
  }

  const byProjectCode = items.find((item) => {
    const itemContract = String(item.contractNo ?? "")
      .trim()
      .toLowerCase();

    return itemContract === projectCodeKey;
  });

  return byProjectCode ?? null;
}

function hasProjectChanges(
  existing: ProjectAccount,
  candidate: KawariProjectCandidate,
): boolean {
  return (
    existing.projectName !== candidate.projectName ||
    existing.customerName !== candidate.customerName ||
    existing.contractNo !== (candidate.projectCode || candidate.externalId) ||
    existing.startDate !== candidate.startDate ||
    existing.endDate !== candidate.endDate ||
    (existing.externalId ?? "") !== candidate.externalId ||
    (existing.clientId ?? "") !== candidate.clientId ||
    (existing.projectStatus ?? "") !== candidate.projectStatus ||
    (existing.projectType ?? "") !== candidate.projectType ||
    (existing.primaryProjectManagerName ?? "") !==
      candidate.primaryProjectManagerName ||
    (existing.primaryProjectManagerId ?? "") !==
      candidate.primaryProjectManagerId ||
    (existing.clientCode ?? "") !== candidate.clientCode ||
    JSON.stringify(existing.projectManagerIds ?? []) !==
      JSON.stringify(candidate.projectManagerIds)
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

  const rawProjects = extractProjectsPayload(projectsResponse.data);
  const rawClients = extractClientsPayload(clientsResponse.data);
  const clientMap = buildClientMap(rawClients);

  const candidates = dedupeCandidates(
    rawProjects
      .map((project) => {
        const clientId = asTrimmedString(project.client_id);
        const client = clientMap.get(clientId) ?? null;

        return normalizeProjectCandidate(project, client);
      })
      .filter(
        (item: KawariProjectCandidate | null): item is KawariProjectCandidate =>
          item !== null,
      ),
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
    (candidate) => {
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
      status:
        item.mapped.projectStatus.toUpperCase() === "INACTIVE"
          ? ("inactive" as const)
          : ("active" as const),
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
      await createProjectAccount(payload);
      createdCount += 1;
      continue;
    }

    if (item.action === "update" && item.existing) {
      await editProjectAccount(item.existing.id, payload);
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