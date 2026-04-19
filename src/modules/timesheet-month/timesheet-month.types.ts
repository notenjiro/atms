export type TimesheetMonthStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type TimesheetMonth = {
  employeeId: string;
  month: string;
  status: TimesheetMonthStatus;
  submittedAt?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type TimesheetMonthsFile = {
  items: TimesheetMonth[];
};