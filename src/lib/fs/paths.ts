import path from "node:path";

const projectRoot = process.cwd();
const dataDirectory = path.join(projectRoot, "data");

export const dataPaths = {
  root: dataDirectory,
  users: path.join(dataDirectory, "users.json"),
  issues: path.join(dataDirectory, "issues.json"),
  projectAccounts: path.join(dataDirectory, "project-accounts.json"),
  leaveRequests: path.join(dataDirectory, "leave-requests.json"),
  timesheets: path.join(dataDirectory, "timesheets.json"),
  timesheetMonths: path.join(dataDirectory, "timesheet-months.json"),
  timesheetProjects: path.join(dataDirectory, "timesheet-projects.json"),
  timesheetHolidays: path.join(dataDirectory, "timesheet-holidays.json"),
  notifications: path.join(dataDirectory, "notifications.json"),
  auditLogs: path.join(dataDirectory, "audit-logs.json"),
  masters: path.join(dataDirectory, "masters.json"),
  appSettings: path.join(dataDirectory, "app-settings.json"),
} as const;

export type DataPathKey = keyof typeof dataPaths;