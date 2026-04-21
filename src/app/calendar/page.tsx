import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, Users } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { LeaveCalendar } from "@/components/leave/leave-calendar";
import { getSession } from "@/modules/auth/auth.session";
import { getLeaveBootstrapService } from "@/modules/leave/leave.service";

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

export default async function CalendarPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const normalizedRole = session.role.toLowerCase();
  const canManageApproval =
    normalizedRole === "lead" || normalizedRole.includes("lead");

  const { summary, requests, calendarEvents } = await getLeaveBootstrapService(
    canManageApproval ? undefined : session.userId,
  );

  const pendingCount = requests.filter(
    (item) => item.status === "pending",
  ).length;
  const approvedCount = requests.filter(
    (item) => item.status === "approved",
  ).length;

  const uniqueEmployees = new Set(
    requests.map((item) => item.employeeName?.trim()).filter(Boolean),
  ).size;

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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Calendar Events"
              value={calendarEvents.length}
              hint="Generated from current leave records"
              icon={<CalendarDays className="size-5" />}
            />
            <StatCard
              title="Approved Requests"
              value={approvedCount}
              hint="Approved items in the current dataset"
              icon={<CheckCircle2 className="size-5" />}
            />
            <StatCard
              title="Pending Requests"
              value={pendingCount}
              hint="Items still waiting for approval"
              icon={<Clock3 className="size-5" />}
            />
            <StatCard
              title="Employees Visible"
              value={uniqueEmployees}
              hint="Distinct employees represented in records"
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
                  Leave is the first calendar source. Future layers can extend
                  this page with project events, deadlines, holidays, and team
                  planning signals.
                </p>
              </div>

              <div className="glass-chip-calendar rounded-2xl px-4 py-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-700">
                  Current source
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  Leave calendar events
                </p>
              </div>
            </div>
          </section>

          <LeaveCalendar events={calendarEvents} />

          <section className="glass-panel-calendar rounded-[28px] p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Planning notes
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-sky-200/70 bg-white/55 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Layer 1</p>
                <p className="mt-2 text-sm text-slate-600">
                  Approved leave and pending leave visibility for team planning.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-200/70 bg-white/55 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Layer 2</p>
                <p className="mt-2 text-sm text-slate-600">
                  Project milestones, account deadlines, and operational
                  reminders.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-200/70 bg-white/55 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Layer 3</p>
                <p className="mt-2 text-sm text-slate-600">
                  Notifications and scheduling rules connected to approval
                  workflow.
                </p>
              </div>
            </div>
          </section>
        </div>
      </AppShell>
    </div>
  );
}
