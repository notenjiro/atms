"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Send,
  Sheet,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { TimesheetEntry } from "@/modules/timesheet/timesheet.types";

type TimesheetTableProps = {
  items: TimesheetEntry[];
  currentUserId: string;
  canManageApproval?: boolean;
};

type ApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: string | string[];
  };
};

type TimesheetTab = "my-timesheets" | "by-projects" | "approval";

function getStatusBadgeClassName(status: TimesheetEntry["status"]): string {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "submitted":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function formatHours(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getItemMonthKey(item: TimesheetEntry): string {
  return item.workDate.slice(0, 7);
}

function normalizeErrorMessage(result: ApiErrorResponse, fallback: string): string {
  const detail = result.error?.details;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0] ?? fallback;
  }

  if (typeof detail === "string" && detail.trim() !== "") {
    return detail;
  }

  return result.error?.message || fallback;
}

function buildProjectSummary(items: TimesheetEntry[]) {
  const map = new Map<
    string,
    {
      key: string;
      projectName: string;
      customerName?: string;
      totalHours: number;
      billableHours: number;
      itemCount: number;
      submittedCount: number;
      approvedCount: number;
    }
  >();

  for (const item of items) {
    const key =
      item.projectAccountId?.trim() ||
      item.projectAccountName?.trim() ||
      item.taskName.trim();

    const projectName =
      item.projectAccountName?.trim() ||
      item.projectAccountId?.trim() ||
      "Unassigned project";

    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        projectName,
        customerName: item.customerName,
        totalHours: item.hours,
        billableHours: item.isBillable ? item.hours : 0,
        itemCount: 1,
        submittedCount: item.status === "submitted" ? 1 : 0,
        approvedCount: item.status === "approved" ? 1 : 0,
      });
      continue;
    }

    existing.totalHours += item.hours;
    existing.billableHours += item.isBillable ? item.hours : 0;
    existing.itemCount += 1;
    existing.submittedCount += item.status === "submitted" ? 1 : 0;
    existing.approvedCount += item.status === "approved" ? 1 : 0;
    existing.customerName = existing.customerName || item.customerName;
  }

  return [...map.values()]
    .map((entry) => ({
      ...entry,
      totalHours: Number(entry.totalHours.toFixed(2)),
      billableHours: Number(entry.billableHours.toFixed(2)),
    }))
    .sort((a, b) => b.totalHours - a.totalHours);
}

export function TimesheetTable({
  items,
  currentUserId,
  canManageApproval = false,
}: TimesheetTableProps) {
  const router = useRouter();

  const [tab, setTab] = useState<TimesheetTab>("my-timesheets");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleMonthKey, setVisibleMonthKey] = useState(() => {
    if (items.length > 0) {
      return getItemMonthKey(items[0]);
    }

    return getMonthKey(new Date());
  });

  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const myItems = useMemo(
    () => items.filter((item) => item.employeeId === currentUserId),
    [items, currentUserId],
  );

  const approvalItems = useMemo(() => {
    if (!canManageApproval) {
      return [];
    }

    return items.filter((item) => item.status === "submitted");
  }, [canManageApproval, items]);

  const sourceItems = useMemo(() => {
    if (tab === "approval" && canManageApproval) {
      return approvalItems;
    }

    return myItems;
  }, [approvalItems, canManageApproval, myItems, tab]);

  const monthItems = useMemo(() => {
    return sourceItems.filter((item) => getItemMonthKey(item) === visibleMonthKey);
  }, [sourceItems, visibleMonthKey]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return monthItems.filter((item) => {
      if (keyword === "") {
        return true;
      }

      return (
        item.taskName.toLowerCase().includes(keyword) ||
        (item.description ?? "").toLowerCase().includes(keyword) ||
        (item.projectAccountName ?? "").toLowerCase().includes(keyword) ||
        (item.projectAccountId ?? "").toLowerCase().includes(keyword) ||
        (item.customerName ?? "").toLowerCase().includes(keyword) ||
        item.employeeName.toLowerCase().includes(keyword)
      );
    });
  }, [monthItems, searchTerm]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, TimesheetEntry[]>();

    for (const item of filteredItems) {
      const existing = map.get(item.workDate);

      if (existing) {
        existing.push(item);
      } else {
        map.set(item.workDate, [item]);
      }
    }

    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, dateItems]) => ({
        date,
        items: [...dateItems].sort((a, b) => {
          const projectCompare = (a.projectAccountId ?? "").localeCompare(
            b.projectAccountId ?? "",
          );

          if (projectCompare !== 0) {
            return projectCompare;
          }

          return a.taskName.localeCompare(b.taskName);
        }),
        totalHours: Number(
          dateItems.reduce((sum, item) => sum + item.hours, 0).toFixed(2),
        ),
      }));
  }, [filteredItems]);

  const projectSummary = useMemo(() => buildProjectSummary(filteredItems), [filteredItems]);

  const currentMonthDate = useMemo(() => {
    const [year, month] = visibleMonthKey.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, 1);
  }, [visibleMonthKey]);

  const monthLabel = getMonthLabel(visibleMonthKey);

  function moveMonth(offset: number) {
    const next = new Date(
      currentMonthDate.getFullYear(),
      currentMonthDate.getMonth() + offset,
      1,
    );

    setVisibleMonthKey(getMonthKey(next));
  }

  function goToCurrentMonth() {
    setVisibleMonthKey(getMonthKey(new Date()));
  }

  function switchTab(nextTab: TimesheetTab) {
    setTab(nextTab);
    setSearchTerm("");
    setRejectingId(null);
    setRejectReason("");
    setConfirmingDeleteId(null);
  }

  async function postAction(
    url: string,
    body: Record<string, unknown> | undefined,
    fallbackErrorMessage: string,
  ) {
    const response = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = (await response.json().catch(() => ({}))) as ApiErrorResponse;

    if (!response.ok) {
      throw new Error(normalizeErrorMessage(result, fallbackErrorMessage));
    }
  }

  async function deleteAction(url: string, fallbackErrorMessage: string) {
    const response = await fetch(url, {
      method: "DELETE",
    });

    const result = (await response.json().catch(() => ({}))) as ApiErrorResponse;

    if (!response.ok) {
      throw new Error(normalizeErrorMessage(result, fallbackErrorMessage));
    }
  }

  async function handleSubmit(item: TimesheetEntry) {
    try {
      setIsSubmittingId(item.id);

      await postAction(
        `/api/timesheets/${item.id}/submit`,
        undefined,
        "Unable to submit timesheet entry.",
      );

      toast.success(`Submitted "${item.taskName}" successfully.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit timesheet entry.",
      );
    } finally {
      setIsSubmittingId(null);
    }
  }

  async function handleApprove(item: TimesheetEntry) {
    try {
      setIsSubmittingId(item.id);

      await postAction(
        `/api/timesheets/${item.id}/approve`,
        {},
        "Unable to approve timesheet entry.",
      );

      toast.success(`Approved "${item.taskName}" successfully.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to approve timesheet entry.",
      );
    } finally {
      setIsSubmittingId(null);
    }
  }

  async function handleReject(item: TimesheetEntry) {
    if (!rejectReason.trim()) {
      toast.error("Reject reason is required.");
      return;
    }

    try {
      setIsSubmittingId(item.id);

      await postAction(
        `/api/timesheets/${item.id}/reject`,
        {
          rejectedReason: rejectReason.trim(),
        },
        "Unable to reject timesheet entry.",
      );

      setRejectingId(null);
      setRejectReason("");
      toast.success(`Rejected "${item.taskName}" successfully.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to reject timesheet entry.",
      );
    } finally {
      setIsSubmittingId(null);
    }
  }

  async function handleDelete(item: TimesheetEntry) {
    try {
      setIsSubmittingId(item.id);

      await deleteAction(
        `/api/timesheets/${item.id}`,
        "Unable to delete timesheet entry.",
      );

      setConfirmingDeleteId(null);
      toast.success(`Deleted "${item.taskName}" successfully.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete timesheet entry.",
      );
    } finally {
      setIsSubmittingId(null);
    }
  }

  const totalHours = filteredItems.reduce((sum, item) => sum + item.hours, 0);
  const billableHours = filteredItems
    .filter((item) => item.isBillable)
    .reduce((sum, item) => sum + item.hours, 0);
  const draftCount = filteredItems.filter((item) => item.status === "draft").length;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Month detail</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Timesheet detail explorer
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review your saved month entries by date, project, and approval status in
              a cleaner layout that matches the board above.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={goToCurrentMonth}>
              Today
            </Button>
            <Button type="button" variant="outline" onClick={() => moveMonth(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              {monthLabel}
            </div>
            <Button type="button" variant="outline" onClick={() => moveMonth(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => switchTab("my-timesheets")}
            className={[
              "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition",
              tab === "my-timesheets"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            <Sheet className="size-4" />
            My Timesheets
          </button>

          <button
            type="button"
            onClick={() => switchTab("by-projects")}
            className={[
              "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition",
              tab === "by-projects"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            <FolderKanban className="size-4" />
            By Projects
          </button>

          {canManageApproval ? (
            <button
              type="button"
              onClick={() => switchTab("approval")}
              className={[
                "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition",
                tab === "approval"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <CheckCircle2 className="size-4" />
              Approval Queue
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Visible Entries
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {filteredItems.length}
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-sky-700">
              Total Hours
            </p>
            <p className="mt-2 text-2xl font-semibold text-sky-800">
              {formatHours(totalHours)}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700">
              Billable Hours
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-800">
              {formatHours(billableHours)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Draft Entries
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {draftCount}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by task, project, customer, or employee"
            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {tab === "by-projects" ? (
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {projectSummary.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500 lg:col-span-2">
              No project-based entries found in this month.
            </div>
          ) : null}

          {projectSummary.map((project) => (
            <div
              key={project.key}
              className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {project.projectName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {project.customerName || "No customer assigned"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-600">
                  <FolderKanban className="size-5" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    Total Hours
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {formatHours(project.totalHours)}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700">
                    Billable
                  </p>
                  <p className="mt-2 text-xl font-semibold text-emerald-800">
                    {formatHours(project.billableHours)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    Entries
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {project.itemCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-amber-700">
                    Submitted
                  </p>
                  <p className="mt-2 text-xl font-semibold text-amber-800">
                    {project.submittedCount}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Approved entries:{" "}
                <span className="font-semibold text-slate-900">
                  {project.approvedCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5">
          {groupedByDate.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              No timesheet entries found in this month and view.
            </div>
          ) : null}

          <div className="space-y-5">
            {groupedByDate.map((group) => (
              <div
                key={group.date}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600">
                      <CalendarDays className="size-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {group.date}
                      </p>
                      <p className="text-xs text-slate-500">
                        {group.items.length} entr{group.items.length === 1 ? "y" : "ies"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {formatHours(group.totalHours)} hours
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Task
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Project
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Hours
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Type
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {group.items.map((item) => {
                        const isBusy = isSubmittingId === item.id;
                        const isRejectingThisRow = rejectingId === item.id;
                        const isConfirmingDeleteThisRow = confirmingDeleteId === item.id;

                        const canSubmit =
                          item.employeeId === currentUserId &&
                          item.status === "draft";
                        const canDelete =
                          item.employeeId === currentUserId &&
                          item.status === "draft";
                        const canApproveOrReject =
                          canManageApproval &&
                          tab === "approval" &&
                          item.status === "submitted";

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/60"
                          >
                            <td className="px-4 py-4 text-slate-700">
                              <div className="font-medium text-slate-900">
                                {item.taskName}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {item.description || "No description"}
                              </div>
                              {tab === "approval" ? (
                                <div className="mt-1 text-xs font-medium text-slate-500">
                                  {item.employeeName}
                                </div>
                              ) : null}
                            </td>

                            <td className="px-4 py-4 text-slate-700">
                              <div className="font-medium text-slate-900">
                                {item.projectAccountName || "Unassigned project"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {item.projectAccountId || item.customerName || "-"}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-center font-semibold text-slate-900">
                              {formatHours(item.hours)}
                            </td>

                            <td className="px-4 py-4 text-center">
                              <span
                                className={[
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                  item.isBillable
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-100 text-slate-700",
                                ].join(" ")}
                              >
                                {item.isBillable ? "Billable" : "Non-billable"}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-center">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadgeClassName(item.status)}`}
                              >
                                {item.status}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  {canSubmit ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={isBusy}
                                      onClick={() => handleSubmit(item)}
                                      className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                    >
                                      <Send className="size-4" />
                                      {isBusy ? "Submitting..." : "Submit"}
                                    </Button>
                                  ) : null}

                                  {canApproveOrReject ? (
                                    <>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isBusy}
                                        onClick={() => handleApprove(item)}
                                        className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      >
                                        {isBusy ? "Working..." : "Approve"}
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isBusy}
                                        onClick={() => {
                                          setRejectingId(item.id);
                                          setRejectReason("");
                                          setConfirmingDeleteId(null);
                                        }}
                                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  ) : null}

                                  {canDelete ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={isBusy}
                                      onClick={() => {
                                        setConfirmingDeleteId(item.id);
                                        setRejectingId(null);
                                      }}
                                      className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    >
                                      <Trash2 className="size-4" />
                                      Delete
                                    </Button>
                                  ) : null}

                                  {!canSubmit && !canApproveOrReject && !canDelete ? (
                                    <span className="text-xs font-medium text-slate-400">
                                      No actions available
                                    </span>
                                  ) : null}
                                </div>

                                {isRejectingThisRow ? (
                                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-rose-700">
                                          Reject timesheet
                                        </p>
                                        <p className="mt-1 text-xs text-rose-600">
                                          Add a reason before sending this entry back.
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRejectingId(null);
                                          setRejectReason("");
                                        }}
                                        className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-100"
                                        aria-label="Close reject panel"
                                      >
                                        <XCircle className="size-4" />
                                      </button>
                                    </div>

                                    <textarea
                                      value={rejectReason}
                                      onChange={(event) =>
                                        setRejectReason(event.target.value)
                                      }
                                      rows={3}
                                      placeholder="Enter reject reason"
                                      className="mt-3 block w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                                    />

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isBusy}
                                        onClick={() => handleReject(item)}
                                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                      >
                                        {isBusy ? "Submitting..." : "Confirm Reject"}
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isBusy}
                                        onClick={() => {
                                          setRejectingId(null);
                                          setRejectReason("");
                                        }}
                                      >
                                        Close
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}

                                {isConfirmingDeleteThisRow ? (
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-sm font-semibold text-slate-800">
                                      Delete draft entry
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">
                                      This action removes the draft permanently.
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isBusy}
                                        onClick={() => handleDelete(item)}
                                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                      >
                                        {isBusy ? "Deleting..." : "Confirm Delete"}
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isBusy}
                                        onClick={() => setConfirmingDeleteId(null)}
                                      >
                                        Keep Entry
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}