import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok, unauthorized } from "@/lib/respond";
import { getSession } from "@/modules/auth/auth.session";
import {
  getIssueByIdService,
  updateIssueService,
} from "@/modules/issues/issue.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const GET = withApiHandler(
  async (_req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    const item = await getIssueByIdService(id);

    return ok({
      item,
    });
  },
);

export const PATCH = withApiHandler(
  async (req: NextRequest, context: RouteContext) => {
    const session = await getSession();

    if (!session) {
      return unauthorized();
    }

    const { id } = await context.params;
    const body = await req.json();

    const existing = await getIssueByIdService(id);

    if (!existing) {
      throw new Error("Issue not found.");
    }

    const item = await updateIssueService(
      existing.id,
      {
        title: body.title,
        description: body.description,
        customerName: body.customerName,
        projectAccountId: body.projectAccountId,
        priority: body.priority,
        status: body.status,
        source: body.source,
        ownerName: body.ownerName,
        ownerEmail: body.ownerEmail,
        externalTicketNo: body.externalTicketNo,
      },
      {
        actorId: session.userId,
        actorName: session.fullName,
      },
    );

    return ok(
      {
        item,
      },
      "Issue updated successfully.",
    );
  },
);