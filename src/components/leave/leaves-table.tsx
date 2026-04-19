"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LEAVE_TYPES, type LeaveRequest } from "@/modules/leave/leave.types";

type LeavesTableProps = {
  items: LeaveRequest[];
  canManageApproval?: boolean;
  currentUserId: string;
};

type ApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: string | string[];
  };
};

type StatusFilter = "all" | LeaveRequest["status"];
type LeaveViewMode = "my-requests" | "team-approval";

const PAGE_SIZE = 8;

function getStatusBadgeClassName(status: LeaveRequest["status"]): string {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "draft":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getRowToneClassName(
  item: LeaveRequest,
  viewMode: LeaveViewMode,
  currentUserId: string,
): string {
  if (viewMode === "team-approval" && item.status === "pending") {
    return "bg-amber-50/60";
  }

  if (item.employeeId === currentUserId && item.status === "approved") {
    return "bg-emerald-50/35";
  }

  if (item.employeeId === currentUserId && item.status === "rejected") {
    return "bg-rose-50/35";
  }

  return "bg-white";
}

function getActionButtonClassName(kind: "approve" | "reject" | "cancel"): string {
  switch (kind) {
    case "approve":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
    case "reject":
      return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100";
    case "cancel":
      return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200";
    default:
      return "";
  }
}

function formatDays(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
}

function getDateRangeLabel(item: LeaveRequest): string {
  if (item.startDate === item.endDate) {
    return item.startDate;
  }

  return `${item.startDate} to ${item.endDate}`;
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

function getLeaveTypeNameById(leaveTypeId: string): string {
  return (
    LEAVE_TYPES.find((leaveType) => leaveType.id === leaveTypeId)?.name ??
    leaveTypeId
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm text-slate-500">
        Page <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
        <span className="font-semibold text-slate-800">{totalPages}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onNext}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function LeavesTable({
  items,
  canManageApproval = false,
  currentUserId,
}: LeavesTableProps) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<LeaveViewMode>("my-requests");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);

  const myItems = useMemo(
    () => items.filter((item) => item.employeeId === currentUserId),
    [items, currentUserId],
  );

  const teamApprovalItems = useMemo(() => {
    if (!canManageApproval) {
      return [];
    }

    return items.filter((item) => item.status === "pending");
  }, [canManageApproval, items]);

  const sourceItems = useMemo(() => {
    if (viewMode === "team-approval" && canManageApproval) {
      return teamApprovalItems;
    }

    return myItems;
  }, [canManageApproval, myItems, teamApprovalItems, viewMode]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return sourceItems.filter((item) => {
      const matchesSearch =
        keyword === "" ||
        item.employeeName.toLowerCase().includes(keyword) ||
        item.leaveTypeName.toLowerCase().includes(keyword) ||
        item.leaveTypeId.toLowerCase().includes(keyword) ||
        (item.remarks ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesLeaveType =
        leaveTypeFilter === "all" || item.leaveTypeId === leaveTypeFilter;

      return matchesSearch && matchesStatus && matchesLeaveType;
    });
  }, [sourceItems, searchTerm, statusFilter, leaveTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const pagedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredItems]);

  const pendingCount = teamApprovalItems.length;
  const approvedCount = myItems.filter((item) => item.status === "approved").length;
  const rejectedCount = myItems.filter((item) => item.status === "rejected").length;
  const pendingMineCount = myItems.filter((item) => item.status === "pending").length;

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setLeaveTypeFilter("all");
    setCurrentPage(1);
  }

  function resetRejectPanel() {
    setRejectingId(null);
    setRejectReason("");
  }

  function resetCancelPanel() {
    setConfirmingCancelId(null);
  }

  function switchView(nextView: LeaveViewMode) {
    setViewMode(nextView);
    setCurrentPage(1);
    resetRejectPanel();
    resetCancelPanel();
    resetFilters();
  }

  function applyStatusFilter(nextStatus: StatusFilter) {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
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

  async function handleApprove(item: LeaveRequest) {
    try {
      setIsSubmittingId(item.id);

      await postAction(
        `/api/leaves/${item.id}/approve`,
        {},
        "Unable to approve leave request.",
      );

      toast.success(`Approved "${item.leaveTypeName}" successfully.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to approve leave request.",
      );
    } finally {
      setIsSubmittingId(null);
    }
  }

  async function handleCancel(item: LeaveRequest) {
    try {
      setIsSubmittingId(item.id);

      await postAction(
        `/api/leaves/${item.id}/cancel`,
        undefined,
        "Unable to cancel leave request.",
      );

      resetCancelPanel();
      toast.success(`Cancelled "${item.leaveTypeName}" successfully.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to cancel leave request.",
      );
    } finally {
      setIsSubmittingId(null);
    }
  }

  async function submitReject(item: LeaveRequest) {
    if (!rejectReason.trim()) {
      toast.error("Reject reason is required.");
      return;
    }

    try {
      setIsSubmittingId(item.id);

      await postAction(
        `/api/leaves/${item.id}/reject`,
        {
          rejectedReason: rejectReason.trim(),
        },
        "Unable to reject leave request.",
      );

      resetRejectPanel();
      toast.success(`Rejected "${item.leaveTypeName}" successfully.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to reject leave request.",
      );
    } finally {
      setIsSubmittingId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Approval workspace</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              Review leave requests
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Switch between your own requests and the team approval queue.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                My Requests
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {myItems.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-700">
                Approved
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {approvedCount}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-amber-700">
                My Pending
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-800">
                {pendingMineCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                Team Queue
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => switchView("my-requests")}
            className={[
              "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition",
              viewMode === "my-requests"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            <ShieldCheck className="size-4" />
            My Requests
          </button>

          {canManageApproval ? (
            <button
              type="button"
              onClick={() => switchView("team-approval")}
              className={[
                "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition",
                viewMode === "team-approval"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <CheckCircle2 className="size-4" />
              Team Approval
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  viewMode === "team-approval"
                    ? "bg-white/15 text-white"
                    : "bg-amber-100 text-amber-700",
                ].join(" ")}
              >
                {pendingCount}
              </span>
            </button>
          ) : null}
        </div>

        {canManageApproval && viewMode === "team-approval" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-sm font-semibold text-amber-800">
              Team approval inbox
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Pending requests appear here first, so lead users can approve or
              reject without digging through personal history.
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected", "cancelled"] as const).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => applyStatusFilter(status)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition",
                  statusFilter === status
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {status}
              </button>
            ),
          )}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.5fr),220px,220px,auto]">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search employee, leave type, or remarks"
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
                applyStatusFilter(event.target.value as StatusFilter)
              }
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Leave type
            </label>
            <select
              value={leaveTypeFilter}
              onChange={(event) => {
                setLeaveTypeFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All leave types</option>
              {LEAVE_TYPES.map((leaveType) => (
                <option key={leaveType.id} value={leaveType.id}>
                  {leaveType.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Showing{" "}
        <span className="font-semibold text-slate-900">{pagedItems.length}</span> of{" "}
        <span className="font-semibold text-slate-900">{filteredItems.length}</span>{" "}
        request{filteredItems.length === 1 ? "" : "s"} in this view.
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 font-semibold text-slate-700">Employee</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Leave Type</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Period</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Days</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Remarks</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {pagedItems.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  {viewMode === "team-approval"
                    ? "No pending team requests match the current filters."
                    : "No leave requests match the current filters."}
                </td>
              </tr>
            ) : null}

            {pagedItems.map((item) => {
              const isBusy = isSubmittingId === item.id;
              const canApproveOrReject =
                canManageApproval &&
                viewMode === "team-approval" &&
                item.status === "pending";
              const canCancel =
                item.employeeId === currentUserId && item.status === "pending";
              const isRejectingThisRow = rejectingId === item.id;
              const isConfirmingCancelThisRow = confirmingCancelId === item.id;

              return (
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/60 ${getRowToneClassName(
                    item,
                    viewMode,
                    currentUserId,
                  )}`}
                >
                  <td className="px-4 py-4 text-slate-700">
                    <div className="font-medium text-slate-900">
                      {item.employeeName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.employeeId}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    <div className="font-medium text-slate-900">
                      {item.leaveTypeName || getLeaveTypeNameById(item.leaveTypeId)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.leaveTypeId}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    <div>{getDateRangeLabel(item)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.startPortion} → {item.endPortion}
                    </div>
                  </td>

                  <td className="px-4 py-4 font-medium text-slate-900">
                    {formatDays(item.totalDays)}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadgeClassName(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="max-w-[260px] px-4 py-4 text-slate-600">
                    <span className="line-clamp-3">{item.remarks || "-"}</span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {canApproveOrReject ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleApprove(item)}
                              className={getActionButtonClassName("approve")}
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
                                resetCancelPanel();
                              }}
                              className={getActionButtonClassName("reject")}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}

                        {canCancel ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => {
                              setConfirmingCancelId(item.id);
                              resetRejectPanel();
                            }}
                            className={getActionButtonClassName("cancel")}
                          >
                            Cancel
                          </Button>
                        ) : null}

                        {!canApproveOrReject && !canCancel ? (
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
                                Reject request
                              </p>
                              <p className="mt-1 text-xs text-rose-600">
                                Add a reason before sending this request back.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={resetRejectPanel}
                              className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-100"
                              aria-label="Close reject panel"
                            >
                              <XCircle className="size-4" />
                            </button>
                          </div>

                          <textarea
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                            rows={3}
                            placeholder="Enter reject reason"
                            className="mt-3 block w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                          />

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => submitReject(item)}
                              className={getActionButtonClassName("reject")}
                            >
                              {isBusy ? "Submitting..." : "Confirm reject"}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              disabled={isBusy}
                              onClick={resetRejectPanel}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {isConfirmingCancelThisRow ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                              <div className="rounded-xl border border-amber-200 bg-white p-2 text-amber-700">
                                <TriangleAlert className="size-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-amber-800">
                                  Cancel request
                                </p>
                                <p className="mt-1 text-xs text-amber-700">
                                  This will cancel the current pending leave request.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={resetCancelPanel}
                              className="rounded-lg p-1 text-amber-700 transition hover:bg-amber-100"
                              aria-label="Close cancel panel"
                            >
                              <XCircle className="size-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleCancel(item)}
                              className={getActionButtonClassName("cancel")}
                            >
                              {isBusy ? "Cancelling..." : "Confirm cancel"}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              disabled={isBusy}
                              onClick={resetCancelPanel}
                            >
                              Keep request
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevious={() => setCurrentPage((current) => Math.max(1, current - 1))}
        onNext={() =>
          setCurrentPage((current) => Math.min(totalPages, current + 1))
        }
      />

      {canManageApproval && viewMode === "team-approval" && pendingCount > 0 ? (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Lead tip: the team approval tab is scoped to pending requests only, so
          this area stays focused on decisions instead of historical clutter.
        </div>
      ) : null}

      {!canManageApproval ? (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          You are currently viewing your own leave history and pending requests.
        </div>
      ) : null}

      {rejectedCount > 0 && viewMode === "my-requests" ? (
        <div className="border-t border-slate-200 bg-rose-50/60 px-4 py-3 text-sm text-rose-700">
          You have {rejectedCount} rejected request{rejectedCount > 1 ? "s" : ""}.
          Review the remarks and dates before submitting another request.
        </div>
      ) : null}
    </section>
  );
}