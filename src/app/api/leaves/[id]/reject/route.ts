import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { rejectLeaveRequestService } from "@/modules/leave/leave.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const POST = withApiHandler(
  async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const body = await req.json();

    const item = await rejectLeaveRequestService(id, body.rejectedReason, {
      name: body.approverName,
      email: body.approverEmail,
    });

    return ok({
      item,
    });
  },
);