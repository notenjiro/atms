"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

type ProjectAccountsTableProps = {
  items: ProjectAccount[];
};

type EditableValues = {
  endDate: string;
  allocatedManDays: string;
  usedManDays: string;
  note: string;
};

type ApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: string | string[];
  };
};

type StatusFilter = "all" | ProjectAccount["status"];
type ExpiryFilter = "all" | "expiringSoon";
type VisibilityFilter = "active" | "archived";

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
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getInitialValues(item: ProjectAccount): EditableValues {
  return {
    endDate: item.endDate,
    allocatedManDays: String(item.allocatedManDays),
    usedManDays: String(item.usedManDays),
    note: item.note ?? "",
  };
}

function normalizeErrorDetails(details: string | string[] | undefined): string[] {
  if (!details) {
    return [];
  }

  return Array.isArray(details) ? details : [details];
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
  if (item.archivedAt) {
    return "bg-slate-50";
  }

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

function getActionButtonClassName(kind: "edit" | "archive" | "restore"): string {
  switch (kind) {
    case "edit":
      return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100";
    case "archive":
      return "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100";
    case "restore":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
    default:
      return "";
  }
}

export function ProjectAccountsTable({ items }: ProjectAccountsTableProps) {
  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<EditableValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowError, setRowError] = useState<string[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("active");

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const isArchived = Boolean(item.archivedAt);

      const matchesVisibility =
        visibilityFilter === "active" ? !isArchived : isArchived;

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

      return (
        matchesVisibility && matchesSearch && matchesStatus && matchesExpiry
      );
    });
  }, [items, searchTerm, statusFilter, expiryFilter, visibilityFilter]);

  const hasItems = filteredItems.length > 0;

  const editingItem = useMemo(
    () =>
      filteredItems.find((item) => item.id === editingId) ??
      items.find((item) => item.id === editingId) ??
      null,
    [editingId, filteredItems, items],
  );

  const warningSummary = useMemo(() => {
    const activeItems = filteredItems.filter((item) => !item.archivedAt);

    return {
      expiringCritical: activeItems.filter((item) => isExpiringCritical(item.endDate))
        .length,
      expiringSoon: activeItems.filter(
        (item) => isExpiringSoon(item.endDate) && !isExpiringCritical(item.endDate),
      ).length,
      lowEffort: activeItems.filter((item) => isEffortLow(item)).length,
      exhausted: activeItems.filter((item) => isEffortExhausted(item)).length,
    };
  }, [filteredItems]);

  function startEdit(item: ProjectAccount) {
    setEditingId(item.id);
    setValues(getInitialValues(item));
    setRowError([]);
    setSuccessId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setValues(null);
    setRowError([]);
  }

  function updateField<K extends keyof EditableValues>(
    key: K,
    value: EditableValues[K],
  ) {
    setValues((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  async function submitEdit(item: ProjectAccount) {
    if (!values) {
      return;
    }

    setIsSubmitting(true);
    setRowError([]);
    setSuccessId(null);

    try {
      const response = await fetch(`/api/project-accounts/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endDate: values.endDate,
          allocatedManDays: Number(values.allocatedManDays),
          usedManDays: Number(values.usedManDays),
          note: values.note.trim() || undefined,
        }),
      });

      const result = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        const details = normalizeErrorDetails(result.error?.details);
        const fallbackMessage =
          result.error?.message || "Unable to update project account.";

        setRowError(details.length > 0 ? details : [fallbackMessage]);
        return;
      }

      setSuccessId(item.id);
      setEditingId(null);
      setValues(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      setRowError(["Unable to update project account. Please try again."]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(item: ProjectAccount) {
    const confirmed = window.confirm(
      `Archive project account "${item.projectName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/project-accounts/${item.id}/archive`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Archive request failed");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      window.alert("Unable to archive project account.");
    }
  }

  async function handleRestore(item: ProjectAccount) {
    try {
      const response = await fetch(`/api/project-accounts/${item.id}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Restore request failed");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      window.alert("Unable to restore project account.");
    }
  }

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setExpiryFilter("all");
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Search and filter</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              Find the right account faster
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Search by project, customer, or contract number.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={visibilityFilter === "active" ? "default" : "outline"}
              onClick={() => setVisibilityFilter("active")}
            >
              Active list
            </Button>
            <Button
              type="button"
              variant={visibilityFilter === "archived" ? "default" : "outline"}
              onClick={() => setVisibilityFilter("archived")}
            >
              Archived list
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filteredItems.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">{items.length}</span>{" "}
            account{items.length === 1 ? "" : "s"}
          </div>
        </div>

        {visibilityFilter === "active" ? (
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
        ) : null}

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
            <Button type="button" variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
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
              <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!hasItems ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  {items.length === 0
                    ? "No project accounts yet. Create your first account using the form above."
                    : "No accounts match the current filters."}
                </td>
              </tr>
            ) : null}

            {filteredItems.map((item) => {
              const isEditing = editingId === item.id;
              const currentValues =
                isEditing && values ? values : getInitialValues(item);
              const remainingLow = isEffortLow(item);
              const remainingExhausted = isEffortExhausted(item);
              const criticalExpiry = isExpiringCritical(item.endDate);
              const soonExpiry = isExpiringSoon(item.endDate);

              return (
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 align-top last:border-b-0 ${getRowClassName(item)}`}
                >
                  <td className="px-4 py-4 text-slate-700">{item.projectName}</td>
                  <td className="px-4 py-4 text-slate-700">{item.customerName}</td>
                  <td className="px-4 py-4 text-slate-700">{item.contractNo}</td>

                  <td className="px-4 py-4 text-slate-700">
                    <div>{item.startDate}</div>

                    {isEditing ? (
                      <input
                        type="date"
                        value={currentValues.endDate}
                        onChange={(event) => updateField("endDate", event.target.value)}
                        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    ) : (
                      <div className="space-y-1 text-xs">
                        <div className="text-slate-500">to {item.endDate}</div>
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
                    )}
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-slate-500">Allocated</label>
                          <input
                            type="number"
                            min="0"
                            step="0.00001"
                            value={currentValues.allocatedManDays}
                            onChange={(event) =>
                              updateField("allocatedManDays", event.target.value)
                            }
                            className="mt-1 block w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-500">Used</label>
                          <input
                            type="number"
                            min="0"
                            step="0.00001"
                            value={currentValues.usedManDays}
                            onChange={(event) =>
                              updateField("usedManDays", event.target.value)
                            }
                            className="mt-1 block w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>
                      </div>
                    ) : (
                      <span>
                        {formatEffort(item.usedManDays)} / {formatEffort(item.allocatedManDays)}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 font-medium text-slate-900">
                    <div>{formatEffort(item.remainingManDays)}</div>

                    {!isEditing ? (
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
                    ) : null}
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
                          Archived
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500">Note</label>
                          <textarea
                            rows={3}
                            value={currentValues.note}
                            onChange={(event) => updateField("note", event.target.value)}
                            className="mt-1 block w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>

                        {rowError.length > 0 ? (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                            {rowError.map((message) => (
                              <div key={message}>{message}</div>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => submitEdit(item)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Saving..." : "Save"}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelEdit}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {!item.archivedAt ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => startEdit(item)}
                              className={getActionButtonClassName("edit")}
                            >
                              Edit
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleArchive(item)}
                              className={getActionButtonClassName("archive")}
                            >
                              Archive
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleRestore(item)}
                            className={getActionButtonClassName("restore")}
                          >
                            Restore
                          </Button>
                        )}

                        {item.note ? (
                          <div className="basis-full pt-1">
                            <p className="max-w-[240px] text-xs leading-5 text-slate-500">
                              {item.note}
                            </p>
                          </div>
                        ) : null}

                        {successId === item.id ? (
                          <div className="basis-full pt-1">
                            <p className="text-xs font-medium text-emerald-600">
                              Updated successfully.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingItem ? (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Editing{" "}
          <span className="font-semibold text-slate-700">
            {editingItem.projectName}
          </span>
        </div>
      ) : null}
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