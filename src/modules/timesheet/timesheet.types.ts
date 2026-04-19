export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type TimesheetEntrySource = "manual" | "api";

export type TimesheetUnit = "hour" | "day";

export type TimesheetApprovalRole = "lead";

export type TimesheetViewMode = "my-timesheets" | "team-approval";

export type TimesheetEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  hours: number;
  unit: TimesheetUnit;
  taskName: string;
  description?: string;
  projectAccountId?: string;
  projectAccountName?: string;
  customerName?: string;
  isBillable: boolean;
  source: TimesheetEntrySource;
  status: TimesheetStatus;
  approverRole?: TimesheetApprovalRole;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTimesheetEntryInput = {
  workDate: string;
  hours: number;
  unit?: TimesheetUnit;
  taskName: string;
  description?: string;
  projectAccountId?: string;
  projectAccountName?: string;
  customerName?: string;
  isBillable?: boolean;
  source?: TimesheetEntrySource;
};

export type UpdateTimesheetEntryInput = Partial<{
  workDate: string;
  hours: number;
  unit: TimesheetUnit;
  taskName: string;
  description: string;
  projectAccountId: string;
  projectAccountName: string;
  customerName: string;
  isBillable: boolean;
  source: TimesheetEntrySource;
  status: TimesheetStatus;
  approverRole: TimesheetApprovalRole;
  submittedAt: string;
  approvedAt: string;
  rejectedAt: string;
  rejectedReason: string;
}>;

export type TimesheetEntryFilters = Partial<{
  employeeId: string;
  status: TimesheetStatus;
  source: TimesheetEntrySource;
  isBillable: boolean;
  fromDate: string;
  toDate: string;
  projectAccountId: string;
}>;

export type TimesheetDailySummary = {
  workDate: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  entryCount: number;
};

export type TimesheetOverviewSummary = {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  draftCount: number;
};

export type TimesheetApprovalSummary = {
  pendingCount: number;
  approvedThisMonthCount: number;
  rejectedThisMonthCount: number;
};

export type TimesheetBootstrap = {
  items: TimesheetEntry[];
  dailySummaries: TimesheetDailySummary[];
  overview: TimesheetOverviewSummary;
  approval: TimesheetApprovalSummary;
};

export type TimesheetsFile = {
  items: TimesheetEntry[];
};

export type SaveTimesheetMonthBoardEntryInput = {
  workDate: string;
  hours: number;
  unit?: TimesheetUnit;
  taskName: string;
  description?: string;
  projectAccountId?: string;
  projectAccountName?: string;
  customerName?: string;
  isBillable?: boolean;
  source?: TimesheetEntrySource;
};

export type SaveTimesheetMonthBoardInput = {
  employeeId: string;
  employeeName: string;
  month: string;
  entries: SaveTimesheetMonthBoardEntryInput[];
};