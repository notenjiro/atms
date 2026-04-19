import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { rejectTimesheetEntryService } from "@/modules/timesheet/timesheet.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const POST = withApiHandler(
  async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const body = await req.json();

    const item = await rejectTimesheetEntryService(id, body.rejectedReason, {
      name: body.approverName,
      email: body.approverEmail,
    });

    return ok({
      item,
    });
  },
);