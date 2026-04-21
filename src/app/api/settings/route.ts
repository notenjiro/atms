import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "settings.json");

function getDefaultSettings() {
  return {
    general: {
      workspaceName: "ATMS Support",
      timeZone: "Asia/Bangkok",
      workHoursPerDay: 8,
      dateFormat: "DD/MM/YYYY",
    },
    users: {
      defaultRole: "staff",
      leadRole: "lead",
    },
    leave: {
      annual: 10,
      sick: 30,
      requireApproval: true,
    },
    timesheet: {
      hoursPerDay: 8,
      allowWeekend: false,
      lockAfterDays: 3,
    },
    issue: {
      requireOwnerToStartProgress: true,
      requireOwnerToResolve: true,
      allowReopenClosed: true,
      slaHoursLow: 72,
      slaHoursMedium: 24,
      slaHoursHigh: 8,
      slaHoursCritical: 4,
    },
    reports: {
      showIssueMetrics: true,
      showLeaveMetrics: true,
      showTimesheetMetrics: true,
      maxRecentMonths: 6,
    },
    calendar: {
      showPendingLeave: true,
      allowEmployeeTeamCalendarView: false,
      upcomingDays: 30,
    },
    notifications: {
      enableIssueAlerts: true,
      enableLeaveAlerts: true,
      criticalIssuesOnly: false,
      maxItems: 20,
    },
  };
}

function mergeDefaults(data: any) {
  const defaults = getDefaultSettings();

  return {
    general: {
      ...defaults.general,
      ...(data?.general || {}),
    },
    users: {
      ...defaults.users,
      ...(data?.users || {}),
    },
    leave: {
      ...defaults.leave,
      ...(data?.leave || {}),
    },
    timesheet: {
      ...defaults.timesheet,
      ...(data?.timesheet || {}),
    },
    issue: {
      ...defaults.issue,
      ...(data?.issue || {}),
    },
    reports: {
      ...defaults.reports,
      ...(data?.reports || {}),
    },
    calendar: {
      ...defaults.calendar,
      ...(data?.calendar || {}),
    },
    notifications: {
      ...defaults.notifications,
      ...(data?.notifications || {}),
    },
  };
}

function ensureFileExists() {
  if (!fs.existsSync(filePath)) {
    const defaults = getDefaultSettings();
    fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), "utf-8");
  }
}

function readSettings() {
  ensureFileExists();

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw || "{}");

  return mergeDefaults(parsed);
}

function writeSettings(data: any) {
  const merged = mergeDefaults(data);
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), "utf-8");
}

export async function GET() {
  try {
    const settings = readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    writeSettings(body);

    return NextResponse.json({
      success: true,
      settings: readSettings(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}