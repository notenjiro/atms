import { listHolidays, replaceHolidays } from "./timesheet-holiday.repository";
import { fetchThaiHolidaysFromProvider } from "./timesheet-holiday.provider";

import type {
  TimesheetHoliday,
  TimesheetHolidayMap,
} from "./timesheet-holiday.types";

function getNowIsoString(): string {
  return new Date().toISOString();
}

function mapExternalToInternal(
  external: Array<{ date: string; name: string }>,
): TimesheetHoliday[] {
  const now = getNowIsoString();

  return external.map((item) => ({
    date: item.date,
    name: item.name,
    type: "public",
    isActive: true,
    source: "api",
    createdAt: now,
    updatedAt: now,
  }));
}

export async function syncHolidayService(
  year: number,
): Promise<TimesheetHoliday[]> {
  const externalItems = await fetchThaiHolidaysFromProvider(year);
  const normalizedItems = mapExternalToInternal(externalItems);

  const existingItems = await listHolidays();
  const otherYearItems = existingItems.filter(
    (item) => !item.date.startsWith(`${year}-`),
  );

  await replaceHolidays([...otherYearItems, ...normalizedItems]);

  return normalizedItems;
}

export async function getHolidayMapService(
  year: number,
): Promise<TimesheetHolidayMap> {
  let holidays = await listHolidays();

  const yearItems = holidays.filter((item) => item.date.startsWith(`${year}-`));

  if (yearItems.length === 0) {
    await syncHolidayService(year);
    holidays = await listHolidays();
  }

  const map: TimesheetHolidayMap = {};

  for (const item of holidays) {
    if (!item.isActive) {
      continue;
    }

    if (!item.date.startsWith(`${year}-`)) {
      continue;
    }

    map[item.date] = item;
  }

  return map;
}