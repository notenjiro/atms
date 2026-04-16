import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { restoreProjectAccount } from "@/modules/project-accounts/project-account.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const POST = withApiHandler(
  async (_req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    const updated = await restoreProjectAccount(id);

    return ok(
      {
        item: updated,
      },
      "Project account restored successfully.",
    );
  },
);