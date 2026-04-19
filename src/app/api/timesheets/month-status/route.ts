import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { getTimesheetMonthService } from "@/modules/timesheet-month/timesheet-month.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const employeeId = req.nextUrl.searchParams.get("employeeId");
  const month = req.nextUrl.searchParams.get("month");

  if (!employeeId || !month) {
    throw new Error("employeeId and month are required.");
  }

  const item = await getTimesheetMonthService(employeeId, month);

  return ok({
    item,
  });
});