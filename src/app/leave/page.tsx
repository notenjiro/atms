// src/app/leave/page.tsx
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
      return "border-orange-200 bg-orange-50/80";
    case "L003":
      return "border-amber-200 bg-amber-50/80";
    case "L004":
      return "border-rose-200 bg-rose-50/75";
    default:
      return "border-orange-100 bg-white/70";
  }
}

function SummaryCard({ card }: { card: LeaveDashboardCard }) {
  return (
    <div
      className={`glass-panel-leave rounded-2xl border px-4 py-4 ${getCardToneClassName(card.leaveTypeId)}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-orange-500">
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
    <div className="glass-panel-leave rounded-2xl px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-orange-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-xs font-medium text-orange-400">{hint}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-2 text-orange-600">
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

  const { summary, requests, calendarEvents, leavePolicySettings } =
    await getLeaveBootstrapService(
      canManageApproval ? undefined : session.userId,
    );

  const pendingForApproval =
    canManageApproval && leavePolicySettings.requireApproval
      ? requests.filter((item) => item.status === "pending")
      : [];

  return (
    <div className="glass-panel-leave">
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
            requireApproval={leavePolicySettings.requireApproval}
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

          {canManageApproval && leavePolicySettings.requireApproval ? (
            <section className="glass-panel-leave rounded-[28px] border border-orange-200/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Lead approval queue
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-orange-900">
                    Requests waiting for decision
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-800">
                    Team approval is separated in the table below, and this
                    summary keeps the current queue visible at a glance.
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-200 bg-white/70 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700">
                    Pending right now
                  </p>
                  <p className="mt-2 text-3xl font-semibold leading-none text-orange-900">
                    {pendingForApproval.length}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {pendingForApproval.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-orange-200 bg-white/72 px-4 py-4"
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
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-orange-700">
                      {formatDays(item.totalDays)} day
                      {item.totalDays > 1 ? "s" : ""}
                    </p>
                  </div>
                ))}

                {pendingForApproval.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-orange-300 bg-white/55 px-4 py-6 text-sm text-orange-800 md:col-span-3">
                    No pending requests at the moment. The queue is clear.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <LeavesTable
            items={requests}
            canManageApproval={canManageApproval}
            currentUserId={session.userId}
          />

          <LeaveCalendar events={calendarEvents} />
        </div>
      </AppShell>
    </div>
  );
}