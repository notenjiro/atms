import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import {
  createIssueService,
  listIssuesService,
} from "@/modules/issues/issue.service";
import type { IssueFilters } from "@/modules/issues/issue.types";

function getStringParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key)?.trim();
  return value ? value : undefined;
}

function buildIssueFilters(searchParams: URLSearchParams): IssueFilters {
  return {
    search: getStringParam(searchParams, "search"),
    status: getStringParam(searchParams, "status") as
      | IssueFilters["status"]
      | undefined,
    priority: getStringParam(searchParams, "priority") as
      | IssueFilters["priority"]
      | undefined,
    source: getStringParam(searchParams, "source") as
      | IssueFilters["source"]
      | undefined,
    projectAccountId: getStringParam(searchParams, "projectAccountId"),
    customerName: getStringParam(searchParams, "customerName"),
    reporterId: getStringParam(searchParams, "reporterId"),
    ownerName: getStringParam(searchParams, "ownerName"),
  };
}

export const GET = withApiHandler(async (req: NextRequest) => {
  const filters = buildIssueFilters(req.nextUrl.searchParams);
  const items = await listIssuesService(filters);

  return ok({
    items,
  });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const item = await createIssueService(
    {
      // ✅ actor
      reporterId: body.reporterId,
      reporterName: body.reporterName,
      reporterEmail: body.reporterEmail,
    },
    {
      // ✅ CreateIssueInput (ตรง type 100%)
      title: body.title,
      description: body.description,
      customerName: body.customerName,
      projectAccountId: body.projectAccountId,
      priority: body.priority,
      source: body.source,
      ownerName: body.ownerName,
      ownerEmail: body.ownerEmail,
      externalTicketNo: body.externalTicketNo,
    },
  );

  return ok(
    {
      item,
    },
    "Issue created successfully.",
    201,
  );
});