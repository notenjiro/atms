import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { applyKawariProjectAccountSync } from "@/modules/kawari/kawari.project-sync";

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));

  const projectsPath =
    typeof body?.projectsPath === "string" && body.projectsPath.trim()
      ? body.projectsPath.trim()
      : undefined;

  const clientsPath =
    typeof body?.clientsPath === "string" && body.clientsPath.trim()
      ? body.clientsPath.trim()
      : undefined;

  const limit =
    typeof body?.limit === "number" && Number.isFinite(body.limit)
      ? body.limit
      : undefined;

  const result = await applyKawariProjectAccountSync({
    projectsPath,
    clientsPath,
    limit,
  });

  return ok(
    {
      result,
    },
    "Kawari project account sync completed.",
  );
});