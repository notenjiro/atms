import { randomUUID } from "node:crypto";

import { ValidationError } from "@/lib/errors";
import { upsertServiceNowIssuesBulkService } from "@/modules/issues/issue.service";
import { listProjectAccounts } from "@/modules/project-accounts/project-account.repository";
import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

import { serviceTicketImportInputSchema } from "./service-ticket.schemas";
import {
  listServiceTicketImports,
  listServiceTickets,
  saveServiceTicketImports,
  saveServiceTickets,
  upsertServiceTickets,
} from "./service-ticket.repository";
import { mapServiceTicketToIssueSyncInput } from "./service-ticket-to-issue.mapper";
import type {
  ServiceTicket,
  ServiceTicketFilters,
  ServiceTicketImportBatch,
  ServiceTicketImportInput,
  ServiceTicketImportResult,
  ServiceTicketImportStatus,
  ServiceTicketImportTemplate,
  ServiceTicketProjectSummary,
  ServiceTicketType,
} from "./service-ticket.types";

type RawValue = string | number | boolean | null | Date;
type RawRow = Record<string, RawValue>;

const HOURS_PER_MAN_DAY = 8;

function nowIsoDateTime(): string {
  return new Date().toISOString();
}

function normalizeText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_\-./()]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeTicketNo(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, " ");
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();

    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function normalizeOptional(value: unknown): string | undefined {
  const text = normalizeText(value);
  return text || undefined;
}

function normalizeDateValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  const raw = normalizeText(value);

  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return raw;
}

function getRowValue(row: RawRow, candidates: string[]): RawValue {
  const normalizedMap = new Map<string, RawValue>();

  for (const [key, value] of Object.entries(row)) {
    normalizedMap.set(normalizeKey(key), value);
  }

  for (const candidate of candidates) {
    const value = normalizedMap.get(normalizeKey(candidate));

    if (value !== undefined && value !== null && normalizeText(value) !== "") {
      return value;
    }
  }

  return null;
}

function detectTicketType(
  template: ServiceTicketImportTemplate,
  row: RawRow,
): ServiceTicketType {
  if (template === "incident-summary") {
    return "incident";
  }

  if (template === "service-request-summary") {
    return "request";
  }

  if (template === "change-request-summary") {
    return "change";
  }

  const ticketNo = normalizeTicketNo(
    getRowValue(row, ["Number", "Ticket No", "Ticket", "Task", "Task No"]),
  ).toLowerCase();

  if (ticketNo.startsWith("inc")) {
    return "incident";
  }

  if (ticketNo.startsWith("chg") || ticketNo.startsWith("crq")) {
    return "change";
  }

  if (ticketNo.startsWith("ritm") || ticketNo.startsWith("req")) {
    return "request";
  }

  return "task";
}

function getTicketNo(row: RawRow): string {
  return normalizeTicketNo(
    getRowValue(row, [
      "Number",
      "Ticket No",
      "Ticket Number",
      "Task",
      "Task No",
      "Request",
      "Incident",
      "Change",
      "Change Request",
    ]),
  );
}

function getProjectCode(row: RawRow): string {
  return normalizeText(
    getRowValue(row, [
      "Project Code",
      "ProjectCode",
      "Project",
      "Contract No",
      "Contract No.",
      "Contract Number",
      "Customer Project Code",
      "Project Account",
    ]),
  );
}

function getProjectName(row: RawRow): string | undefined {
  return normalizeOptional(
    getRowValue(row, [
      "Project Name",
      "Project",
      "Title",
      "Short description",
      "Short Description",
    ]),
  );
}

function getTitle(row: RawRow): string {
  const title = normalizeText(
    getRowValue(row, [
      "Title",
      "Short description",
      "Short Description",
      "Description",
      "Summary",
      "Subject",
    ]),
  );

  if (title) {
    return title;
  }

  return getTicketNo(row);
}

function getBillableHours(row: RawRow): number {
  const directHours = normalizeNumber(
    getRowValue(row, [
      "Billable (Hrs)",
      "Billable Hrs",
      "Billable Hours",
      "Billable Hour",
      "Billable Hour(s)",
      "Billable",
      "Hours",
      "Hour",
      "Actual Hours",
      "Effort Hours",
      "Effort",
    ]),
  );

  if (directHours > 0) {
    return directHours;
  }

  const manDays = normalizeNumber(
    getRowValue(row, [
      "Man-day",
      "Man Day",
      "Manday",
      "Man-days",
      "Man Days",
      "MD",
      "Billable Man-days",
      "Billable Man Days",
    ]),
  );

  if (manDays > 0) {
    return manDays * HOURS_PER_MAN_DAY;
  }

  return 0;
}

function isClosedStatus(status: string | undefined): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.toLowerCase();

  return (
    normalized.includes("closed") ||
    normalized.includes("resolved") ||
    normalized.includes("complete") ||
    normalized.includes("cancelled")
  );
}

function buildProjectAccountMap(
  projectAccounts: ProjectAccount[],
): Map<string, ProjectAccount> {
  const map = new Map<string, ProjectAccount>();

  for (const item of projectAccounts) {
    const keys = [
      item.contractNo,
      item.code,
      item.externalId,
      item.projectName,
    ].filter(Boolean);

    for (const key of keys) {
      const normalized = normalizeText(key).toLowerCase();

      if (!normalized) {
        continue;
      }

      map.set(normalized, item);
    }
  }

  return map;
}

function matchProjectAccount(
  rowProjectCode: string,
  rowProjectName: string | undefined,
  projectAccountMap: Map<string, ProjectAccount>,
): ProjectAccount | null {
  const projectCode = rowProjectCode.trim().toLowerCase();

  if (projectCode && projectAccountMap.has(projectCode)) {
    return projectAccountMap.get(projectCode) ?? null;
  }

  const projectName = normalizeText(rowProjectName).toLowerCase();

  if (projectName && projectAccountMap.has(projectName)) {
    return projectAccountMap.get(projectName) ?? null;
  }

  return null;
}

function normalizeRawRow(
  row: RawRow,
): Record<string, string | number | boolean | null> {
  const normalized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      normalized[key] = value.toISOString();
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      normalized[key] = value;
      continue;
    }

    normalized[key] = normalizeText(value);
  }

  return normalized;
}

function buildServiceTicket(params: {
  row: RawRow;
  rowNumber: number;
  input: ServiceTicketImportInput;
  batchId: string;
  importedAt: string;
  projectAccountMap: Map<string, ProjectAccount>;
}): ServiceTicket | null {
  const { row, rowNumber, input, batchId, importedAt, projectAccountMap } =
    params;

  const ticketNo = getTicketNo(row);

  if (!ticketNo) {
    return null;
  }

  const ticketType = detectTicketType(input.template, row);
  const projectCode = getProjectCode(row);
  const projectName = getProjectName(row);
  const matchedProjectAccount = matchProjectAccount(
    projectCode,
    projectName,
    projectAccountMap,
  );

  const billableHours = getBillableHours(row);
  const billableManDays = billableHours / HOURS_PER_MAN_DAY;
  const status = normalizeOptional(
    getRowValue(row, ["Status", "State", "Ticket Status"]),
  );

  return {
    id: randomUUID(),

    source: "servicenow-import",
    sourceFileName: input.fileName,
    sourceSheetName: input.sheetName || "Sheet1",
    sourceTemplate: input.template,
    sourceRowNumber: rowNumber,
    importBatchId: batchId,
    importedAt,

    ticketNo,
    ticketType,
    taskNo: normalizeOptional(
      getRowValue(row, [
        "Task",
        "Task No",
        "Task Number",
        "Number.1",
        "Number_1",
      ]),
    ),

    title: getTitle(row),
    shortDescription: normalizeOptional(
      getRowValue(row, ["Short description", "Short Description"]),
    ),
    description: normalizeOptional(getRowValue(row, ["Description"])),
    closeNotes: normalizeOptional(
      getRowValue(row, ["Close notes", "Close Notes", "Resolution notes"]),
    ),
    rootCause: normalizeOptional(
      getRowValue(row, ["Root Cause", "Root cause"]),
    ),
    nonChargeReason: normalizeOptional(
      getRowValue(row, ["Non-Charge Reason", "Non Charge Reason"]),
    ),

    company: normalizeOptional(getRowValue(row, ["Company", "Customer"])),
    location: normalizeOptional(getRowValue(row, ["Location"])),
    requestedBy: normalizeOptional(
      getRowValue(row, ["Requested by", "Requested By", "Requester"]),
    ),
    assignedTo: normalizeOptional(
      getRowValue(row, [
        "Assigned to.1",
        "Assigned To.1",
        "Assigned to_1",
        "Assigned To_1",
        "Assigned to",
        "Assigned To",
        "Assignee",
      ]),
    ),
    responsibleGroup: normalizeOptional(
      getRowValue(row, ["Responsible group", "Responsible Group"]),
    ),
    responsibleTo: normalizeOptional(
      getRowValue(row, ["Responsible to", "Responsible To"]),
    ),
    assignmentGroup: normalizeOptional(
      getRowValue(row, ["Assignment group", "Assignment Group"]),
    ),
    owner: normalizeOptional(
      getRowValue(row, ["Owner", "Project Owner", "Code Owner"]),
    ),

    projectCode,
    projectName,
    projectAccountId: matchedProjectAccount?.id,
    matchStatus: matchedProjectAccount ? "matched" : "unmatched",

    priority: normalizeOptional(getRowValue(row, ["Priority"])),
    state: normalizeOptional(getRowValue(row, ["State"])),
    status,
    module: normalizeOptional(getRowValue(row, ["Module"])),
    subModule: normalizeOptional(
      getRowValue(row, ["Sub-Module", "Sub Module"]),
    ),
    taskType: normalizeOptional(getRowValue(row, ["Task Type", "Type"])),
    category: normalizeOptional(getRowValue(row, ["Category"])),
    problemType: normalizeOptional(
      getRowValue(row, ["Problem Type", "Problem type"]),
    ),
    changeType: normalizeOptional(
      getRowValue(row, ["Change Type", "Change type"]),
    ),
    skill: normalizeOptional(getRowValue(row, ["Skill"])),

    openedAt: normalizeDateValue(
      getRowValue(row, ["Opened", "Opened At", "Open Date"]),
    ),
    createdAt: normalizeDateValue(getRowValue(row, ["Created", "Created At"])),
    closedAt: normalizeDateValue(getRowValue(row, ["Closed", "Closed At"])),
    resolvedAt: normalizeDateValue(
      getRowValue(row, ["Resolved", "Resolved At"]),
    ),
    billableDate: normalizeDateValue(
      getRowValue(row, ["Billable Date", "Billable date"]),
    ),
    cabDate: normalizeDateValue(getRowValue(row, ["CAB Date", "CAB date"])),
    uatDate: normalizeDateValue(getRowValue(row, ["UAT Date", "UAT date"])),

    billableHours,
    billableManDays,

    raw: normalizeRawRow(row),
  };
}

function matchesFilters(
  item: ServiceTicket,
  filters?: ServiceTicketFilters,
): boolean {
  if (!filters) {
    return true;
  }

  if (
    filters.projectAccountId &&
    item.projectAccountId !== filters.projectAccountId
  ) {
    return false;
  }

  if (
    filters.projectCode &&
    item.projectCode.toLowerCase() !== filters.projectCode.toLowerCase()
  ) {
    return false;
  }

  if (
    filters.ticketType &&
    filters.ticketType !== "all" &&
    item.ticketType !== filters.ticketType
  ) {
    return false;
  }

  if (
    filters.matchStatus &&
    filters.matchStatus !== "all" &&
    item.matchStatus !== filters.matchStatus
  ) {
    return false;
  }

  if (filters.search) {
    const keyword = filters.search.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    const haystack = [
      item.ticketNo,
      item.title,
      item.projectCode,
      item.projectName,
      item.company,
      item.assignedTo,
      item.owner,
      item.status,
      item.state,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  }

  return true;
}

function createEmptyProjectSummary(
  projectCode: string,
): ServiceTicketProjectSummary {
  return {
    projectCode,
    totalTickets: 0,
    incidentTickets: 0,
    requestTickets: 0,
    changeTickets: 0,
    taskTickets: 0,
    openTickets: 0,
    closedTickets: 0,
    billableHours: 0,
    billableManDays: 0,
    unmatchedTickets: 0,
  };
}

async function syncServiceTicketsToIssues(params: {
  tickets: ServiceTicket[];
}): Promise<{
  created: number;
  updated: number;
  skipped: number;
}> {
  const { tickets } = params;

  const inputs = tickets
    .filter((ticket) => ticket.ticketNo.trim())
    .map((ticket) => mapServiceTicketToIssueSyncInput(ticket));

  const result = await upsertServiceNowIssuesBulkService(inputs);

  return {
    created: result.created,
    updated: result.updated,
    skipped: result.skipped + (tickets.length - inputs.length),
  };
}

export async function importServiceTickets(
  input: ServiceTicketImportInput,
): Promise<ServiceTicketImportResult> {
  const parsed = serviceTicketImportInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError("Invalid service ticket import payload.");
  }

  const cleanInput = parsed.data;
  const batchId = randomUUID();
  const importedAt = nowIsoDateTime();
  const projectAccounts = await listProjectAccounts();
  const projectAccountMap = buildProjectAccountMap(projectAccounts);

  const warnings: string[] = [];
  const incoming: ServiceTicket[] = [];

  let skippedRows = 0;

  cleanInput.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const ticket = buildServiceTicket({
      row,
      rowNumber,
      input: cleanInput,
      batchId,
      importedAt,
      projectAccountMap,
    });

    if (!ticket) {
      skippedRows += 1;
      warnings.push(
        `Row ${rowNumber}: skipped because ticket number is empty.`,
      );
      return;
    }

    if (!ticket.projectCode) {
      warnings.push(`Row ${rowNumber}: project code is empty.`);
    }

    if (ticket.matchStatus === "unmatched") {
      warnings.push(
        `Row ${rowNumber}: project code "${ticket.projectCode || "-"}" did not match any project account.`,
      );
    }

    incoming.push(ticket);
  });

  const existing = await listServiceTickets();
  const upserted = upsertServiceTickets(existing, incoming);

  await saveServiceTickets(upserted.merged);

  const issueSync = await syncServiceTicketsToIssues({
    tickets: incoming,
  });

  const unmatchedRows = incoming.filter(
    (item) => item.matchStatus === "unmatched",
  ).length;

  const status: ServiceTicketImportStatus =
    warnings.length > 0 ? "completed-with-warning" : "completed";

  const batch: ServiceTicketImportBatch = {
    id: batchId,
    source: "servicenow-import",
    sourceFileName: cleanInput.fileName,
    sourceTemplate: cleanInput.template,
    importedAt,
    status,

    totalRows: cleanInput.rows.length,
    importedRows: incoming.length,
    createdRows: upserted.created + issueSync.created,
    updatedRows: upserted.updated + issueSync.updated,
    skippedRows: skippedRows + upserted.skipped + issueSync.skipped,
    unmatchedRows,

    warnings,
  };

  const existingBatches = await listServiceTicketImports();
  await saveServiceTicketImports([batch, ...existingBatches]);

  return {
    batch,
    items: incoming,
  };
}

export async function listServiceTicketsService(
  filters?: ServiceTicketFilters,
): Promise<ServiceTicket[]> {
  const items = await listServiceTickets();

  return items
    .filter((item) => matchesFilters(item, filters))
    .sort((a, b) => {
      const openedCompare = (b.openedAt ?? "").localeCompare(a.openedAt ?? "");

      if (openedCompare !== 0) {
        return openedCompare;
      }

      return b.importedAt.localeCompare(a.importedAt);
    });
}

export async function listServiceTicketImportsService(): Promise<
  ServiceTicketImportBatch[]
> {
  return listServiceTicketImports();
}

export async function getUnmatchedServiceTicketsService(): Promise<
  ServiceTicket[]
> {
  return listServiceTicketsService({
    matchStatus: "unmatched",
  });
}

export async function getServiceTicketProjectSummaries(): Promise<
  ServiceTicketProjectSummary[]
> {
  const items = await listServiceTickets();
  const map = new Map<string, ServiceTicketProjectSummary>();

  for (const item of items) {
    const key =
      item.projectAccountId || item.projectCode || `unmatched:${item.ticketNo}`;

    if (!map.has(key)) {
      const summary = createEmptyProjectSummary(item.projectCode || "-");
      summary.projectAccountId = item.projectAccountId;
      summary.projectName = item.projectName;
      map.set(key, summary);
    }

    const summary = map.get(key)!;

    summary.totalTickets += 1;
    summary.billableHours += item.billableHours;
    summary.billableManDays += item.billableManDays;

    if (item.ticketType === "incident") {
      summary.incidentTickets += 1;
    } else if (item.ticketType === "request") {
      summary.requestTickets += 1;
    } else if (item.ticketType === "change") {
      summary.changeTickets += 1;
    } else {
      summary.taskTickets += 1;
    }

    if (isClosedStatus(item.status) || isClosedStatus(item.state)) {
      summary.closedTickets += 1;
    } else {
      summary.openTickets += 1;
    }

    if (item.matchStatus === "unmatched") {
      summary.unmatchedTickets += 1;
    }
  }

  return [...map.values()].sort((a, b) =>
    a.projectCode.localeCompare(b.projectCode),
  );
}

export async function getServiceTicketSummaryForProjectAccount(
  projectAccountId: string,
): Promise<ServiceTicketProjectSummary | null> {
  const summaries = await getServiceTicketProjectSummaries();

  return (
    summaries.find(
      (summary) => summary.projectAccountId === projectAccountId,
    ) ?? null
  );
}
