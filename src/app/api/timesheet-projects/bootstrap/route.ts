import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { getTimesheetProjectPickerBootstrapService } from "@/modules/timesheet-projects/timesheet-project.service";
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
  const data = await getTimesheetProjectPickerBootstrapService(filters);

  return ok({
    ...data,
  });
});