import { listIssuesService } from "@/modules/issues/issue.service";
import type { Issue } from "@/modules/issues/issue.types";
import { listProjectAccounts } from "@/modules/project-accounts/project-account.repository";
import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";
import { listServiceTickets } from "@/modules/service-tickets/service-ticket.repository";
import type { ServiceTicket } from "@/modules/service-tickets/service-ticket.types";

export type ReportStatus = Issue["status"];

export const REPORT_STATUS_OPTIONS = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
  "cancelled",
] satisfies ReportStatus[];

export type ReportFilter = {
  projectAccountId?: string;
  projectCode?: string;
  fromDate?: string;
  toDate?: string;
  statuses?: ReportStatus[];
};

export type ReportFilterInput = {
  projectAccountId?: string | null;
  projectCode?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  statuses?: string[] | null;
};

export type ReportSummary = {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  resolvedIssues: number;
  criticalIssues: number;
  unassignedOpenIssues: number;
};

export type ReportTrendPoint = {
  date: string;
  opened: number;
  closed: number;
};

export type ReportAgingBucket = {
  label: string;
  count: number;
};

export type ReportCustomerPoint = {
  customerName: string;
  count: number;
};

export type ReportProjectPoint = {
  projectAccountId?: string;
  projectCode: string;
  projectName: string;
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  breachedIssues: number;
  billableHours: number;
  billableManDays: number;
};

export type ReportPersonPoint = {
  personName: string;
  totalTickets: number;
  billableHours: number;
  billableManDays: number;
};

export type ReportTicketLogRow = {
  issueNo: string;
  externalTicketNo?: string;
  projectCode?: string;
  projectName?: string;
  customerName: string;
  title: string;
  status: Issue["status"];
  priority: Issue["priority"];
  ownerName?: string;
  openedAt: string;
  closedAt?: string;
  agingHours: number | null;
  slaHours: number;
  slaBreached: boolean;
  billableHours: number;
  billableManDays: number;
};

export type ReportSLA = {
  slaPercent: number;
  totalClosed: number;
  closedWithinSLA: number;
  closedBreachedSLA: number;
  openOverdue: number;
  avgResolutionHours: number | null;
};

export type ReportManDay = {
  totalBillableHours: number;
  totalBillableManDays: number;
  totalTicketsWithBilling: number;
};

export type ReportFilterOptions = {
  projectAccounts: Array<{
    id: string;
    code?: string;
    name?: string;
    customerName?: string;
  }>;
  projectCodes: string[];
};

export type ReportAnalytics = {
  filter: ReportFilter;
  summary: ReportSummary;
  trend: ReportTrendPoint[];
  aging: ReportAgingBucket[];
  topCustomers: ReportCustomerPoint[];
  byProject: ReportProjectPoint[];
  byPerson: ReportPersonPoint[];
  ticketLog: ReportTicketLogRow[];
  sla: ReportSLA;
  manDay: ReportManDay;
  filterOptions: ReportFilterOptions;
};

const OPEN_STATUSES: Issue["status"][] = ["open", "in_progress", "pending"];
const CLOSED_STATUSES: Issue["status"][] = ["resolved", "closed", "cancelled"];
const COMPANY_FILTER_PREFIX = "company:";

function clean(value?: string | null): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

function normalizeKey(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function buildCompanyFilterId(company: string): string {
  return `${COMPANY_FILTER_PREFIX}${company}`;
}

function getCompanyFromFilterId(value?: string): string | undefined {
  if (!value?.startsWith(COMPANY_FILTER_PREFIX)) {
    return undefined;
  }

  return clean(value.slice(COMPANY_FILTER_PREFIX.length));
}

export function isReportStatus(value: string): value is ReportStatus {
  return REPORT_STATUS_OPTIONS.includes(value as ReportStatus);
}

export function buildReportFilter(input: ReportFilterInput): ReportFilter {
  const statuses = (input.statuses ?? []).filter(isReportStatus);

  return {
    projectAccountId: clean(input.projectAccountId),
    projectCode: clean(input.projectCode),
    fromDate: clean(input.fromDate),
    toDate: clean(input.toDate),
    statuses: statuses.length > 0 ? statuses : undefined,
  };
}

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getDiffHours(fromIso: string, toIso?: string): number | null {
  const from = new Date(fromIso);
  const to = toIso ? new Date(toIso) : new Date();

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return null;
  }

  const diffHours = Math.floor(
    (to.getTime() - from.getTime()) / (1000 * 60 * 60),
  );

  return diffHours < 0 ? 0 : diffHours;
}

function getClosedDate(item: Issue): string | undefined {
  return item.closedAt || item.resolvedAt || item.cancelledAt;
}

function getSlaHours(priority: Issue["priority"]): number {
  switch (priority) {
    case "critical":
      return 4;
    case "high":
      return 8;
    case "medium":
      return 24;
    case "low":
    default:
      return 72;
  }
}

function isSlaBreached(item: Issue): boolean {
  const closedDate = getClosedDate(item);
  const agingHours = getDiffHours(item.openedAt, closedDate);
  const slaHours = getSlaHours(item.priority);

  return agingHours !== null && agingHours > slaHours;
}

function isIssueInDateRange(item: Issue, filter: ReportFilter): boolean {
  const from = parseDate(filter.fromDate);
  const to = parseDate(filter.toDate);

  if (!from && !to) {
    return true;
  }

  const targetDate = parseDate(getClosedDate(item) || item.openedAt);

  if (!targetDate) {
    return false;
  }

  if (from) {
    from.setHours(0, 0, 0, 0);

    if (targetDate < from) {
      return false;
    }
  }

  if (to) {
    to.setHours(23, 59, 59, 999);

    if (targetDate > to) {
      return false;
    }
  }

  return true;
}

function getTicketKey(value?: string): string {
  return normalizeKey(value);
}

function buildServiceTicketMap(serviceTickets: ServiceTicket[]) {
  const map = new Map<string, ServiceTicket[]>();

  for (const ticket of serviceTickets) {
    const key = getTicketKey(ticket.ticketNo);

    if (!key) {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)!.push(ticket);
  }

  return map;
}

function buildProjectAccountMaps(projectAccounts: ProjectAccount[]) {
  const byId = new Map<string, ProjectAccount>();
  const byCode = new Map<string, ProjectAccount>();

  for (const account of projectAccounts) {
    byId.set(account.id, account);

    const code = normalizeKey(account.code);

    if (code) {
      byCode.set(code, account);
    }
  }

  return {
    byId,
    byCode,
  };
}

function getLinkedServiceTickets(
  issue: Issue,
  serviceTicketMap: Map<string, ServiceTicket[]>,
): ServiceTicket[] {
  const keys = [
    getTicketKey(issue.externalTicketNo),
    getTicketKey(issue.issueNo),
  ].filter(Boolean);

  const result: ServiceTicket[] = [];

  for (const key of keys) {
    result.push(...(serviceTicketMap.get(key) ?? []));
  }

  const deduped = new Map<string, ServiceTicket>();

  for (const ticket of result) {
    deduped.set(ticket.id, ticket);
  }

  return [...deduped.values()];
}

function getPrimaryServiceTicket(
  linkedTickets: ServiceTicket[],
): ServiceTicket | undefined {
  return (
    linkedTickets.find(
      (ticket) => clean(ticket.company) || clean(ticket.projectName),
    ) ?? linkedTickets[0]
  );
}

function issueMatchesProjectAccountFilter(params: {
  issue: Issue;
  linkedTickets: ServiceTicket[];
  projectAccountId: string;
  projectAccountMaps: ReturnType<typeof buildProjectAccountMaps>;
}): boolean {
  const { issue, linkedTickets, projectAccountId, projectAccountMaps } = params;
  const company = getCompanyFromFilterId(projectAccountId);

  if (company) {
    return linkedTickets.some(
      (ticket) => normalizeKey(ticket.company) === normalizeKey(company),
    );
  }

  if (issue.projectAccountId === projectAccountId) {
    return true;
  }

  const accountById = projectAccountMaps.byId.get(projectAccountId);

  if (!accountById) {
    return false;
  }

  if (normalizeKey(issue.projectAccountCode) === normalizeKey(accountById.code)) {
    return true;
  }

  return linkedTickets.some(
    (ticket) =>
      normalizeKey(ticket.projectCode) === normalizeKey(accountById.code),
  );
}

function issueMatchesProjectCode(params: {
  issue: Issue;
  projectCode: string;
  linkedTickets: ServiceTicket[];
}): boolean {
  const { issue, projectCode, linkedTickets } = params;
  const target = normalizeKey(projectCode);

  if (!target) {
    return true;
  }

  if (normalizeKey(issue.projectAccountCode) === target) {
    return true;
  }

  return linkedTickets.some(
    (ticket) => normalizeKey(ticket.projectCode) === target,
  );
}

function applyFilter(
  items: Issue[],
  filter: ReportFilter,
  serviceTicketMap: Map<string, ServiceTicket[]>,
  projectAccountMaps: ReturnType<typeof buildProjectAccountMaps>,
): Issue[] {
  return items.filter((item) => {
    const linkedTickets = getLinkedServiceTickets(item, serviceTicketMap);

    if (filter.statuses?.length && !filter.statuses.includes(item.status)) {
      return false;
    }

    if (
      filter.projectAccountId &&
      !issueMatchesProjectAccountFilter({
        issue: item,
        linkedTickets,
        projectAccountId: filter.projectAccountId,
        projectAccountMaps,
      })
    ) {
      return false;
    }

    if (
      filter.projectCode &&
      !issueMatchesProjectCode({
        issue: item,
        projectCode: filter.projectCode,
        linkedTickets,
      })
    ) {
      return false;
    }

    return isIssueInDateRange(item, filter);
  });
}

function buildSummary(items: Issue[]): ReportSummary {
  const closedIssues = items.filter((item) =>
    CLOSED_STATUSES.includes(item.status),
  ).length;

  return {
    totalIssues: items.length,
    openIssues: items.filter((item) => OPEN_STATUSES.includes(item.status))
      .length,
    closedIssues,
    resolvedIssues: closedIssues,
    criticalIssues: items.filter((item) => item.priority === "critical").length,
    unassignedOpenIssues: items.filter(
      (item) =>
        OPEN_STATUSES.includes(item.status) && !(item.ownerName ?? "").trim(),
    ).length,
  };
}

function buildTrend(items: Issue[], days = 30): ReportTrendPoint[] {
  const today = new Date();
  const openedMap = new Map<string, number>();
  const closedMap = new Map<string, number>();

  for (const item of items) {
    const openedDate = parseDate(item.openedAt);

    if (openedDate) {
      const key = toDateKey(openedDate);
      openedMap.set(key, (openedMap.get(key) ?? 0) + 1);
    }

    const closedDate = parseDate(getClosedDate(item));

    if (closedDate) {
      const key = toDateKey(closedDate);
      closedMap.set(key, (closedMap.get(key) ?? 0) + 1);
    }
  }

  const points: ReportTrendPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - offset);

    const key = toDateKey(date);

    points.push({
      date: formatShortDate(key),
      opened: openedMap.get(key) ?? 0,
      closed: closedMap.get(key) ?? 0,
    });
  }

  return points;
}

function buildAging(items: Issue[]): ReportAgingBucket[] {
  const buckets: ReportAgingBucket[] = [
    { label: "0-3 days", count: 0 },
    { label: "4-7 days", count: 0 },
    { label: "8-14 days", count: 0 },
    { label: "15+ days", count: 0 },
  ];

  for (const item of items) {
    if (!OPEN_STATUSES.includes(item.status)) {
      continue;
    }

    const hours = getDiffHours(item.openedAt);

    if (hours === null) {
      continue;
    }

    const days = Math.floor(hours / 24);

    if (days <= 3) {
      buckets[0].count += 1;
    } else if (days <= 7) {
      buckets[1].count += 1;
    } else if (days <= 14) {
      buckets[2].count += 1;
    } else {
      buckets[3].count += 1;
    }
  }

  return buckets;
}

function buildTopCustomers(items: Issue[], limit = 6): ReportCustomerPoint[] {
  const map = new Map<string, number>();

  for (const item of items) {
    const customerName = clean(item.customerName) ?? "Unknown";
    map.set(customerName, (map.get(customerName) ?? 0) + 1);
  }

  return [...map.entries()]
    .map(([customerName, count]) => ({
      customerName,
      count,
    }))
    .sort(
      (a, b) =>
        b.count - a.count || a.customerName.localeCompare(b.customerName),
    )
    .slice(0, limit);
}

function getProjectInfoForReportRow(params: {
  issue: Issue;
  linkedTickets: ServiceTicket[];
  projectAccountMaps: ReturnType<typeof buildProjectAccountMaps>;
}): {
  projectAccountId?: string;
  projectCode: string;
  projectName: string;
  projectAccountName: string;
} {
  const { issue, linkedTickets, projectAccountMaps } = params;
  const primaryTicket = getPrimaryServiceTicket(linkedTickets);

  const ticketCompany = clean(primaryTicket?.company);
  const ticketProjectName = clean(primaryTicket?.projectName);
  const ticketProjectCode = clean(primaryTicket?.projectCode);

  if (ticketCompany || ticketProjectName || ticketProjectCode) {
    return {
      projectAccountId: ticketCompany
        ? buildCompanyFilterId(ticketCompany)
        : undefined,
      projectCode: ticketProjectCode || clean(issue.projectAccountCode) || "-",
      projectName: ticketProjectName || "Unmatched Project Name",
      projectAccountName:
        ticketCompany || issue.customerName || "Unmatched Company",
    };
  }

  if (issue.projectAccountId) {
    const account = projectAccountMaps.byId.get(issue.projectAccountId);

    if (account) {
      return {
        projectAccountId: account.id,
        projectCode: account.code,
        projectName: account.projectName,
        projectAccountName: account.customerName,
      };
    }
  }

  const issueProjectCode = clean(issue.projectAccountCode);

  if (issueProjectCode) {
    const account = projectAccountMaps.byCode.get(normalizeKey(issueProjectCode));

    if (account) {
      return {
        projectAccountId: account.id,
        projectCode: account.code,
        projectName: account.projectName,
        projectAccountName: account.customerName,
      };
    }
  }

  return {
    projectCode: issueProjectCode || "-",
    projectName: "Unmatched Project Name",
    projectAccountName: issue.customerName || "Unmatched Company",
  };
}

function sumBillableHoursForTickets(tickets: ServiceTicket[]): number {
  return tickets.reduce((sum, ticket) => sum + ticket.billableHours, 0);
}

function buildTicketLog(
  items: Issue[],
  serviceTicketMap: Map<string, ServiceTicket[]>,
  projectAccountMaps: ReturnType<typeof buildProjectAccountMaps>,
): ReportTicketLogRow[] {
  return items.map((item) => {
    const linkedTickets = getLinkedServiceTickets(item, serviceTicketMap);
    const projectInfo = getProjectInfoForReportRow({
      issue: item,
      linkedTickets,
      projectAccountMaps,
    });

    const closedDate = getClosedDate(item);
    const agingHours = getDiffHours(item.openedAt, closedDate);
    const slaHours = getSlaHours(item.priority);
    const billableHours = sumBillableHoursForTickets(linkedTickets);

    return {
      issueNo: item.issueNo,
      externalTicketNo: item.externalTicketNo,
      projectCode: projectInfo.projectCode,
      projectName: projectInfo.projectName,
      customerName: projectInfo.projectAccountName,
      title: item.title,
      status: item.status,
      priority: item.priority,
      ownerName: item.ownerName,
      openedAt: item.openedAt,
      closedAt: closedDate,
      agingHours,
      slaHours,
      slaBreached: agingHours !== null && agingHours > slaHours,
      billableHours,
      billableManDays: billableHours / 8,
    };
  });
}

function buildSLA(items: Issue[]): ReportSLA {
  const closedItems = items.filter((item) => getClosedDate(item));

  let closedWithinSLA = 0;
  let closedBreachedSLA = 0;
  let totalResolutionHours = 0;
  let resolutionCount = 0;

  for (const item of closedItems) {
    const closedDate = getClosedDate(item);
    const agingHours = getDiffHours(item.openedAt, closedDate);
    const slaHours = getSlaHours(item.priority);

    if (agingHours === null) {
      continue;
    }

    totalResolutionHours += agingHours;
    resolutionCount += 1;

    if (agingHours <= slaHours) {
      closedWithinSLA += 1;
    } else {
      closedBreachedSLA += 1;
    }
  }

  const openOverdue = items.filter(
    (item) => OPEN_STATUSES.includes(item.status) && isSlaBreached(item),
  ).length;

  const totalClosed = closedWithinSLA + closedBreachedSLA;

  return {
    slaPercent: totalClosed
      ? Number(((closedWithinSLA / totalClosed) * 100).toFixed(2))
      : 0,
    totalClosed,
    closedWithinSLA,
    closedBreachedSLA,
    openOverdue,
    avgResolutionHours: resolutionCount
      ? Number((totalResolutionHours / resolutionCount).toFixed(1))
      : null,
  };
}

function buildManDay(ticketLog: ReportTicketLogRow[]): ReportManDay {
  const totalBillableHours = ticketLog.reduce(
    (sum, row) => sum + row.billableHours,
    0,
  );

  return {
    totalBillableHours,
    totalBillableManDays: totalBillableHours / 8,
    totalTicketsWithBilling: ticketLog.filter((row) => row.billableHours > 0)
      .length,
  };
}

function buildByProject(ticketLog: ReportTicketLogRow[]): ReportProjectPoint[] {
  const map = new Map<string, ReportProjectPoint>();

  for (const row of ticketLog) {
    const key = `${row.customerName || "Unmatched Company"}::${row.projectCode || "-"}::${row.projectName || "Unmatched Project Name"}`;

    if (!map.has(key)) {
      map.set(key, {
        projectCode: row.projectCode || "-",
        projectName: row.projectName || "Unmatched Project Name",
        totalIssues: 0,
        openIssues: 0,
        closedIssues: 0,
        breachedIssues: 0,
        billableHours: 0,
        billableManDays: 0,
      });
    }

    const target = map.get(key)!;
    target.totalIssues += 1;

    if (OPEN_STATUSES.includes(row.status)) {
      target.openIssues += 1;
    }

    if (CLOSED_STATUSES.includes(row.status)) {
      target.closedIssues += 1;
    }

    if (row.slaBreached) {
      target.breachedIssues += 1;
    }

    target.billableHours += row.billableHours;
    target.billableManDays += row.billableManDays;
  }

  return [...map.values()].sort(
    (a, b) =>
      b.totalIssues - a.totalIssues ||
      a.projectCode.localeCompare(b.projectCode) ||
      a.projectName.localeCompare(b.projectName),
  );
}

function buildByPerson(serviceTickets: ServiceTicket[]): ReportPersonPoint[] {
  const map = new Map<string, ReportPersonPoint>();

  for (const ticket of serviceTickets) {
    if (ticket.billableHours <= 0) {
      continue;
    }

    const person =
      clean(ticket.assignedTo) ||
      clean(ticket.responsibleTo) ||
      clean(ticket.owner) ||
      clean(ticket.requestedBy) ||
      "Unassigned";

    if (!map.has(person)) {
      map.set(person, {
        personName: person,
        totalTickets: 0,
        billableHours: 0,
        billableManDays: 0,
      });
    }

    const row = map.get(person)!;
    row.totalTickets += 1;
    row.billableHours += ticket.billableHours;
    row.billableManDays += ticket.billableManDays;
  }

  return [...map.values()].sort(
    (a, b) =>
      b.billableHours - a.billableHours ||
      a.personName.localeCompare(b.personName),
  );
}

function buildFilterOptions(
  projectAccounts: ProjectAccount[],
  serviceTickets: ServiceTicket[],
): ReportFilterOptions {
  const projectAccountMap = new Map<
    string,
    {
      id: string;
      code?: string;
      name?: string;
      customerName?: string;
    }
  >();
  const projectCodeSet = new Set<string>();

  for (const account of projectAccounts) {
    if (!account.archivedAt) {
      projectAccountMap.set(account.id, {
        id: account.id,
        code: account.code,
        name: account.projectName,
        customerName: account.customerName,
      });
    }

    if (account.code?.trim()) {
      projectCodeSet.add(account.code.trim());
    }
  }

  for (const ticket of serviceTickets) {
    const company = clean(ticket.company);
    const projectCode = clean(ticket.projectCode);

    if (company) {
      const id = buildCompanyFilterId(company);

      if (!projectAccountMap.has(id)) {
        projectAccountMap.set(id, {
          id,
          code: undefined,
          name: company,
          customerName: company,
        });
      }
    }

    if (projectCode) {
      projectCodeSet.add(projectCode);
    }
  }

  return {
    projectAccounts: [...projectAccountMap.values()].sort(
      (a, b) =>
        (a.customerName ?? "").localeCompare(b.customerName ?? "") ||
        (a.code ?? "").localeCompare(b.code ?? "") ||
        (a.name ?? "").localeCompare(b.name ?? ""),
    ),
    projectCodes: [...projectCodeSet.values()].sort((a, b) =>
      a.localeCompare(b),
    ),
  };
}

function filterServiceTicketsByIssues(
  serviceTickets: ServiceTicket[],
  issues: Issue[],
): ServiceTicket[] {
  const ticketKeys = new Set(
    issues
      .flatMap((item) => [item.externalTicketNo, item.issueNo])
      .map(getTicketKey)
      .filter(Boolean),
  );

  return serviceTickets.filter((ticket) =>
    ticketKeys.has(getTicketKey(ticket.ticketNo)),
  );
}

export async function getReportAnalyticsService(
  filter: ReportFilter = {},
): Promise<ReportAnalytics> {
  const [allIssues, allServiceTickets, projectAccounts] = await Promise.all([
    listIssuesService(),
    listServiceTickets(),
    listProjectAccounts(),
  ]);

  const projectAccountMaps = buildProjectAccountMaps(projectAccounts);
  const allServiceTicketMap = buildServiceTicketMap(allServiceTickets);

  const filteredIssues = applyFilter(
    allIssues,
    filter,
    allServiceTicketMap,
    projectAccountMaps,
  );

  const filteredServiceTickets = filterServiceTicketsByIssues(
    allServiceTickets,
    filteredIssues,
  );

  const filteredServiceTicketMap = buildServiceTicketMap(filteredServiceTickets);

  const ticketLog = buildTicketLog(
    filteredIssues,
    filteredServiceTicketMap,
    projectAccountMaps,
  );

  return {
    filter,
    summary: buildSummary(filteredIssues),
    trend: buildTrend(filteredIssues, 30),
    aging: buildAging(filteredIssues),
    topCustomers: buildTopCustomers(filteredIssues, 6),
    byProject: buildByProject(ticketLog),
    byPerson: buildByPerson(filteredServiceTickets),
    ticketLog,
    sla: buildSLA(filteredIssues),
    manDay: buildManDay(ticketLog),
    filterOptions: buildFilterOptions(projectAccounts, allServiceTickets),
  };
}