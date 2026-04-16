import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { loginRequestSchema } from "@/modules/auth/auth.schemas";
import { authenticateUser } from "@/modules/auth/auth.service";
import { createSession } from "@/modules/auth/auth.session";

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const parsed = loginRequestSchema.parse(body);

  const user = await authenticateUser(parsed);

  await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  });

  return ok(
    {
      user,
    },
    "Login successful",
  );
});