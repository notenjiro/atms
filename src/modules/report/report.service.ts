import { listIssuesService } from "@/modules/issues/issue.service";
import type { Issue } from "@/modules/issues/issue.types";

export type ReportSummary = {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  criticalIssues: number;
  unassignedOpenIssues: number;
};

export type ReportTrendPoint = {
  date: string;
  opened: number;
  resolved: number;
};

export type ReportAgingBucket = {
  label: string;
  count: number;
};

export type ReportCustomerPoint = {
  customerName: string;
  count: number;
};

export type ReportSLA = {
  avgResolutionDays: number | null;
  resolvedWithinSLA: number;
  resolvedBreachedSLA: number;
  openOverdue: number;
};

export type ReportAnalytics = {
  summary: ReportSummary;
  trend: ReportTrendPoint[];
  aging: ReportAgingBucket[];
  topCustomers: ReportCustomerPoint[];
  sla: ReportSLA;
};

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
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

function getDaysDiff(fromIso: string, to: Date): number | null {
  const from = new Date(fromIso);

  if (Number.isNaN(from.getTime())) {
    return null;
  }

  const diffMs = to.getTime() - from.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays < 0 ? 0 : diffDays;
}

function diffDays(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso);
  const to = new Date(toIso);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return null;
  }

  return Math.max(
    0,
    Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function buildSummary(items: Issue[]): ReportSummary {
  const openStatuses: Issue["status"][] = ["open", "in_progress", "pending"];
  const resolvedStatuses: Issue["status"][] = ["resolved", "closed"];

  return {
    totalIssues: items.length,
    openIssues: items.filter((item) => openStatuses.includes(item.status)).length,
    resolvedIssues: items.filter((item) => resolvedStatuses.includes(item.status))
      .length,
    criticalIssues: items.filter((item) => item.priority === "critical").length,
    unassignedOpenIssues: items.filter(
      (item) =>
        openStatuses.includes(item.status) && !(item.ownerName ?? "").trim(),
    ).length,
  };
}

function buildTrend(items: Issue[], days = 30): ReportTrendPoint[] {
  const today = new Date();
  const points: ReportTrendPoint[] = [];

  const openedMap = new Map<string, number>();
  const resolvedMap = new Map<string, number>();

  for (const item of items) {
    if (item.openedAt) {
      const openedKey = toDateKey(new Date(item.openedAt));
      openedMap.set(openedKey, (openedMap.get(openedKey) ?? 0) + 1);
    }

    const resolvedAt = item.closedAt ?? item.resolvedAt;
    if (resolvedAt) {
      const resolvedKey = toDateKey(new Date(resolvedAt));
      resolvedMap.set(resolvedKey, (resolvedMap.get(resolvedKey) ?? 0) + 1);
    }
  }

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - offset);

    const key = toDateKey(date);

    points.push({
      date: formatShortDate(key),
      opened: openedMap.get(key) ?? 0,
      resolved: resolvedMap.get(key) ?? 0,
    });
  }

  return points;
}

function buildAging(items: Issue[]): ReportAgingBucket[] {
  const now = new Date();
  const buckets: ReportAgingBucket[] = [
    { label: "0-3 days", count: 0 },
    { label: "4-7 days", count: 0 },
    { label: "8-14 days", count: 0 },
    { label: "15+ days", count: 0 },
  ];

  for (const item of items) {
    if (!["open", "in_progress", "pending"].includes(item.status)) {
      continue;
    }

    const days = getDaysDiff(item.openedAt, now);

    if (days === null) {
      continue;
    }

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
    const customerName = item.customerName?.trim() || "Unknown";
    map.set(customerName, (map.get(customerName) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([customerName, count]) => ({
      customerName,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.customerName.localeCompare(b.customerName))
    .slice(0, limit);
}

function getSlaTarget(priority: Issue["priority"]): number {
  switch (priority) {
    case "critical":
      return 1;
    case "high":
      return 3;
    case "medium":
      return 5;
    case "low":
    default:
      return 7;
  }
}

function buildSLA(items: Issue[]): ReportSLA {
  let totalDays = 0;
  let count = 0;

  let within = 0;
  let breach = 0;
  let overdue = 0;

  const now = new Date().toISOString();

  for (const item of items) {
    const target = getSlaTarget(item.priority);
    const resolvedAt = item.closedAt ?? item.resolvedAt;

    if (resolvedAt) {
      const days = diffDays(item.openedAt, resolvedAt);

      if (days !== null) {
        totalDays += days;
        count += 1;

        if (days <= target) {
          within += 1;
        } else {
          breach += 1;
        }
      }
    }

    if (!resolvedAt && ["open", "in_progress", "pending"].includes(item.status)) {
      const days = diffDays(item.openedAt, now);

      if (days !== null && days > target) {
        overdue += 1;
      }
    }
  }

  return {
    avgResolutionDays: count ? Number((totalDays / count).toFixed(1)) : null,
    resolvedWithinSLA: within,
    resolvedBreachedSLA: breach,
    openOverdue: overdue,
  };
}

export async function getReportAnalyticsService(): Promise<ReportAnalytics> {
  const items = await listIssuesService();

  return {
    summary: buildSummary(items),
    trend: buildTrend(items, 30),
    aging: buildAging(items),
    topCustomers: buildTopCustomers(items, 6),
    sla: buildSLA(items),
  };
}