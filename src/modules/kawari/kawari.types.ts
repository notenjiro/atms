import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

export type KawariAuthMode = "basic" | "login" | "token";

export type KawariHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type KawariRequestOptions = {
  path: string;
  method?: KawariHttpMethod;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type KawariResponse<T> = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
};

export type KawariHealthResult = {
  enabled: boolean;
  authMode: KawariAuthMode;
  baseUrlConfigured: boolean;
  credentialsConfigured: boolean;
  reachable: boolean;
  status: number | null;
  statusText: string | null;
  checkedPath: string;
};

export type KawariProjectRaw = {
  _id: string;
  project_status?: string;
  project_code?: string;
  project_type?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  client_id?: string;
  key_project_manager?: string;
  key_project_manager_id?: string;
  project_manager_ids?: string[];
  can_edit?: boolean;
  created?: string;
  [key: string]: unknown;
};

export type KawariClientRaw = {
  _id: string;
  is_active?: boolean;
  name?: string;
  name_th?: string;
  client_code?: string;
  [key: string]: unknown;
};

export type KawariProjectCandidate = {
  externalId: string;
  projectCode: string;
  projectName: string;
  projectStatus: string;
  projectType: string;
  startDate: string;
  endDate: string;
  clientId: string;
  customerName: string;
  clientCode: string;
  primaryProjectManagerName: string;
  primaryProjectManagerId: string;
  projectManagerIds: string[];
  canEditInKawari: boolean;
  raw: KawariProjectRaw;
  clientRaw: KawariClientRaw | null;
};

export type KawariProjectSyncPreviewItem = {
  action: "create" | "update" | "skip";
  reason: string;
  externalId: string;
  projectCode: string;
  projectName: string;
  customerName: string;
  mapped: KawariProjectCandidate | null;
  existing: ProjectAccount | null;
};

export type KawariProjectSyncPreview = {
  sourceProjectsPath: string;
  sourceClientsPath: string;
  totalRawProjects: number;
  totalRawClients: number;
  totalCandidates: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  items: KawariProjectSyncPreviewItem[];
};

export type KawariProjectSyncApplyResult = {
  sourceProjectsPath: string;
  sourceClientsPath: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  items: KawariProjectSyncPreviewItem[];
};