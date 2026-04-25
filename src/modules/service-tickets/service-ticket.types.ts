export type ServiceTicketSource = "servicenow-import";

export type ServiceTicketType = "incident" | "request" | "change" | "task";

export type ServiceTicketImportTemplate =
  | "incident-summary"
  | "service-request-summary"
  | "change-request-summary"
  | "monthly-review-by-project-owner";

export type ServiceTicketImportStatus = "completed" | "completed-with-warning";

export type ServiceTicketMatchStatus = "matched" | "unmatched";

export type ServiceTicket = {
  id: string;

  source: ServiceTicketSource;
  sourceFileName: string;
  sourceSheetName: string;
  sourceTemplate: ServiceTicketImportTemplate;
  sourceRowNumber: number;
  importBatchId: string;
  importedAt: string;

  ticketNo: string;
  ticketType: ServiceTicketType;
  taskNo?: string;

  title: string;
  shortDescription?: string;
  description?: string;
  closeNotes?: string;
  rootCause?: string;
  nonChargeReason?: string;

  company?: string;
  location?: string;
  requestedBy?: string;
  assignedTo?: string;
  responsibleGroup?: string;
  responsibleTo?: string;
  assignmentGroup?: string;
  owner?: string;

  projectCode: string;
  projectName?: string;
  projectAccountId?: string;
  matchStatus: ServiceTicketMatchStatus;

  priority?: string;
  state?: string;
  status?: string;
  module?: string;
  subModule?: string;
  taskType?: string;
  category?: string;
  problemType?: string;
  changeType?: string;
  skill?: string;

  openedAt?: string;
  createdAt?: string;
  closedAt?: string;
  resolvedAt?: string;
  billableDate?: string;
  cabDate?: string;
  uatDate?: string;

  billableHours: number;
  billableManDays: number;

  raw: Record<string, string | number | boolean | null>;
};

export type ServiceTicketImportBatch = {
  id: string;
  source: ServiceTicketSource;
  sourceFileName: string;
  sourceTemplate: ServiceTicketImportTemplate;
  importedAt: string;
  status: ServiceTicketImportStatus;

  totalRows: number;
  importedRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  unmatchedRows: number;

  warnings: string[];
};

export type ServiceTicketsFile = {
  items: ServiceTicket[];
};

export type ServiceTicketImportsFile = {
  batches: ServiceTicketImportBatch[];
};

export type ServiceTicketImportInput = {
  fileName: string;
  template: ServiceTicketImportTemplate;
  rows: Array<Record<string, string | number | boolean | null>>;
  sheetName?: string;
};

export type ServiceTicketImportResult = {
  batch: ServiceTicketImportBatch;
  items: ServiceTicket[];
};

export type ServiceTicketFilters = {
  projectAccountId?: string;
  projectCode?: string;
  ticketType?: ServiceTicketType | "all";
  matchStatus?: ServiceTicketMatchStatus | "all";
  search?: string;
};

export type ServiceTicketProjectSummary = {
  projectAccountId?: string;
  projectCode: string;
  projectName?: string;

  totalTickets: number;
  incidentTickets: number;
  requestTickets: number;
  changeTickets: number;
  taskTickets: number;

  openTickets: number;
  closedTickets: number;

  billableHours: number;
  billableManDays: number;

  unmatchedTickets: number;
};