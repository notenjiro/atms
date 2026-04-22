import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";
import { previewKawariProjectAccountSync } from "@/modules/kawari/kawari.project-sync";

export const GET = withApiHandler(async (req: NextRequest) => {
  const projectsPath = req.nextUrl.searchParams.get("projectsPath") ?? undefined;
  const clientsPath = req.nextUrl.searchParams.get("clientsPath") ?? undefined;

  const preview = await previewKawariProjectAccountSync({
    projectsPath,
    clientsPath,
  });

  return ok(
    {
      preview,
    },
    "Kawari project account preview completed.",
  );
});