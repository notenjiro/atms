import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { approveTimesheetMonthService } from "@/modules/timesheet-month/timesheet-month.service";

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const item = await approveTimesheetMonthService(
    body.employeeId,
    body.month,
  );

  return ok({
    item,
  });
});