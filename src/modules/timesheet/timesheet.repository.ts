import { NotFoundError } from "@/lib/errors";
import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";

import { timesheetsFileSchema } from "./timesheet.schemas";
import type { TimesheetEntry, TimesheetsFile } from "./timesheet.types";

const DEFAULT_TIMESHEETS_FILE: TimesheetsFile = {
  items: [],
};

export async function readTimesheetsFile(): Promise<TimesheetsFile> {
  const data = await readJsonFile<TimesheetsFile>(
    dataPaths.timesheets,
    DEFAULT_TIMESHEETS_FILE,
  );

  const parsed = timesheetsFileSchema.safeParse(data);

  if (!parsed.success) {
    console.error(
      "Invalid timesheets.json format",
      parsed.error.flatten().fieldErrors,
    );
    return DEFAULT_TIMESHEETS_FILE;
  }

  return parsed.data;
}

export async function listTimesheetEntries(): Promise<TimesheetEntry[]> {
  const data = await readTimesheetsFile();
  return data.items;
}

export async function findTimesheetEntryById(
  id: string,
): Promise<TimesheetEntry | null> {
  const items = await listTimesheetEntries();
  return items.find((item) => item.id === id) ?? null;
}

export async function saveTimesheetEntries(
  items: TimesheetEntry[],
): Promise<void> {
  await writeJsonFile<TimesheetsFile>(dataPaths.timesheets, {
    items,
  });
}

export async function addTimesheetEntry(
  newTimesheetEntry: TimesheetEntry,
): Promise<TimesheetEntry> {
  const items = await listTimesheetEntries();
  const nextItems = [...items, newTimesheetEntry];

  await saveTimesheetEntries(nextItems);

  return newTimesheetEntry;
}

export async function updateTimesheetEntry(
  updatedTimesheetEntry: TimesheetEntry,
): Promise<TimesheetEntry> {
  const items = await listTimesheetEntries();

  const index = items.findIndex((item) => item.id === updatedTimesheetEntry.id);

  if (index === -1) {
    throw new NotFoundError("Timesheet entry not found.");
  }

  items[index] = updatedTimesheetEntry;

  await saveTimesheetEntries(items);

  return updatedTimesheetEntry;
}

export async function removeTimesheetEntry(id: string): Promise<void> {
  const items = await listTimesheetEntries();

  const nextItems = items.filter((item) => item.id !== id);

  if (nextItems.length === items.length) {
    throw new NotFoundError("Timesheet entry not found.");
  }

  await saveTimesheetEntries(nextItems);
}