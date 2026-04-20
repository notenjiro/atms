import { z } from "zod";

export const issueStatusSchema = z.enum([
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
  "cancelled",
]);

export const issuePrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const issueSourceSchema = z.enum([
  "manual",
  "servicenow",
  "email",
  "phone",
]);

export const issueSchema = z.object({
  id: z.string().min(1),
  issueNo: z.string().trim().min(1),
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().default(""),
  customerName: z.string().trim().min(1, "Customer name is required."),
  projectAccountId: z.string().trim().min(1).optional(),
  projectAccountCode: z.string().trim().min(1).optional(),
  projectAccountName: z.string().trim().min(1).optional(),
  status: issueStatusSchema,
  priority: issuePrioritySchema,
  source: issueSourceSchema,
  ownerName: z.string().trim().min(1).optional(),
  ownerEmail: z
    .string()
    .trim()
    .email("Please enter a valid owner email address.")
    .optional(),
  reporterId: z.string().trim().min(1),
  reporterName: z.string().trim().min(1),
  reporterEmail: z
    .string()
    .trim()
    .email("Please enter a valid reporter email address.")
    .optional(),
  externalTicketNo: z.string().trim().min(1).optional(),
  openedAt: z.string().min(1),
  resolvedAt: z.string().min(1).optional(),
  closedAt: z.string().min(1).optional(),
  cancelledAt: z.string().min(1).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const createIssueSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    description: z.string().trim().default(""),
    customerName: z.string().trim().optional(),
    projectAccountId: z.string().trim().optional(),
    priority: issuePrioritySchema,
    source: issueSourceSchema.optional(),
    ownerName: z.string().trim().optional(),
    ownerEmail: z
      .string()
      .trim()
      .email("Please enter a valid owner email address.")
      .optional(),
    externalTicketNo: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    const hasProjectAccountId = Boolean(value.projectAccountId?.trim());
    const hasCustomerName = Boolean(value.customerName?.trim());

    if (!hasProjectAccountId && !hasCustomerName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerName"],
        message: "Customer name is required when no project account is selected.",
      });
    }
  });

export const updateIssueSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").optional(),
    description: z.string().trim().optional(),
    customerName: z.string().trim().optional(),
    projectAccountId: z.string().trim().optional(),
    priority: issuePrioritySchema.optional(),
    status: issueStatusSchema.optional(),
    source: issueSourceSchema.optional(),
    ownerName: z.string().trim().optional(),
    ownerEmail: z
      .string()
      .trim()
      .email("Please enter a valid owner email address.")
      .optional(),
    externalTicketNo: z.string().trim().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  });

export const issuesFileSchema = z.object({
  items: z.array(issueSchema),
});

export type IssueSchemaInput = z.infer<typeof issueSchema>;
export type CreateIssueSchemaInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueSchemaInput = z.infer<typeof updateIssueSchema>;