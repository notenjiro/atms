export const LEAVE_TYPE_IDS = [
  "L001",
  "L003",
  "L004",
  "L005",
  "L006",
  "L007",
  "L008",
  "L009",
  "L010",
  "L011",
  "L012",
  "L013",
  "L014",
] as const;

export type LeaveTypeId = (typeof LEAVE_TYPE_IDS)[number];

export type LeaveStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type LeaveApprovalRole = "lead";

export type LeaveQuotaSource = "manual" | "api";

export type LeaveDayPortion = "full" | "half-am" | "half-pm";

export type LeaveViewTab = "dashboard" | "calendar" | "request-history";

export type LeaveTypeDefinition = {
  id: LeaveTypeId;
  name: string;
  colorToken: string;
  quotaDays?: number;
  allowNegativeBalance?: boolean;
  quotaSource: LeaveQuotaSource;
  sortOrder: number;
};

export type LeaveQuotaBalance = {
  leaveTypeId: LeaveTypeId;
  entitledDays?: number;
  carriedForwardDays?: number;
  usedDays: number;
  pendingDays: number;
  remainingDays?: number;
  asOfDate?: string;
  source: LeaveQuotaSource;
  updatedAt?: string;
};

export type LeaveApprover = {
  role: LeaveApprovalRole;
  name?: string;
  email?: string;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: LeaveTypeId;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  startPortion: LeaveDayPortion;
  endPortion: LeaveDayPortion;
  totalDays: number;
  remarks?: string;
  status: LeaveStatus;
  approver: LeaveApprover;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateLeaveRequestInput = {
  leaveTypeId: LeaveTypeId;
  startDate: string;
  endDate: string;
  startPortion?: LeaveDayPortion;
  endPortion?: LeaveDayPortion;
  remarks?: string;
};

export type UpdateLeaveRequestInput = Partial<{
  leaveTypeId: LeaveTypeId;
  startDate: string;
  endDate: string;
  startPortion: LeaveDayPortion;
  endPortion: LeaveDayPortion;
  remarks: string;
  status: LeaveStatus;
  approver: LeaveApprover;
  approvedAt: string;
  rejectedAt: string;
  rejectedReason: string;
  cancelledAt: string;
}>;

export type LeaveRequestFilters = Partial<{
  employeeId: string;
  status: LeaveStatus;
  leaveTypeId: LeaveTypeId;
  fromDate: string;
  toDate: string;
  approverRole: LeaveApprovalRole;
}>;

export type LeaveDashboardCard = {
  leaveTypeId: LeaveTypeId;
  leaveTypeName: string;
  entitledDays?: number;
  carriedForwardDays?: number;
  usedDays: number;
  pendingDays: number;
  remainingDays?: number;
  source: LeaveQuotaSource;
};

export type LeaveCalendarEvent = {
  id: string;
  leaveRequestId: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: LeaveTypeId;
  leaveTypeName: string;
  date: string;
  status: LeaveStatus;
  portion: LeaveDayPortion;
};

export type LeaveDashboardSummary = {
  cards: LeaveDashboardCard[];
  pendingApprovalCount: number;
  approvedThisMonthDays: number;
  remainingAnnualLeaveDays?: number;
  remainingSickLeaveDays?: number;
  remainingPersonalLeaveDays?: number;
};

export type LeaveFile = {
  requests: LeaveRequest[];
  quotaBalances: LeaveQuotaBalance[];
};

export const LEAVE_TYPES: readonly LeaveTypeDefinition[] = [
  {
    id: "L001",
    name: "Annual Leave",
    colorToken: "leave-annual",
    quotaDays: 12,
    quotaSource: "manual",
    sortOrder: 1,
  },
  {
    id: "L003",
    name: "Sick Leave",
    colorToken: "leave-sick",
    quotaDays: 30,
    quotaSource: "manual",
    sortOrder: 2,
  },
  {
    id: "L004",
    name: "Personal Leave",
    colorToken: "leave-personal",
    quotaDays: 3,
    quotaSource: "manual",
    sortOrder: 3,
  },
  {
    id: "L005",
    name: "Leave without Pay",
    colorToken: "leave-unpaid",
    allowNegativeBalance: true,
    quotaSource: "manual",
    sortOrder: 4,
  },
  {
    id: "L006",
    name: "Congratulatory Leave",
    colorToken: "leave-congratulatory",
    quotaSource: "manual",
    sortOrder: 5,
  },
  {
    id: "L007",
    name: "Wedding Leave",
    colorToken: "leave-wedding",
    quotaSource: "manual",
    sortOrder: 6,
  },
  {
    id: "L008",
    name: "Funeral Leave",
    colorToken: "leave-funeral",
    quotaSource: "manual",
    sortOrder: 7,
  },
  {
    id: "L009",
    name: "Maternity Leave (Paid)",
    colorToken: "leave-maternity-paid",
    quotaSource: "manual",
    sortOrder: 8,
  },
  {
    id: "L010",
    name: "Maternity Leave (Unpaid)",
    colorToken: "leave-maternity-unpaid",
    allowNegativeBalance: true,
    quotaSource: "manual",
    sortOrder: 9,
  },
  {
    id: "L011",
    name: "Military Leave",
    colorToken: "leave-military",
    quotaSource: "manual",
    sortOrder: 10,
  },
  {
    id: "L012",
    name: "Study Leave",
    colorToken: "leave-study",
    quotaSource: "manual",
    sortOrder: 11,
  },
  {
    id: "L013",
    name: "Paternity Leave (Paid)",
    colorToken: "leave-paternity",
    quotaSource: "manual",
    sortOrder: 12,
  },
  {
    id: "L014",
    name: "Postnatal Infant-Care Leave (Paid 50%)",
    colorToken: "leave-postnatal",
    quotaSource: "manual",
    sortOrder: 13,
  },
] as const;