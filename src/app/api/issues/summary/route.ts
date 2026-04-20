import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { getIssueSummaryService } from "@/modules/issues/issue.service";
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
  const summary = await getIssueSummaryService(filters);

  return ok({
    summary,
  });
});