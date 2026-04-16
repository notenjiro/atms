import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { editProjectAccount, getProjectAccountById } from "@/modules/project-accounts/project-account.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const GET = withApiHandler(async (_req: NextRequest, context: RouteContext) => {
  const { id } = await context.params;
  const item = await getProjectAccountById(id);

  return ok({
    item,
  });
});

export const PATCH = withApiHandler(async (req: NextRequest, context: RouteContext) => {
  const { id } = await context.params;
  const body = await req.json();

  const updated = await editProjectAccount(id, body);

  return ok(
    {
      item: updated,
    },
    "Project account updated successfully.",
  );
});