import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { approveLeaveRequestService } from "@/modules/leave/leave.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const POST = withApiHandler(
  async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const item = await approveLeaveRequestService(id, {
      name: body.approverName,
      email: body.approverEmail,
    });

    return ok({
      item,
    });
  },
);