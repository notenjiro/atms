import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { getReportAnalyticsService } from "@/modules/report/report.service";

export async function GET() {
  const analytics = await getReportAnalyticsService();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ATMS";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 18 },
    { header: "Notes", key: "notes", width: 36 },
  ];

  summarySheet.addRow({
    metric: "Total Issues",
    value: analytics.summary.totalIssues,
    notes: "All issues in the current store",
  });
  summarySheet.addRow({
    metric: "Open Issues",
    value: analytics.summary.openIssues,
    notes: "Open, in progress, and pending",
  });
  summarySheet.addRow({
    metric: "Resolved Issues",
    value: analytics.summary.resolvedIssues,
    notes: "Resolved and closed",
  });
  summarySheet.addRow({
    metric: "Critical Issues",
    value: analytics.summary.criticalIssues,
    notes: "Priority marked as critical",
  });
  summarySheet.addRow({
    metric: "Unassigned Open Issues",
    value: analytics.summary.unassignedOpenIssues,
    notes: "Open issues without owner",
  });
  summarySheet.addRow({
    metric: "Avg Resolution (days)",
    value: analytics.sla.avgResolutionDays ?? "-",
    notes: "Average time to close issue",
  });
  summarySheet.addRow({
    metric: "Within SLA",
    value: analytics.sla.resolvedWithinSLA,
    notes: "Resolved within SLA target",
  });
  summarySheet.addRow({
    metric: "Breached SLA",
    value: analytics.sla.resolvedBreachedSLA,
    notes: "Resolved but exceeded SLA",
  });
  summarySheet.addRow({
    metric: "Open Overdue",
    value: analytics.sla.openOverdue,
    notes: "Open issues beyond SLA",
  });

  const trendSheet = workbook.addWorksheet("Trend");
  trendSheet.columns = [
    { header: "Date", key: "date", width: 16 },
    { header: "Opened", key: "opened", width: 14 },
    { header: "Resolved", key: "resolved", width: 14 },
  ];
  analytics.trend.forEach((item) => {
    trendSheet.addRow(item);
  });

  const agingSheet = workbook.addWorksheet("Aging");
  agingSheet.columns = [
    { header: "Bucket", key: "label", width: 18 },
    { header: "Count", key: "count", width: 14 },
  ];
  analytics.aging.forEach((item) => {
    agingSheet.addRow(item);
  });

  const customersSheet = workbook.addWorksheet("Top Customers");
  customersSheet.columns = [
    { header: "Customer", key: "customerName", width: 36 },
    { header: "Issues", key: "count", width: 14 },
  ];
  analytics.topCustomers.forEach((item) => {
    customersSheet.addRow(item);
  });

  for (const sheet of workbook.worksheets) {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFCE7F3" },
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  // ✅ แปลง Buffer -> Uint8Array (compatible กับ NextResponse)
  const uint8 = new Uint8Array(buffer as ArrayBuffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="atms-report.xlsx"',
    },
  });
}
