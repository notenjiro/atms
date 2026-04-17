import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import {
  getLeaveRequestByIdService,
  updateLeaveRequestService,
} from "@/modules/leave/leave.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const GET = withApiHandler(
  async (_req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const item = await getLeaveRequestByIdService(id);

    return ok({
      item,
    });
  },
);

export const PATCH = withApiHandler(
  async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const body = await req.json();

    const item = await updateLeaveRequestService(id, {
      leaveTypeId: body.leaveTypeId,
      startDate: body.startDate,
      endDate: body.endDate,
      startPortion: body.startPortion,
      endPortion: body.endPortion,
      remarks: body.remarks,
      status: body.status,
      approver: body.approver,
      approvedAt: body.approvedAt,
      rejectedAt: body.rejectedAt,
      rejectedReason: body.rejectedReason,
      cancelledAt: body.cancelledAt,
    });

    return ok({
      item,
    });
  },
);