import { randomUUID } from "node:crypto";

import type { EntityId } from "@/types/common";

export function generateId(): EntityId {
  return randomUUID();
}

export function generatePrefixedId(prefix: string): EntityId {
  const id = randomUUID().split("-")[0];
  return `${prefix}_${id}`;
}

export function generateSequentialCode(
  prefix: string,
  lastNumber: number,
  padLength = 5,
): string {
  const next = lastNumber + 1;
  const padded = String(next).padStart(padLength, "0");
  return `${prefix}${padded}`;
}

export function generateIssueNo(lastNumber: number): string {
  return generateSequentialCode("ISS-", lastNumber, 6);
}

export function generateProjectAccountCode(lastNumber: number): string {
  return generateSequentialCode("ACC-", lastNumber, 5);
}