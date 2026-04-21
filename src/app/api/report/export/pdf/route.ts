import { NextResponse } from "next/server";

import { getReportAnalyticsService } from "@/modules/report/report.service";

function renderRows(rows: Array<{ label: string; value: string | number }>) {
  return rows
    .map(
      (row) => `
        <tr>
          <td>${row.label}</td>
          <td>${row.value}</td>
        </tr>
      `,
    )
    .join("");
}

export async function GET() {
  const analytics = await getReportAnalyticsService();

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>ATMS Report</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 32px;
            color: #0f172a;
          }

          h1, h2 {
            margin: 0;
          }

          .page-title {
            margin-bottom: 24px;
          }

          .page-title p {
            margin: 8px 0 0;
            color: #475569;
            font-size: 14px;
          }

          .section {
            margin-top: 28px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 14px;
          }

          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #fdf2f8;
          }

          .muted {
            color: #64748b;
          }

          @media print {
            body {
              margin: 16px;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-title">
          <h1>ATMS Report</h1>
          <p>Operational analytics, SLA snapshot, and workload visibility.</p>
        </div>

        <div class="section">
          <h2>Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${renderRows([
                { label: "Total Issues", value: analytics.summary.totalIssues },
                { label: "Open Issues", value: analytics.summary.openIssues },
                { label: "Resolved Issues", value: analytics.summary.resolvedIssues },
                { label: "Critical Issues", value: analytics.summary.criticalIssues },
                {
                  label: "Unassigned Open Issues",
                  value: analytics.summary.unassignedOpenIssues,
                },
              ])}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>SLA</h2>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${renderRows([
                {
                  label: "Avg Resolution (days)",
                  value: analytics.sla.avgResolutionDays ?? "-",
                },
                {
                  label: "Within SLA",
                  value: analytics.sla.resolvedWithinSLA,
                },
                {
                  label: "Breached SLA",
                  value: analytics.sla.resolvedBreachedSLA,
                },
                {
                  label: "Open Overdue",
                  value: analytics.sla.openOverdue,
                },
              ])}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>30-Day Trend</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Opened</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.trend
                .map(
                  (item) => `
                    <tr>
                      <td>${item.date}</td>
                      <td>${item.opened}</td>
                      <td>${item.resolved}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Open Issue Aging</h2>
          <table>
            <thead>
              <tr>
                <th>Bucket</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.aging
                .map(
                  (item) => `
                    <tr>
                      <td>${item.label}</td>
                      <td>${item.count}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Top Customers</h2>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.topCustomers
                .map(
                  (item) => `
                    <tr>
                      <td>${item.customerName}</td>
                      <td>${item.count}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="section muted">
          <p>Tip: use the browser print dialog to save this page as PDF.</p>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}