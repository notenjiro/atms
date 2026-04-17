"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  LeaveCalendarEvent,
  LeaveStatus,
} from "@/modules/leave/leave.types";

type LeaveCalendarProps = {
  events: LeaveCalendarEvent[];
};

type CalendarDay = {
  key: string;
  date: Date;
  isoDate: string;
  isCurrentMonth: boolean;
  events: LeaveCalendarEvent[];
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

function buildCalendarDays(
  monthDate: Date,
  events: LeaveCalendarEvent[],
): CalendarDay[] {
  const startOfMonth = getMonthStart(monthDate);
  const endOfMonth = getMonthEnd(monthDate);

  const gridStart = new Date(startOfMonth);
  gridStart.setDate(startOfMonth.getDate() - startOfMonth.getDay());

  const gridEnd = new Date(endOfMonth);
  gridEnd.setDate(endOfMonth.getDate() + (6 - endOfMonth.getDay()));

  const eventMap = new Map<string, LeaveCalendarEvent[]>();

  for (const event of events) {
    const key = event.date;
    const existing = eventMap.get(key);

    if (existing) {
      existing.push(event);
    } else {
      eventMap.set(key, [event]);
    }
  }

  const days: CalendarDay[] = [];

  for (
    let cursor = new Date(gridStart);
    cursor <= gridEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const isoDate = toIsoDate(cursor);

    days.push({
      key: isoDate,
      date: new Date(cursor),
      isoDate,
      isCurrentMonth: cursor.getMonth() === monthDate.getMonth(),
      events: [...(eventMap.get(isoDate) ?? [])].sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName),
      ),
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

function getInitialSelectedDate(events: LeaveCalendarEvent[], visibleMonth: Date): string {
  if (events.length > 0) {
    return events[0].date;
  }

  return toIsoDate(visibleMonth);
}

export function LeaveCalendar({ events }: LeaveCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
    getInitialVisibleMonth(events),
  );
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getInitialSelectedDate(events, getInitialVisibleMonth(events)),
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth, events),
    [events, visibleMonth],
  );

  const visibleMonthLabel = formatMonthLabel(visibleMonth);

  const visibleMonthSummary = useMemo(() => {
    const currentMonth = visibleMonth.getMonth();
    const currentYear = visibleMonth.getFullYear();

    const monthEvents = events.filter((event) => {
      const [year, month] = event.date.split("-").map(Number);

      return year === currentYear && month === currentMonth + 1;
    });

    const approvedCount = monthEvents.filter(
      (event) => event.status === "approved",
    ).length;
    const pendingCount = monthEvents.filter(
      (event) => event.status === "pending",
    ).length;

    return {
      total: monthEvents.length,
      approved: approvedCount,
      pending: pendingCount,
    };
  }, [events, visibleMonth]);

  const selectedDay = useMemo(() => {
    return calendarDays.find((day) => day.isoDate === selectedDate) ?? null;
  }, [calendarDays, selectedDate]);

  const selectedDayEvents = selectedDay?.events ?? [];

  useEffect(() => {
    const selectedExistsInCurrentGrid = calendarDays.some(
      (day) => day.isoDate === selectedDate,
    );

    if (selectedExistsInCurrentGrid) {
      return;
    }

    const fallback = calendarDays.find((day) => day.isCurrentMonth) ?? calendarDays[0];

    if (fallback) {
      setSelectedDate(fallback.isoDate);
    }
  }, [calendarDays, selectedDate]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Calendar</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Leave calendar
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Visualize leave events by month and click any date to inspect the
            day-level details on the side.
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

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            Events this month
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {visibleMonthSummary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700">
            Approved
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">
            {visibleMonthSummary.approved}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-amber-700">
            Pending
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-800">
            {visibleMonthSummary.pending}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr),360px]">
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

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDate(day.isoDate)}
                    className={[
                      "min-h-[152px] rounded-2xl border p-3 text-left shadow-sm transition",
                      day.isCurrentMonth
                        ? "border-slate-200 bg-white hover:border-slate-300"
                        : "border-slate-100 bg-slate-50/80 text-slate-400 hover:border-slate-200",
                      isSelected ? "ring-2 ring-slate-300" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={[
                          "inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                          isSelected
                            ? "bg-slate-900 text-white"
                            : day.isCurrentMonth
                              ? "bg-slate-100 text-slate-800"
                              : "bg-slate-100 text-slate-400",
                        ].join(" ")}
                      >
                        {day.date.getDate()}
                      </span>

                      {day.events.length > 0 ? (
                        <span className="text-xs font-medium text-slate-400">
                          {day.events.length} event{day.events.length > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-2">
                      {day.events.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
                          title={`${event.employeeName} • ${event.leaveTypeName} • ${event.status}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block size-2 rounded-full ${getStatusDotClassName(event.status)}`}
                            />
                            <span className="truncate text-xs font-semibold text-slate-800">
                              {event.employeeName}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getLeaveTypeBadgeClassName(event.leaveTypeId)}`}
                            >
                              {event.leaveTypeId}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                              {event.portion === "full"
                                ? "Full"
                                : event.portion === "half-am"
                                  ? "AM"
                                  : "PM"}
                            </span>
                          </div>
                        </div>
                      ))}

                      {day.events.length > 3 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-500">
                          +{day.events.length - 3} more
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

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Events on this day
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {selectedDayEvents.length}
            </p>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No leave events on this date
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Pick another day in the grid to inspect leave activity.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {event.employeeName}
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
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Approved
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
              <span className="inline-block size-2 rounded-full bg-amber-500" />
              Pending
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
              <span className="inline-block size-2 rounded-full bg-rose-500" />
              Rejected
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
              <span className="inline-block size-2 rounded-full bg-slate-400" />
              Cancelled
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}