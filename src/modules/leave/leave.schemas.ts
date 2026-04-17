import { z } from "zod";

export const leaveTypeIdSchema = z.enum([
  "L001",
  "L003",
  "L004",
  "L005",
  "L006",
  "L007",
  "L008",
  "L009",
  "L010",
  "L011",
  "L012",
  "L013",
  "L014",
]);

export const leaveStatusSchema = z.enum([
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const leaveApprovalRoleSchema = z.enum(["lead"]);

export const leaveQuotaSourceSchema = z.enum(["manual", "api"]);

export const leaveDayPortionSchema = z.enum(["full", "half-am", "half-pm"]);

export const leaveViewTabSchema = z.enum([
  "dashboard",
  "calendar",
  "request-history",
]);

export const leaveTypeDefinitionSchema = z.object({
  id: leaveTypeIdSchema,
  name: z.string().trim().min(1, "Leave type name is required."),
  colorToken: z.string().trim().min(1, "Color token is required."),
  quotaDays: z
    .number()
    .min(0, "Quota days cannot be negative.")
    .optional(),
  allowNegativeBalance: z.boolean().optional(),
  quotaSource: leaveQuotaSourceSchema,
  sortOrder: z.number().int("Sort order must be a whole number."),
});

export const leaveQuotaBalanceSchema = z.object({
  leaveTypeId: leaveTypeIdSchema,
  entitledDays: z
    .number()
    .min(0, "Entitled days cannot be negative.")
    .optional(),
  carriedForwardDays: z
    .number()
    .min(0, "Carried forward days cannot be negative.")
    .optional(),
  usedDays: z.number().min(0, "Used days cannot be negative."),
  pendingDays: z.number().min(0, "Pending days cannot be negative."),
  remainingDays: z.number().optional(),
  asOfDate: z.string().min(1, "As-of date is required.").optional(),
  source: leaveQuotaSourceSchema,
  updatedAt: z.string().min(1, "Updated at is required.").optional(),
});

export const leaveApproverSchema = z.object({
  role: leaveApprovalRoleSchema,
  name: z.string().trim().min(1, "Approver name is required.").optional(),
  email: z
    .string()
    .trim()
    .email("Please enter a valid approver email address.")
    .optional(),
});

export const leaveRequestSchema = z
  .object({
    id: z.string().min(1),
    employeeId: z.string().trim().min(1, "Employee ID is required."),
    employeeName: z.string().trim().min(1, "Employee name is required."),
    leaveTypeId: leaveTypeIdSchema,
    leaveTypeName: z.string().trim().min(1, "Leave type name is required."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    startPortion: leaveDayPortionSchema,
    endPortion: leaveDayPortionSchema,
    totalDays: z.number().positive("Total days must be greater than zero."),
    remarks: z.string().trim().optional(),
    status: leaveStatusSchema,
    approver: leaveApproverSchema,
    submittedAt: z.string().min(1, "Submitted at is required."),
    approvedAt: z.string().min(1).optional(),
    rejectedAt: z.string().min(1).optional(),
    rejectedReason: z.string().trim().min(1).optional(),
    cancelledAt: z.string().min(1).optional(),
    createdAt: z.string().min(1, "Created at is required."),
    updatedAt: z.string().min(1, "Updated at is required."),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }

    if (value.totalDays <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalDays"],
        message: "Total days must be greater than zero.",
      });
    }

    if (value.status === "approved" && !value.approvedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approvedAt"],
        message: "Approved date is required when status is approved.",
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

    if (value.status === "cancelled" && !value.cancelledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancelledAt"],
        message: "Cancelled date is required when status is cancelled.",
      });
    }
  });

export const createLeaveRequestSchema = z
  .object({
    leaveTypeId: leaveTypeIdSchema,
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    startPortion: leaveDayPortionSchema.optional(),
    endPortion: leaveDayPortionSchema.optional(),
    remarks: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }
  });

export const updateLeaveRequestSchema = z
  .object({
    leaveTypeId: leaveTypeIdSchema.optional(),
    startDate: z.string().min(1, "Start date is required.").optional(),
    endDate: z.string().min(1, "End date is required.").optional(),
    startPortion: leaveDayPortionSchema.optional(),
    endPortion: leaveDayPortionSchema.optional(),
    remarks: z.string().trim().optional(),
    status: leaveStatusSchema.optional(),
    approver: leaveApproverSchema.optional(),
    approvedAt: z.string().min(1).optional(),
    rejectedAt: z.string().min(1).optional(),
    rejectedReason: z.string().trim().min(1).optional(),
    cancelledAt: z.string().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  })
  .superRefine((value, ctx) => {
    if (
      typeof value.startDate === "string" &&
      typeof value.endDate === "string" &&
      value.endDate < value.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }

    if (value.status === "approved" && !value.approvedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approvedAt"],
        message: "Approved date is required when status is approved.",
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

    if (value.status === "cancelled" && !value.cancelledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancelledAt"],
        message: "Cancelled date is required when status is cancelled.",
      });
    }
  });

export const leaveRequestFiltersSchema = z.object({
  employeeId: z.string().trim().min(1).optional(),
  status: leaveStatusSchema.optional(),
  leaveTypeId: leaveTypeIdSchema.optional(),
  fromDate: z.string().min(1).optional(),
  toDate: z.string().min(1).optional(),
  approverRole: leaveApprovalRoleSchema.optional(),
});

export const leaveDashboardCardSchema = z.object({
  leaveTypeId: leaveTypeIdSchema,
  leaveTypeName: z.string().trim().min(1, "Leave type name is required."),
  entitledDays: z
    .number()
    .min(0, "Entitled days cannot be negative.")
    .optional(),
  carriedForwardDays: z
    .number()
    .min(0, "Carried forward days cannot be negative.")
    .optional(),
  usedDays: z.number().min(0, "Used days cannot be negative."),
  pendingDays: z.number().min(0, "Pending days cannot be negative."),
  remainingDays: z.number().optional(),
  source: leaveQuotaSourceSchema,
});

export const leaveCalendarEventSchema = z.object({
  id: z.string().min(1),
  leaveRequestId: z.string().min(1),
  employeeId: z.string().trim().min(1, "Employee ID is required."),
  employeeName: z.string().trim().min(1, "Employee name is required."),
  leaveTypeId: leaveTypeIdSchema,
  leaveTypeName: z.string().trim().min(1, "Leave type name is required."),
  date: z.string().min(1, "Date is required."),
  status: leaveStatusSchema,
  portion: leaveDayPortionSchema,
});

export const leaveDashboardSummarySchema = z.object({
  cards: z.array(leaveDashboardCardSchema),
  pendingApprovalCount: z
    .number()
    .int("Pending approval count must be a whole number.")
    .min(0, "Pending approval count cannot be negative."),
  approvedThisMonthDays: z
    .number()
    .min(0, "Approved this month days cannot be negative."),
  remainingAnnualLeaveDays: z.number().optional(),
  remainingSickLeaveDays: z.number().optional(),
  remainingPersonalLeaveDays: z.number().optional(),
});

export const leaveFileSchema = z.object({
  requests: z.array(leaveRequestSchema),
  quotaBalances: z.array(leaveQuotaBalanceSchema),
});

export type LeaveTypeDefinitionSchemaInput = z.infer<
  typeof leaveTypeDefinitionSchema
>;
export type LeaveQuotaBalanceSchemaInput = z.infer<
  typeof leaveQuotaBalanceSchema
>;
export type LeaveApproverSchemaInput = z.infer<typeof leaveApproverSchema>;
export type LeaveRequestSchemaInput = z.infer<typeof leaveRequestSchema>;
export type CreateLeaveRequestSchemaInput = z.infer<
  typeof createLeaveRequestSchema
>;
export type UpdateLeaveRequestSchemaInput = z.infer<
  typeof updateLeaveRequestSchema
>;
export type LeaveRequestFiltersSchemaInput = z.infer<
  typeof leaveRequestFiltersSchema
>;
export type LeaveDashboardCardSchemaInput = z.infer<
  typeof leaveDashboardCardSchema
>;
export type LeaveCalendarEventSchemaInput = z.infer<
  typeof leaveCalendarEventSchema
>;
export type LeaveDashboardSummarySchemaInput = z.infer<
  typeof leaveDashboardSummarySchema
>;
export type LeaveFileSchemaInput = z.infer<typeof leaveFileSchema>;