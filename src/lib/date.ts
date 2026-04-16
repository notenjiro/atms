import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";

import type { IsoDateString, IsoDateTimeString } from "@/types/common";

export function nowIsoDateTime(): IsoDateTimeString {
  return new Date().toISOString();
}

export function todayIsoDate(): IsoDateString {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDate(date: Date, pattern = "dd MMM yyyy"): string {
  return format(date, pattern);
}

export function formatIsoDate(dateString: IsoDateString, pattern = "dd MMM yyyy"): string {
  const parsed = parseISO(dateString);
  return isValid(parsed) ? format(parsed, pattern) : dateString;
}

export function formatIsoDateTime(
  dateTimeString: IsoDateTimeString,
  pattern = "dd MMM yyyy HH:mm",
): string {
  const parsed = parseISO(dateTimeString);
  return isValid(parsed) ? format(parsed, pattern) : dateTimeString;
}

export function parseIsoDate(dateString: string): Date | null {
  const parsed = parseISO(dateString);
  return isValid(parsed) ? parsed : null;
}

export function getDaysUntil(dateString: IsoDateString): number | null {
  const targetDate = parseIsoDate(dateString);

  if (!targetDate) {
    return null;
  }

  return differenceInCalendarDays(targetDate, new Date());
}

export function getMonthRange(date = new Date()): {
  startDate: IsoDateString;
  endDate: IsoDateString;
} {
  return {
    startDate: format(startOfMonth(date), "yyyy-MM-dd"),
    endDate: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

export function shiftMonth(date: Date, amount: number): Date {
  return addMonths(date, amount);
}

export function isDateWithinRange(
  targetDate: IsoDateString,
  startDate: IsoDateString,
  endDate: IsoDateString,
): boolean {
  const target = parseIsoDate(targetDate);
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (!target || !start || !end) {
    return false;
  }

  return target >= start && target <= end;
}

export function toYearMonthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

export function toYearMonthKeyFromIso(dateString: IsoDateString): string | null {
  const parsed = parseIsoDate(dateString);
  return parsed ? format(parsed, "yyyy-MM") : null;
}