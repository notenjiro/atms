import path from "node:path";
import fs from "node:fs/promises";

import {
  serviceTicketsFileSchema,
  serviceTicketImportsFileSchema,
} from "./service-ticket.schemas";

import type {
  ServiceTicket,
  ServiceTicketImportBatch,
  ServiceTicketsFile,
  ServiceTicketImportsFile,
} from "./service-ticket.types";

const DATA_DIR = path.join(process.cwd(), "data");
const TICKETS_FILE = path.join(DATA_DIR, "service-tickets.json");
const IMPORTS_FILE = path.join(DATA_DIR, "service-ticket-imports.json");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return null;
    }

    throw err;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function readTicketsFile(): Promise<ServiceTicketsFile> {
  const raw = await readJsonFile<ServiceTicketsFile>(TICKETS_FILE);

  if (!raw) {
    return { items: [] };
  }

  const parsed = serviceTicketsFileSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(
      "Invalid service-tickets.json format",
      parsed.error.flatten().fieldErrors,
    );
    return { items: [] };
  }

  return parsed.data;
}

async function readImportsFile(): Promise<ServiceTicketImportsFile> {
  const raw = await readJsonFile<ServiceTicketImportsFile>(IMPORTS_FILE);

  if (!raw) {
    return { batches: [] };
  }

  const parsed = serviceTicketImportsFileSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(
      "Invalid service-ticket-imports.json format",
      parsed.error.flatten().fieldErrors,
    );
    return { batches: [] };
  }

  return parsed.data;
}

export async function listServiceTickets(): Promise<ServiceTicket[]> {
  const file = await readTicketsFile();

  return file.items;
}

export async function saveServiceTickets(
  items: ServiceTicket[],
): Promise<void> {
  await writeJsonFile<ServiceTicketsFile>(TICKETS_FILE, {
    items,
  });
}

export async function listServiceTicketImports(): Promise<
  ServiceTicketImportBatch[]
> {
  const file = await readImportsFile();

  return file.batches;
}

export async function saveServiceTicketImports(
  batches: ServiceTicketImportBatch[],
): Promise<void> {
  await writeJsonFile<ServiceTicketImportsFile>(IMPORTS_FILE, {
    batches,
  });
}

function getServiceTicketUniqueKey(item: ServiceTicket): string {
  return `${item.ticketNo.trim().toLowerCase()}::${item.ticketType}`;
}

function stringifyComparableTicket(item: ServiceTicket): string {
  const comparable = {
    source: item.source,
    sourceFileName: item.sourceFileName,
    sourceSheetName: item.sourceSheetName,
    sourceTemplate: item.sourceTemplate,
    sourceRowNumber: item.sourceRowNumber,

    ticketNo: item.ticketNo,
    ticketType: item.ticketType,
    taskNo: item.taskNo,

    title: item.title,
    shortDescription: item.shortDescription,
    description: item.description,
    closeNotes: item.closeNotes,
    rootCause: item.rootCause,
    nonChargeReason: item.nonChargeReason,

    company: item.company,
    location: item.location,
    requestedBy: item.requestedBy,
    assignedTo: item.assignedTo,
    responsibleGroup: item.responsibleGroup,
    responsibleTo: item.responsibleTo,
    assignmentGroup: item.assignmentGroup,
    owner: item.owner,

    projectCode: item.projectCode,
    projectName: item.projectName,
    projectAccountId: item.projectAccountId,
    matchStatus: item.matchStatus,

    priority: item.priority,
    state: item.state,
    status: item.status,
    module: item.module,
    subModule: item.subModule,
    taskType: item.taskType,
    category: item.category,
    problemType: item.problemType,
    changeType: item.changeType,
    skill: item.skill,

    openedAt: item.openedAt,
    createdAt: item.createdAt,
    closedAt: item.closedAt,
    resolvedAt: item.resolvedAt,
    billableDate: item.billableDate,
    cabDate: item.cabDate,
    uatDate: item.uatDate,

    billableHours: item.billableHours,
    billableManDays: item.billableManDays,

    raw: item.raw,
  };

  return JSON.stringify(comparable);
}

/**
 * Upsert logic:
 * - ticketNo + ticketType = unique key
 * - new key = create
 * - existing key with changed data = update, keeping original id
 * - existing key with same data = skip
 * - duplicate rows inside the same import = latest row wins
 */
export function upsertServiceTickets(
  existing: ServiceTicket[],
  incoming: ServiceTicket[],
): {
  merged: ServiceTicket[];
  created: number;
  updated: number;
  skipped: number;
} {
  const existingMap = new Map<string, ServiceTicket>();

  for (const item of existing) {
    existingMap.set(getServiceTicketUniqueKey(item), item);
  }

  const incomingMap = new Map<string, ServiceTicket>();

  for (const item of incoming) {
    incomingMap.set(getServiceTicketUniqueKey(item), item);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const incomingItem of incomingMap.values()) {
    const key = getServiceTicketUniqueKey(incomingItem);
    const existingItem = existingMap.get(key);

    if (!existingItem) {
      existingMap.set(key, incomingItem);
      created += 1;
      continue;
    }

    const isSame =
      stringifyComparableTicket(existingItem) ===
      stringifyComparableTicket(incomingItem);

    if (isSame) {
      skipped += 1;
      continue;
    }

    existingMap.set(key, {
      ...existingItem,
      ...incomingItem,
      id: existingItem.id,
    });

    updated += 1;
  }

  return {
    merged: Array.from(existingMap.values()),
    created,
    updated,
    skipped,
  };
}