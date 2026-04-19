import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import {
  deleteTimesheetEntryService,
  getTimesheetEntryByIdService,
  updateTimesheetEntryService,
} from "@/modules/timesheet/timesheet.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const GET = withApiHandler(
  async (_req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const item = await getTimesheetEntryByIdService(id);

    return ok({
      item,
    });
  },
);

export const PATCH = withApiHandler(
  async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const body = await req.json();

    const item = await updateTimesheetEntryService(id, {
      workDate: body.workDate,
      hours: body.hours,
      unit: body.unit,
      taskName: body.taskName,
      description: body.description,
      projectAccountId: body.projectAccountId,
      projectAccountName: body.projectAccountName,
      customerName: body.customerName,
      isBillable: body.isBillable,
      source: body.source,
      status: body.status,
      approverRole: body.approverRole,
      submittedAt: body.submittedAt,
      approvedAt: body.approvedAt,
      rejectedAt: body.rejectedAt,
      rejectedReason: body.rejectedReason,
    });

    return ok({
      item,
    });
  },
);

export const DELETE = withApiHandler(
  async (_req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    await deleteTimesheetEntryService(id);

    return ok({
      deleted: true,
    });
  },
);