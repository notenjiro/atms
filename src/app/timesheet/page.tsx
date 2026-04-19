import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, ReceiptText, Timer } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { TimesheetMonthBoard } from "@/components/timesheet/timesheet-month-board";
import { TimesheetTable } from "@/components/timesheet/timesheet-table";
import { getSession } from "@/modules/auth/auth.session";
import { getTimesheetBootstrapService } from "@/modules/timesheet/timesheet.service";

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
  tone?: "default" | "sky" | "emerald" | "amber";
}) {
  const toneClassName =
    tone === "sky"
      ? "border-sky-200 bg-sky-50"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm ${toneClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default async function TimesheetPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const normalizedRole = session.role.toLowerCase();
  const canManageApproval =
    normalizedRole === "lead" || normalizedRole.includes("lead");

  const { items, overview, approval } = await getTimesheetBootstrapService(
    canManageApproval ? undefined : session.userId,
  );

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      title="Timesheet"
      description="Plan monthly effort by project and sub-task, then review detailed month entries below."
    >
      <div className="space-y-5">
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
            tone="sky"
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
            tone="amber"
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
          <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">
                  Approval summary
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-amber-900">
                  Lead review pulse
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">
                  Keep an eye on the submitted queue and the current month
                  approval volume without scanning the entire table.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-amber-300 bg-white/70 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-amber-700">
                    Pending
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-amber-900">
                    {approval.pendingCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-white/70 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700">
                    Approved This Month
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-800">
                    {approval.approvedThisMonthCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-white/70 px-4 py-3">
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
  );
}