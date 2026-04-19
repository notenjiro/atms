import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { submitTimesheetMonthBoardService } from "@/modules/timesheet/timesheet.service";

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const items = await submitTimesheetMonthBoardService({
    employeeId: body.employeeId,
    employeeName: body.employeeName,
    month: body.month,
    entries: body.entries,
  });

  return ok(
    {
      items,
    },
    "Timesheet month board submitted successfully.",
  );
});