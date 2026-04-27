import { NextRequest, NextResponse } from "next/server";

import {
  buildReportFilter,
  getReportAnalyticsService,
} from "@/modules/report/report.service";

function buildFilter(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  return buildReportFilter({
    projectAccountId: params.get("projectAccountId"),
    projectCode: params.get("projectCode"),
    fromDate: params.get("fromDate"),
    toDate: params.get("toDate"),
    statuses: params.getAll("status"),
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function renderProjectRows(
  rows: Array<{
    projectCode: string;
    projectName: string;
    totalIssues: number;
    openIssues: number;
    closedIssues: number;
    breachedIssues: number;
    billableManDays: number;
  }>,
): string {
  if (rows.length === 0) {
    return `<tr><td colspan="7" class="empty">No data</td></tr>`;
  }

  return rows
    .slice(0, 14)
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.projectCode)}</td>
          <td>${escapeHtml(row.projectName)}</td>
          <td class="num">${row.totalIssues}</td>
          <td class="num">${row.openIssues}</td>
          <td class="num">${row.closedIssues}</td>
          <td class="num danger">${row.breachedIssues}</td>
          <td class="num">${formatNumber(row.billableManDays)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderTicketRows(
  rows: Array<{
    issueNo: string;
    externalTicketNo?: string;
    projectCode?: string;
    title: string;
    status: string;
    priority: string;
    agingHours: number | null;
    slaHours: number;
    slaBreached: boolean;
    billableManDays: number;
  }>,
): string {
  if (rows.length === 0) {
    return `<tr><td colspan="10" class="empty">No data</td></tr>`;
  }

  return rows
    .slice(0, 24)
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.issueNo)}</td>
          <td>${escapeHtml(row.externalTicketNo || "-")}</td>
          <td>${escapeHtml(row.projectCode || "-")}</td>
          <td>${escapeHtml(row.title)}</td>
          <td>${escapeHtml(row.status)}</td>
          <td>${escapeHtml(row.priority)}</td>
          <td class="num">${row.agingHours ?? "-"}</td>
          <td class="num">${row.slaHours}</td>
          <td class="num ${row.slaBreached ? "danger" : ""}">
            ${row.slaBreached ? "Yes" : "No"}
          </td>
          <td class="num">${formatNumber(row.billableManDays)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderTrendBars(
  rows: Array<{
    date: string;
    opened: number;
    closed: number;
  }>,
): string {
  const visible = rows.slice(-12);
  const max = Math.max(
    1,
    ...visible.map((row) => Math.max(row.opened, row.closed)),
  );

  return visible
    .map((row) => {
      const openedHeight = Math.max(2, Math.round((row.opened / max) * 90));
      const closedHeight = Math.max(2, Math.round((row.closed / max) * 90));

      return `
        <div class="bar-group">
          <div class="bars">
            <div class="bar opened" style="height:${openedHeight}px"></div>
            <div class="bar closed" style="height:${closedHeight}px"></div>
          </div>
          <div class="bar-label">${escapeHtml(row.date)}</div>
        </div>
      `;
    })
    .join("");
}

export async function GET(req: NextRequest) {
  const analytics = await getReportAnalyticsService(buildFilter(req));

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Monthly SLA Report</title>
        <style>
          * { box-sizing: border-box; }

          body {
            margin: 0;
            background: #f8fafc;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
          }

          .page {
            width: 1120px;
            min-height: 792px;
            margin: 0 auto 24px;
            background: white;
            padding: 34px 42px;
            position: relative;
            overflow: hidden;
          }

          .cover {
            background: #1f4aa0;
            color: white;
          }

          .cover-card {
            width: 430px;
            min-height: 560px;
            background: #f8c400;
            color: white;
            padding: 48px 34px;
          }

          .cover-title {
            margin-top: 130px;
            font-size: 34px;
            font-weight: 700;
            line-height: 1.2;
          }

          .cover-subtitle {
            margin-top: 32px;
            font-size: 18px;
          }

          .cover-date {
            position: absolute;
            bottom: 70px;
            left: 76px;
            font-size: 16px;
          }

          .blob {
            position: absolute;
            right: -160px;
            top: -100px;
            width: 520px;
            height: 920px;
            background: white;
            border-radius: 48% 52% 45% 55%;
            transform: rotate(28deg);
            opacity: 0.98;
          }

          .title {
            font-size: 30px;
            font-weight: 800;
            color: #173b7a;
          }

          .subtitle {
            margin-top: 4px;
            color: #f2b500;
            font-size: 22px;
            font-weight: 700;
          }

          .rule {
            height: 2px;
            background: #173b7a;
            margin: 18px 0 24px;
          }

          .grid {
            display: grid;
            gap: 16px;
          }

          .grid-4 {
            grid-template-columns: repeat(4, 1fr);
          }

          .card {
            border: 1px solid #dbe3ef;
            border-radius: 16px;
            background: #ffffff;
            padding: 18px;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          }

          .metric-label {
            color: #64748b;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700;
          }

          .metric-value {
            margin-top: 10px;
            font-size: 34px;
            font-weight: 800;
            color: #173b7a;
          }

          .metric-helper {
            margin-top: 6px;
            color: #64748b;
            font-size: 13px;
          }

          .good { color: #15803d; }
          .danger { color: #dc2626; }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th {
            background: #173b7a;
            color: white;
            padding: 8px;
            text-align: left;
          }

          td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px;
            vertical-align: top;
          }

          .num { text-align: right; }
          .empty { text-align: center; color: #64748b; }

          .chart {
            height: 180px;
            display: flex;
            align-items: flex-end;
            gap: 12px;
            padding: 16px;
            border: 1px solid #dbe3ef;
            border-radius: 16px;
            background: #f8fafc;
          }

          .bar-group {
            flex: 1;
            min-width: 0;
            text-align: center;
          }

          .bars {
            height: 100px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 4px;
          }

          .bar {
            width: 10px;
            border-radius: 4px 4px 0 0;
          }

          .opened { background: #f2b500; }
          .closed { background: #173b7a; }

          .bar-label {
            margin-top: 8px;
            font-size: 10px;
            color: #64748b;
            white-space: nowrap;
          }

          .legend {
            margin-top: 8px;
            display: flex;
            gap: 18px;
            font-size: 12px;
            color: #64748b;
          }

          .dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 999px;
            margin-right: 6px;
          }

          .dot-opened { background: #f2b500; }
          .dot-closed { background: #173b7a; }

          .footer {
            position: absolute;
            bottom: 22px;
            left: 42px;
            right: 42px;
            color: #64748b;
            font-size: 11px;
          }

          @media print {
            body { background: white; }
            .page {
              width: 100%;
              margin: 0;
              page-break-after: always;
            }
          }
        </style>
      </head>
      <body>
        <section class="page cover">
          <div class="blob"></div>
          <div class="cover-card">
            <div style="font-size:22px;font-weight:800;">ATMS</div>
            <div class="cover-title">Monthly SLA review meeting</div>
            <div class="cover-subtitle">Application Management Support</div>
            <div class="cover-date">${escapeHtml(new Date().toLocaleDateString("en-GB"))}</div>
          </div>
        </section>

        <section class="page">
          <div class="title">Monthly SLA review meeting</div>
          <div class="subtitle">SLA and ticket trends</div>
          <div class="rule"></div>

          <div class="grid grid-4">
            <div class="card">
              <div class="metric-label">SLA Performance</div>
              <div class="metric-value ${analytics.sla.slaPercent >= 90 ? "good" : "danger"}">
                ${analytics.sla.slaPercent}%
              </div>
              <div class="metric-helper">
                ${analytics.sla.closedWithinSLA}/${analytics.sla.totalClosed} closed within SLA
              </div>
            </div>

            <div class="card">
              <div class="metric-label">Total Tickets</div>
              <div class="metric-value">${analytics.summary.totalIssues}</div>
              <div class="metric-helper">Selected report scope</div>
            </div>

            <div class="card">
              <div class="metric-label">Open Overdue</div>
              <div class="metric-value danger">${analytics.sla.openOverdue}</div>
              <div class="metric-helper">Still open and beyond SLA</div>
            </div>

            <div class="card">
              <div class="metric-label">Man-day</div>
              <div class="metric-value">${formatNumber(analytics.manDay.totalBillableManDays)}</div>
              <div class="metric-helper">${formatNumber(analytics.manDay.totalBillableHours)} hours</div>
            </div>
          </div>

          <div style="margin-top:24px;">
            <h2>Monthly ticket trend</h2>
            <div class="chart">
              ${renderTrendBars(analytics.trend)}
            </div>
            <div class="legend">
              <span><span class="dot dot-opened"></span>Opened</span>
              <span><span class="dot dot-closed"></span>Closed</span>
            </div>
          </div>

          <div class="footer">ATMS monthly SLA dashboard</div>
        </section>

        <section class="page">
          <div class="title">Monthly SLA review meeting</div>
          <div class="subtitle">Monthly ticket by project</div>
          <div class="rule"></div>

          <table>
            <thead>
              <tr>
                <th>Project Code</th>
                <th>Project Name</th>
                <th class="num">Tickets</th>
                <th class="num">Open</th>
                <th class="num">Closed</th>
                <th class="num">Breached</th>
                <th class="num">MD</th>
              </tr>
            </thead>
            <tbody>
              ${renderProjectRows(analytics.byProject)}
            </tbody>
          </table>

          <div class="footer">Project-level workload and man-day consumption</div>
        </section>

        <section class="page">
          <div class="title">Monthly SLA review meeting</div>
          <div class="subtitle">Ticket log appendix</div>
          <div class="rule"></div>

          <table>
            <thead>
              <tr>
                <th>Issue No</th>
                <th>SNOW No</th>
                <th>Project</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th class="num">Aging Hrs</th>
                <th class="num">SLA Hrs</th>
                <th class="num">Breach</th>
                <th class="num">MD</th>
              </tr>
            </thead>
            <tbody>
              ${renderTicketRows(analytics.ticketLog)}
            </tbody>
          </table>

          <div class="footer">Top 24 tickets from selected scope</div>
        </section>
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