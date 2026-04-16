import type { BaseEntity, AppRole, RecordStatus } from "@/types/common";

export interface User extends BaseEntity {
  email: string;
  passwordHash: string;
  fullName: string;
  role: AppRole;
  status: RecordStatus;
  phone?: string;
}

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  status: RecordStatus;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: SafeUser;
  token?: string;
}

export interface SessionData {
  userId: string;
  email: string;
  role: AppRole;
  fullName: string;
}

export interface AuthContext {
  user: SafeUser;
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
  };
}