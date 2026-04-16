import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { archiveProjectAccount } from "@/modules/project-accounts/project-account.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const POST = withApiHandler(
  async (_req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    const updated = await archiveProjectAccount(id);

    return ok(
      {
        item: updated,
      },
      "Project account archived successfully.",
    );
  },
);