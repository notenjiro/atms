"use client";

import { useMemo, useState } from "react";

import IssueDetailModal from "@/components/issues/issue-detail-modal";

export type IssueTableItem = {
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

type IssuesTableProps = {
  issues: IssueTableItem[];
  defaultFilters?: {
    status?: "open" | "resolved";
    owner?: "unassigned";
    aging?: "gte7";
  };
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open Group" },
  { value: "resolved", label: "Resolved Group" },
] as const;

const PRIORITY_OPTIONS: Array<IssueTableItem["priority"] | "all"> = [
  "all",
  "low",
  "medium",
  "high",
  "critical",
];

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatStatusLabel(status: IssueTableItem["status"]) {
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPriorityLabel(priority: IssueTableItem["priority"]) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatSourceLabel(source: IssueTableItem["source"]) {
  if (source === "servicenow") return "ServiceNow";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function getStatusBadgeClass(status: IssueTableItem["status"]) {
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

function getPriorityBadgeClass(priority: IssueTableItem["priority"]) {
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

function getAgingBadgeClass(
  days: number | null,
  status: IssueTableItem["status"],
) {
  if (days === null) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (status === "resolved" || status === "closed" || status === "cancelled") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (days >= 14) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (days >= 7) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatAgingLabel(days: number | null) {
  if (days === null) {
    return "-";
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day";
  }

  return `${days} days`;
}

export default function IssuesTable({
  issues,
  defaultFilters,
}: IssuesTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "resolved">(
    defaultFilters?.status ?? "all",
  );
  const [priority, setPriority] = useState<IssueTableItem["priority"] | "all">(
    "all",
  );
  const [owner, setOwner] = useState<string>(
    defaultFilters?.owner === "unassigned" ? "" : "all",
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const ownerOptions = useMemo(() => {
    const uniqueOwners = Array.from(
      new Set(
        issues
          .map((issue) => issue.ownerName?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return uniqueOwners;
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesSearch =
        keyword.length === 0 ||
        issue.issueNo.toLowerCase().includes(keyword) ||
        issue.title.toLowerCase().includes(keyword) ||
        issue.customerName.toLowerCase().includes(keyword) ||
        (issue.ownerName ?? "").toLowerCase().includes(keyword) ||
        (issue.reporterName ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        status === "all" ||
        (status === "open" &&
          ["open", "in_progress", "pending"].includes(issue.status)) ||
        (status === "resolved" &&
          ["resolved", "closed"].includes(issue.status));

      const matchesPriority = priority === "all" || issue.priority === priority;

      const matchesOwner =
        owner === "all"
          ? true
          : owner === ""
            ? !(issue.ownerName ?? "").trim()
            : (issue.ownerName ?? "").trim() === owner;

      const matchesAging =
        defaultFilters?.aging === "gte7"
          ? ["open", "in_progress", "pending"].includes(issue.status) &&
            (getAgingInDays(issue.openedAt) ?? 0) >= 7
          : true;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesOwner &&
        matchesAging
      );
    });
  }, [defaultFilters?.aging, issues, owner, priority, search, status]);

  function openIssue(issueId: string) {
    setSelectedIssueId(issueId);
  }

  function closeIssueModal() {
    setSelectedIssueId(null);
  }

  return (
    <>
      <div className="glass-panel-issue rounded-xl border bg-white">
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Issues</h2>
            <div className="text-sm text-gray-500">
              {filteredIssues.length} of {issues.length} item
              {issues.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Issue no, title, customer, owner, reporter"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "all" | "open" | "resolved")
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as IssueTableItem["priority"] | "all")
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">All Priorities</option>
                {PRIORITY_OPTIONS.filter((option) => option !== "all").map(
                  (option) => (
                    <option key={option} value={option}>
                      {formatPriorityLabel(option)}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Owner</label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">All Owners</option>
                <option value="">Unassigned</option>
                {ownerOptions.map((ownerName) => (
                  <option key={ownerName} value={ownerName}>
                    {ownerName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="border-b px-4 py-3 font-medium">Issue No</th>
                <th className="border-b px-4 py-3 font-medium">Title</th>
                <th className="border-b px-4 py-3 font-medium">Customer</th>
                <th className="border-b px-4 py-3 font-medium">Owner</th>
                <th className="border-b px-4 py-3 font-medium">Status</th>
                <th className="border-b px-4 py-3 font-medium">Priority</th>
                <th className="border-b px-4 py-3 font-medium">Aging</th>
                <th className="border-b px-4 py-3 font-medium">Source</th>
                <th className="border-b px-4 py-3 font-medium">Reporter</th>
                <th className="border-b px-4 py-3 font-medium">Opened</th>
                <th className="border-b px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>

            <tbody>
              {filteredIssues.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No issues found.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => {
                  const agingDays = getAgingInDays(issue.openedAt);

                  return (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="border-b px-4 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => openIssue(issue.id)}
                          className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-100 hover:border-gray-300 active:scale-[0.98]"
                        >
                          {issue.issueNo}
                        </button>
                      </td>

                      <td className="border-b px-4 py-3 text-gray-900">
                        {issue.title}
                      </td>

                      <td className="border-b px-4 py-3">{issue.customerName}</td>

                      <td className="border-b px-4 py-3">
                        <div className="min-w-[140px]">
                          <div className="text-sm text-gray-900">
                            {issue.ownerName || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {issue.ownerEmail || ""}
                          </div>
                        </div>
                      </td>

                      <td className="border-b px-4 py-3">
                        <Badge
                          label={formatStatusLabel(issue.status)}
                          className={getStatusBadgeClass(issue.status)}
                        />
                      </td>

                      <td className="border-b px-4 py-3">
                        <Badge
                          label={formatPriorityLabel(issue.priority)}
                          className={getPriorityBadgeClass(issue.priority)}
                        />
                      </td>

                      <td className="border-b px-4 py-3">
                        <Badge
                          label={formatAgingLabel(agingDays)}
                          className={getAgingBadgeClass(agingDays, issue.status)}
                        />
                      </td>

                      <td className="border-b px-4 py-3">
                        {formatSourceLabel(issue.source)}
                      </td>

                      <td className="border-b px-4 py-3">
                        {issue.reporterName || "-"}
                      </td>

                      <td className="border-b px-4 py-3">
                        {formatDate(issue.openedAt)}
                      </td>

                      <td className="border-b px-4 py-3">
                        {formatDate(issue.updatedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <IssueDetailModal
        open={selectedIssueId !== null}
        issueId={selectedIssueId}
        onClose={closeIssueModal}
      />
    </>
  );
}