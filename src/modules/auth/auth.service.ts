import bcrypt from "bcryptjs";

import { nowIsoDateTime } from "@/lib/date";
import { UnauthorizedError } from "@/lib/errors";
import { generateId } from "@/lib/id";

import { addUser, findUserByEmail } from "./auth.repository";
import type { LoginRequest, SafeUser, User } from "./auth.types";
import { toSafeUser } from "./auth.types";

export async function authenticateUser(input: LoginRequest): Promise<SafeUser> {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  if (user.status !== "active") {
    throw new UnauthorizedError("This account is inactive.");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  return toSafeUser(user);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: User["role"];
  status?: User["status"];
  phone?: string;
}): Promise<SafeUser> {
  const now = nowIsoDateTime();

  const passwordHash = await hashPassword(input.password);

  const user: User = {
    id: generateId(),
    email: input.email.trim().toLowerCase(),
    passwordHash,
    fullName: input.fullName.trim(),
    role: input.role,
    status: input.status ?? "active",
    phone: input.phone?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const createdUser = await addUser(user);

  return toSafeUser(createdUser);
}

export async function bootstrapAdminUser(): Promise<{
  user: SafeUser;
  created: boolean;
}> {
  const defaultAdminEmail = "admin@test.com";
  const existingUser = await findUserByEmail(defaultAdminEmail);

  if (existingUser) {
    return {
      user: toSafeUser(existingUser),
      created: false,
    };
  }

  const createdUser = await createUser({
    email: defaultAdminEmail,
    password: "123456",
    fullName: "System Administrator",
    role: "admin",
    status: "active",
  });

  return {
    user: createdUser,
    created: true,
  };
}