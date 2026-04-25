import { z } from "zod";

export const serviceTicketSourceSchema = z.enum(["servicenow-import"]);

export const serviceTicketTypeSchema = z.enum([
  "incident",
  "request",
  "change",
  "task",
]);

export const serviceTicketImportTemplateSchema = z.enum([
  "incident-summary",
  "service-request-summary",
  "change-request-summary",
  "monthly-review-by-project-owner",
]);

export const serviceTicketImportStatusSchema = z.enum([
  "completed",
  "completed-with-warning",
]);

export const serviceTicketMatchStatusSchema = z.enum([
  "matched",
  "unmatched",
]);

export const serviceTicketRawValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const serviceTicketSchema = z.object({
  id: z.string().min(1),

  source: serviceTicketSourceSchema,
  sourceFileName: z.string().min(1),
  sourceSheetName: z.string().min(1),
  sourceTemplate: serviceTicketImportTemplateSchema,
  sourceRowNumber: z.number().int().min(1),
  importBatchId: z.string().min(1),
  importedAt: z.string().min(1),

  ticketNo: z.string().trim().min(1),
  ticketType: serviceTicketTypeSchema,
  taskNo: z.string().trim().optional(),

  title: z.string().trim(),
  shortDescription: z.string().trim().optional(),
  description: z.string().trim().optional(),
  closeNotes: z.string().trim().optional(),
  rootCause: z.string().trim().optional(),
  nonChargeReason: z.string().trim().optional(),

  company: z.string().trim().optional(),
  location: z.string().trim().optional(),
  requestedBy: z.string().trim().optional(),
  assignedTo: z.string().trim().optional(),
  responsibleGroup: z.string().trim().optional(),
  responsibleTo: z.string().trim().optional(),
  assignmentGroup: z.string().trim().optional(),
  owner: z.string().trim().optional(),

  projectCode: z.string().trim(),
  projectName: z.string().trim().optional(),
  projectAccountId: z.string().trim().optional(),
  matchStatus: serviceTicketMatchStatusSchema,

  priority: z.string().trim().optional(),
  state: z.string().trim().optional(),
  status: z.string().trim().optional(),
  module: z.string().trim().optional(),
  subModule: z.string().trim().optional(),
  taskType: z.string().trim().optional(),
  category: z.string().trim().optional(),
  problemType: z.string().trim().optional(),
  changeType: z.string().trim().optional(),
  skill: z.string().trim().optional(),

  openedAt: z.string().trim().optional(),
  createdAt: z.string().trim().optional(),
  closedAt: z.string().trim().optional(),
  resolvedAt: z.string().trim().optional(),
  billableDate: z.string().trim().optional(),
  cabDate: z.string().trim().optional(),
  uatDate: z.string().trim().optional(),

  billableHours: z.number().min(0),
  billableManDays: z.number().min(0),

  raw: z.record(z.string(), serviceTicketRawValueSchema),
});

export const serviceTicketImportBatchSchema = z.object({
  id: z.string().min(1),
  source: serviceTicketSourceSchema,
  sourceFileName: z.string().min(1),
  sourceTemplate: serviceTicketImportTemplateSchema,
  importedAt: z.string().min(1),
  status: serviceTicketImportStatusSchema,

  totalRows: z.number().int().min(0),
  importedRows: z.number().int().min(0),
  createdRows: z.number().int().min(0),
  updatedRows: z.number().int().min(0),
  skippedRows: z.number().int().min(0),
  unmatchedRows: z.number().int().min(0),

  warnings: z.array(z.string()),
});

export const serviceTicketsFileSchema = z.object({
  items: z.array(serviceTicketSchema),
});

export const serviceTicketImportsFileSchema = z.object({
  batches: z.array(serviceTicketImportBatchSchema),
});

export const serviceTicketImportInputSchema = z.object({
  fileName: z.string().trim().min(1),
  template: serviceTicketImportTemplateSchema,
  sheetName: z.string().trim().optional(),
  rows: z.array(z.record(z.string(), serviceTicketRawValueSchema)),
});

export type ServiceTicketSchemaInput = z.infer<typeof serviceTicketSchema>;
export type ServiceTicketImportBatchSchemaInput = z.infer<
  typeof serviceTicketImportBatchSchema
>;
export type ServiceTicketImportInputSchemaInput = z.infer<
  typeof serviceTicketImportInputSchema
>;