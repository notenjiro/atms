import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import {
  createProjectAccount,
  getProjectAccountsView,
} from "@/modules/project-accounts/project-account.service";

export const GET = withApiHandler(async () => {
  const { activeItems, archivedItems } = await getProjectAccountsView();

  return ok({
    activeItems,
    archivedItems,
  });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const created = await createProjectAccount(body);

  return ok(
    {
      item: created,
    },
    "Project account created successfully.",
    201,
  );
});