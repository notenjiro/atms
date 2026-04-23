export type TimesheetMonthStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type TimesheetMonthProjectApproverOption = {
  id: string;
  name: string;
};

export type TimesheetMonthProjectConfig = {
  projectRefId: string;
  projectCode: string;
  projectName: string;
  selectedApproverId?: string;
  selectedApproverName?: string;
  approverOptions: TimesheetMonthProjectApproverOption[];
};

export type TimesheetMonth = {
  employeeId: string;
  month: string;
  status: TimesheetMonthStatus;
  projectConfigs?: TimesheetMonthProjectConfig[];
  submittedAt?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type TimesheetMonthsFile = {
  items: TimesheetMonth[];
};
