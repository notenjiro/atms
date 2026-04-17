import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";

import { CreateLeaveForm } from "@/components/leave/create-leave-form";
import { LeaveCalendar } from "@/components/leave/leave-calendar";
import { LeavesTable } from "@/components/leave/leaves-table";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/modules/auth/auth.session";
import { getLeaveBootstrapService } from "@/modules/leave/leave.service";
import type { LeaveDashboardCard } from "@/modules/leave/leave.types";

function formatDays(value: number | undefined): string {
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

function getCardToneClassName(leaveTypeId: string): string {
  switch (leaveTypeId) {
    case "L001":
      return "border-sky-200 bg-sky-50/70";
    case "L003":
      return "border-emerald-200 bg-emerald-50/70";
    case "L004":
      return "border-violet-200 bg-violet-50/70";
    default:
      return "border-slate-200 bg-white";
  }
}

function SummaryCard({ card }: { card: LeaveDashboardCard }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 shadow-sm ${getCardToneClassName(card.leaveTypeId)}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {card.leaveTypeName}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Entitled
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatDays(card.entitledDays)}
          </p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Used
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatDays(card.usedDays)}
          </p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Remaining
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatDays(card.remainingDays)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Pending: {formatDays(card.pendingDays)}</span>
        <span>Source: {card.source.toUpperCase()}</span>
      </div>
    </div>
  );
}

function MiniStat({
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
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-xs font-medium text-slate-400">{hint}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default async function LeavePage() {
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

  const pendingForApproval = canManageApproval
    ? requests.filter((item) => item.status === "pending")
    : [];

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      title="Leave"
      description="Track quota balances, submit requests, review approvals, and visualize team leave in one workspace."
    >
      <div className="space-y-5">
        <CreateLeaveForm
          employeeId={session.userId}
          employeeName={session.fullName}
          approverName={canManageApproval ? session.fullName : undefined}
          approverEmail={canManageApproval ? session.email : undefined}
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summary.cards
            .filter((card) =>
              ["L001", "L003", "L004"].includes(card.leaveTypeId),
            )
            .map((card) => (
              <SummaryCard key={card.leaveTypeId} card={card} />
            ))}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MiniStat
            title="Pending Approval"
            value={summary.pendingApprovalCount}
            hint="Requests waiting for lead review"
            icon={<Clock3 className="size-5" />}
          />
          <MiniStat
            title="Approved This Month"
            value={formatDays(summary.approvedThisMonthDays)}
            hint="Approved leave days in the current month"
            icon={<CheckCircle2 className="size-5" />}
          />
          <MiniStat
            title="Calendar Events"
            value={calendarEvents.length}
            hint="Generated from the current leave records"
            icon={<CalendarDays className="size-5" />}
          />
        </section>

        {canManageApproval ? (
          <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">
                  Lead approval queue
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-amber-900">
                  Requests waiting for decision
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">
                  Team approval is separated in the table below, and this summary
                  keeps the current queue visible at a glance.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-300 bg-white/70 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Pending right now
                </p>
                <p className="mt-2 text-3xl font-semibold leading-none text-amber-900">
                  {pendingForApproval.length}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {pendingForApproval.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-amber-200 bg-white px-4 py-4"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {item.employeeName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.leaveTypeName}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.startDate} to {item.endDate}
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-amber-700">
                    {formatDays(item.totalDays)} day
                    {item.totalDays > 1 ? "s" : ""}
                  </p>
                </div>
              ))}

              {pendingForApproval.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-300 bg-white/60 px-4 py-6 text-sm text-amber-800 md:col-span-3">
                  No pending requests at the moment. The queue is clear.
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <LeaveCalendar events={calendarEvents} />

        <LeavesTable
          items={requests}
          canManageApproval={canManageApproval}
          currentUserId={session.userId}
        />
      </div>
    </AppShell>
  );
}