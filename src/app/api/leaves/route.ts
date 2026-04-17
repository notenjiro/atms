import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import {
  createLeaveRequestService,
  listLeaveRequestsService,
} from "@/modules/leave/leave.service";
import type { LeaveRequestFilters } from "@/modules/leave/leave.types";

function getStringParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key)?.trim();

  return value ? value : undefined;
}

function buildLeaveRequestFilters(
  searchParams: URLSearchParams,
): LeaveRequestFilters {
  return {
    employeeId: getStringParam(searchParams, "employeeId"),
    status: getStringParam(searchParams, "status") as
      | LeaveRequestFilters["status"]
      | undefined,
    leaveTypeId: getStringParam(searchParams, "leaveTypeId") as
      | LeaveRequestFilters["leaveTypeId"]
      | undefined,
    fromDate: getStringParam(searchParams, "fromDate"),
    toDate: getStringParam(searchParams, "toDate"),
    approverRole: getStringParam(searchParams, "approverRole") as
      | LeaveRequestFilters["approverRole"]
      | undefined,
  };
}

export const GET = withApiHandler(async (req: NextRequest) => {
  const filters = buildLeaveRequestFilters(req.nextUrl.searchParams);
  const items = await listLeaveRequestsService(filters);

  return ok({
    items,
  });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();

  const created = await createLeaveRequestService(
    {
      employeeId: body.employeeId,
      employeeName: body.employeeName,
      approverName: body.approverName,
      approverEmail: body.approverEmail,
    },
    {
      leaveTypeId: body.leaveTypeId,
      startDate: body.startDate,
      endDate: body.endDate,
      startPortion: body.startPortion,
      endPortion: body.endPortion,
      remarks: body.remarks,
    },
  );

  return ok(
    {
      item: created,
    },
    "Leave request created successfully.",
    201,
  );
});