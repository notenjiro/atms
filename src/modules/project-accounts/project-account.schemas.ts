import { z } from "zod";

export const projectAccountStatusSchema = z.enum([
  "active",
  "expired",
  "draft",
  "inactive",
  "done",
]);

export const projectAccountAlertChannelSchema = z.enum(["email", "sms"]);

export const projectAccountAlertRecipientSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Recipient name is required."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid recipient email address."),
});

export const projectAccountAlertSettingsSchema = z.object({
  enabled: z.boolean(),
  daysBeforeExpiry: z
    .number()
    .int("Days before expiry must be a whole number.")
    .min(0, "Days before expiry cannot be negative."),
  channels: z.array(projectAccountAlertChannelSchema),
  recipients: z.array(projectAccountAlertRecipientSchema),
});

export const projectAccountSchema = z.object({
  id: z.string().min(1),
  code: z.string().trim().min(1),
  projectName: z.string().trim().min(1, "Project name is required."),
  customerName: z.string().trim().min(1, "Customer name is required."),
  contractNo: z.string().trim().min(1, "Contract number is required."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  allocatedManDays: z
    .number()
    .min(0, "Allocated man-days cannot be negative."),
  usedManDays: z.number().min(0, "Used man-days cannot be negative."),
  remainingManDays: z.number(),
  status: projectAccountStatusSchema,
  note: z.string().trim().optional(),
  alertSettings: projectAccountAlertSettingsSchema,
  archivedAt: z.string().min(1).nullish(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),

  // Kawari mapping fields
  externalId: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  clientCode: z.string().trim().optional(),
  projectStatus: z.string().trim().optional(),
  projectType: z.string().trim().optional(),
  primaryProjectManagerName: z.string().trim().optional(),
  primaryProjectManagerId: z.string().trim().optional(),
  projectManagerIds: z.array(z.string().trim()).optional(),
  canEditInKawari: z.boolean().optional(),

  // Kawari detail fields
  overrideTotalResourceMandays: z.number().optional(),
  totalManDays: z.number().optional(),
  projectServiceContractPrice: z.number().optional(),
  projectOtherServiceContractPrice: z.number().optional(),
});

export const createProjectAccountSchema = z
  .object({
    projectName: z.string().trim().min(1, "Project name is required."),
    customerName: z.string().trim().min(1, "Customer name is required."),
    contractNo: z.string().trim().min(1, "Contract number is required."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    allocatedManDays: z
      .number()
      .min(0, "Allocated man-days cannot be negative."),
    usedManDays: z
      .number()
      .min(0, "Used man-days cannot be negative.")
      .optional(),
    note: z.string().trim().optional(),
    alertSettings: projectAccountAlertSettingsSchema.partial().optional(),

    // Kawari mapping fields
    externalId: z.string().trim().optional(),
    clientId: z.string().trim().optional(),
    clientCode: z.string().trim().optional(),
    projectStatus: z.string().trim().optional(),
    projectType: z.string().trim().optional(),
    primaryProjectManagerName: z.string().trim().optional(),
    primaryProjectManagerId: z.string().trim().optional(),
    projectManagerIds: z.array(z.string().trim()).optional(),
    canEditInKawari: z.boolean().optional(),

    // Kawari detail fields
    overrideTotalResourceMandays: z.number().optional(),
    totalManDays: z.number().optional(),
    projectServiceContractPrice: z.number().optional(),
    projectOtherServiceContractPrice: z.number().optional(),

    status: projectAccountStatusSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }

    if (
      typeof value.usedManDays === "number" &&
      value.usedManDays > value.allocatedManDays
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usedManDays"],
        message: "Used man-days cannot exceed allocated man-days.",
      });
    }
  });

export const updateProjectAccountSchema = z
  .object({
    projectName: z.string().trim().min(1, "Project name is required.").optional(),
    customerName: z.string().trim().min(1, "Customer name is required.").optional(),
    contractNo: z.string().trim().min(1, "Contract number is required.").optional(),
    startDate: z.string().min(1, "Start date is required.").optional(),
    endDate: z.string().min(1, "End date is required.").optional(),
    allocatedManDays: z
      .number()
      .min(0, "Allocated man-days cannot be negative.")
      .optional(),
    usedManDays: z
      .number()
      .min(0, "Used man-days cannot be negative.")
      .optional(),
    remainingManDays: z.number().optional(),
    status: projectAccountStatusSchema.optional(),
    note: z.string().trim().optional(),
    alertSettings: projectAccountAlertSettingsSchema.optional(),
    archivedAt: z.string().min(1).nullish().optional(),

    // Kawari mapping fields
    externalId: z.string().trim().optional(),
    clientId: z.string().trim().optional(),
    clientCode: z.string().trim().optional(),
    projectStatus: z.string().trim().optional(),
    projectType: z.string().trim().optional(),
    primaryProjectManagerName: z.string().trim().optional(),
    primaryProjectManagerId: z.string().trim().optional(),
    projectManagerIds: z.array(z.string().trim()).optional(),
    canEditInKawari: z.boolean().optional(),

    // Kawari detail fields
    overrideTotalResourceMandays: z.number().optional(),
    totalManDays: z.number().optional(),
    projectServiceContractPrice: z.number().optional(),
    projectOtherServiceContractPrice: z.number().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  });

export const projectAccountsFileSchema = z.object({
  items: z.array(projectAccountSchema),
});

export type ProjectAccountSchemaInput = z.infer<typeof projectAccountSchema>;
export type CreateProjectAccountSchemaInput = z.infer<
  typeof createProjectAccountSchema
>;
export type UpdateProjectAccountSchemaInput = z.infer<
  typeof updateProjectAccountSchema
>;