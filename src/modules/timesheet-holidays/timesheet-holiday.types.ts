export type TimesheetHolidayType =
  | "public"
  | "substitute"
  | "special"
  | "company";

export type TimesheetHoliday = {
  date: string; // YYYY-MM-DD
  name: string;
  type: TimesheetHolidayType;
  isActive: boolean;

  source: "local" | "api";

  createdAt: string;
  updatedAt: string;
};

export type TimesheetHolidaysFile = {
  items: TimesheetHoliday[];
};

export type TimesheetHolidayMap = Record<
  string, // YYYY-MM-DD
  TimesheetHoliday
>;