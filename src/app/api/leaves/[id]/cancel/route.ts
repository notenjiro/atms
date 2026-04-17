import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { cancelLeaveRequestService } from "@/modules/leave/leave.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const POST = withApiHandler(
  async (_req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    const item = await cancelLeaveRequestService(id);

    return ok({
      item,
    });
  },
);