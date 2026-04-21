import fs from "fs";
import path from "path";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Users,
  Eye,
  Filter,
  Timer,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { LeaveCalendar } from "@/components/leave/leave-calendar";
import { getSession } from "@/modules/auth/auth.session";
import { getLeaveBootstrapService } from "@/modules/leave/leave.service";

type CalendarSettings = {
  showPendingLeave: boolean;
  allowEmployeeTeamCalendarView: boolean;
  upcomingDays: number;
};

const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  showPendingLeave: true,
  allowEmployeeTeamCalendarView: false,
  upcomingDays: 30,
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

    const upcomingDays =
      typeof calendar.upcomingDays === "number" &&
      Number.isFinite(calendar.upcomingDays) &&
      calendar.upcomingDays > 0
        ? Math.floor(calendar.upcomingDays)
        : DEFAULT_CALENDAR_SETTINGS.upcomingDays;

    return {
      showPendingLeave:
        typeof calendar.showPendingLeave === "boolean"
          ? calendar.showPendingLeave
          : DEFAULT_CALENDAR_SETTINGS.showPendingLeave,
      allowEmployeeTeamCalendarView:
        typeof calendar.allowEmployeeTeamCalendarView === "boolean"
          ? calendar.allowEmployeeTeamCalendarView
          : DEFAULT_CALENDAR_SETTINGS.allowEmployeeTeamCalendarView,
      upcomingDays,
    };
  } catch (error) {
    console.error(error);
    return DEFAULT_CALENDAR_SETTINGS;
  }
}

function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-panel-calendar rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-sky-700">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>
          ) : null}
        </div>

        <div className="glass-chip-calendar rounded-2xl p-2 text-sky-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function PolicyCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-sky-200/70 bg-white/60 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="glass-chip-calendar rounded-xl p-2 text-sky-700">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-700">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function isWithinUpcomingWindow(dateString: string, upcomingDays: number) {
  const today = new Date();
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const eventDate = new Date(`${dateString.slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(eventDate.getTime())) {
    return false;
  }

  const diffMs = eventDate.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= upcomingDays;
}

export default async function CalendarPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const normalizedRole = session.role.toLowerCase();
  const canManageApproval =
    normalizedRole === "lead" || normalizedRole.includes("lead");
  const settings = readCalendarSettings();

  const canViewTeamCalendar =
    canManageApproval || settings.allowEmployeeTeamCalendarView;

  const { requests, calendarEvents } = await getLeaveBootstrapService(
    canViewTeamCalendar ? undefined : session.userId,
  );

  const visibleRequests = settings.showPendingLeave
    ? requests
    : requests.filter((item) => item.status !== "pending");

  const visibleRequestIds = new Set(visibleRequests.map((item) => item.id));

  const visibleCalendarEvents = calendarEvents.filter((item) =>
    visibleRequestIds.has(item.leaveRequestId),
  );

  const pendingCount = visibleRequests.filter(
    (item) => item.status === "pending",
  ).length;
  const approvedCount = visibleRequests.filter(
    (item) => item.status === "approved",
  ).length;

  const uniqueEmployees = new Set(
    visibleRequests.map((item) => item.employeeName?.trim()).filter(Boolean),
  ).size;

  const upcomingEventsCount = visibleCalendarEvents.filter((item) =>
    isWithinUpcomingWindow(item.date, settings.upcomingDays),
  ).length;

  return (
    <div className="theme-calendar">
      <AppShell
        fullName={session.fullName}
        email={session.email}
        role={session.role}
        title="Calendar"
        description="Team visibility for approved leave and related scheduling activity."
      >
        <div className="space-y-6">
          <section className="glass-panel-calendar rounded-[28px] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">
                  Active policy
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-sky-900">
                  Calendar rules in effect
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-800">
                  These values come directly from Settings and now control what
                  this page shows for team visibility and leave planning.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-white/72 px-4 py-3 text-sm text-sky-800">
                Change calendar rules from the Settings page.
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PolicyCard
                title="Pending leave visibility"
                value={settings.showPendingLeave ? "Shown" : "Hidden"}
                hint="Controls whether pending leave requests appear in counts and calendar visibility."
                icon={<Filter className="size-4" />}
              />
              <PolicyCard
                title="Team calendar access"
                value={canViewTeamCalendar ? "Team view enabled" : "Self view only"}
                hint="Non-lead users follow the employee team-view setting. Leads always see the team view."
                icon={<Eye className="size-4" />}
              />
              <PolicyCard
                title="Upcoming window"
                value={`${settings.upcomingDays} day${
                  settings.upcomingDays === 1 ? "" : "s"
                }`}
                hint="Used to count near-term events for planning visibility."
                icon={<Timer className="size-4" />}
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Calendar Events"
              value={visibleCalendarEvents.length}
              hint="Generated from the currently visible leave records"
              icon={<CalendarDays className="size-5" />}
            />
            <StatCard
              title="Approved Requests"
              value={approvedCount}
              hint="Approved items in the current visible dataset"
              icon={<CheckCircle2 className="size-5" />}
            />
            <StatCard
              title="Pending Requests"
              value={pendingCount}
              hint="Items still waiting for approval and allowed by policy"
              icon={<Clock3 className="size-5" />}
            />
            <StatCard
              title="Employees Visible"
              value={uniqueEmployees}
              hint="Distinct employees represented in visible records"
              icon={<Users className="size-5" />}
            />
          </section>

          <section className="glass-panel-calendar rounded-[28px] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Calendar workspace
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Leave is the first calendar source. This page now respects
                  settings for pending visibility, team access, and upcoming
                  planning range.
                </p>
              </div>

              <div className="glass-chip-calendar rounded-2xl px-4 py-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-700">
                  Upcoming events
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {upcomingEventsCount} in next {settings.upcomingDays} day
                  {settings.upcomingDays === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </section>

          <LeaveCalendar events={visibleCalendarEvents} />

          <section className="glass-panel-calendar rounded-[28px] p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Planning notes
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-sky-200/70 bg-white/55 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Layer 1</p>
                <p className="mt-2 text-sm text-slate-600">
                  Approved leave visibility, with pending leave optionally shown
                  based on calendar settings.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-200/70 bg-white/55 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Layer 2</p>
                <p className="mt-2 text-sm text-slate-600">
                  Team visibility scope is now controlled by role and calendar
                  access policy.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-200/70 bg-white/55 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Layer 3</p>
                <p className="mt-2 text-sm text-slate-600">
                  Upcoming planning count now follows the configured time window
                  from settings.
                </p>
              </div>
            </div>
          </section>
        </div>
      </AppShell>
    </div>
  );
}