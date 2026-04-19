import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import {
  createTimesheetProjectService,
  listTimesheetProjectsResultService,
} from "@/modules/timesheet-projects/timesheet-project.service";
import type {
  TimesheetProjectCategory,
  TimesheetProjectFilters,
} from "@/modules/timesheet-projects/timesheet-project.types";

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

function buildTimesheetProjectFilters(
  searchParams: URLSearchParams,
): TimesheetProjectFilters {
  return {
    search: getStringParam(searchParams, "search"),
    category: getStringParam(searchParams, "category") as
      | TimesheetProjectCategory
      | undefined,
    isChargeable: getBooleanParam(searchParams, "isChargeable"),
    isActive: getBooleanParam(searchParams, "isActive"),
  };
}

export const GET = withApiHandler(async (req: NextRequest) => {
  const filters = buildTimesheetProjectFilters(req.nextUrl.searchParams);
  const result = await listTimesheetProjectsResultService(filters);

  return ok(result);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const item = await createTimesheetProjectService({
    code: body.code,
    name: body.name,
    category: body.category,
    isChargeable: body.isChargeable,
    customerName: body.customerName,
    source: body.source,
  });

  return ok(
    {
      item,
    },
    "Timesheet project created successfully.",
    201,
  );
});