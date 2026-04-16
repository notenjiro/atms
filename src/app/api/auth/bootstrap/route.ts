import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { bootstrapAdminUser } from "@/modules/auth/auth.service";

export const POST = withApiHandler(async () => {
  const result = await bootstrapAdminUser();

  return ok(
    {
      user: result.user,
      created: result.created,
    },
    result.created
      ? "Admin user created successfully"
      : "Admin user already exists",
  );
});