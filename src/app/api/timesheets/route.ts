import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import {
  createTimesheetEntryService,
  listTimesheetEntriesService,
} from "@/modules/timesheet/timesheet.service";
import type {
  TimesheetEntryFilters,
  TimesheetEntrySource,
  TimesheetStatus,
} from "@/modules/timesheet/timesheet.types";

function getStringParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key)?.trim();

  return value ? value : undefined;
}

function getBooleanParam(
  searchParams: URLSearchParams,
  key: string,
): boolean | undefined {
  const rawValue = searchParams.get(key)?.trim().toLowerCase();

  if (!rawValue) {
    return undefined;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  return undefined;
}

function buildTimesheetFilters(
  searchParams: URLSearchParams,
): TimesheetEntryFilters {
  return {
    employeeId: getStringParam(searchParams, "employeeId"),
    status: getStringParam(searchParams, "status") as TimesheetStatus | undefined,
    source: getStringParam(searchParams, "source") as
      | TimesheetEntrySource
      | undefined,
    isBillable: getBooleanParam(searchParams, "isBillable"),
    fromDate: getStringParam(searchParams, "fromDate"),
    toDate: getStringParam(searchParams, "toDate"),
    projectAccountId: getStringParam(searchParams, "projectAccountId"),
  };
}

export const GET = withApiHandler(async (req: NextRequest) => {
  const filters = buildTimesheetFilters(req.nextUrl.searchParams);
  const items = await listTimesheetEntriesService(filters);

  return ok({
    items,
  });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const item = await createTimesheetEntryService(
    {
      employeeId: body.employeeId,
      employeeName: body.employeeName,
    },
    {
      workDate: body.workDate,
      hours: body.hours,
      unit: body.unit,
      taskName: body.taskName,
      description: body.description,
      projectAccountId: body.projectAccountId,
      projectAccountName: body.projectAccountName,
      customerName: body.customerName,
      isBillable: body.isBillable,
      source: body.source,
    },
  );

  return ok(
    {
      item,
    },
    "Timesheet entry created successfully.",
    201,
  );
});