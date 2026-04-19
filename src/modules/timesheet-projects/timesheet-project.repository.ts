import { NotFoundError } from "@/lib/errors";
import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";

import { timesheetProjectsFileSchema } from "./timesheet-project.schemas";
import type {
  TimesheetProject,
  TimesheetProjectsFile,
} from "./timesheet-project.types";

const DEFAULT_TIMESHEET_PROJECTS_FILE: TimesheetProjectsFile = {
  items: [],
};

export async function readTimesheetProjectsFile(): Promise<TimesheetProjectsFile> {
  const data = await readJsonFile<TimesheetProjectsFile>(
    dataPaths.timesheetProjects,
    DEFAULT_TIMESHEET_PROJECTS_FILE,
  );

  const parsed = timesheetProjectsFileSchema.safeParse(data);

  if (!parsed.success) {
    console.error(
      "Invalid timesheet-projects.json format",
      parsed.error.flatten().fieldErrors,
    );

    return DEFAULT_TIMESHEET_PROJECTS_FILE;
  }

  return parsed.data;
}

export async function listTimesheetProjects(): Promise<TimesheetProject[]> {
  const data = await readTimesheetProjectsFile();
  return data.items;
}

export async function findTimesheetProjectById(
  id: string,
): Promise<TimesheetProject | null> {
  const items = await listTimesheetProjects();
  return items.find((item) => item.id === id) ?? null;
}

export async function findTimesheetProjectByCode(
  code: string,
): Promise<TimesheetProject | null> {
  const normalizedCode = code.trim().toLowerCase();

  const items = await listTimesheetProjects();

  return (
    items.find((item) => item.code.trim().toLowerCase() === normalizedCode) ??
    null
  );
}

export async function saveTimesheetProjects(
  items: TimesheetProject[],
): Promise<void> {
  await writeJsonFile<TimesheetProjectsFile>(dataPaths.timesheetProjects, {
    items,
  });
}

export async function addTimesheetProject(
  newProject: TimesheetProject,
): Promise<TimesheetProject> {
  const items = await listTimesheetProjects();
  const nextItems = [...items, newProject];

  await saveTimesheetProjects(nextItems);

  return newProject;
}

export async function updateTimesheetProject(
  updatedProject: TimesheetProject,
): Promise<TimesheetProject> {
  const items = await listTimesheetProjects();

  const index = items.findIndex((item) => item.id === updatedProject.id);

  if (index === -1) {
    throw new NotFoundError("Timesheet project not found.");
  }

  items[index] = updatedProject;

  await saveTimesheetProjects(items);

  return updatedProject;
}

export async function replaceTimesheetProjects(
  items: TimesheetProject[],
): Promise<void> {
  await saveTimesheetProjects(items);
}