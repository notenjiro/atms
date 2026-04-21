import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Clock3, FolderSearch, ShieldAlert } from "lucide-react";

import CreateIssueForm from "@/components/issues/create-issue-form";
import IssuesTable, {
  type IssueTableItem,
} from "@/components/issues/issues-table";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/modules/auth/auth.session";

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

export default async function IssueLogPage({
  searchParams,
}: IssueLogPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const filters = await searchParams;
  const issues = await getIssues();

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
