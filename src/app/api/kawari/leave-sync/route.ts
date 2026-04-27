import { NextResponse } from "next/server";

import { getSession } from "@/modules/auth/auth.session";
import {
  getKawariLeaveCacheStatus,
  syncKawariLeaveCache,
} from "@/modules/kawari/kawari-leave-sync";

export async function GET() {
  const result = await getKawariLeaveCacheStatus();

  return NextResponse.json({
    ok: true,
    data: result,
  });
}

export async function POST() {
  const session = await getSession();

  const result = await syncKawariLeaveCache({
    atmsUserId: session?.userId ?? null,
    atmsEmail: session?.email ?? null,
  });

  return NextResponse.json(
    {
      ok: result.ok,
      data: result,
    },
    {
      status: result.ok ? 200 : 502,
    },
  );
}