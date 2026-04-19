import { z } from "zod";

export const timesheetProjectSourceSchema = z.enum(["local", "customer-api"]);

export const timesheetProjectCategorySchema = z.enum([
  "all",
  "chargeable",
  "non-charge",
]);

export const timesheetProjectSchema = z.object({
  id: z.string().min(1, "Timesheet project ID is required."),
  code: z.string().trim().min(1, "Project code is required."),
  name: z.string().trim().min(1, "Project name is required."),
  category: z.string().trim().optional(),
  isChargeable: z.boolean(),
  customerName: z.string().trim().optional(),
  source: timesheetProjectSourceSchema,
  isActive: z.boolean(),
  createdAt: z.string().min(1, "Created at is required."),
  updatedAt: z.string().min(1, "Updated at is required."),
});

export const timesheetProjectFiltersSchema = z.object({
  search: z.string().trim().optional(),
  category: timesheetProjectCategorySchema.optional(),
  isChargeable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const timesheetProjectListResultSchema = z.object({
  items: z.array(timesheetProjectSchema),
  total: z
    .number()
    .int("Total must be a whole number.")
    .min(0, "Total cannot be negative."),
});

export const timesheetProjectsFileSchema = z.object({
  items: z.array(timesheetProjectSchema),
});

export const createTimesheetProjectSchema = z.object({
  code: z.string().trim().min(1, "Project code is required."),
  name: z.string().trim().min(1, "Project name is required."),
  category: z.string().trim().optional(),
  isChargeable: z.boolean().optional(),
  customerName: z.string().trim().optional(),
  source: timesheetProjectSourceSchema.optional(),
});

export const updateTimesheetProjectSchema = z
  .object({
    code: z.string().trim().min(1, "Project code is required.").optional(),
    name: z.string().trim().min(1, "Project name is required.").optional(),
    category: z.string().trim().optional(),
    isChargeable: z.boolean().optional(),
    customerName: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  });

export const externalTimesheetProjectSchema = z.object({
  projectCode: z.string().trim().min(1, "External project code is required."),
  projectName: z.string().trim().min(1, "External project name is required."),
  category: z.string().trim().optional(),
  chargeType: z.enum(["chargeable", "non-charge"]).optional(),
  customerName: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type TimesheetProjectSchemaInput = z.infer<
  typeof timesheetProjectSchema
>;
export type TimesheetProjectFiltersSchemaInput = z.infer<
  typeof timesheetProjectFiltersSchema
>;
export type TimesheetProjectListResultSchemaInput = z.infer<
  typeof timesheetProjectListResultSchema
>;
export type TimesheetProjectsFileSchemaInput = z.infer<
  typeof timesheetProjectsFileSchema
>;
export type CreateTimesheetProjectSchemaInput = z.infer<
  typeof createTimesheetProjectSchema
>;
export type UpdateTimesheetProjectSchemaInput = z.infer<
  typeof updateTimesheetProjectSchema
>;
export type ExternalTimesheetProjectSchemaInput = z.infer<
  typeof externalTimesheetProjectSchema
>;