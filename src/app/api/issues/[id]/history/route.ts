import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok, unauthorized } from "@/lib/respond";
import { getSession } from "@/modules/auth/auth.session";
import { listIssueHistoryByIssueId } from "@/modules/issues/issue-history.repository";

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
    const items = await listIssueHistoryByIssueId(id);

    return ok({
      items,
    });
  },
);