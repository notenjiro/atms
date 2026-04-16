import { ConflictError, NotFoundError } from "@/lib/errors";
import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";

import { usersFileSchema } from "./auth.schemas";
import type { User } from "./auth.types";

const DEFAULT_USERS: User[] = [];

export async function getAllUsers(): Promise<User[]> {
  const data = await readJsonFile<User[]>(dataPaths.users, DEFAULT_USERS);

  const parsed = usersFileSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Invalid users.json format", parsed.error.flatten().fieldErrors);
    return DEFAULT_USERS;
  }

  return parsed.data;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await getAllUsers();

  return users.find((user) => user.email.trim().toLowerCase() === normalizedEmail) ?? null;
}

export async function findUserById(userId: string): Promise<User | null> {
  const users = await getAllUsers();

  return users.find((user) => user.id === userId) ?? null;
}

export async function saveUsers(users: User[]): Promise<void> {
  await writeJsonFile<User[]>(dataPaths.users, users);
}

export async function addUser(newUser: User): Promise<User> {
  const users = await getAllUsers();

  const exists = users.some(
    (user) => user.email.trim().toLowerCase() === newUser.email.trim().toLowerCase(),
  );

  if (exists) {
    throw new ConflictError("A user with this email already exists.");
  }

  const nextUsers = [...users, newUser];

  await saveUsers(nextUsers);

  return newUser;
}

export async function updateUser(updatedUser: User): Promise<User> {
  const users = await getAllUsers();

  const index = users.findIndex((user) => user.id === updatedUser.id);

  if (index === -1) {
    throw new NotFoundError("User not found.");
  }

  const emailTakenByAnotherUser = users.some(
    (user) =>
      user.id !== updatedUser.id &&
      user.email.trim().toLowerCase() === updatedUser.email.trim().toLowerCase(),
  );

  if (emailTakenByAnotherUser) {
    throw new ConflictError("A user with this email already exists.");
  }

  users[index] = updatedUser;

  await saveUsers(users);

  return updatedUser;
}