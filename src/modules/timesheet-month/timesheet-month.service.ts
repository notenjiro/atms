import { ValidationError } from "@/lib/errors";

import {
  findTimesheetMonth,
  upsertTimesheetMonth,
} from "./timesheet-month.repository";
import type {
  TimesheetMonth,
  TimesheetMonthProjectConfig,
  TimesheetMonthStatus,
} from "./timesheet-month.types";

function getNowIsoString(): string {
  return new Date().toISOString();
}

function normalizeProjectConfigs(
  projectConfigs?: TimesheetMonthProjectConfig[],
): TimesheetMonthProjectConfig[] | undefined {
  if (!Array.isArray(projectConfigs)) {
    return undefined;
  }

  const normalized = projectConfigs
    .map((item) => ({
      projectRefId: item.projectRefId.trim(),
      projectCode: item.projectCode.trim(),
      projectName: item.projectName.trim(),
      selectedApproverId: item.selectedApproverId?.trim() || undefined,
      selectedApproverName: item.selectedApproverName?.trim() || undefined,
      approverOptions: Array.isArray(item.approverOptions)
        ? item.approverOptions
            .map((option) => ({
              id: option.id.trim(),
              name: option.name.trim(),
            }))
            .filter((option) => option.id && option.name)
        : [],
    }))
    .filter((item) => item.projectRefId && item.projectCode && item.projectName);

  return normalized;
}

function buildTimesheetMonthRecord(
  employeeId: string,
  month: string,
  status: TimesheetMonthStatus,
  existing?: TimesheetMonth | null,
  rejectedReason?: string,
  projectConfigs?: TimesheetMonthProjectConfig[],
): TimesheetMonth {
  const now = getNowIsoString();
  const nextProjectConfigs = normalizeProjectConfigs(projectConfigs) ?? existing?.projectConfigs;

  return {
    employeeId,
    month,
    status,
    projectConfigs: nextProjectConfigs,
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
  projectConfigs?: TimesheetMonthProjectConfig[],
): Promise<TimesheetMonth> {
  const existing = await findTimesheetMonth(employeeId, month);

  const record = buildTimesheetMonthRecord(
    employeeId,
    month,
    "draft",
    existing,
    undefined,
    projectConfigs,
  );

  return upsertTimesheetMonth(record);
}

export async function submitTimesheetMonthService(
  employeeId: string,
  month: string,
  projectConfigs?: TimesheetMonthProjectConfig[],
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
    undefined,
    projectConfigs,
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
