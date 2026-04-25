export type IssueStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "resolved"
  | "closed"
  | "cancelled";

export type IssuePriority = "low" | "medium" | "high" | "critical";

export type IssueSource = "manual" | "servicenow" | "email" | "phone";

export type IssuePolicySettings = {
  requireOwnerToStartProgress: boolean;
  requireOwnerToResolve: boolean;
  allowReopenClosed: boolean;
  slaHoursLow: number;
  slaHoursMedium: number;
  slaHoursHigh: number;
  slaHoursCritical: number;
};

export type Issue = {
  id: string;
  issueNo: string;
  title: string;
  description: string;
  customerName: string;
  projectAccountId?: string;
  projectAccountCode?: string;
  projectAccountName?: string;
  status: IssueStatus;
  priority: IssuePriority;
  source: IssueSource;
  ownerName?: string;
  ownerEmail?: string;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  externalTicketNo?: string;
  openedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateIssueInput = {
  title: string;
  description: string;
  customerName?: string;
  projectAccountId?: string;
  priority: IssuePriority;
  source?: IssueSource;
  ownerName?: string;
  ownerEmail?: string;
  externalTicketNo?: string;
};

export type UpdateIssueInput = Partial<{
  title: string;
  description: string;
  customerName: string;
  projectAccountId: string;
  priority: IssuePriority;
  status: IssueStatus;
  source: IssueSource;
  ownerName: string;
  ownerEmail: string;
  externalTicketNo: string;
}>;

export type ServiceNowIssueSyncInput = {
  issueNo: string;
  title: string;
  description: string;
  customerName: string;
  projectAccountId?: string;
  projectAccountCode?: string;
  projectAccountName?: string;
  status: IssueStatus;
  priority: IssuePriority;
  ownerName?: string;
  ownerEmail?: string;
  externalTicketNo: string;
  openedAt: string;
  closedAt?: string;
};

export type ServiceNowIssueSyncResult = {
  item: Issue;
  action: "created" | "updated" | "skipped";
};

export type IssueFilters = Partial<{
  search: string;
  status: IssueStatus;
  priority: IssuePriority;
  source: IssueSource;
  projectAccountId: string;
  customerName: string;
  reporterId: string;
  ownerName: string;
}>;

export type IssueSummary = {
  total: number;
  open: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  critical: number;
};

export type IssuesFile = {
  items: Issue[];
};