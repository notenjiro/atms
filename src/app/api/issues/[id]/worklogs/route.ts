import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok, unauthorized } from "@/lib/respond";
import { getSession } from "@/modules/auth/auth.session";
import {
  createIssueWorklogService,
  listIssueWorklogsService,
  summarizeIssueWorklogs,
} from "@/modules/issues/issue-worklog.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const GET = withApiHandler(
  async (_req: NextRequest, context: RouteContext) => {
    const session = await getSession();

    if (!session) {
      return unauthorized();
    }

    const { id } = await context.params;
    const items = await listIssueWorklogsService(id);

    return ok({
      items,
      summary: summarizeIssueWorklogs(items),
    });
  },
);

export const POST = withApiHandler(
  async (req: NextRequest, context: RouteContext) => {
    const session = await getSession();

    if (!session) {
      return unauthorized();
    }

    const { id } = await context.params;
    const body = await req.json();

    const item = await createIssueWorklogService({
      issueId: id,
      actorId: session.userId,
      actorName: session.fullName,
      actorEmail: session.email,
      hours: body.hours,
      isBillable: body.isBillable,
      description: body.description,
      workDate: body.workDate,
    });

    const items = await listIssueWorklogsService(id);

    return ok(
      {
        item,
        items,
        summary: summarizeIssueWorklogs(items),
      },
      "Worklog added successfully.",
      201,
    );
  },
);