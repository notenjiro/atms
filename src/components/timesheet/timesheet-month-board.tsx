"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Lock,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TimesheetProjectPickerDialog } from "./timesheet-project-picker-dialog";

type BoardProject = {
  id: string;
  projectCode: string;
  projectName: string;
  isChargeable: boolean;
  customerName?: string;
};

type BoardRow = {
  id: string;
  projectRefId: string;
  taskName: string;
  days: Record<number, string>;
};

type HolidayItem = {
  date: string;
  name: string;
};

type HolidayMap = Record<string, HolidayItem>;

type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

type LeaveBootstrapResponse = {
  requests?: LeaveRequestItem[];
  data?: {
    requests?: LeaveRequestItem[];
  };
};

type LeaveRequestItem = {
  id: string;
  employeeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  status: "draft" | "pending" | "approved" | "rejected" | "cancelled";
};

type LeaveOverlayItem = {
  leaveTypeName: string;
  status: LeaveRequestItem["status"];
};

type LeaveOverlayMap = Record<string, LeaveOverlayItem>;

type TimesheetEntryApiItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  hours: number;
  taskName: string;
  description?: string;
  projectAccountId?: string;
  projectAccountName?: string;
  customerName?: string;
  isBillable: boolean;
  status: TimesheetStatus;
};

type TimesheetEntriesResponse = {
  items?: TimesheetEntryApiItem[];
  data?: {
    items?: TimesheetEntryApiItem[];
  };
  message?: string;
  error?: {
    message?: string;
    details?: string | string[];
  };
};

type TimesheetMonthStatusResponse = {
  item?: { status?: TimesheetStatus } | null;
  data?: {
    item?: { status?: TimesheetStatus } | null;
  };
  message?: string;
  error?: {
    message?: string;
    details?: string | string[];
  };
};

type HolidaysResponse = {
  items?: HolidayItem[];
  data?: {
    items?: HolidayItem[];
  };
  message?: string;
  error?: {
    message?: string;
    details?: string | string[];
  };
};

type TimesheetMonthBoardResponse = {
  items?: TimesheetEntryApiItem[];
  data?: {
    items?: TimesheetEntryApiItem[];
  };
  message?: string;
  error?: {
    message?: string;
    details?: string | string[];
  };
};

type TimesheetMonthBoardProps = {
  employeeId: string;
  employeeName: string;
  canManageApproval?: boolean;
};

type PickerProject = {
  id: string;
  code: string;
  name: string;
  isChargeable: boolean;
  customerName?: string;
};

type SaveMonthBoardEntryPayload = {
  workDate: string;
  hours: number;
  unit?: "hour" | "day";
  taskName: string;
  description?: string;
  projectAccountId?: string;
  projectAccountName?: string;
  customerName?: string;
  isBillable?: boolean;
  source?: "manual" | "api";
};

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

function getMonthDateRange(monthKey: string): { fromDate: string; toDate: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return {
    fromDate: `${monthKey}-01`,
    toDate: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getWeekdayShortLabel(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day)
    .toLocaleDateString("en-US", { weekday: "short" })
    .slice(0, 2)
    .toUpperCase();
}

function getDayType(
  year: number,
  month: number,
  day: number,
  holidayMap: HolidayMap,
): "weekday" | "weekend" | "holiday" {
  const isoDate = toIsoDate(year, month, day);

  if (holidayMap[isoDate]) {
    return "holiday";
  }

  const weekDay = new Date(year, month - 1, day).getDay();

  if (weekDay === 0 || weekDay === 6) {
    return "weekend";
  }

  return "weekday";
}

function parseHourValue(rawValue: string): number {
  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
}

function normalizeHourInput(rawValue: string): string {
  if (rawValue.trim() === "") {
    return "";
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < 0) {
    return "";
  }

  if (value > 24) {
    return "24";
  }

  return rawValue;
}

function getProjectSectionKey(projectCode: string): string {
  return projectCode.trim().toLowerCase();
}

function getEmptyTaskRowId(projectCode: string): string {
  return `${projectCode.trim().toLowerCase()}::__empty__`;
}

function getRowStableId(projectCode: string, taskName: string, index: number): string {
  const normalizedTask = taskName.trim().toLowerCase();

  if (!normalizedTask) {
    return `${getEmptyTaskRowId(projectCode)}__${index}`;
  }

  return `${projectCode.trim().toLowerCase()}::${normalizedTask}::${index}`;
}

function getDayCellToneClassName(
  dayType: "weekday" | "weekend" | "holiday",
  leaveItem?: LeaveOverlayItem,
): string {
  if (leaveItem?.status === "approved") {
    return "border-violet-200 bg-violet-50";
  }

  if (leaveItem?.status === "pending") {
    return "border-fuchsia-200 bg-fuchsia-50";
  }

  if (dayType === "holiday") {
    return "border-rose-200 bg-rose-50";
  }

  if (dayType === "weekend") {
    return "border-amber-200 bg-amber-50";
  }

  return "border-slate-200 bg-white";
}

function getLeaveLabelClassName(status: LeaveRequestItem["status"]): string {
  if (status === "approved") {
    return "text-violet-700";
  }

  if (status === "pending") {
    return "text-fuchsia-700";
  }

  return "text-slate-500";
}

function expandLeaveDates(request: LeaveRequestItem): string[] {
  const dates: string[] = [];

  if (request.status !== "approved" && request.status !== "pending") {
    return dates;
  }

  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return dates;
  }

  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(
      `${cursor.getFullYear()}-${`${cursor.getMonth() + 1}`.padStart(2, "0")}-${`${cursor.getDate()}`.padStart(2, "0")}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function extractHolidayItems(result: HolidaysResponse): HolidayItem[] {
  return result.items ?? result.data?.items ?? [];
}

function extractLeaveRequests(result: LeaveBootstrapResponse): LeaveRequestItem[] {
  return result.requests ?? result.data?.requests ?? [];
}

function extractTimesheetItems(
  result: TimesheetEntriesResponse | TimesheetMonthBoardResponse,
): TimesheetEntryApiItem[] {
  return result.items ?? result.data?.items ?? [];
}

function extractMonthStatus(result: TimesheetMonthStatusResponse): TimesheetStatus {
  return result.item?.status ?? result.data?.item?.status ?? "draft";
}

function extractApiErrorMessage(
  result:
    | TimesheetEntriesResponse
    | TimesheetMonthStatusResponse
    | HolidaysResponse
    | TimesheetMonthBoardResponse
    | undefined,
  fallbackMessage: string,
): string {
  if (!result) {
    return fallbackMessage;
  }

  const details = result.error?.details;

  if (Array.isArray(details) && details.length > 0) {
    const first = details[0];
    if (typeof first === "string" && first.trim()) {
      return first;
    }
  }

  if (typeof details === "string" && details.trim()) {
    return details;
  }

  if (typeof result.error?.message === "string" && result.error.message.trim()) {
    return result.error.message;
  }

  if (typeof result.message === "string" && result.message.trim()) {
    return result.message;
  }

  return fallbackMessage;
}

function mapEntriesToBoard(items: TimesheetEntryApiItem[]): {
  projects: BoardProject[];
  rows: BoardRow[];
} {
  const nextProjectsMap = new Map<string, BoardProject>();
  const nextRowsByProject = new Map<string, BoardRow[]>();

  for (const item of items) {
    const projectCode = item.projectAccountId?.trim() || "UNASSIGNED";
    const projectName = item.projectAccountName?.trim() || "Unassigned project";

    if (!nextProjectsMap.has(projectCode)) {
      nextProjectsMap.set(projectCode, {
        id: getProjectSectionKey(projectCode),
        projectCode,
        projectName,
        isChargeable: item.isBillable,
        customerName: item.customerName,
      });
    }

    const currentRows = nextRowsByProject.get(projectCode) ?? [];
    const existingIndex = currentRows.findIndex(
      (row) =>
        row.taskName.trim().toLowerCase() === item.taskName.trim().toLowerCase(),
    );

    if (existingIndex >= 0) {
      const existingRow = currentRows[existingIndex];
      const day = Number(item.workDate.split("-")[2]);
      existingRow.days[day] = String(item.hours);
    } else {
      const day = Number(item.workDate.split("-")[2]);

      currentRows.push({
        id: getRowStableId(projectCode, item.taskName, currentRows.length),
        projectRefId: getProjectSectionKey(projectCode),
        taskName: item.taskName,
        days: {
          [day]: String(item.hours),
        },
      });
    }

    nextRowsByProject.set(projectCode, currentRows);
  }

  return {
    projects: [...nextProjectsMap.values()],
    rows: [...nextRowsByProject.values()].flat(),
  };
}

export function TimesheetMonthBoard({
  employeeId,
  employeeName,
  canManageApproval = false,
}: TimesheetMonthBoardProps) {
  const now = new Date();

  const [visibleMonthKey, setVisibleMonthKey] = useState(getMonthKey(now));
  const [projects, setProjects] = useState<BoardProject[]>([]);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [holidayMap, setHolidayMap] = useState<HolidayMap>({});
  const [leaveOverlayMap, setLeaveOverlayMap] = useState<LeaveOverlayMap>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingMonth, setIsSubmittingMonth] = useState(false);
  const [isApprovingMonth, setIsApprovingMonth] = useState(false);
  const [isRejectingMonth, setIsRejectingMonth] = useState(false);

  const [monthStatus, setMonthStatus] = useState<TimesheetStatus>("draft");
  const [rejectPanelOpen, setRejectPanelOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [year, month] = visibleMonthKey.split("-").map(Number);

  const days = useMemo(() => {
    const totalDays = getDaysInMonth(year, month);
    return Array.from({ length: totalDays }, (_, index) => index + 1);
  }, [month, year]);

  const groupedProjects = useMemo(() => {
    return projects.map((project) => ({
      ...project,
      rows: rows.filter((row) => row.projectRefId === project.id),
    }));
  }, [projects, rows]);

  const isApprovedMonth = monthStatus === "approved";
  const isSubmittedMonth = monthStatus === "submitted";
  const isBoardLocked = isApprovedMonth;

  const projectCount = projects.length;
  const taskRowCount = rows.length;

  const monthTotalHours = useMemo(() => {
    return Number(
      rows
        .reduce((sum, row) => {
          return (
            sum +
            Object.values(row.days).reduce(
              (rowSum, cellValue) => rowSum + parseHourValue(cellValue),
              0,
            )
          );
        }, 0)
        .toFixed(2),
    );
  }, [rows]);

  const loadBoardData = useCallback(async () => {
    const { fromDate, toDate } = getMonthDateRange(visibleMonthKey);

    const [entriesResponse, monthStatusResponse] = await Promise.all([
      fetch(
        `/api/timesheets?employeeId=${encodeURIComponent(employeeId)}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`,
        { cache: "no-store" },
      ),
      fetch(
        `/api/timesheets/month-status?employeeId=${encodeURIComponent(employeeId)}&month=${encodeURIComponent(visibleMonthKey)}`,
        { cache: "no-store" },
      ),
    ]);

    const entriesResult = (await entriesResponse.json().catch(() => ({}))) as TimesheetEntriesResponse;
    const monthStatusResult = (await monthStatusResponse.json().catch(() => ({}))) as TimesheetMonthStatusResponse;

    if (!entriesResponse.ok) {
      throw new Error(
        extractApiErrorMessage(entriesResult, "Unable to load timesheet entries."),
      );
    }

    const boardData = mapEntriesToBoard(extractTimesheetItems(entriesResult));

    setProjects(boardData.projects);
    setRows(boardData.rows);
    setMonthStatus(extractMonthStatus(monthStatusResult));
  }, [employeeId, visibleMonthKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadHolidays() {
      try {
        const response = await fetch(`/api/holidays?year=${year}`, {
          cache: "no-store",
        });

        const result = (await response.json().catch(() => ({}))) as HolidaysResponse;

        if (!response.ok) {
          throw new Error(
            extractApiErrorMessage(result, "Unable to load holidays."),
          );
        }

        if (cancelled) {
          return;
        }

        const nextHolidayMap: HolidayMap = {};

        for (const item of extractHolidayItems(result)) {
          nextHolidayMap[item.date] = item;
        }

        setHolidayMap(nextHolidayMap);
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setHolidayMap({});
        }
      }
    }

    loadHolidays();

    return () => {
      cancelled = true;
    };
  }, [year]);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaveOverlay() {
      try {
        const response = await fetch(
          `/api/leaves/bootstrap?employeeId=${encodeURIComponent(employeeId)}`,
          { cache: "no-store" },
        );

        const result = (await response.json().catch(() => ({}))) as LeaveBootstrapResponse;

        if (!response.ok) {
          throw new Error("Unable to load leave overlay.");
        }

        if (cancelled) {
          return;
        }

        const nextOverlayMap: LeaveOverlayMap = {};

        for (const request of extractLeaveRequests(result)) {
          const dates = expandLeaveDates(request);

          for (const date of dates) {
            nextOverlayMap[date] = {
              leaveTypeName: request.leaveTypeName,
              status: request.status,
            };
          }
        }

        setLeaveOverlayMap(nextOverlayMap);
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLeaveOverlayMap({});
        }
      }
    }

    loadLeaveOverlay();

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setIsLoadingBoard(true);
        await loadBoardData();
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load month board.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBoard(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [loadBoardData]);

  function markBoardDirty() {
    if (!isBoardLocked) {
      setMonthStatus("draft");
    }
  }

  function moveMonth(offset: number) {
    const next = new Date(year, month - 1 + offset, 1);
    setVisibleMonthKey(getMonthKey(next));
    setRejectPanelOpen(false);
    setRejectReason("");
  }

  function addProject(project: PickerProject) {
    if (isBoardLocked) {
      toast.error("Approved months are locked.");
      return;
    }

    const existing = projects.find((item) => item.projectCode === project.code);

    if (existing) {
      toast.error("This project is already added to the current board.");
      return;
    }

    const sectionId = getProjectSectionKey(project.code);

    const newProject: BoardProject = {
      id: sectionId,
      projectCode: project.code,
      projectName: project.name,
      isChargeable: project.isChargeable,
      customerName: project.customerName,
    };

    const newRow: BoardRow = {
      id: `${getEmptyTaskRowId(project.code)}__0`,
      projectRefId: sectionId,
      taskName: "",
      days: {},
    };

    setProjects((current) => [...current, newProject]);
    setRows((current) => [...current, newRow]);
    markBoardDirty();

    toast.success(`Added project "${project.code}" to the board.`);
  }

  function addTaskRow(projectRefId: string, projectCode: string) {
    if (isBoardLocked) {
      toast.error("Approved months are locked.");
      return;
    }

    const currentProjectRows = rows.filter((row) => row.projectRefId === projectRefId);

    setRows((current) => [
      ...current,
      {
        id: `${getEmptyTaskRowId(projectCode)}__${currentProjectRows.length}`,
        projectRefId,
        taskName: "",
        days: {},
      },
    ]);

    markBoardDirty();
  }

  function removeTaskRow(rowId: string) {
    if (isBoardLocked) {
      toast.error("Approved months are locked.");
      return;
    }

    setRows((current) => current.filter((row) => row.id !== rowId));
    markBoardDirty();
  }

  function removeProject(projectRefId: string) {
    if (isBoardLocked) {
      toast.error("Approved months are locked.");
      return;
    }

    setProjects((current) => current.filter((project) => project.id !== projectRefId));
    setRows((current) => current.filter((row) => row.projectRefId !== projectRefId));
    markBoardDirty();
  }

  function updateTaskName(rowId: string, taskName: string) {
    if (isBoardLocked || isSubmittedMonth) {
      return;
    }

    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, taskName } : row)),
    );

    markBoardDirty();
  }

  function updateCell(rowId: string, day: number, value: string) {
    if (isBoardLocked || isSubmittedMonth) {
      return;
    }

    const normalizedValue = normalizeHourInput(value);

    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              days: {
                ...row.days,
                [day]: normalizedValue,
              },
            }
          : row,
      ),
    );

    markBoardDirty();
  }

  function getRowTotal(row: BoardRow): number {
    return Number(
      Object.values(row.days)
        .reduce((sum, value) => sum + parseHourValue(value), 0)
        .toFixed(2),
    );
  }

  function getDayTotal(day: number): number {
    return Number(
      rows
        .reduce((sum, row) => sum + parseHourValue(row.days[day] ?? ""), 0)
        .toFixed(2),
    );
  }

  function buildPayloadRows(): SaveMonthBoardEntryPayload[] {
    return groupedProjects.flatMap((project) =>
      project.rows.flatMap((row) =>
        days
          .filter((day) => parseHourValue(row.days[day] ?? "") > 0)
          .map((day) => ({
            workDate: toIsoDate(year, month, day),
            hours: parseHourValue(row.days[day] ?? ""),
            unit: "hour",
            taskName: row.taskName.trim() || "Untitled task",
            description: undefined,
            projectAccountId: project.projectCode,
            projectAccountName: project.projectName,
            customerName: project.customerName,
            isBillable: project.isChargeable,
            source: "manual",
          })),
      ),
    );
  }

  async function postMonthBoard(
    endpoint:
      | "/api/timesheets/month-board/save"
      | "/api/timesheets/month-board/submit"
      | "/api/timesheets/month-board/approve"
      | "/api/timesheets/month-board/reject",
    successMessage: string,
    nextStatus: TimesheetStatus,
    fallbackErrorMessage: string,
    extraBody?: Record<string, unknown>,
  ) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeId,
        employeeName,
        month: visibleMonthKey,
        ...(endpoint.endsWith("/save") || endpoint.endsWith("/submit")
          ? { entries: buildPayloadRows() }
          : {}),
        ...extraBody,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as TimesheetMonthBoardResponse;

    if (!response.ok) {
      throw new Error(extractApiErrorMessage(result, fallbackErrorMessage));
    }

    const updatedItems = extractTimesheetItems(result);
    const boardData = mapEntriesToBoard(updatedItems);

    setProjects(boardData.projects);
    setRows(boardData.rows);
    setMonthStatus(nextStatus);
    toast.success(successMessage);
  }

  async function handleSaveDraft() {
    try {
      const payloadRows = buildPayloadRows();

      if (payloadRows.length === 0) {
        toast.error("There is no effort to save in the current month board.");
        return;
      }

      setIsSavingDraft(true);

      await postMonthBoard(
        "/api/timesheets/month-board/save",
        "Timesheet month board saved successfully.",
        "draft",
        "Unable to save timesheet month board.",
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save timesheet month board.",
      );
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSubmitMonth() {
    try {
      const payloadRows = buildPayloadRows();

      if (payloadRows.length === 0) {
        toast.error("There is no effort to submit in the current month board.");
        return;
      }

      setIsSubmittingMonth(true);

      await postMonthBoard(
        "/api/timesheets/month-board/submit",
        "Timesheet month submitted successfully.",
        "submitted",
        "Unable to submit timesheet month.",
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to submit timesheet month.",
      );
    } finally {
      setIsSubmittingMonth(false);
    }
  }

  async function handleApproveMonth() {
    try {
      setIsApprovingMonth(true);

      await postMonthBoard(
        "/api/timesheets/month-board/approve",
        "Timesheet month approved successfully.",
        "approved",
        "Unable to approve timesheet month.",
      );

      await loadBoardData();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to approve timesheet month.",
      );
    } finally {
      setIsApprovingMonth(false);
    }
  }

  async function handleRejectMonth() {
    try {
      if (!rejectReason.trim()) {
        toast.error("Reject reason is required.");
        return;
      }

      setIsRejectingMonth(true);

      await postMonthBoard(
        "/api/timesheets/month-board/reject",
        "Timesheet month rejected successfully.",
        "rejected",
        "Unable to reject timesheet month.",
        {
          reason: rejectReason.trim(),
        },
      );

      setRejectPanelOpen(false);
      setRejectReason("");

      await loadBoardData();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to reject timesheet month.",
      );
    } finally {
      setIsRejectingMonth(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Month board</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Monthly timesheet board
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Plan effort by project and sub-task, then review month entries in a
              cleaner board-first workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => moveMonth(-1)}>
              <ChevronLeft className="size-4" />
            </Button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              {getMonthLabel(year, month)}
            </div>

            <Button type="button" variant="outline" onClick={() => moveMonth(1)}>
              <ChevronRight className="size-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(true)}
              disabled={isBoardLocked || isSubmittedMonth}
            >
              <FolderPlus className="size-4" />
              Add Project
            </Button>

            <Button
              type="button"
              onClick={handleSaveDraft}
              disabled={
                isSavingDraft ||
                isSubmittingMonth ||
                isLoadingBoard ||
                isBoardLocked ||
                isSubmittedMonth
              }
            >
              <Save className="size-4" />
              {isSavingDraft ? "Saving..." : "Save Draft"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSubmitMonth}
              disabled={
                isSavingDraft ||
                isSubmittingMonth ||
                isLoadingBoard ||
                isBoardLocked
              }
            >
              <Send className="size-4" />
              {isSubmittingMonth ? "Submitting..." : "Submit Month"}
            </Button>

            {canManageApproval ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApproveMonth}
                  disabled={
                    monthStatus !== "submitted" ||
                    isApprovingMonth ||
                    isRejectingMonth
                  }
                >
                  <ShieldCheck className="size-4" />
                  {isApprovingMonth ? "Approving..." : "Approve Month"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectPanelOpen((current) => !current)}
                  disabled={
                    monthStatus !== "submitted" ||
                    isApprovingMonth ||
                    isRejectingMonth
                  }
                >
                  <XCircle className="size-4" />
                  Reject Month
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Employee
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {employeeName}
            </p>
            <p className="mt-1 text-xs text-slate-500">{employeeId}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Projects
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {projectCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Task Rows
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {taskRowCount}
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-sky-700">
              Month Total
            </p>
            <p className="mt-2 text-2xl font-semibold text-sky-800">
              {monthTotalHours}
            </p>
          </div>

          <div
            className={[
              "rounded-2xl border px-4 py-3",
              monthStatus === "approved"
                ? "border-emerald-200 bg-emerald-50"
                : monthStatus === "submitted"
                  ? "border-amber-200 bg-amber-50"
                  : monthStatus === "rejected"
                    ? "border-rose-200 bg-rose-50"
                    : "border-slate-200 bg-slate-50",
            ].join(" ")}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Month Status
            </p>
            <div className="mt-2 flex items-center gap-2">
              {isBoardLocked ? (
                <Lock className="size-4 text-emerald-700" />
              ) : (
                <div className="inline-block size-2 rounded-full bg-slate-400" />
              )}
              <p className="text-sm font-semibold capitalize text-slate-900">
                {monthStatus}
              </p>
            </div>
          </div>
        </div>

        {rejectPanelOpen ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-700">
              Reject timesheet month
            </p>
            <p className="mt-1 text-sm text-rose-600">
              Add a reason before rejecting this month.
            </p>

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
                onClick={handleRejectMonth}
                disabled={isRejectingMonth}
              >
                {isRejectingMonth ? "Rejecting..." : "Confirm Reject"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectPanelOpen(false);
                  setRejectReason("");
                }}
                disabled={isRejectingMonth}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
            <span className="inline-block size-2 rounded-full bg-slate-400" />
            Weekday
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
            <span className="inline-block size-2 rounded-full bg-amber-500" />
            Weekend
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">
            <span className="inline-block size-2 rounded-full bg-rose-500" />
            Holiday
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700">
            <span className="inline-block size-2 rounded-full bg-violet-500" />
            Approved Leave
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-fuchsia-700">
            <span className="inline-block size-2 rounded-full bg-fuchsia-500" />
            Pending Leave
          </span>
        </div>
      </div>

      <div className="overflow-x-auto p-5">
        <div className="min-w-[1500px]">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 min-w-[320px] border-b border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-700">
                  Project / Sub-task
                </th>

                {days.map((day) => {
                  const isoDate = toIsoDate(year, month, day);
                  const dayType = getDayType(year, month, day, holidayMap);
                  const leaveItem = leaveOverlayMap[isoDate];
                  const holidayName = holidayMap[isoDate]?.name;

                  return (
                    <th
                      key={day}
                      title={
                        leaveItem
                          ? `${leaveItem.leaveTypeName} (${leaveItem.status})`
                          : holidayName || undefined
                      }
                      className={`min-w-[56px] border-b px-2 py-3 text-center font-semibold text-slate-700 ${getDayCellToneClassName(dayType, leaveItem)}`}
                    >
                      <div>{day}</div>
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                        {getWeekdayShortLabel(year, month, day)}
                      </div>
                      {leaveItem ? (
                        <div
                          className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${getLeaveLabelClassName(
                            leaveItem.status,
                          )}`}
                        >
                          {leaveItem.status === "approved" ? "LEAVE" : "PEND"}
                        </div>
                      ) : dayType === "holiday" ? (
                        <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-rose-700">
                          HOL
                        </div>
                      ) : null}
                    </th>
                  );
                })}

                <th className="min-w-[72px] border-b border-slate-200 bg-white px-4 py-3 text-center font-semibold text-slate-700">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoadingBoard ? (
                <tr>
                  <td
                    colSpan={days.length + 2}
                    className="border-b border-slate-100 px-4 py-12 text-center text-sm text-slate-500"
                  >
                    Loading timesheet board...
                  </td>
                </tr>
              ) : null}

              {!isLoadingBoard && groupedProjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={days.length + 2}
                    className="border-b border-slate-100 px-4 py-12 text-center text-sm text-slate-500"
                  >
                    No projects added yet. Start by clicking <strong>Add Project</strong>.
                  </td>
                </tr>
              ) : null}

              {!isLoadingBoard &&
                groupedProjects.map((project) => (
                  <tr key={`project-${project.id}`}>
                    <td colSpan={days.length + 2} className="p-0">
                      <div className="border-b border-slate-200 bg-slate-50">
                        <div className="grid min-w-full grid-cols-[320px_repeat(auto-fit,minmax(56px,1fr))_72px]">
                          <div className="sticky left-0 z-10 flex min-h-[72px] items-center justify-between gap-3 border-r border-slate-200 bg-slate-50 px-4 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {project.projectCode}
                              </p>
                              <p className="mt-1 text-sm text-slate-700">
                                {project.projectName}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {project.customerName || "No customer"} •{" "}
                                {project.isChargeable ? "Chargeable" : "Non-charge"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  addTaskRow(project.id, project.projectCode)
                                }
                                disabled={isBoardLocked || isSubmittedMonth}
                              >
                                <Plus className="size-4" />
                                Add Row
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => removeProject(project.id)}
                                disabled={isBoardLocked || isSubmittedMonth}
                              >
                                <Trash2 className="size-4" />
                                Remove
                              </Button>
                            </div>
                          </div>

                          {days.map((day) => {
                            const isoDate = toIsoDate(year, month, day);
                            const dayType = getDayType(year, month, day, holidayMap);
                            const leaveItem = leaveOverlayMap[isoDate];

                            return (
                              <div
                                key={`project-${project.id}-day-${day}`}
                                className={`min-h-[72px] border-r border-slate-200 ${getDayCellToneClassName(dayType, leaveItem)}`}
                              />
                            );
                          })}

                          <div className="flex min-h-[72px] items-center justify-center border-r border-slate-200 bg-slate-50 px-4 py-4 text-center font-semibold text-slate-900">
                            {project.rows.reduce((sum, row) => sum + getRowTotal(row), 0)}
                          </div>
                        </div>
                      </div>

                      {project.rows.map((row) => (
                        <div
                          key={row.id}
                          className="grid min-w-full grid-cols-[320px_repeat(auto-fit,minmax(56px,1fr))_72px] border-b border-slate-100 hover:bg-slate-50/60"
                        >
                          <div className="sticky left-0 z-10 flex items-start gap-3 border-r border-slate-100 bg-white px-4 py-3">
                            <input
                              type="text"
                              value={row.taskName}
                              onChange={(event) =>
                                updateTaskName(row.id, event.target.value)
                              }
                              placeholder="Enter sub-task"
                              disabled={isBoardLocked || isSubmittedMonth}
                              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />

                            <button
                              type="button"
                              onClick={() => removeTaskRow(row.id)}
                              disabled={isBoardLocked || isSubmittedMonth}
                              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300"
                              aria-label="Remove task row"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>

                          {days.map((day) => {
                            const isoDate = toIsoDate(year, month, day);
                            const dayType = getDayType(year, month, day, holidayMap);
                            const leaveItem = leaveOverlayMap[isoDate];
                            const holidayName = holidayMap[isoDate]?.name;

                            const isApprovedLeave = leaveItem?.status === "approved";
                            const isPendingLeave = leaveItem?.status === "pending";

                            return (
                              <div
                                key={`${row.id}-day-${day}`}
                                title={
                                  leaveItem
                                    ? `${leaveItem.leaveTypeName} (${leaveItem.status})`
                                    : holidayName || undefined
                                }
                                className={`flex items-center justify-center border-r border-slate-100 px-1 py-3 ${getDayCellToneClassName(dayType, leaveItem)}`}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="0.25"
                                  value={row.days[day] ?? ""}
                                  onChange={(event) =>
                                    updateCell(row.id, day, event.target.value)
                                  }
                                  disabled={
                                    isBoardLocked ||
                                    isSubmittedMonth ||
                                    isApprovedLeave
                                  }
                                  className={[
                                    "block w-12 rounded-lg border px-2 py-1.5 text-center text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed",
                                    isApprovedLeave
                                      ? "border-violet-200 bg-violet-100 text-violet-700"
                                      : isPendingLeave
                                        ? "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700"
                                        : "border-slate-200 bg-white disabled:bg-slate-100",
                                  ].join(" ")}
                                />
                              </div>
                            );
                          })}

                          <div className="flex items-center justify-center border-r border-slate-100 bg-white px-4 py-3 text-center font-semibold text-slate-900">
                            {getRowTotal(row)}
                          </div>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}

              {!isLoadingBoard && groupedProjects.length > 0 ? (
                <tr className="bg-slate-50">
                  <td className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900">
                    Day Totals
                  </td>

                  {days.map((day) => {
                    const isoDate = toIsoDate(year, month, day);
                    const dayType = getDayType(year, month, day, holidayMap);
                    const leaveItem = leaveOverlayMap[isoDate];

                    return (
                      <td
                        key={`total-${day}`}
                        className={`border-b border-slate-200 px-2 py-4 text-center text-sm font-semibold text-slate-900 ${getDayCellToneClassName(dayType, leaveItem)}`}
                      >
                        {getDayTotal(day)}
                      </td>
                    );
                  })}

                  <td className="border-b border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-900">
                    {monthTotalHours}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <TimesheetProjectPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addProject}
      />
    </section>
  );
}