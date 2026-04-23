import { NextResponse } from "next/server";

import { getProjectAccountsView } from "@/modules/project-accounts/project-account.service";

export async function GET() {
  const data = await getProjectAccountsView();

  return NextResponse.json({
    success: true,
    data,
  });
}