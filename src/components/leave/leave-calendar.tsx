// src/components/leave/leave-calendar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  LeaveCalendarEvent,
  LeaveStatus,
} from "@/modules/leave/leave.types";
import type {
  TimesheetEntry,
  TimesheetStatus,
} from "@/modules/timesheet/timesheet.types";

type LeaveCalendarProps = {
  events: LeaveCalendarEvent[];
  timesheets?: TimesheetEntry[];
};

type CalendarDay = {
  key: string;
  date: Date;
  isoDate: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: LeaveCalendarEvent[];
  timesheets: TimesheetEntry[];
};

type TimesheetSummary = {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  entryCount: number;
  statuses: TimesheetStatus[];
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayIsoDate(): string {
  return toIsoDate(new Date());
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatFullDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);

  return new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );
}

function resolveStaffName(name?: string): string {
  const trimmed = name?.trim();

  return trimmed || "Unknown Staff";
}

function getStatusDotClassName(status: LeaveStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500";
    case "pending":
      return "bg-amber-500";
    case "rejected":
      return "bg-rose-500";
    case "cancelled":
      return "bg-slate-400";
    case "draft":
      return "bg-sky-500";
    default:
      return "bg-slate-400";
  }
}

function getStatusBadgeClassName(status: LeaveStatus): string {
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

function getTimesheetDotClassName(status: TimesheetStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500";
    case "submitted":
      return "bg-amber-500";
    case "rejected":
      return "bg-rose-500";
    case "draft":
    default:
      return "bg-slate-400";
  }
}

function getTimesheetBadgeClassName(status: TimesheetStatus): string {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "submitted":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "draft":
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getLeaveTypeBadgeClassName(leaveTypeId: string): string {
  switch (leaveTypeId) {
    case "L001":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "L003":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "L004":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getPortionLabel(portion: LeaveCalendarEvent["portion"]): string {
  switch (portion) {
    case "half-am":
      return "Half day (AM)";
    case "half-pm":
      return "Half day (PM)";
    default:
      return "Full day";
  }
}

function getCompactPortionLabel(portion: LeaveCalendarEvent["portion"]): string {
  switch (portion) {
    case "half-am":
      return "AM";
    case "half-pm":
      return "PM";
    default:
      return "Full";
  }
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatHours(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function summarizeTimesheets(items: TimesheetEntry[]): TimesheetSummary {
  const statuses = new Set<TimesheetStatus>();
  let totalHours = 0;
  let billableHours = 0;
  let nonBillableHours = 0;

  for (const item of items) {
    const hours = roundHours(item.hours);
    totalHours = roundHours(totalHours + hours);

    if (item.isBillable) {
      billableHours = roundHours(billableHours + hours);
    } else {
      nonBillableHours = roundHours(nonBillableHours + hours);
    }

    statuses.add(item.status);
  }

  return {
    totalHours,
    billableHours,
    nonBillableHours,
    entryCount: items.length,
    statuses: [...statuses],
  };
}

function buildCalendarDays(
  monthDate: Date,
  events: LeaveCalendarEvent[],
  timesheets: TimesheetEntry[],
): CalendarDay[] {
  const startOfMonth = getMonthStart(monthDate);
  const endOfMonth = getMonthEnd(monthDate);
  const todayIsoDate = getTodayIsoDate();

  const gridStart = new Date(startOfMonth);
  gridStart.setDate(startOfMonth.getDate() - startOfMonth.getDay());

  const gridEnd = new Date(endOfMonth);
  gridEnd.setDate(endOfMonth.getDate() + (6 - endOfMonth.getDay()));

  const eventMap = new Map<string, LeaveCalendarEvent[]>();
  const timesheetMap = new Map<string, TimesheetEntry[]>();

  for (const event of events) {
    const key = event.date;
    const existing = eventMap.get(key);

    if (existing) {
      existing.push(event);
    } else {
      eventMap.set(key, [event]);
    }
  }

  for (const timesheet of timesheets) {
    const key = timesheet.workDate.slice(0, 10);
    const existing = timesheetMap.get(key);

    if (existing) {
      existing.push(timesheet);
    } else {
      timesheetMap.set(key, [timesheet]);
    }
  }

  const days: CalendarDay[] = [];

  for (
    let cursor = new Date(gridStart);
    cursor <= gridEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const isoDate = toIsoDate(cursor);
    const dayOfWeek = cursor.getDay();

    days.push({
      key: isoDate,
      date: new Date(cursor),
      isoDate,
      isCurrentMonth: cursor.getMonth() === monthDate.getMonth(),
      isToday: isoDate === todayIsoDate,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      events: [...(eventMap.get(isoDate) ?? [])].sort((a, b) =>
        resolveStaffName(a.employeeName).localeCompare(
          resolveStaffName(b.employeeName),
        ),
      ),
      timesheets: [...(timesheetMap.get(isoDate) ?? [])].sort((a, b) => {
        const employeeCompare = a.employeeName.localeCompare(b.employeeName);

        if (employeeCompare !== 0) {
          return employeeCompare;
        }

        return a.taskName.localeCompare(b.taskName);
      }),
    });
  }

  return days;
}

function getInitialVisibleMonth(events: LeaveCalendarEvent[]): Date {
  if (events.length > 0) {
    const firstEvent = events[0];
    const [year, month] = firstEvent.date.split("-").map(Number);

    if (
      typeof year === "number" &&
      Number.isFinite(year) &&
      typeof month === "number" &&
      Number.isFinite(month)
    ) {
      return new Date(year, month - 1, 1);
    }
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getInitialSelectedDate(
  events: LeaveCalendarEvent[],
  visibleMonth: Date,
): string {
  if (events.length > 0) {
    return events[0].date;
  }

  return toIsoDate(visibleMonth);
}

function EventCountPill({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: "leave" | "timesheet";
}) {
  if (count <= 0) {
    return null;
  }

  const className =
    tone === "leave"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}
    >
      {count} {label}
    </span>
  );
}

function SummaryMiniCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function LeaveCalendar({ events, timesheets = [] }: LeaveCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
    getInitialVisibleMonth(events),
  );
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getInitialSelectedDate(events, getInitialVisibleMonth(events)),
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth, events, timesheets),
    [events, timesheets, visibleMonth],
  );

  const visibleMonthLabel = formatMonthLabel(visibleMonth);

  const visibleMonthSummary = useMemo(() => {
    const currentMonth = visibleMonth.getMonth();
    const currentYear = visibleMonth.getFullYear();

    const monthEvents = events.filter((event) => {
      const [year, month] = event.date.split("-").map(Number);

      return year === currentYear && month === currentMonth + 1;
    });

    const monthTimesheets = timesheets.filter((timesheet) => {
      const [year, month] = timesheet.workDate.slice(0, 10).split("-").map(Number);

      return year === currentYear && month === currentMonth + 1;
    });

    const approvedCount = monthEvents.filter(
      (event) => event.status === "approved",
    ).length;
    const pendingCount = monthEvents.filter(
      (event) => event.status === "pending",
    ).length;
    const timesheetSummary = summarizeTimesheets(monthTimesheets);

    return {
      total: monthEvents.length,
      approved: approvedCount,
      pending: pendingCount,
      timesheetDays: new Set(
        monthTimesheets.map((timesheet) => timesheet.workDate.slice(0, 10)),
      ).size,
      timesheetHours: timesheetSummary.totalHours,
    };
  }, [events, timesheets, visibleMonth]);

  const selectedDay = useMemo(() => {
    return calendarDays.find((day) => day.isoDate === selectedDate) ?? null;
  }, [calendarDays, selectedDate]);

  const selectedDayEvents = selectedDay?.events ?? [];
  const selectedDayTimesheets = selectedDay?.timesheets ?? [];
  const selectedDayTimesheetSummary = summarizeTimesheets(selectedDayTimesheets);

  useEffect(() => {
    const selectedExistsInCurrentGrid = calendarDays.some(
      (day) => day.isoDate === selectedDate,
    );

    if (selectedExistsInCurrentGrid) {
      return;
    }

    const fallback =
      calendarDays.find((day) => day.isCurrentMonth) ?? calendarDays[0];

    if (fallback) {
      setSelectedDate(fallback.isoDate);
    }
  }, [calendarDays, selectedDate]);

  return (
    <section className="glass-panel-calendar rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Calendar</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Leave and timesheet calendar
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Visualize leave events, half-day leave portions, and timesheet
            activity by month. Staff names fall back to Unknown Staff when a
            future Kawari user mapping is not available yet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setVisibleMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            {visibleMonthLabel}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setVisibleMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[260px,minmax(0,1fr),380px]">
        <aside className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Month summary</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              {visibleMonthLabel}
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            <SummaryMiniCard
              label="Leave events"
              value={visibleMonthSummary.total}
              className="border-slate-200 bg-white text-slate-900"
            />
            <SummaryMiniCard
              label="Approved"
              value={visibleMonthSummary.approved}
              className="border-emerald-200 bg-emerald-50 text-emerald-800"
            />
            <SummaryMiniCard
              label="Pending"
              value={visibleMonthSummary.pending}
              className="border-amber-200 bg-amber-50 text-amber-800"
            />
            <SummaryMiniCard
              label="Timesheet days"
              value={visibleMonthSummary.timesheetDays}
              className="border-sky-200 bg-sky-50 text-sky-800"
            />
            <SummaryMiniCard
              label="Timesheet hours"
              value={`${formatHours(visibleMonthSummary.timesheetHours)}h`}
              className="border-violet-200 bg-violet-50 text-violet-800"
            />
          </div>
        </aside>

        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const isSelected = day.isoDate === selectedDate;
                const dayTimesheetSummary = summarizeTimesheets(day.timesheets);

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDate(day.isoDate)}
                    className={[
                      "min-h-[172px] rounded-2xl border p-3 text-left shadow-sm transition",
                      day.isCurrentMonth
                        ? day.isWeekend
                          ? "border-sky-100 bg-sky-50/70 hover:border-sky-200"
                          : "border-slate-200 bg-white hover:border-slate-300"
                        : "border-slate-100 bg-slate-50/80 text-slate-400 hover:border-slate-200",
                      isSelected ? "ring-2 ring-sky-300" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={[
                          "inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                          day.isToday
                            ? "bg-sky-600 text-white"
                            : isSelected
                              ? "bg-slate-900 text-white"
                              : day.isCurrentMonth
                                ? "bg-slate-100 text-slate-800"
                                : "bg-slate-100 text-slate-400",
                        ].join(" ")}
                      >
                        {day.date.getDate()}
                      </span>

                      <div className="flex flex-wrap justify-end gap-1">
                        <EventCountPill
                          count={day.events.length}
                          label="leave"
                          tone="leave"
                        />
                        <EventCountPill
                          count={day.timesheets.length}
                          label="TS"
                          tone="timesheet"
                        />
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {day.events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="rounded-xl border border-slate-200 bg-white/82 px-2.5 py-2"
                          title={`${resolveStaffName(event.employeeName)} • ${event.leaveTypeName} • ${event.status}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block size-2 rounded-full ${getStatusDotClassName(event.status)}`}
                            />
                            <span className="truncate text-xs font-semibold text-slate-800">
                              {resolveStaffName(event.employeeName)}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex max-w-[118px] rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getLeaveTypeBadgeClassName(event.leaveTypeId)}`}
                              title={event.leaveTypeName}
                            >
                              <span className="truncate">{event.leaveTypeName}</span>
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                              {getCompactPortionLabel(event.portion)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {day.events.length > 2 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-500">
                          +{day.events.length - 2} more leave
                        </div>
                      ) : null}

                      {day.timesheets.length > 0 ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
                              <Clock3 className="size-3" />
                              Timesheet
                            </span>
                            <span className="text-xs font-semibold text-emerald-800">
                              {formatHours(dayTimesheetSummary.totalHours)}h
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {dayTimesheetSummary.statuses.map((status) => (
                              <span
                                key={status}
                                className={`inline-block size-2 rounded-full ${getTimesheetDotClassName(status)}`}
                                title={status}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Selected day</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {selectedDay ? formatFullDateLabel(selectedDay.isoDate) : "No date"}
              </h3>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600">
              <CalendarDays className="size-5" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                Leave
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {selectedDayEvents.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700">
                Timesheet
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {formatHours(selectedDayTimesheetSummary.totalHours)}h
              </p>
            </div>
          </div>

          {selectedDayEvents.length === 0 &&
          selectedDayTimesheets.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No leave or timesheet activity
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Pick another day in the grid to inspect leave and timesheet
                details.
              </p>
            </div>
          ) : null}

          {selectedDayEvents.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Layers className="size-4 text-sky-700" />
                Leave events
              </div>

              <div className="space-y-3">
                {selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {resolveStaffName(event.employeeName)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {event.employeeId}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadgeClassName(event.status)}`}
                      >
                        {event.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getLeaveTypeBadgeClassName(event.leaveTypeId)}`}
                      >
                        {event.leaveTypeName}
                      </span>

                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {getPortionLabel(event.portion)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {selectedDayTimesheets.length > 0 ? (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileCheck2 className="size-4 text-emerald-700" />
                Timesheet overlay
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    Total
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatHours(selectedDayTimesheetSummary.totalHours)}h
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-700">
                    Billable
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    {formatHours(selectedDayTimesheetSummary.billableHours)}h
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    Entries
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedDayTimesheetSummary.entryCount}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedDayTimesheets.map((timesheet) => (
                  <div
                    key={timesheet.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {resolveStaffName(timesheet.employeeName)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {timesheet.taskName}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getTimesheetBadgeClassName(timesheet.status)}`}
                      >
                        {timesheet.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {formatHours(timesheet.hours)}h
                      </span>

                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {timesheet.isBillable ? "Billable" : "Non-billable"}
                      </span>

                      {timesheet.projectAccountName ? (
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                          {timesheet.projectAccountName}
                        </span>
                      ) : null}
                    </div>

                    {timesheet.description ? (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {timesheet.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Leave approved / TS approved
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
              <span className="inline-block size-2 rounded-full bg-amber-500" />
              Pending / submitted
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
              <span className="inline-block size-2 rounded-full bg-rose-500" />
              Rejected
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
              <span className="inline-block size-2 rounded-full bg-slate-400" />
              Cancelled / draft
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}