import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

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

function formatNumber(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function applyHeaderStyle(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF173B7A" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
}

function autosize(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 12;

    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      const text =
        value === null || value === undefined
          ? ""
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);

      maxLength = Math.max(maxLength, Math.min(text.length + 2, 60));
    });

    column.width = maxLength;
  });
}

export async function GET(req: NextRequest) {
  const analytics = await getReportAnalyticsService(buildFilter(req));
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ATMS";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 20 },
  ];

  summarySheet.addRows([
    { metric: "Total Issues", value: analytics.summary.totalIssues },
    { metric: "Open Issues", value: analytics.summary.openIssues },
    { metric: "Closed Issues", value: analytics.summary.closedIssues },
    { metric: "SLA %", value: analytics.sla.slaPercent },
    { metric: "Open Overdue", value: analytics.sla.openOverdue },
    {
      metric: "Average Resolution Hours",
      value: analytics.sla.avgResolutionHours ?? "-",
    },
    {
      metric: "Billable Hours",
      value: formatNumber(analytics.manDay.totalBillableHours),
    },
    {
      metric: "Billable MD",
      value: formatNumber(analytics.manDay.totalBillableManDays),
    },
  ]);

  const projectSheet = workbook.addWorksheet("Project");
  projectSheet.columns = [
    { header: "Project Code", key: "projectCode", width: 30 },
    { header: "Project Name", key: "projectName", width: 50 },
    { header: "Tickets", key: "tickets", width: 10 },
    { header: "Open", key: "open", width: 10 },
    { header: "Closed", key: "closed", width: 10 },
    { header: "Breached", key: "breached", width: 10 },
    { header: "Billable Hours", key: "hours", width: 16 },
    { header: "MD", key: "md", width: 10 },
  ];

  projectSheet.addRows(
    analytics.byProject.map((project) => ({
      projectCode: project.projectCode || "-",
      projectName: project.projectName,
      tickets: project.totalIssues,
      open: project.openIssues,
      closed: project.closedIssues,
      breached: project.breachedIssues,
      hours: formatNumber(project.billableHours),
      md: formatNumber(project.billableManDays),
    })),
  );

  const personSheet = workbook.addWorksheet("Person");
  personSheet.columns = [
    { header: "Person", key: "person", width: 32 },
    { header: "Tickets", key: "tickets", width: 12 },
    { header: "Billable Hours", key: "hours", width: 16 },
    { header: "Billable MD", key: "md", width: 14 },
  ];

  personSheet.addRows(
    analytics.byPerson.map((person) => ({
      person: person.personName,
      tickets: person.totalTickets,
      hours: formatNumber(person.billableHours),
      md: formatNumber(person.billableManDays),
    })),
  );

  const ticketSheet = workbook.addWorksheet("Tickets");
  ticketSheet.columns = [
    { header: "Issue No", key: "issueNo", width: 20 },
    { header: "External No", key: "external", width: 20 },
    { header: "Project Code", key: "project", width: 30 },
    { header: "Project Name", key: "projectName", width: 48 },
    { header: "Customer", key: "customer", width: 28 },
    { header: "Title", key: "title", width: 60 },
    { header: "Status", key: "status", width: 15 },
    { header: "Priority", key: "priority", width: 15 },
    { header: "Aging (h)", key: "aging", width: 12 },
    { header: "SLA (h)", key: "sla", width: 12 },
    { header: "Breached", key: "breach", width: 12 },
    { header: "Billable Hours", key: "hours", width: 16 },
    { header: "MD", key: "md", width: 10 },
  ];

  ticketSheet.addRows(
    analytics.ticketLog.map((ticket) => ({
      issueNo: ticket.issueNo,
      external: ticket.externalTicketNo || "-",
      project: ticket.projectCode || "-",
      projectName: ticket.projectName || "-",
      customer: ticket.customerName,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      aging: ticket.agingHours ?? "-",
      sla: ticket.slaHours,
      breach: ticket.slaBreached ? "YES" : "NO",
      hours: formatNumber(ticket.billableHours),
      md: formatNumber(ticket.billableManDays),
    })),
  );

  for (const sheet of workbook.worksheets) {
    applyHeaderStyle(sheet);
    autosize(sheet);
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report.xlsx"`,
    },
  });
}