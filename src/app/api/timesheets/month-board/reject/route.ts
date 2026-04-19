import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { rejectTimesheetMonthBoardService } from "@/modules/timesheet/timesheet.service";

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const items = await rejectTimesheetMonthBoardService({
    employeeId: body.employeeId,
    month: body.month,
    reason: body.reason,
  });

  return ok(
    {
      items,
    },
    "Timesheet month rejected successfully.",
  );
});