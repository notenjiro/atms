export type TimesheetProjectSource = "local" | "customer-api";

export type TimesheetProjectCategory =
  | "all"
  | "chargeable"
  | "non-charge";

export type TimesheetProject = {
  id: string;

  // primary identity
  code: string;
  name: string;

  // classification
  category?: string;
  isChargeable: boolean;

  // optional business context
  customerName?: string;

  // source tracking
  source: TimesheetProjectSource;

  // lifecycle
  isActive: boolean;

  // metadata
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

/**
 * For future API integration (customer system)
 * we define a raw external shape placeholder
 */
export type ExternalTimesheetProject = {
  projectCode: string;
  projectName: string;
  category?: string;
  chargeType?: "chargeable" | "non-charge";
  customerName?: string;
  status?: "active" | "inactive";
};