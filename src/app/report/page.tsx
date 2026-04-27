import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  FolderSearch,
  ShieldAlert,
  Timer,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import ReportFilterForm from "@/components/report/report-filter-form";
import { ReportCharts } from "@/components/report/report-charts";
import { getSession } from "@/modules/auth/auth.session";
import {
  buildReportFilter,
  getReportAnalyticsService,
  type ReportFilter,
} from "@/modules/report/report.service";

type ReportPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getParams(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const value = params[key];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
}

function buildFilter(
  params: Record<string, string | string[] | undefined>,
): ReportFilter {
  return buildReportFilter({
    projectAccountId: getParam(params, "projectAccountId"),
    projectCode: getParam(params, "projectCode"),
    fromDate: getParam(params, "fromDate"),
    toDate: getParam(params, "toDate"),
    statuses: getParams(params, "status"),
  });
}

function buildExportHref(base: string, filter: ReportFilter): string {
  const params = new URLSearchParams();

  if (filter.projectAccountId) {
    params.set("projectAccountId", filter.projectAccountId);
  }

  if (filter.projectCode) {
    params.set("projectCode", filter.projectCode);
  }

  if (filter.fromDate) {
    params.set("fromDate", filter.fromDate);
  }

  if (filter.toDate) {
    params.set("toDate", filter.toDate);
  }

  for (const status of filter.statuses ?? []) {
    params.append("status", status);
  }

  const query = params.toString();

  return query ? `${base}?${query}` : base;
}

function SummaryCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: number | string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-panel-report rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-pink-700">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-500">{helper}</div>
        </div>

        <div className="glass-chip-report rounded-2xl p-2 text-pink-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: number | string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-pink-200/70 bg-white/70 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-pink-200 bg-pink-50/80 p-2 text-pink-700">
          {icon}
        </div>

        <div>
          <div className="text-sm font-medium text-pink-700">{title}</div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-500">{helper}</div>
        </div>
      </div>
    </div>
  );
}

function ExportButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel-report rounded-[28px] p-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const filter = buildFilter(resolvedSearchParams);
  const analytics = await getReportAnalyticsService(filter);

  const excelHref = buildExportHref("/api/report/export/excel", filter);
  const pdfHref = buildExportHref("/api/report/export/pdf", filter);

  return (
    <div className="glass-panel-report">
      <AppShell
        fullName={session.fullName}
        email={session.email}
        role={session.role}
        title="Reports"
        description="Monthly SLA dashboard, ticket trends, billing, and export-ready reporting."
      >
        <div className="space-y-6">
          <section className="glass-panel-report rounded-[28px] p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="glass-chip-report inline-flex rounded-full px-3 py-1 text-xs font-medium tracking-[0.2em] text-pink-700">
                  Monthly SLA Report
                </div>

                <h2 className="mt-4 text-3xl font-semibold text-slate-900">
                  SLA, ticket trend, and man-day consumption report
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Search project account or project code, select status, then
                  export the same filtered dataset.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <ExportButton
                  href={excelHref}
                  label="Export Excel"
                  icon={<FileSpreadsheet className="size-4" />}
                />
                <ExportButton
                  href={pdfHref}
                  label="Export PDF"
                  icon={<Download className="size-4" />}
                />
              </div>
            </div>

            <ReportFilterForm
              filter={filter}
              options={analytics.filterOptions}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="SLA Performance"
              value={`${analytics.sla.slaPercent}%`}
              helper={`${analytics.sla.closedWithinSLA}/${analytics.sla.totalClosed} closed within SLA`}
              icon={<CheckCircle2 className="size-5" />}
            />
            <SummaryCard
              title="Total Issues"
              value={analytics.summary.totalIssues}
              helper="Issues in selected scope"
              icon={<FolderSearch className="size-5" />}
            />
            <SummaryCard
              title="Open Issues"
              value={analytics.summary.openIssues}
              helper="Open, in progress, and pending"
              icon={<AlertTriangle className="size-5" />}
            />
            <SummaryCard
              title="Man-day Consumed"
              value={formatNumber(analytics.manDay.totalBillableManDays)}
              helper={`${formatNumber(analytics.manDay.totalBillableHours)} billable hours`}
              icon={<Clock3 className="size-5" />}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InsightCard
              title="Avg Resolution"
              value={
                analytics.sla.avgResolutionHours !== null
                  ? `${formatNumber(analytics.sla.avgResolutionHours)}h`
                  : "-"
              }
              helper="Average time to close an issue"
              icon={<Clock3 className="size-5" />}
            />
            <InsightCard
              title="Breached SLA"
              value={analytics.sla.closedBreachedSLA}
              helper="Closed after SLA target"
              icon={<ShieldAlert className="size-5" />}
            />
            <InsightCard
              title="Open Overdue"
              value={analytics.sla.openOverdue}
              helper="Open issues already beyond SLA"
              icon={<Timer className="size-5" />}
            />
            <InsightCard
              title="Unassigned Open"
              value={analytics.summary.unassignedOpenIssues}
              helper="Open workload with no owner"
              icon={<Users className="size-5" />}
            />
          </section>

          <Section
            title="Project consumption"
            description="Ticket and man-day consumption by project."
          >
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-pink-50 text-left">
                    <th className="px-3 py-2">Project Code</th>
                    <th className="px-3 py-2">Project Name</th>
                    <th className="px-3 py-2 text-right">Tickets</th>
                    <th className="px-3 py-2 text-right">Open</th>
                    <th className="px-3 py-2 text-right">Closed</th>
                    <th className="px-3 py-2 text-right">Breached</th>
                    <th className="px-3 py-2 text-right">MD</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byProject.slice(0, 12).map((row) => (
                    <tr
                      key={`${row.projectCode}-${row.projectName}`}
                      className="border-b"
                    >
                      <td className="px-3 py-2">{row.projectCode}</td>
                      <td className="px-3 py-2">{row.projectName}</td>
                      <td className="px-3 py-2 text-right">
                        {row.totalIssues}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.openIssues}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.closedIssues}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.breachedIssues}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(row.billableManDays)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <ReportCharts
            trend={analytics.trend}
            aging={analytics.aging}
            byProject={analytics.byProject}
          />
        </div>
      </AppShell>
    </div>
  );
}