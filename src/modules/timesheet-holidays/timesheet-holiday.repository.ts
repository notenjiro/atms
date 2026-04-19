import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";

import { timesheetHolidaysFileSchema } from "./timesheet-holiday.schemas";
import type {
  TimesheetHoliday,
  TimesheetHolidaysFile,
} from "./timesheet-holiday.types";

const DEFAULT_FILE: TimesheetHolidaysFile = {
  items: [],
};

export async function readHolidayFile(): Promise<TimesheetHolidaysFile> {
  const data = await readJsonFile<TimesheetHolidaysFile>(
    dataPaths.timesheetHolidays,
    DEFAULT_FILE,
  );

  const parsed = timesheetHolidaysFileSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Invalid holiday file");
    return DEFAULT_FILE;
  }

  return parsed.data;
}

export async function listHolidays(): Promise<TimesheetHoliday[]> {
  const data = await readHolidayFile();
  return data.items;
}

export async function replaceHolidays(
  items: TimesheetHoliday[],
): Promise<void> {
  await writeJsonFile<TimesheetHolidaysFile>(
    dataPaths.timesheetHolidays,
    { items },
  );
}