"use client";

import { useMemo, useState } from "react";

import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

type ProjectAccountsTableProps = {
  items: ProjectAccount[];
  title: string;
  emptyMessage: string;
};

type StatusFilter = "all" | ProjectAccount["status"];
type ExpiryFilter = "all" | "expiringSoon";

function getStatusBadgeClassName(status: ProjectAccount["status"]): string {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "expired":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "inactive":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "draft":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "done":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getDaysUntil(endDate: string): number {
  const today = new Date();
  const target = new Date(endDate);

  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function isExpiringSoon(endDate: string): boolean {
  const diffDays = getDaysUntil(endDate);
  return diffDays >= 0 && diffDays <= 30;
}

function isExpiringCritical(endDate: string): boolean {
  const diffDays = getDaysUntil(endDate);
  return diffDays >= 0 && diffDays <= 7;
}

function getRemainingEffortRatio(item: ProjectAccount): number {
  if (item.allocatedManDays <= 0) {
    return 0;
  }

  return item.remainingManDays / item.allocatedManDays;
}

function isEffortExhausted(item: ProjectAccount): boolean {
  return item.remainingManDays <= 0;
}

function isEffortLow(item: ProjectAccount): boolean {
  if (isEffortExhausted(item)) {
    return false;
  }

  return getRemainingEffortRatio(item) <= 0.1;
}

function formatEffort(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 5,
      });
}

function getRowClassName(item: ProjectAccount): string {
  if (item.status === "expired" || isEffortExhausted(item)) {
    return "bg-rose-50/60";
  }

  if (isExpiringCritical(item.endDate)) {
    return "bg-amber-50/80";
  }

  if (isExpiringSoon(item.endDate) || isEffortLow(item)) {
    return "bg-amber-50/40";
  }

  return "";
}

export function ProjectAccountsTable({
  items,
  title,
  emptyMessage,
}: ProjectAccountsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        keyword === "" ||
        item.projectName.toLowerCase().includes(keyword) ||
        item.customerName.toLowerCase().includes(keyword) ||
        item.contractNo.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesExpiry =
        expiryFilter === "all" ||
        (expiryFilter === "expiringSoon" && isExpiringSoon(item.endDate));

      return matchesSearch && matchesStatus && matchesExpiry;
    });
  }, [items, searchTerm, statusFilter, expiryFilter]);

  const hasItems = filteredItems.length > 0;

  const warningSummary = useMemo(() => {
    return {
      expiringCritical: filteredItems.filter((item) => isExpiringCritical(item.endDate))
        .length,
      expiringSoon: filteredItems.filter(
        (item) => isExpiringSoon(item.endDate) && !isExpiringCritical(item.endDate),
      ).length,
      lowEffort: filteredItems.filter((item) => isEffortLow(item)).length,
      exhausted: filteredItems.filter((item) => isEffortExhausted(item)).length,
    };
  }, [filteredItems]);

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setExpiryFilter("all");
  }

  return (
    <section className="glass-panel-project overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Search and filter</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Search by project, customer, or contract number.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filteredItems.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">{items.length}</span>{" "}
            account{items.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <WarningCard
            title="Critical expiry"
            value={warningSummary.expiringCritical}
            hint="≤ 7 days"
            tone="danger"
          />
          <WarningCard
            title="Expiring soon"
            value={warningSummary.expiringSoon}
            hint="8 - 30 days"
            tone="warning"
          />
          <WarningCard
            title="Low remaining effort"
            value={warningSummary.lowEffort}
            hint="≤ 10% remaining"
            tone="warning"
          />
          <WarningCard
            title="Effort exhausted"
            value={warningSummary.exhausted}
            hint="remaining = 0"
            tone="danger"
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.5fr),220px,220px,auto]">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search project, customer, or contract"
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Expiry
            </label>
            <select
              value={expiryFilter}
              onChange={(event) =>
                setExpiryFilter(event.target.value as ExpiryFilter)
              }
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All accounts</option>
              <option value="expiringSoon">Expiring soon (≤ 30 days)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 font-semibold text-slate-700">Project</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Customer</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Contract</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Period</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Usage</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Remaining</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
            </tr>
          </thead>

          <tbody>
            {!hasItems ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}

            {filteredItems.map((item) => {
              const remainingLow = isEffortLow(item);
              const remainingExhausted = isEffortExhausted(item);
              const criticalExpiry = isExpiringCritical(item.endDate);
              const soonExpiry = isExpiringSoon(item.endDate);

              return (
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 align-top last:border-b-0 ${getRowClassName(item)}`}
                >
                  <td className="px-4 py-4 text-slate-700">
                    <div className="font-medium text-slate-900">{item.projectName}</div>
                    {item.note ? (
                      <p className="mt-1 max-w-[260px] text-xs leading-5 text-slate-500">
                        {item.note}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-4 text-slate-700">{item.customerName}</td>
                  <td className="px-4 py-4 text-slate-700">{item.contractNo}</td>

                  <td className="px-4 py-4 text-slate-700">
                    <div>{item.startDate}</div>
                    <div className="mt-1 text-xs text-slate-500">to {item.endDate}</div>

                    <div className="mt-2 space-y-1 text-xs">
                      {criticalExpiry ? (
                        <div className="font-medium text-rose-700">
                          Critical expiry (≤ 7 days)
                        </div>
                      ) : soonExpiry && item.status !== "expired" ? (
                        <div className="font-medium text-amber-700">
                          Expiring soon
                        </div>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    <div>
                      {formatEffort(item.usedManDays)} /{" "}
                      {formatEffort(item.allocatedManDays)}
                    </div>
                  </td>

                  <td className="px-4 py-4 font-medium text-slate-900">
                    <div>{formatEffort(item.remainingManDays)}</div>

                    <div className="mt-1 space-y-1 text-xs">
                      {remainingExhausted ? (
                        <div className="font-medium text-rose-700">
                          Effort exhausted
                        </div>
                      ) : remainingLow ? (
                        <div className="font-medium text-amber-700">
                          Low remaining effort
                        </div>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={[
                          "inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize",
                          getStatusBadgeClassName(item.status),
                        ].join(" ")}
                      >
                        {item.status}
                      </span>

                      {remainingExhausted ? (
                        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                          No effort left
                        </span>
                      ) : remainingLow ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Effort low
                        </span>
                      ) : null}

                      {item.archivedAt ? (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Archived manually
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WarningCard({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: number;
  hint: string;
  tone: "warning" | "danger";
}) {
  const className =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <p className="text-xs font-medium">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{hint}</p>
    </div>
  );
}