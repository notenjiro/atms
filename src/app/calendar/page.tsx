import fs from "fs";
import path from "path";
import { redirect } from "next/navigation";

import { LeaveCalendar } from "@/components/leave/leave-calendar";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/modules/auth/auth.session";
import { readKawariLeaveCache } from "@/modules/kawari/kawari-leave-cache.repository";
import { getLeaveBootstrapService } from "@/modules/leave/leave.service";
import type {
  LeaveCalendarEvent,
  LeaveDayPortion,
  LeaveRequest,
} from "@/modules/leave/leave.types";
import { listTimesheetEntriesService } from "@/modules/timesheet/timesheet.service";
import type { TimesheetEntry } from "@/modules/timesheet/timesheet.types";

type CalendarSettings = {
  showPendingLeave: boolean;
  allowEmployeeTeamCalendarView: boolean;
};

type LeaveCalendarSource = {
  requests: LeaveRequest[];
  calendarEvents: LeaveCalendarEvent[];
  source: "kawari-cache" | "local";
  warning?: string;
  syncedAt?: string | null;
};

const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  showPendingLeave: true,
  allowEmployeeTeamCalendarView: false,
};

function readCalendarSettings(): CalendarSettings {
  try {
    const filePath = path.join(process.cwd(), "data", "settings.json");

    if (!fs.existsSync(filePath)) {
      return DEFAULT_CALENDAR_SETTINGS;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw || "{}");

    const calendar =
      typeof json?.calendar === "object" && json.calendar !== null
        ? json.calendar
        : {};

    return {
      showPendingLeave:
        typeof calendar.showPendingLeave === "boolean"
          ? calendar.showPendingLeave
          : DEFAULT_CALENDAR_SETTINGS.showPendingLeave,
      allowEmployeeTeamCalendarView:
        typeof calendar.allowEmployeeTeamCalendarView === "boolean"
          ? calendar.allowEmployeeTeamCalendarView
          : DEFAULT_CALENDAR_SETTINGS.allowEmployeeTeamCalendarView,
    };
  } catch {
    return DEFAULT_CALENDAR_SETTINGS;
  }
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function parseDateUtc(value: string): Date {
  return new Date(`${toDateOnly(value)}T00:00:00.000Z`);
}

function isSameDate(a: string, b: string): boolean {
  return toDateOnly(a) === toDateOnly(b);
}

function resolvePortionForDate(
  request: LeaveRequest,
  currentDate: string,
): LeaveDayPortion {
  if (
    isSameDate(currentDate, request.startDate) &&
    isSameDate(currentDate, request.endDate)
  ) {
    if (request.startPortion === "full" && request.endPortion === "full") {
      return "full";
    }

    if (request.startPortion === request.endPortion) {
      return request.startPortion;
    }

    return "full";
  }

  if (isSameDate(currentDate, request.startDate)) {
    return request.startPortion;
  }

  if (isSameDate(currentDate, request.endDate)) {
    return request.endPortion;
  }

  return "full";
}

function buildCalendarEventsFromRequests(
  requests: LeaveRequest[],
): LeaveCalendarEvent[] {
  const events: LeaveCalendarEvent[] = [];

  for (const request of requests) {
    const start = parseDateUtc(request.startDate);
    const end = parseDateUtc(request.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      continue;
    }

    for (
      let current = new Date(start);
      current <= end;
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const currentDate = current.toISOString().slice(0, 10);

      events.push({
        id: `${request.id}:${currentDate}`,
        leaveRequestId: request.id,
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        leaveTypeId: request.leaveTypeId,
        leaveTypeName: request.leaveTypeName,
        date: currentDate,
        status: request.status,
        portion: resolvePortionForDate(request, currentDate),
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

async function loadLeaveCalendarSource(): Promise<LeaveCalendarSource> {
  const cache = await readKawariLeaveCache();

  if (cache.syncedAt && cache.requests.length > 0) {
    return {
      requests: cache.requests,
      calendarEvents: buildCalendarEventsFromRequests(cache.requests),
      source: "kawari-cache",
      warning: cache.errorMessage
        ? `Last Kawari sync failed. Showing cached data. Reason: ${cache.errorMessage}`
        : undefined,
      syncedAt: cache.syncedAt,
    };
  }

  const local = await getLeaveBootstrapService(undefined);

  return {
    requests: local.requests,
    calendarEvents: local.calendarEvents,
    source: "local",
    warning: cache.errorMessage
      ? `Kawari cache is empty. Showing local leave data. Last sync error: ${cache.errorMessage}`
      : "Kawari leave cache has not been synced yet. Showing local leave data.",
    syncedAt: cache.syncedAt,
  };
}

function filterLeaveRequests(
  requests: LeaveRequest[],
  showPendingLeave: boolean,
): LeaveRequest[] {
  return requests.filter((request) => {
    if (!showPendingLeave && request.status === "pending") {
      return false;
    }

    return true;
  });
}

function filterCalendarEvents(
  events: LeaveCalendarEvent[],
  visibleRequestIds: Set<string>,
): LeaveCalendarEvent[] {
  return events.filter((event) => visibleRequestIds.has(event.leaveRequestId));
}

function filterTimesheets(
  timesheets: TimesheetEntry[],
  visibleRequests: LeaveRequest[],
): TimesheetEntry[] {
  const visibleEmployeeIds = new Set(
    visibleRequests.map((request) => request.employeeId),
  );

  if (visibleEmployeeIds.size === 0) {
    return [];
  }

  return timesheets.filter((timesheet) =>
    visibleEmployeeIds.has(timesheet.employeeId),
  );
}

function formatSyncTime(value?: string | null): string {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function CalendarPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const settings = readCalendarSettings();

  const [leaveSource, allTimesheets] = await Promise.all([
    loadLeaveCalendarSource(),
    listTimesheetEntriesService(undefined),
  ]);

  const visibleRequests = filterLeaveRequests(
    leaveSource.requests,
    settings.showPendingLeave,
  );

  const visibleRequestIds = new Set(
    visibleRequests.map((request) => request.id),
  );

  const visibleCalendarEvents = filterCalendarEvents(
    leaveSource.calendarEvents,
    visibleRequestIds,
  );

  const visibleTimesheets = filterTimesheets(allTimesheets, visibleRequests);

  const isTeamView =
    leaveSource.source === "kawari-cache" ||
    settings.allowEmployeeTeamCalendarView ||
    session.role === "admin" ||
    session.role === "manager";

  return (
    <div className="theme-calendar">
      <AppShell
        fullName={session.fullName}
        email={session.email}
        role={session.role}
        title="Calendar"
        description="Leave planning and timesheet workload in one monthly view."
      >
        <div className="space-y-5">
          <section className="glass-panel-calendar rounded-[28px] p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">
                  {isTeamView ? "Team calendar" : "My calendar"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-sky-950">
                  Leave and timesheet overview
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-800">
                  Showing{" "}
                  {settings.showPendingLeave
                    ? "approved and pending"
                    : "approved"}{" "}
                  leave with timesheet workload overlay.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:items-end">
                <div className="rounded-2xl border border-sky-200 bg-white/65 px-4 py-3 text-sm font-medium text-sky-800">
                  Source:{" "}
                  {leaveSource.source === "kawari-cache"
                    ? "Kawari cache"
                    : "Local"}{" "}
                  · Last sync: {formatSyncTime(leaveSource.syncedAt)}
                </div>
              </div>
            </div>

            {leaveSource.warning ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {leaveSource.warning}
              </div>
            ) : null}
          </section>

          <LeaveCalendar
            events={visibleCalendarEvents}
            timesheets={visibleTimesheets}
          />
        </div>
      </AppShell>
    </div>
  );
}
