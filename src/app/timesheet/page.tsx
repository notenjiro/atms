// src/app/timesheet/page.tsx
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Lock,
  ReceiptText,
  Timer,
  CalendarX2,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { TimesheetMonthBoard } from "@/components/timesheet/timesheet-month-board";
import { TimesheetTable } from "@/components/timesheet/timesheet-table";
import { getSession } from "@/modules/auth/auth.session";
import { getTimesheetBootstrapService } from "@/modules/timesheet/timesheet.service";
import type { TimesheetPolicySettings } from "@/modules/timesheet/timesheet.types";

function formatHours(value: number | undefined): string {
  if (typeof value !== "number") {
    return "-";
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
}

function StatCard({
  title,
  value,
  hint,
  icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  tone?: "default" | "green" | "emerald" | "lime";
}) {
  const toneClassName =
    tone === "green"
      ? "border-green-200 bg-green-50/70"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50/70"
        : tone === "lime"
          ? "border-lime-200 bg-lime-50/70"
          : "border-green-100 bg-white/70";

  const iconToneClassName =
    tone === "green"
      ? "border-green-200 bg-green-50/80 text-green-600"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50/80 text-emerald-600"
        : tone === "lime"
          ? "border-lime-200 bg-lime-50/80 text-lime-600"
          : "border-slate-200 bg-white/80 text-slate-600";

  return (
    <div
      className={`glass-panel-timesheet rounded-2xl border px-4 py-4 ${toneClassName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-600">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>
          ) : null}
        </div>

        <div className={`rounded-2xl border p-2 ${iconToneClassName}`}>
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
    <div className="glass-panel-timesheet rounded-2xl border border-emerald-200/70 bg-white/72 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-700">
            {title}
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{hint}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-2 text-emerald-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function buildPolicySummary(policy: TimesheetPolicySettings) {
  return {
    hoursPerDay: `${formatHours(policy.hoursPerDay)} hour${
      policy.hoursPerDay === 1 ? "" : "s"
    } / day`,
    weekend: policy.allowWeekend ? "Allowed" : "Blocked",
    lockAfterDays: `${policy.lockAfterDays} day${
      policy.lockAfterDays === 1 ? "" : "s"
    }`,
  };
}

export default async function TimesheetPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const normalizedRole = session.role.toLowerCase();
  const canManageApproval =
    normalizedRole === "lead" || normalizedRole.includes("lead");

  const { items, overview, approval, policy } = await getTimesheetBootstrapService(
    canManageApproval ? undefined : session.userId,
  );

  const policySummary = buildPolicySummary(policy);

  return (
    <div className="glass-panel-timesheet">
      <AppShell
        fullName={session.fullName}
        email={session.email}
        role={session.role}
        title="Timesheet"
        description="Plan monthly effort by project and sub-task, then review detailed month entries below."
      >
        <div className="space-y-5">
          <section className="glass-panel-timesheet rounded-[28px] border border-emerald-200/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  Active policy
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-emerald-900">
                  Timesheet rules in effect
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-800">
                  These values come directly from Settings and are now enforced by
                  the service layer. What you see here is what the system will
                  actually allow.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-white/72 px-4 py-3 text-sm text-emerald-800">
                Changes to these rules should be made from the Settings page.
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PolicyCard
                title="Daily limit"
                value={policySummary.hoursPerDay}
                hint="Total hours across the same work date cannot go above this limit."
                icon={<Timer className="size-5" />}
              />
              <PolicyCard
                title="Weekend entry"
                value={policySummary.weekend}
                hint={
                  policy.allowWeekend
                    ? "Saturday and Sunday entries can be saved and submitted."
                    : "Saturday and Sunday entries are blocked by policy."
                }
                icon={<CalendarX2 className="size-5" />}
              />
              <PolicyCard
                title="Entry lock"
                value={policySummary.lockAfterDays}
                hint="Older entries cannot be created, edited, deleted, or submitted after this window."
                icon={<Lock className="size-5" />}
              />
            </div>
          </section>

          <TimesheetMonthBoard
            employeeId={session.userId}
            employeeName={session.fullName}
            canManageApproval={canManageApproval}
          />

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Hours"
              value={formatHours(overview.totalHours)}
              hint="Visible in the current timesheet dataset"
              icon={<Timer className="size-5" />}
              tone="green"
            />
            <StatCard
              title="Billable Hours"
              value={formatHours(overview.billableHours)}
              hint="Billable work only"
              icon={<ReceiptText className="size-5" />}
              tone="emerald"
            />
            <StatCard
              title="Submitted"
              value={overview.submittedCount}
              hint="Waiting for review"
              icon={<Clock3 className="size-5" />}
              tone="lime"
            />
            <StatCard
              title="Approved"
              value={overview.approvedCount}
              hint="Approved entries in current dataset"
              icon={<CheckCircle2 className="size-5" />}
            />
          </section>

          <TimesheetTable
            items={items}
            currentUserId={session.userId}
            canManageApproval={canManageApproval}
          />

          {canManageApproval ? (
            <section className="glass-panel-timesheet rounded-[28px] border border-emerald-200/70 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Approval summary
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-emerald-900">
                    Lead review pulse
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-800">
                    Keep an eye on the submitted queue and the current month approval volume without scanning the entire table.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-lime-200 bg-white/72 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-lime-700">
                      Pending
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-lime-900">
                      {approval.pendingCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-white/72 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700">
                      Approved This Month
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-800">
                      {approval.approvedThisMonthCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-rose-200 bg-white/72 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-rose-700">
                      Rejected This Month
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-rose-800">
                      {approval.rejectedThisMonthCount}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </AppShell>
    </div>
  );
}