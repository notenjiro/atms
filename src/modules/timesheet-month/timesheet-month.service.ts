import { ValidationError } from "@/lib/errors";

import {
  findTimesheetMonth,
  upsertTimesheetMonth,
} from "./timesheet-month.repository";
import type {
  TimesheetMonth,
  TimesheetMonthStatus,
} from "./timesheet-month.types";

function getNowIsoString(): string {
  return new Date().toISOString();
}

function buildTimesheetMonthRecord(
  employeeId: string,
  month: string,
  status: TimesheetMonthStatus,
  existing?: TimesheetMonth | null,
  rejectedReason?: string,
): TimesheetMonth {
  const now = getNowIsoString();

  return {
    employeeId,
    month,
    status,
    submittedAt:
      status === "submitted"
        ? existing?.submittedAt ?? now
        : existing?.submittedAt,
    approvedAt:
      status === "approved"
        ? now
        : status === "submitted" || status === "rejected" || status === "draft"
          ? undefined
          : existing?.approvedAt,
    rejectedReason:
      status === "rejected"
        ? rejectedReason?.trim() || existing?.rejectedReason
        : undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function getTimesheetMonthStatusService(
  employeeId: string,
  month: string,
): Promise<TimesheetMonth | null> {
  return findTimesheetMonth(employeeId, month);
}

export async function saveTimesheetMonthDraftService(
  employeeId: string,
  month: string,
): Promise<TimesheetMonth> {
  const existing = await findTimesheetMonth(employeeId, month);

  const record = buildTimesheetMonthRecord(
    employeeId,
    month,
    "draft",
    existing,
  );

  return upsertTimesheetMonth(record);
}

export async function submitTimesheetMonthService(
  employeeId: string,
  month: string,
): Promise<TimesheetMonth> {
  const existing = await findTimesheetMonth(employeeId, month);

  if (existing?.status === "approved") {
    throw new ValidationError("Approved months cannot be submitted again.");
  }

  const record = buildTimesheetMonthRecord(
    employeeId,
    month,
    "submitted",
    existing,
  );

  return upsertTimesheetMonth(record);
}

export async function approveTimesheetMonthService(
  employeeId: string,
  month: string,
): Promise<TimesheetMonth> {
  const existing = await findTimesheetMonth(employeeId, month);

  if (!existing || existing.status !== "submitted") {
    throw new ValidationError(
      "Only submitted timesheet months can be approved.",
    );
  }

  const record = buildTimesheetMonthRecord(
    employeeId,
    month,
    "approved",
    existing,
  );

  return upsertTimesheetMonth(record);
}

export async function rejectTimesheetMonthService(
  employeeId: string,
  month: string,
  rejectedReason: string,
): Promise<TimesheetMonth> {
  const existing = await findTimesheetMonth(employeeId, month);

  if (!existing || existing.status !== "submitted") {
    throw new ValidationError(
      "Only submitted timesheet months can be rejected.",
    );
  }

  if (!rejectedReason.trim()) {
    throw new ValidationError("Rejected reason is required.");
  }

  const record = buildTimesheetMonthRecord(
    employeeId,
    month,
    "rejected",
    existing,
    rejectedReason,
  );

  return upsertTimesheetMonth(record);
}

export async function getTimesheetMonthService(
  employeeId: string,
  month: string,
): Promise<TimesheetMonth | null> {
  return findTimesheetMonth(employeeId, month);
}