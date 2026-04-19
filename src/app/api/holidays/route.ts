import { NextRequest, NextResponse } from "next/server";

import { getHolidayMapService } from "@/modules/timesheet-holidays/timesheet-holiday.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = Number(yearParam);

  if (!yearParam || !Number.isFinite(year)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "year is required",
        },
      },
      { status: 400 },
    );
  }

  const holidayMap = await getHolidayMapService(year);

  return NextResponse.json(
    {
      items: Object.values(holidayMap),
    },
    {
      status: 200,
    },
  );
}