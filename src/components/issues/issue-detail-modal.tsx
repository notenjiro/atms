"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type IssueDetailModalProps = {
  open: boolean;
  issueId: string | null;
  onClose: () => void;
};

type ApiResponse = {
  data?: {
    item?: IssueDetailModalItem;
  };
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

function formatStatusLabel(status: IssueStatus) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function formatPriorityLabel(priority: IssuePriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatSourceLabel(source: IssueSource) {
  switch (source) {
    case "servicenow":
      return "ServiceNow";
    default:
      return source.charAt(0).toUpperCase() + source.slice(1);
  }
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
      <div className="break-words text-sm text-gray-900">
        {value?.trim() ? value : "-"}
      </div>
    </div>
  );
}

export default function IssueDetailModal({
  open,
  issueId,
  onClose,
}: IssueDetailModalProps) {
  const [issue, setIssue] = useState<IssueDetailModalItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!open || !issueId) {
      return;
    }

    async function loadIssue() {
      try {
        setLoading(true);

        const response = await fetch(`/api/issues/${issueId}`, {
          cache: "no-store",
        });

        const json = (await response.json().catch(() => null)) as ApiResponse | null;

        if (!response.ok) {
          throw new Error("Failed to load issue");
        }

        setIssue(json?.data?.item ?? null);
      } catch {
        setIssue(null);
      } finally {
        setLoading(false);
      }
    }

    loadIssue();
  }, [open, issueId, refreshKey]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  function handleIssueChanged() {
    setRefreshKey((current) => current + 1);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close issue detail modal"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="relative z-[121] flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b bg-white px-5 py-4">
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
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
              <div className="space-y-6">
                <IssueStatusActions
                  issueId={issue.id}
                  currentStatus={issue.status}
                  onUpdated={handleIssueChanged}
                />

                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Description
                  </h3>

                  <div className="mt-3 min-h-28 rounded-lg border bg-gray-50 p-3 text-sm text-gray-900 whitespace-pre-wrap">
                    {issue.description?.trim() ? issue.description : "-"}
                  </div>
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
                    <Field
                      label="Source"
                      value={formatSourceLabel(issue.source)}
                    />
                  </div>
                </div>

                <IssueHistoryPanel
                  issueId={issue.id}
                  refreshKey={refreshKey}
                />
              </div>

              <div className="space-y-6">
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
                    <Field
                      label="Closed At"
                      value={formatDateTime(issue.closedAt)}
                    />
                    <Field
                      label="Cancelled At"
                      value={formatDateTime(issue.cancelledAt)}
                    />
                    <Field
                      label="Created At"
                      value={formatDateTime(issue.createdAt)}
                    />
                    <Field
                      label="Updated At"
                      value={formatDateTime(issue.updatedAt)}
                    />
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