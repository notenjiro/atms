"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ReportAgingBucket,
  ReportProjectPoint,
  ReportTrendPoint,
} from "@/modules/report/report.service";

type ReportChartsProps = {
  trend: ReportTrendPoint[];
  aging: ReportAgingBucket[];
  byProject: ReportProjectPoint[];
};

const AGING_COLORS = ["#bfdbfe", "#fde68a", "#fdba74", "#fecaca"];

function ChartCard({
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
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="mt-5 h-[320px]">{children}</div>
    </section>
  );
}

export function ReportCharts({ trend, aging, byProject }: ReportChartsProps) {
  const topProjects = byProject.slice(0, 8);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard
        title="30-Day Ticket Trend"
        description="Daily opened versus closed movement."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} stroke="#64748b" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="opened"
              name="Opened"
              stroke="#ec4899"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="closed"
              name="Closed"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Ticket by Project"
        description="Top project/account workload from the selected filter."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topProjects}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="projectCode"
              stroke="#64748b"
              tick={{ fontSize: 11 }}
            />
            <YAxis allowDecimals={false} stroke="#64748b" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalIssues" name="Tickets" fill="#2563eb" />
            <Bar dataKey="breachedIssues" name="SLA Breached" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Open Issue Aging"
        description="Current open workload by aging bucket."
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie
              data={aging}
              dataKey="count"
              nameKey="label"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
            >
              {aging.map((entry, index) => (
                <Cell
                  key={`${entry.label}-${index}`}
                  fill={AGING_COLORS[index % AGING_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}