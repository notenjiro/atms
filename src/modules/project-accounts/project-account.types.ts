export type ProjectAccountStatus = "active" | "expired" | "draft" | "inactive";

export type ProjectAccountAlertChannel = "email" | "sms";

export type ProjectAccountAlertRecipient = {
  id: string;
  name: string;
  email: string;
};

export type ProjectAccountAlertSettings = {
  enabled: boolean;
  daysBeforeExpiry: number;
  channels: ProjectAccountAlertChannel[];
  recipients: ProjectAccountAlertRecipient[];
};

export type ProjectAccount = {
  id: string;
  code: string;
  projectName: string;
  customerName: string;
  contractNo: string;
  startDate: string;
  endDate: string;
  allocatedManDays: number;
  usedManDays: number;
  remainingManDays: number;
  status: ProjectAccountStatus;
  note?: string;
  alertSettings: ProjectAccountAlertSettings;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectAccountInput = {
  projectName: string;
  customerName: string;
  contractNo: string;
  startDate: string;
  endDate: string;
  allocatedManDays: number;
  usedManDays?: number;
  note?: string;
  alertSettings?: Partial<ProjectAccountAlertSettings>;
};

export type UpdateProjectAccountInput = Partial<{
  projectName: string;
  customerName: string;
  contractNo: string;
  startDate: string;
  endDate: string;
  allocatedManDays: number;
  usedManDays: number;
  status: ProjectAccountStatus;
  note: string;
  alertSettings: ProjectAccountAlertSettings;
}>;

export type ProjectAccountsFile = {
  items: ProjectAccount[];
};