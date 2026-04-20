import { withApiHandler } from "@/lib/api";
import { ok, unauthorized } from "@/lib/respond";
import { getSession } from "@/modules/auth/auth.session";
import { getAllUsers } from "@/modules/auth/auth.repository";
import { toSafeUser } from "@/modules/auth/auth.types";

export const GET = withApiHandler(async () => {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const users = await getAllUsers();

  const items = users
    .filter((user) => user.status === "active")
    .map((user) => toSafeUser(user))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return ok({
    items,
  });
});