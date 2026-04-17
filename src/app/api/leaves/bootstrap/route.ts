import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { getLeaveBootstrapService } from "@/modules/leave/leave.service";

function getStringParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key)?.trim();
  return value ? value : undefined;
}

export const GET = withApiHandler(async (req: NextRequest) => {
  const employeeId = getStringParam(req.nextUrl.searchParams, "employeeId");

  const data = await getLeaveBootstrapService(employeeId);

  return ok({
    ...data,
  });
});