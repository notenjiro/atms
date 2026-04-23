export type TimesheetProjectSource = "local" | "customer-api" | "kawari-monthly" | "kawari-history";

export type TimesheetProjectCategory =
  | "all"
  | "chargeable"
  | "non-charge";

export type TimesheetProject = {
  id: string;

  projectId?: string;

  code: string;
  name: string;
  category?: string;
  isChargeable: boolean;
  customerName?: string;

  approverIds?: string[];
  approverNames?: string[];

  source: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TimesheetProjectFilters = Partial<{
  search: string;
  category: TimesheetProjectCategory;
  isChargeable: boolean;
  isActive: boolean;
}>;

export type TimesheetProjectListResult = {
  items: TimesheetProject[];
  total: number;
};

export type TimesheetProjectsFile = {
  items: TimesheetProject[];
};

export type CreateTimesheetProjectInput = {
  code: string;
  name: string;
  category?: string;
  isChargeable?: boolean;
  customerName?: string;
  source?: TimesheetProjectSource;
};

export type UpdateTimesheetProjectInput = Partial<{
  code: string;
  name: string;
  category: string;
  isChargeable: boolean;
  customerName: string;
  isActive: boolean;
}>;

export type ExternalTimesheetProject = {
  projectCode: string;
  projectName: string;
  category?: string;
  chargeType?: "chargeable" | "non-charge";
  customerName?: string;
  status?: "active" | "inactive";
};
