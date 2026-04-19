import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { approveTimesheetEntryService } from "@/modules/timesheet/timesheet.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const POST = withApiHandler(
  async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const item = await approveTimesheetEntryService(id, {
      name: body.approverName,
      email: body.approverEmail,
    });

    return ok({
      item,
    });
  },
);