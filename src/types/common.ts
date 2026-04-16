export type EntityId = string;
export type IsoDateString = string;
export type IsoDateTimeString = string;

export type AppRole = "admin" | "manager" | "support" | "viewer";

export type RecordStatus = "active" | "inactive";
export type SyncStatus = "idle" | "pending" | "synced" | "failed";

export interface BaseAuditFields {
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface BaseEntity extends BaseAuditFields {
  id: EntityId;
}

export interface NamedOption {
  value: string;
  label: string;
}

export interface ContactChannelConfig {
  email?: string;
  phone?: string;
}

export interface NotificationRecipient {
  name: string;
  email?: string;
  phone?: string;
}

export interface DateRange {
  startDate: IsoDateString;
  endDate: IsoDateString;
}

export interface MonthKey {
  year: number;
  month: number;
}

export interface SummaryMetric {
  label: string;
  value: number;
  unit?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortParams {
  field: string;
  direction: "asc" | "desc";
}

export interface QueryListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export interface ExportFileMeta {
  fileName: string;
  mimeType: string;
}

export interface OperationResult<T = void> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AppErrorShape {
  code: string;
  message: string;
  details?: Record<string, string[] | string | undefined>;
}