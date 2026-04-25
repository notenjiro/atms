"use client";

import { useEffect, useMemo, useState } from "react";

import IssueDetailModal from "@/components/issues/issue-detail-modal";
import type { IssuePolicySettings } from "@/modules/issues/issue.types";

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
  policy?: Pick<
    IssuePolicySettings,
    "slaHoursLow" | "slaHoursMedium" | "slaHoursHigh" | "slaHoursCritical"
  >;
  defaultFilters?: {
    status?: "open" | "resolved";
    owner?: "unassigned";
    aging?: "gte7";
  };
};

const DEFAULT_POLICY = {
  slaHoursLow: 72,
  slaHoursMedium: 24,
  slaHoursHigh: 8,
  slaHoursCritical: 4,
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

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

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

function formatStatusLabel(status: IssueTableItem["status"]) {
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPriorityLabel(priority: IssueTableItem["priority"]) {
  if (priority === "critical") return "Very High";
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

function Badge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex min-w-fit items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function isClosedLikeStatus(status: IssueTableItem["status"]) {
  return status === "resolved" || status === "closed" || status === "cancelled";
}

function getAgingInHours(issue: IssueTableItem) {
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
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  return diffHours < 0 ? 0 : diffHours;
}

function getAgingInDays(issue: IssueTableItem) {
  const hours = getAgingInHours(issue);

  if (hours === null) {
    return null;
  }

  return Math.floor(hours / 24);
}

function getSlaHours(
  priority: IssueTableItem["priority"],
  policy?: IssuesTableProps["policy"],
) {
  const activePolicy = policy ?? DEFAULT_POLICY;

  switch (priority) {
    case "low":
      return activePolicy.slaHoursLow;
    case "medium":
      return activePolicy.slaHoursMedium;
    case "high":
      return activePolicy.slaHoursHigh;
    case "critical":
      return activePolicy.slaHoursCritical;
    default:
      return activePolicy.slaHoursLow;
  }
}

function getAgingBadgeClass(
  issue: IssueTableItem,
  policy?: IssuesTableProps["policy"],
) {
  const hours = getAgingInHours(issue);

  if (hours === null) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  const slaHours = getSlaHours(issue.priority, policy);

  if (hours > slaHours) {
    return "border-red-200 bg-red-50 text-red-700 font-semibold";
  }

  if (hours >= slaHours * 0.7) {
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
  policy,
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
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    50,
  );
  const [page, setPage] = useState(1);
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
      const agingDays = getAgingInDays(issue);

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
          ["resolved", "closed", "cancelled"].includes(issue.status));

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
            (agingDays ?? 0) >= 7
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

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredIssues.length);

  const paginatedIssues = filteredIssues.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [owner, pageSize, priority, search, status]);

  function openIssue(issueId: string) {
    setSelectedIssueId(issueId);
  }

  function closeIssueModal() {
    setSelectedIssueId(null);
  }

  function goToPreviousPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    setPage((current) => Math.min(totalPages, current + 1));
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
          <table className="min-w-[1720px] border-collapse text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="w-[120px] border-b px-3 py-3 font-medium">
                  Issue No
                </th>
                <th className="w-[460px] border-b px-3 py-3 font-medium">
                  Title
                </th>
                <th className="w-[250px] border-b px-3 py-3 font-medium">
                  Customer
                </th>
                <th className="w-[210px] border-b px-3 py-3 font-medium">
                  Owner
                </th>
                <th className="w-[130px] border-b px-3 py-3 font-medium">
                  Status
                </th>
                <th className="w-[120px] border-b px-3 py-3 font-medium">
                  Priority
                </th>
                <th className="w-[110px] border-b px-3 py-3 font-medium">
                  Aging
                </th>
                <th className="w-[120px] border-b px-3 py-3 font-medium">
                  Source
                </th>
                <th className="w-[170px] border-b px-3 py-3 font-medium">
                  Reporter
                </th>
                <th className="w-[130px] border-b px-3 py-3 font-medium">
                  Opened
                </th>
                <th className="w-[130px] border-b px-3 py-3 font-medium">
                  Closed
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedIssues.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No issues found.
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((issue) => {
                  const agingDays = getAgingInDays(issue);

                  return (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="border-b px-3 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => openIssue(issue.id)}
                          className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:border-gray-300 hover:bg-gray-100 active:scale-[0.98]"
                        >
                          {issue.issueNo}
                        </button>
                      </td>

                      <td className="border-b px-3 py-3 text-gray-900">
                        <div
                          className="line-clamp-2 max-w-[430px] leading-5"
                          title={issue.title}
                        >
                          {issue.title}
                        </div>
                      </td>

                      <td className="border-b px-3 py-3">
                        <div className="max-w-[230px] leading-5">
                          {issue.customerName}
                        </div>
                      </td>

                      <td className="border-b px-3 py-3">
                        <div className="max-w-[190px] leading-5">
                          <div className="text-sm text-gray-900">
                            {issue.ownerName || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {issue.ownerEmail || ""}
                          </div>
                        </div>
                      </td>

                      <td className="border-b px-3 py-3">
                        <Badge
                          label={formatStatusLabel(issue.status)}
                          className={getStatusBadgeClass(issue.status)}
                        />
                      </td>

                      <td className="border-b px-3 py-3">
                        <Badge
                          label={formatPriorityLabel(issue.priority)}
                          className={getPriorityBadgeClass(issue.priority)}
                        />
                      </td>

                      <td className="border-b px-3 py-3">
                        <Badge
                          label={formatAgingLabel(agingDays)}
                          className={getAgingBadgeClass(issue, policy)}
                        />
                      </td>

                      <td className="border-b px-3 py-3">
                        {formatSourceLabel(issue.source)}
                      </td>

                      <td className="border-b px-3 py-3">
                        <div className="max-w-[150px] leading-5">
                          {issue.reporterName || "-"}
                        </div>
                      </td>

                      <td className="border-b px-3 py-3">
                        <div className="min-w-[100px]">
                          {formatDate(issue.openedAt)}
                        </div>
                      </td>

                      <td className="border-b px-3 py-3">
                        <div className="min-w-[100px]">
                          {formatDate(issue.closedAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredIssues.length === 0 ? 0 : startIndex + 1}-
            {endIndex} of {filteredIssues.length}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-600">Rows per page</label>
            <select
              value={pageSize}
              onChange={(event) =>
                setPageSize(
                  Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number],
                )
              }
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600">
              Page {safePage} of {totalPages}
            </div>

            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={safePage <= 1}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={safePage >= totalPages}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
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