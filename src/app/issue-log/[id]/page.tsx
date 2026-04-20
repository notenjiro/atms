import { notFound, redirect } from "next/navigation";

import IssueHistoryPanel from "@/components/issues/issue-history-panel";
import IssueStatusActions from "@/components/issues/issue-status-actions";
import UpdateIssueForm from "@/components/issues/update-issue-form";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/modules/auth/auth.session";

type IssueDetail = {
  id: string;
  issueNo: string;
  title: string;
  description: string;
  customerName: string;
  projectAccountId?: string;
  projectAccountCode?: string;
  projectAccountName?: string;
  status: "open" | "in_progress" | "pending" | "resolved" | "closed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  source: "manual" | "servicenow" | "email" | "phone";
  ownerName?: string;
  ownerEmail?: string;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  externalTicketNo?: string;
  openedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

type IssueApiResponse = {
  data?: {
    item?: IssueDetail | null;
  };
};

type IssueDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStatusLabel(status: IssueDetail["status"]) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function formatPriorityLabel(priority: IssueDetail["priority"]) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatSourceLabel(source: IssueDetail["source"]) {
  switch (source) {
    case "servicenow":
      return "ServiceNow";
    default:
      return source.charAt(0).toUpperCase() + source.slice(1);
  }
}

function getStatusBadgeClass(status: IssueDetail["status"]) {
  switch (status) {
    case "open":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "pending":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "resolved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "closed":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getPriorityBadgeClass(priority: IssueDetail["priority"]) {
  switch (priority) {
    case "low":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "medium":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "high":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function Badge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-sm text-gray-900">{value?.trim() ? value : "-"}</div>
    </div>
  );
}

async function getIssue(id: string): Promise<IssueDetail | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/issues/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as IssueApiResponse;
    return json?.data?.item ?? null;
  } catch {
    return null;
  }
}

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default async function IssueDetailPage({
  params,
}: IssueDetailPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const issue = await getIssue(id);

  if (!issue) {
    notFound();
  }

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      title={issue.issueNo}
      description={issue.title}
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Status">
            <Badge
              label={formatStatusLabel(issue.status)}
              className={getStatusBadgeClass(issue.status)}
            />
          </SummaryCard>

          <SummaryCard title="Priority">
            <Badge
              label={formatPriorityLabel(issue.priority)}
              className={getPriorityBadgeClass(issue.priority)}
            />
          </SummaryCard>

          <SummaryCard title="Source">
            <div className="text-lg font-semibold text-gray-900">
              {formatSourceLabel(issue.source)}
            </div>
          </SummaryCard>

          <SummaryCard title="Customer">
            <div className="text-lg font-semibold text-gray-900">
              {issue.customerName}
            </div>
          </SummaryCard>
        </section>

        <IssueStatusActions issueId={issue.id} currentStatus={issue.status} />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <UpdateIssueForm
              issue={{
                id: issue.id,
                title: issue.title,
                description: issue.description,
                customerName: issue.customerName,
                projectAccountId: issue.projectAccountId,
                status: issue.status,
                priority: issue.priority,
                source: issue.source,
                ownerName: issue.ownerName,
                ownerEmail: issue.ownerEmail,
                externalTicketNo: issue.externalTicketNo,
              }}
            />

            <div className="rounded-xl border bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Issue Details
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Issue No" value={issue.issueNo} />
                <Field label="Customer" value={issue.customerName} />
                <Field label="External Ticket No" value={issue.externalTicketNo} />
                <Field label="Project Account Code" value={issue.projectAccountCode} />
                <Field label="Project Account Name" value={issue.projectAccountName} />
                <Field label="Owner Name" value={issue.ownerName} />
                <Field label="Owner Email" value={issue.ownerEmail} />
                <Field label="Reporter ID" value={issue.reporterId} />
              </div>
            </div>

            <IssueHistoryPanel issueId={issue.id} />
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">People</h2>

              <div className="mt-4 grid gap-4">
                <Field label="Reporter Name" value={issue.reporterName} />
                <Field label="Reporter Email" value={issue.reporterEmail} />
                <Field label="Owner Name" value={issue.ownerName} />
                <Field label="Owner Email" value={issue.ownerEmail} />
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>

              <div className="mt-4 grid gap-4">
                <Field label="Opened At" value={formatDateTime(issue.openedAt)} />
                <Field label="Resolved At" value={formatDateTime(issue.resolvedAt)} />
                <Field label="Closed At" value={formatDateTime(issue.closedAt)} />
                <Field label="Cancelled At" value={formatDateTime(issue.cancelledAt)} />
                <Field label="Created At" value={formatDateTime(issue.createdAt)} />
                <Field label="Updated At" value={formatDateTime(issue.updatedAt)} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}