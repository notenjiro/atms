import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { approveTimesheetMonthBoardService } from "@/modules/timesheet/timesheet.service";

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const items = await approveTimesheetMonthBoardService({
    employeeId: body.employeeId,
    month: body.month,
  });

  return ok(
    {
      items,
    },
    "Timesheet month approved successfully.",
  );
});