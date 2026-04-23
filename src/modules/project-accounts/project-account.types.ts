export type ProjectAccountStatus =
  | "active"
  | "expired"
  | "draft"
  | "inactive"
  | "done";

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

  archivedAt?: string;

  createdAt: string;
  updatedAt: string;

  // Kawari mapping fields
  externalId?: string;
  clientId?: string;
  clientCode?: string;
  projectStatus?: string;
  projectType?: string;
  primaryProjectManagerName?: string;
  primaryProjectManagerId?: string;
  projectManagerIds?: string[];
  canEditInKawari?: boolean;

  // Kawari detail fields
  overrideTotalResourceMandays?: number;
  totalManDays?: number;
  projectServiceContractPrice?: number;
  projectOtherServiceContractPrice?: number;
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

  // Kawari mapping fields
  externalId?: string;
  clientId?: string;
  clientCode?: string;
  projectStatus?: string;
  projectType?: string;
  primaryProjectManagerName?: string;
  primaryProjectManagerId?: string;
  projectManagerIds?: string[];
  canEditInKawari?: boolean;

  // Kawari detail fields
  overrideTotalResourceMandays?: number;
  totalManDays?: number;
  projectServiceContractPrice?: number;
  projectOtherServiceContractPrice?: number;

  status?: ProjectAccountStatus;
};

export type UpdateProjectAccountInput = Partial<{
  projectName: string;
  customerName: string;
  contractNo: string;

  startDate: string;
  endDate: string;

  allocatedManDays: number;
  usedManDays: number;
  remainingManDays: number;

  status: ProjectAccountStatus;
  note: string;

  alertSettings: ProjectAccountAlertSettings;

  archivedAt: string | undefined;

  externalId: string;
  clientId: string;
  clientCode: string;
  projectStatus: string;
  projectType: string;
  primaryProjectManagerName: string;
  primaryProjectManagerId: string;
  projectManagerIds: string[];
  canEditInKawari: boolean;

  overrideTotalResourceMandays: number;
  totalManDays: number;
  projectServiceContractPrice: number;
  projectOtherServiceContractPrice: number;
}>;

export type ProjectAccountsFile = {
  items: ProjectAccount[];
};