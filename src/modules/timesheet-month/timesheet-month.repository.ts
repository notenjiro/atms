import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";

import type {
  TimesheetMonth,
  TimesheetMonthsFile,
} from "./timesheet-month.types";

const DEFAULT_TIMESHEET_MONTHS_FILE: TimesheetMonthsFile = {
  items: [],
};

export async function readTimesheetMonthsFile(): Promise<TimesheetMonthsFile> {
  return readJsonFile<TimesheetMonthsFile>(
    dataPaths.timesheetMonths,
    DEFAULT_TIMESHEET_MONTHS_FILE,
  );
}

export async function listTimesheetMonths(): Promise<TimesheetMonth[]> {
  const data = await readTimesheetMonthsFile();
  return data.items;
}

export async function findTimesheetMonth(
  employeeId: string,
  month: string,
): Promise<TimesheetMonth | null> {
  const items = await listTimesheetMonths();

  return (
    items.find(
      (item) => item.employeeId === employeeId && item.month === month,
    ) ?? null
  );
}

export async function saveTimesheetMonths(
  items: TimesheetMonth[],
): Promise<void> {
  await writeJsonFile<TimesheetMonthsFile>(dataPaths.timesheetMonths, {
    items,
  });
}

export async function upsertTimesheetMonth(
  target: TimesheetMonth,
): Promise<TimesheetMonth> {
  const items = await listTimesheetMonths();

  const index = items.findIndex(
    (item) =>
      item.employeeId === target.employeeId &&
      item.month === target.month,
  );

  if (index >= 0) {
    items[index] = target;
  } else {
    items.push(target);
  }

  await saveTimesheetMonths(items);

  return target;
}