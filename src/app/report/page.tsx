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
import { ReportCharts } from "@/components/report/report-charts";
import { getSession } from "@/modules/auth/auth.session";
import { getReportAnalyticsService } from "@/modules/report/report.service";

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
  dark = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <a
      href={href}
      target={dark ? "_blank" : undefined}
      rel={dark ? "noreferrer" : undefined}
      className={
        dark
          ? "inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          : "inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
      }
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

export default async function ReportPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const analytics = await getReportAnalyticsService();

  return (
    <div className="glass-panel-report">
      <AppShell
        fullName={session.fullName}
        email={session.email}
        role={session.role}
        title="Reports"
        description="Operational insights, analytics, and export-ready reporting."
      >
        <div className="space-y-6">
          <section className="glass-panel-report rounded-[28px] p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="glass-chip-report inline-flex rounded-full px-3 py-1 text-xs font-medium tracking-[0.2em] text-pink-700">
                  Reports
                </div>

                <h2 className="mt-4 text-3xl font-semibold text-slate-900">
                  Export-ready issue reporting with quick operational insight
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  This page focuses on issue reporting, trend visibility, SLA
                  health, and quick export actions. The goal is to answer what is
                  happening now without burying the useful parts under too many
                  setup cards.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <ExportButton
                  href="/api/report/export/excel"
                  label="Export Excel"
                  icon={<FileSpreadsheet className="size-4" />}
                  dark
                />
                <ExportButton
                  href="/api/report/export/pdf"
                  label="Export PDF"
                  icon={<Download className="size-4" />}
                  dark
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Issues"
              value={analytics.summary.totalIssues}
              helper="All issues in the current store"
              icon={<FolderSearch className="size-5" />}
            />
            <SummaryCard
              title="Open Issues"
              value={analytics.summary.openIssues}
              helper="Open, in progress, and pending"
              icon={<AlertTriangle className="size-5" />}
            />
            <SummaryCard
              title="Resolved Issues"
              value={analytics.summary.resolvedIssues}
              helper="Resolved and closed"
              icon={<CheckCircle2 className="size-5" />}
            />
            <SummaryCard
              title="Critical Issues"
              value={analytics.summary.criticalIssues}
              helper="Priority marked as critical"
              icon={<ShieldAlert className="size-5" />}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InsightCard
              title="Avg Resolution"
              value={
                analytics.sla.avgResolutionDays !== null
                  ? `${analytics.sla.avgResolutionDays} day${
                      analytics.sla.avgResolutionDays === 1 ? "" : "s"
                    }`
                  : "-"
              }
              helper="Average time to close an issue"
              icon={<Clock3 className="size-5" />}
            />
            <InsightCard
              title="Within SLA"
              value={analytics.sla.resolvedWithinSLA}
              helper="Resolved inside target window"
              icon={<CheckCircle2 className="size-5" />}
            />
            <InsightCard
              title="Breached SLA"
              value={analytics.sla.resolvedBreachedSLA}
              helper="Resolved after SLA target"
              icon={<AlertTriangle className="size-5" />}
            />
            <InsightCard
              title="Open Overdue"
              value={analytics.sla.openOverdue}
              helper="Still open and already overdue"
              icon={<Timer className="size-5" />}
            />
          </section>

          <Section
            title="Quick operational reads"
            description="A fast layer for the numbers people usually ask first."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InsightCard
                title="Unassigned Open Issues"
                value={analytics.summary.unassignedOpenIssues}
                helper="Open workload with no owner assigned yet"
                icon={<Users className="size-5" />}
              />
              <InsightCard
                title="Top Customer Load"
                value={
                  analytics.topCustomers.length > 0
                    ? analytics.topCustomers[0]?.customerName
                    : "-"
                }
                helper={
                  analytics.topCustomers.length > 0
                    ? `${analytics.topCustomers[0]?.count} issue(s)`
                    : "No customer data available"
                }
                icon={<FolderSearch className="size-5" />}
              />
              <InsightCard
                title="Export Status"
                value="Ready"
                helper="Excel and PDF exports are available again"
                icon={<Download className="size-5" />}
              />
            </div>
          </Section>

          <ReportCharts
            trend={analytics.trend}
            aging={analytics.aging}
            topCustomers={analytics.topCustomers}
          />
        </div>
      </AppShell>
    </div>
  );
}