import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { clearSession } from "@/modules/auth/auth.session";

export const POST = withApiHandler(async () => {
  await clearSession();

  return ok(null, "Logout successful");
});