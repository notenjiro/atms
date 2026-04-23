import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { saveTimesheetMonthBoardService } from "@/modules/timesheet/timesheet.service";

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const items = await saveTimesheetMonthBoardService({
    employeeId: body.employeeId,
    employeeName: body.employeeName,
    month: body.month,
    entries: body.entries,
    projectConfigs: body.projectConfigs,
  });

  return ok(
    {
      items,
    },
    "Timesheet month board saved successfully.",
  );
});
