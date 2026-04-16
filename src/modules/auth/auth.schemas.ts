import { z } from "zod";

export const appRoleSchema = z.enum(["admin", "manager", "support", "viewer"]);
export const recordStatusSchema = z.enum(["active", "inactive"]);

export const loginRequestSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().trim().email(),
  passwordHash: z.string().min(1),
  fullName: z.string().trim().min(1),
  role: appRoleSchema,
  status: recordStatusSchema,
  phone: z.string().trim().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const usersFileSchema = z.array(userSchema);

export type LoginRequestInput = z.infer<typeof loginRequestSchema>;
export type UserSchemaInput = z.infer<typeof userSchema>;