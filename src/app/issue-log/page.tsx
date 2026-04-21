import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Clock3,
  FolderSearch,
  ShieldAlert,
  UserRoundCheck,
  RefreshCcw,
} from "lucide-react";

import CreateIssueForm from "@/components/issues/create-issue-form";
import IssuesTable, {
  type IssueTableItem,
} from "@/components/issues/issues-table";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/modules/auth/auth.session";
import { getIssuePolicySettingsService } from "@/modules/issues/issue.service";
import type { IssuePolicySettings } from "@/modules/issues/issue.types";

type IssueApiItem = {
  id: string;
  issueNo: string;
  title: string;
  description: string;
  customerName: string;
  projectAccountId?: string;
  projectAccountCode?: string;
  projectAccountName?: string;
  status:
    | "open"
    | "in_progress"
    | "pending"
    | "resolved"
    | "closed"
    | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  source: "manual" | "servicenow" | "email" | "phone";
  ownerName?: string;
  ownerEmail?: string;
  reporterId: string;
  reporterName?: string | null;
  reporterEmail?: string;
  externalTicketNo?: string;
  openedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

type IssueLogPageProps = {
  searchParams: Promise<{
    status?: "open" | "resolved";
    owner?: "unassigned";
    aging?: "gte7";
  }>;
};

async function getIssues(): Promise<IssueTableItem[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/issues`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const items = Array.isArray(json?.data?.items)
      ? (json.data.items as IssueApiItem[])
      : [];

    return items.map((item) => ({
      id: item.id,
      issueNo: item.issueNo,
      title: item.title,
      description: item.description ?? "",
      customerName: item.customerName,
      projectAccountId: item.projectAccountId,
      projectAccountCode: item.projectAccountCode,
      projectAccountName: item.projectAccountName,
      status: item.status,
      priority: item.priority,
      source: item.source,
      ownerName: item.ownerName,
      ownerEmail: item.ownerEmail,
      reporterId: item.reporterId,
      reporterName: item.reporterName ?? null,
      reporterEmail: item.reporterEmail,
      externalTicketNo: item.externalTicketNo,
      openedAt: item.openedAt,
      resolvedAt: item.resolvedAt,
      closedAt: item.closedAt,
      cancelledAt: item.cancelledAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  } catch {
    return [];
  }
}

function getAgingInDays(openedAt: string) {
  const opened = new Date(openedAt);

  if (Number.isNaN(opened.getTime())) {
    return null;
  }

  const now = new Date();
  const diffMs = now.getTime() - opened.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays < 0 ? 0 : diffDays;
}

function SummaryCard({
  title,
  value,
  helper,
  href,
  icon,
}: {
  title: string;
  value: number;
  helper: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  const content = (
    <div className="glass-panel-issue rounded-2xl p-4 transition hover:bg-white/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-yellow-700">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-500">{helper}</div>
        </div>

        {icon ? (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50/80 p-2 text-yellow-700">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function PolicyCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-panel-issue rounded-2xl border border-yellow-200/70 bg-white/72 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-yellow-800">{title}</div>
          <div className="mt-2 text-xl font-semibold text-slate-900">
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-500">{helper}</div>
        </div>

        <div className="rounded-2xl border border-yellow-200 bg-yellow-50/80 p-2 text-yellow-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function buildSlaRows(policy: IssuePolicySettings) {
  return [
    { label: "Low", hours: policy.slaHoursLow },
    { label: "Medium", hours: policy.slaHoursMedium },
    { label: "High", hours: policy.slaHoursHigh },
    { label: "Critical", hours: policy.slaHoursCritical },
  ];
}

export default async function IssueLogPage({
  searchParams,
}: IssueLogPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const filters = await searchParams;
  const [issues, policy] = await Promise.all([
    getIssues(),
    getIssuePolicySettingsService(),
  ]);

  const openCount = issues.filter((issue) =>
    ["open", "in_progress", "pending"].includes(issue.status),
  ).length;

  const resolvedCount = issues.filter((issue) =>
    ["resolved", "closed"].includes(issue.status),
  ).length;

  const criticalCount = issues.filter(
    (issue) => issue.priority === "critical",
  ).length;

  const customerCount = new Set(
    issues.map((issue) => issue.customerName.trim()).filter(Boolean),
  ).size;

  const unassignedCount = issues.filter(
    (issue) =>
      ["open", "in_progress", "pending"].includes(issue.status) &&
      !(issue.ownerName ?? "").trim(),
  ).length;

  const agingSevenPlusCount = issues.filter((issue) => {
    if (!["open", "in_progress", "pending"].includes(issue.status)) {
      return false;
    }

    const agingDays = getAgingInDays(issue.openedAt);
    return agingDays !== null && agingDays >= 7;
  }).length;

  const slaRows = buildSlaRows(policy);

  return (
    <div className="glass-panel-issue">
      <AppShell
        fullName={session.fullName}
        email={session.email}
        role={session.role}
        title="Issue Log"
        description="Track operational issues in one place with a local-first workflow."
      >
        <div className="space-y-6">
          <section className="glass-panel-issue rounded-[28px] border border-yellow-200/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">
                  Active policy
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-yellow-900">
                  Issue workflow rules in effect
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-yellow-800">
                  These values come directly from Settings and now affect real issue behavior,
                  including transition rules, owner requirements, and SLA targets.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-200 bg-white/72 px-4 py-3 text-sm text-yellow-800">
                Change these rules from the Settings page.
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PolicyCard
                title="Start progress rule"
                value={policy.requireOwnerToStartProgress ? "Owner required" : "Owner optional"}
                helper="Controls whether an issue needs an owner before moving to In Progress."
                icon={<UserRoundCheck className="size-5" />}
              />
              <PolicyCard
                title="Resolve / close rule"
                value={policy.requireOwnerToResolve ? "Owner required" : "Owner optional"}
                helper="Controls whether an issue needs an owner before resolving or closing."
                icon={<ShieldAlert className="size-5" />}
              />
              <PolicyCard
                title="Reopen rule"
                value={policy.allowReopenClosed ? "Allowed" : "Blocked"}
                helper="Controls whether closed or cancelled issues can be reopened."
                icon={<RefreshCcw className="size-5" />}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-yellow-200 bg-white/72 p-4">
              <div className="text-sm font-medium text-yellow-800">SLA by priority</div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {slaRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-2xl border border-yellow-100 bg-yellow-50/50 px-4 py-3"
                  >
                    <div className="text-xs uppercase tracking-[0.14em] text-yellow-700">
                      {row.label}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {row.hours}
                    </div>
                    <div className="text-xs text-slate-500">hours</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <SummaryCard
              title="Total Issues"
              value={issues.length}
              helper="All issues in the local store"
              href="/issue-log"
              icon={<FolderSearch className="size-5" />}
            />
            <SummaryCard
              title="Open Issues"
              value={openCount}
              helper="Open, in progress, and pending"
              href="/issue-log?status=open"
              icon={<Clock3 className="size-5" />}
            />
            <SummaryCard
              title="Resolved Issues"
              value={resolvedCount}
              helper="Resolved and closed"
              href="/issue-log?status=resolved"
              icon={<FolderSearch className="size-5" />}
            />
            <SummaryCard
              title="Critical Issues"
              value={criticalCount}
              helper="Items marked as critical priority"
              icon={<ShieldAlert className="size-5" />}
            />
            <SummaryCard
              title="Unassigned"
              value={unassignedCount}
              helper="Open issues without an owner"
              href="/issue-log?owner=unassigned"
              icon={<AlertTriangle className="size-5" />}
            />
            <SummaryCard
              title="Aging 7+ Days"
              value={agingSevenPlusCount}
              helper="Open issues older than 7 days"
              href="/issue-log?aging=gte7"
              icon={<Clock3 className="size-5" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-4">
              <CreateIssueForm
                reporterId={session.userId}
                reporterName={session.fullName}
                reporterEmail={session.email}
              />

              <div className="glass-panel-issue rounded-[28px] p-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Overview
                </h2>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>Customers with issues: {customerCount}</p>
                  <p>
                    Current scope: create, list, search, filter, detail, update,
                    and history.
                  </p>
                  <p>
                    Operational focus: assignment coverage, priority control,
                    and aging visibility.
                  </p>
                </div>
              </div>
            </div>

            <IssuesTable
              issues={issues}
              defaultFilters={{
                status: filters.status,
                owner: filters.owner,
                aging: filters.aging,
              }}
            />
          </section>
        </div>
      </AppShell>
    </div>
  );
}