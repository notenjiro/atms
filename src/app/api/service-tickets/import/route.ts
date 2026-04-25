import * as XLSX from "xlsx";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { ValidationError } from "@/lib/errors";

import { importServiceTickets } from "@/modules/service-tickets/service-ticket.service";
import type { ServiceTicketImportTemplate } from "@/modules/service-tickets/service-ticket.types";

type RawValue = string | number | boolean | null;
type RawRow = Record<string, RawValue>;

function normalizeRawValue(value: unknown): RawValue {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function normalizeRawRow(row: Record<string, unknown>): RawRow {
  const normalized: RawRow = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[key] = normalizeRawValue(value);
  }

  return normalized;
}

function detectTemplateFromFileName(
  fileName: string,
): ServiceTicketImportTemplate {
  const normalized = fileName.toLowerCase();

  if (normalized.includes("incident")) {
    return "incident-summary";
  }

  if (
    normalized.includes("service request") ||
    normalized.includes("servicerequest") ||
    normalized.includes("request")
  ) {
    return "service-request-summary";
  }

  if (
    normalized.includes("change request") ||
    normalized.includes("changerequest") ||
    normalized.includes("change")
  ) {
    return "change-request-summary";
  }

  if (
    normalized.includes("monthly review") ||
    normalized.includes("project code owner") ||
    normalized.includes("project owner") ||
    normalized.includes("summary")
  ) {
    return "monthly-review-by-project-owner";
  }

  return "monthly-review-by-project-owner";
}

async function parseExcelFile(file: File): Promise<{
  sheetName: string;
  rows: RawRow[];
}> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new ValidationError("The uploaded Excel file has no sheets.");
  }

  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new ValidationError("Unable to read the first sheet.");
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw: true,
  });

  return {
    sheetName,
    rows: rawRows.map(normalizeRawRow),
  };
}

export const POST = withApiHandler(async (req: Request) => {
  const formData = await req.formData();

  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    throw new ValidationError("Please upload an Excel file.");
  }

  const explicitTemplate = formData.get("template");
  const template =
    typeof explicitTemplate === "string" && explicitTemplate.trim()
      ? (explicitTemplate.trim() as ServiceTicketImportTemplate)
      : detectTemplateFromFileName(fileValue.name);

  const parsed = await parseExcelFile(fileValue);

  const result = await importServiceTickets({
    fileName: fileValue.name,
    template,
    sheetName: parsed.sheetName,
    rows: parsed.rows,
  });

  return ok(
    {
      batch: result.batch,
      importedItems: result.items.length,
    },
    "ServiceNow report imported successfully.",
  );
});