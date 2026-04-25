"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import IssueHistoryPanel from "@/components/issues/issue-history-panel";
import IssueStatusActions from "@/components/issues/issue-status-actions";

type IssueStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "resolved"
  | "closed"
  | "cancelled";

type IssuePriority = "low" | "medium" | "high" | "critical";

type IssueSource = "manual" | "servicenow" | "email" | "phone";

export type IssueDetailModalItem = {
  id: string;
  issueNo: string;
  title: string;
  description: string;
  customerName: string;
  projectAccountId?: string;
  projectAccountCode?: string;
  projectAccountName?: string;
  status: IssueStatus;
  priority: IssuePriority;
  source: IssueSource;
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

type IssueWorklogItem = {
  id: string;
  issueId: string;
  actorId: string;
  actorName: string;
  actorEmail?: string;
  hours: number;
  isBillable: boolean;
  description?: string;
  workDate: string;
  createdAt: string;
};

type WorklogSummary = {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalManDays: number;
  billableManDays: number;
  nonBillableManDays: number;
  byPerson: Array<{
    actorId: string;
    actorName: string;
    actorEmail?: string;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    entries: number;
  }>;
};

type BillingSummary = {
  totalTickets: number;
  totalBillableHours: number;
  totalBillableManDays: number;
  totalNonChargeTickets: number;
  byPerson: Array<{
    name: string;
    totalBillableHours: number;
    totalBillableManDays: number;
    tickets: number;
  }>;
};

type IssuePolicy = {
  slaHoursLow: number;
  slaHoursMedium: number;
  slaHoursHigh: number;
  slaHoursCritical: number;
};

type IssueDetailModalProps = {
  open: boolean;
  issueId: string | null;
  onClose: () => void;
};

type IssueApiResponse = {
  data?: {
    item?: IssueDetailModalItem;
  };
};

type WorklogApiResponse = {
  data?: {
    items?: IssueWorklogItem[];
    summary?: WorklogSummary;
  };
};

type BillingApiResponse = {
  data?: {
    policy?: IssuePolicy;
    summary?: BillingSummary;
  };
};

const DEFAULT_POLICY: IssuePolicy = {
  slaHoursLow: 72,
  slaHoursMedium: 24,
  slaHoursHigh: 8,
  slaHoursCritical: 4,
};

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatStatusLabel(status: IssueStatus) {
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPriorityLabel(priority: IssuePriority) {
  if (priority === "critical") return "Very High";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatSourceLabel(source: IssueSource) {
  if (source === "servicenow") return "ServiceNow";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function getStatusBadgeClass(status: IssueStatus) {
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

function getPriorityBadgeClass(priority: IssuePriority) {
  switch (priority) {
    case "low":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "medium":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "high":
      return "border-red-200 bg-red-50 text-red-700";
    case "critical":
      return "border-purple-200 bg-purple-50 text-purple-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function isClosedLikeStatus(status: IssueStatus) {
  return status === "resolved" || status === "closed" || status === "cancelled";
}

function getAgingHours(issue: IssueDetailModalItem) {
  const opened = new Date(issue.openedAt);

  if (Number.isNaN(opened.getTime())) {
    return null;
  }

  const endValue =
    issue.closedAt ||
    issue.resolvedAt ||
    issue.cancelledAt ||
    undefined;

  const endDate = endValue ? new Date(endValue) : new Date();

  if (Number.isNaN(endDate.getTime())) {
    return null;
  }

  const diffMs = endDate.getTime() - opened.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  return hours < 0 ? 0 : hours;
}

function getSlaHours(issue: IssueDetailModalItem, policy: IssuePolicy) {
  switch (issue.priority) {
    case "low":
      return policy.slaHoursLow;
    case "medium":
      return policy.slaHoursMedium;
    case "high":
      return policy.slaHoursHigh;
    case "critical":
      return policy.slaHoursCritical;
    default:
      return policy.slaHoursLow;
  }
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="break-words text-sm text-gray-900">
        {value?.trim() ? value : "-"}
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  subValue,
  danger,
}: {
  label: string;
  value: string;
  subValue?: string;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 border-r border-gray-200 px-4 last:border-r-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div
        className={`mt-1 truncate text-base font-semibold ${
          danger ? "text-red-700" : "text-gray-900"
        }`}
      >
        {value}
      </div>
      {subValue ? (
        <div className="truncate text-xs text-gray-500">{subValue}</div>
      ) : null}
    </div>
  );
}

export default function IssueDetailModal({
  open,
  issueId,
  onClose,
}: IssueDetailModalProps) {
  const [issue, setIssue] = useState<IssueDetailModalItem | null>(null);
  const [worklogs, setWorklogs] = useState<IssueWorklogItem[]>([]);
  const [worklogSummary, setWorklogSummary] = useState<WorklogSummary | null>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [policy, setPolicy] = useState<IssuePolicy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadIssueBundle() {
    if (!issueId) return;

    try {
      setLoading(true);

      const [issueResponse, worklogResponse, billingResponse] =
        await Promise.all([
          fetch(`/api/issues/${issueId}`, { cache: "no-store" }),
          fetch(`/api/issues/${issueId}/worklogs`, { cache: "no-store" }),
          fetch(`/api/issues/${issueId}/billing`, { cache: "no-store" }),
        ]);

      const issueJson =
        (await issueResponse.json().catch(() => null)) as IssueApiResponse | null;
      const worklogJson =
        (await worklogResponse.json().catch(() => null)) as WorklogApiResponse | null;
      const billingJson =
        (await billingResponse.json().catch(() => null)) as BillingApiResponse | null;

      if (!issueResponse.ok) {
        throw new Error("Failed to load issue");
      }

      setIssue(issueJson?.data?.item ?? null);
      setWorklogs(worklogJson?.data?.items ?? []);
      setWorklogSummary(worklogJson?.data?.summary ?? null);
      setBillingSummary(billingJson?.data?.summary ?? null);
      setPolicy(billingJson?.data?.policy ?? DEFAULT_POLICY);
    } catch {
      setIssue(null);
      setWorklogs([]);
      setWorklogSummary(null);
      setBillingSummary(null);
      setPolicy(DEFAULT_POLICY);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !issueId) return;
    loadIssueBundle();
  }, [open, issueId, refreshKey]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const slaStatus = useMemo(() => {
    if (!issue) return null;

    const agingHours = getAgingHours(issue);
    const slaHours = getSlaHours(issue, policy);
    const breached = agingHours !== null && agingHours > slaHours;

    return { agingHours, slaHours, breached };
  }, [issue, policy]);

  function handleIssueChanged() {
    setRefreshKey((current) => current + 1);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close issue detail modal"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="relative z-[121] flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
        <div className="border-b bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                Issue Detail
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {loading ? "Loading..." : issue?.issueNo || "-"}
                </h2>

                {issue ? (
                  <>
                    <Badge
                      label={formatStatusLabel(issue.status)}
                      className={getStatusBadgeClass(issue.status)}
                    />
                    <Badge
                      label={formatPriorityLabel(issue.priority)}
                      className={getPriorityBadgeClass(issue.priority)}
                    />
                    {slaStatus?.breached ? (
                      <Badge
                        label="SLA Breached"
                        className="border-red-200 bg-red-50 text-red-700"
                      />
                    ) : null}
                  </>
                ) : null}
              </div>

              <p className="mt-2 break-words text-sm text-gray-600">
                {loading ? "Loading issue details..." : issue?.title || "-"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-xl text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
            >
              ×
            </button>
          </div>

          {issue ? (
            <div className="mt-4 overflow-hidden rounded-xl border bg-gray-50">
              <div className="grid grid-cols-2 gap-y-3 py-3 md:grid-cols-6">
                <MiniMetric
                  label="SLA"
                  value={`${slaStatus?.slaHours ?? "-"}h`}
                  subValue={formatPriorityLabel(issue.priority)}
                  danger={slaStatus?.breached}
                />
                <MiniMetric
                  label="Aging"
                  value={
                    slaStatus?.agingHours === null
                      ? "-"
                      : `${slaStatus?.agingHours ?? 0}h`
                  }
                  subValue={isClosedLikeStatus(issue.status) ? "Closed duration" : "Open duration"}
                  danger={slaStatus?.breached}
                />
                <MiniMetric
                  label="SN Billing"
                  value={`${formatNumber(billingSummary?.totalBillableHours ?? 0)}h`}
                  subValue={`${formatNumber(
                    billingSummary?.totalBillableManDays ?? 0,
                  )} MD`}
                />
                <MiniMetric
                  label="Worklog"
                  value={`${formatNumber(worklogSummary?.totalHours ?? 0)}h`}
                  subValue={`${formatNumber(worklogSummary?.totalManDays ?? 0)} MD`}
                />
                <MiniMetric
                  label="Billable"
                  value={`${formatNumber(worklogSummary?.billableHours ?? 0)}h`}
                  subValue={`${formatNumber(
                    worklogSummary?.billableManDays ?? 0,
                  )} MD`}
                />
                <MiniMetric
                  label="Non-billable"
                  value={`${formatNumber(worklogSummary?.nonBillableHours ?? 0)}h`}
                  subValue={`${formatNumber(
                    worklogSummary?.nonBillableManDays ?? 0,
                  )} MD`}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">
              Loading issue...
            </div>
          ) : !issue ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">
              Unable to load issue details.
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
              <div className="space-y-5">
                <IssueStatusActions
                  issueId={issue.id}
                  currentStatus={issue.status}
                  onUpdated={handleIssueChanged}
                />

                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Description
                  </h3>

                  <div className="mt-3 min-h-28 whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm text-gray-900">
                    {issue.description?.trim() ? issue.description : "-"}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Billing & Worklog
                  </h3>

                  {billingSummary?.byPerson?.length ? (
                    <div className="mt-4 rounded-xl border bg-gray-50 p-3">
                      <div className="text-sm font-semibold text-gray-900">
                        ServiceNow billing by person
                      </div>

                      <div className="mt-3 space-y-2">
                        {billingSummary.byPerson.map((row) => (
                          <div
                            key={row.name}
                            className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-gray-900">
                                {row.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {row.tickets} ticket{row.tickets === 1 ? "" : "s"}
                              </div>
                            </div>
                            <div className="text-right font-semibold text-gray-900">
                              {formatNumber(row.totalBillableHours)}h
                              <div className="text-xs font-normal text-gray-500">
                                {formatNumber(row.totalBillableManDays)} MD
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-gray-500">
                      No ServiceNow billing data found for this ticket.
                    </div>
                  )}

                  {worklogs.length ? (
                    <div className="mt-4 space-y-2">
                      {worklogs.map((worklog) => (
                        <div
                          key={worklog.id}
                          className="rounded-xl border bg-gray-50 p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {worklog.actorName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(worklog.workDate)} •{" "}
                                {worklog.isBillable ? "Billable" : "Non-billable"}
                              </div>
                            </div>
                            <div className="font-semibold text-gray-900">
                              {formatNumber(worklog.hours)}h
                            </div>
                          </div>

                          {worklog.description ? (
                            <div className="mt-2 text-gray-700">
                              {worklog.description}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-gray-500">
                      No manual worklog entries. Report will use ServiceNow billing data when available.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Ticket Information
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Issue No" value={issue.issueNo} />
                    <Field label="Customer" value={issue.customerName} />
                    <Field
                      label="Project Account Code"
                      value={issue.projectAccountCode}
                    />
                    <Field
                      label="Project Account Name"
                      value={issue.projectAccountName}
                    />
                    <Field
                      label="External Ticket No"
                      value={issue.externalTicketNo}
                    />
                    <Field label="Source" value={formatSourceLabel(issue.source)} />
                  </div>
                </div>

                <IssueHistoryPanel issueId={issue.id} refreshKey={refreshKey} />
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Ownership
                  </h3>

                  <div className="mt-4 grid gap-4">
                    <Field label="Owner Name" value={issue.ownerName} />
                    <Field label="Owner Email" value={issue.ownerEmail} />
                    <Field label="Reporter ID" value={issue.reporterId} />
                    <Field label="Reporter Name" value={issue.reporterName} />
                    <Field label="Reporter Email" value={issue.reporterEmail} />
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Timeline
                  </h3>

                  <div className="mt-4 grid gap-4">
                    <Field label="Opened At" value={formatDateTime(issue.openedAt)} />
                    <Field
                      label="Resolved At"
                      value={formatDateTime(issue.resolvedAt)}
                    />
                    <Field label="Closed At" value={formatDateTime(issue.closedAt)} />
                    <Field
                      label="Cancelled At"
                      value={formatDateTime(issue.cancelledAt)}
                    />
                    <Field label="Created At" value={formatDateTime(issue.createdAt)} />
                    <Field label="Updated At" value={formatDateTime(issue.updatedAt)} />
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Report Data Readiness
                  </h3>

                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Project</span>
                      <span className="font-medium text-gray-900">
                        {issue.projectAccountId ? "Ready" : "Missing"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Billing</span>
                      <span className="font-medium text-gray-900">
                        {(billingSummary?.totalBillableHours ?? 0) > 0
                          ? "Ready"
                          : "No hours"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Worklog</span>
                      <span className="font-medium text-gray-900">
                        {worklogs.length > 0 ? "Ready" : "Import only"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">SLA</span>
                      <span
                        className={
                          slaStatus?.breached
                            ? "font-semibold text-red-600"
                            : "font-medium text-gray-900"
                        }
                      >
                        {slaStatus?.breached ? "Breached" : "OK"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Next Step
                  </h3>

                  <p className="mt-3 text-sm text-gray-600">
                    Open the full issue page to edit fields, update ownership,
                    and manage the full ticket workflow.
                  </p>

                  <div className="mt-4">
                    <Link
                      href={`/issue-log/${issue.id}`}
                      className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Open Full Page
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white"
          >
            Close
          </button>

          {issueId ? (
            <Link
              href={`/issue-log/${issueId}`}
              className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Open Full Page
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}