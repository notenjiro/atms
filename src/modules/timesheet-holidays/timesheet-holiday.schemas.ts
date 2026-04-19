import { z } from "zod";

export const timesheetHolidaySchema = z.object({
  date: z.string(),
  name: z.string(),
  type: z.enum(["public", "substitute", "special", "company"]),
  isActive: z.boolean(),
  source: z.enum(["local", "api"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const timesheetHolidaysFileSchema = z.object({
  items: z.array(timesheetHolidaySchema),
});