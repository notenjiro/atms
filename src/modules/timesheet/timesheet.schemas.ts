import { z } from "zod";

export const timesheetStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

export const timesheetEntrySourceSchema = z.enum(["manual", "api"]);

export const timesheetUnitSchema = z.enum(["hour", "day"]);

export const timesheetApprovalRoleSchema = z.enum(["lead"]);

export const timesheetViewModeSchema = z.enum([
  "my-timesheets",
  "team-approval",
]);

export const timesheetEntrySchema = z
  .object({
    id: z.string().min(1, "Timesheet entry ID is required."),
    employeeId: z.string().trim().min(1, "Employee ID is required."),
    employeeName: z.string().trim().min(1, "Employee name is required."),
    workDate: z.string().min(1, "Work date is required."),
    hours: z
      .number()
      .min(0, "Hours cannot be negative.")
      .max(24, "Hours cannot exceed 24 per day."),
    unit: timesheetUnitSchema,
    taskName: z.string().trim().min(1, "Task name is required."),
    description: z.string().trim().optional(),
    projectAccountId: z.string().trim().optional(),
    projectAccountName: z.string().trim().optional(),
    customerName: z.string().trim().optional(),
    isBillable: z.boolean(),
    source: timesheetEntrySourceSchema,
    status: timesheetStatusSchema,
    approverRole: timesheetApprovalRoleSchema.optional(),
    submittedAt: z.string().min(1).optional(),
    approvedAt: z.string().min(1).optional(),
    rejectedAt: z.string().min(1).optional(),
    rejectedReason: z.string().trim().min(1).optional(),
    createdAt: z.string().min(1, "Created at is required."),
    updatedAt: z.string().min(1, "Updated at is required."),
  })
  .superRefine((value, ctx) => {
    if (value.status === "submitted" && !value.submittedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["submittedAt"],
        message: "Submitted date is required when status is submitted.",
      });
    }

    if (value.status === "approved" && !value.approvedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approvedAt"],
        message: "Approved date is required when status is approved.",
      });
    }

    if (value.status === "approved" && value.approverRole !== "lead") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approverRole"],
        message: "Approver role must be lead when status is approved.",
      });
    }

    if (value.status === "rejected" && !value.rejectedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectedAt"],
        message: "Rejected date is required when status is rejected.",
      });
    }

    if (value.status === "rejected" && !value.rejectedReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectedReason"],
        message: "Rejected reason is required when status is rejected.",
      });
    }

    if (value.status === "rejected" && value.approverRole !== "lead") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approverRole"],
        message: "Approver role must be lead when status is rejected.",
      });
    }
  });

export const createTimesheetEntrySchema = z.object({
  workDate: z.string().min(1, "Work date is required."),
  hours: z
    .number()
    .min(0, "Hours cannot be negative.")
    .max(24, "Hours cannot exceed 24 per day."),
  unit: timesheetUnitSchema.optional(),
  taskName: z.string().trim().min(1, "Task name is required."),
  description: z.string().trim().optional(),
  projectAccountId: z.string().trim().optional(),
  projectAccountName: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  isBillable: z.boolean().optional(),
  source: timesheetEntrySourceSchema.optional(),
});

export const updateTimesheetEntrySchema = z
  .object({
    workDate: z.string().min(1, "Work date is required.").optional(),
    hours: z
      .number()
      .min(0, "Hours cannot be negative.")
      .max(24, "Hours cannot exceed 24 per day.")
      .optional(),
    unit: timesheetUnitSchema.optional(),
    taskName: z.string().trim().min(1, "Task name is required.").optional(),
    description: z.string().trim().optional(),
    projectAccountId: z.string().trim().optional(),
    projectAccountName: z.string().trim().optional(),
    customerName: z.string().trim().optional(),
    isBillable: z.boolean().optional(),
    source: timesheetEntrySourceSchema.optional(),
    status: timesheetStatusSchema.optional(),
    approverRole: timesheetApprovalRoleSchema.optional(),
    submittedAt: z.string().min(1).optional(),
    approvedAt: z.string().min(1).optional(),
    rejectedAt: z.string().min(1).optional(),
    rejectedReason: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  })
  .superRefine((value, ctx) => {
    if (value.status === "submitted" && !value.submittedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["submittedAt"],
        message: "Submitted date is required when status is submitted.",
      });
    }

    if (value.status === "approved" && !value.approvedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approvedAt"],
        message: "Approved date is required when status is approved.",
      });
    }

    if (value.status === "approved" && value.approverRole !== "lead") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approverRole"],
        message: "Approver role must be lead when status is approved.",
      });
    }

    if (value.status === "rejected" && !value.rejectedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectedAt"],
        message: "Rejected date is required when status is rejected.",
      });
    }

    if (value.status === "rejected" && !value.rejectedReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectedReason"],
        message: "Rejected reason is required when status is rejected.",
      });
    }

    if (value.status === "rejected" && value.approverRole !== "lead") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approverRole"],
        message: "Approver role must be lead when status is rejected.",
      });
    }
  });

export const timesheetEntryFiltersSchema = z.object({
  employeeId: z.string().trim().min(1).optional(),
  status: timesheetStatusSchema.optional(),
  source: timesheetEntrySourceSchema.optional(),
  isBillable: z.boolean().optional(),
  fromDate: z.string().min(1).optional(),
  toDate: z.string().min(1).optional(),
  projectAccountId: z.string().trim().min(1).optional(),
});

export const timesheetDailySummarySchema = z.object({
  workDate: z.string().min(1, "Work date is required."),
  totalHours: z.number().min(0, "Total hours cannot be negative."),
  billableHours: z.number().min(0, "Billable hours cannot be negative."),
  nonBillableHours: z.number().min(0, "Non-billable hours cannot be negative."),
  entryCount: z
    .number()
    .int("Entry count must be a whole number.")
    .min(0, "Entry count cannot be negative."),
});

export const timesheetOverviewSummarySchema = z.object({
  totalHours: z.number().min(0, "Total hours cannot be negative."),
  billableHours: z.number().min(0, "Billable hours cannot be negative."),
  nonBillableHours: z.number().min(0, "Non-billable hours cannot be negative."),
  submittedCount: z
    .number()
    .int("Submitted count must be a whole number.")
    .min(0, "Submitted count cannot be negative."),
  approvedCount: z
    .number()
    .int("Approved count must be a whole number.")
    .min(0, "Approved count cannot be negative."),
  rejectedCount: z
    .number()
    .int("Rejected count must be a whole number.")
    .min(0, "Rejected count cannot be negative."),
  draftCount: z
    .number()
    .int("Draft count must be a whole number.")
    .min(0, "Draft count cannot be negative."),
});

export const timesheetApprovalSummarySchema = z.object({
  pendingCount: z
    .number()
    .int("Pending count must be a whole number.")
    .min(0, "Pending count cannot be negative."),
  approvedThisMonthCount: z
    .number()
    .int("Approved this month count must be a whole number.")
    .min(0, "Approved this month count cannot be negative."),
  rejectedThisMonthCount: z
    .number()
    .int("Rejected this month count must be a whole number.")
    .min(0, "Rejected this month count cannot be negative."),
});

export const timesheetBootstrapSchema = z.object({
  items: z.array(timesheetEntrySchema),
  dailySummaries: z.array(timesheetDailySummarySchema),
  overview: timesheetOverviewSummarySchema,
  approval: timesheetApprovalSummarySchema,
});

export const timesheetsFileSchema = z.object({
  items: z.array(timesheetEntrySchema),
});

export type TimesheetEntrySchemaInput = z.infer<typeof timesheetEntrySchema>;
export type CreateTimesheetEntrySchemaInput = z.infer<
  typeof createTimesheetEntrySchema
>;
export type UpdateTimesheetEntrySchemaInput = z.infer<
  typeof updateTimesheetEntrySchema
>;
export type TimesheetEntryFiltersSchemaInput = z.infer<
  typeof timesheetEntryFiltersSchema
>;
export type TimesheetDailySummarySchemaInput = z.infer<
  typeof timesheetDailySummarySchema
>;
export type TimesheetOverviewSummarySchemaInput = z.infer<
  typeof timesheetOverviewSummarySchema
>;
export type TimesheetApprovalSummarySchemaInput = z.infer<
  typeof timesheetApprovalSummarySchema
>;
export type TimesheetBootstrapSchemaInput = z.infer<
  typeof timesheetBootstrapSchema
>;
export type TimesheetsFileSchemaInput = z.infer<typeof timesheetsFileSchema>;