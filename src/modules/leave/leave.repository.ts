import { NotFoundError } from "@/lib/errors";
import { readJsonFile, writeJsonFile } from "@/lib/fs/json-store";
import { dataPaths } from "@/lib/fs/paths";

import { leaveFileSchema } from "./leave.schemas";
import type {
  LeaveFile,
  LeaveQuotaBalance,
  LeaveRequest,
} from "./leave.types";

const DEFAULT_LEAVE_FILE: LeaveFile = {
  requests: [],
  quotaBalances: [],
};

export async function readLeaveFile(): Promise<LeaveFile> {
  const data = await readJsonFile<LeaveFile>(
    dataPaths.leaveRequests,
    DEFAULT_LEAVE_FILE,
  );

  const parsed = leaveFileSchema.safeParse(data);

  if (!parsed.success) {
    console.error(
      "Invalid leave-requests.json format",
      parsed.error.flatten().fieldErrors,
    );
    return DEFAULT_LEAVE_FILE;
  }

  return parsed.data;
}

export async function listLeaveRequests(): Promise<LeaveRequest[]> {
  const data = await readLeaveFile();
  return data.requests;
}

export async function listLeaveQuotaBalances(): Promise<LeaveQuotaBalance[]> {
  const data = await readLeaveFile();
  return data.quotaBalances;
}

export async function findLeaveRequestById(
  id: string,
): Promise<LeaveRequest | null> {
  const requests = await listLeaveRequests();
  return requests.find((request) => request.id === id) ?? null;
}

export async function findLeaveQuotaBalanceByLeaveTypeId(
  leaveTypeId: LeaveQuotaBalance["leaveTypeId"],
): Promise<LeaveQuotaBalance | null> {
  const balances = await listLeaveQuotaBalances();
  return balances.find((balance) => balance.leaveTypeId === leaveTypeId) ?? null;
}

export async function saveLeaveFile(data: LeaveFile): Promise<void> {
  await writeJsonFile<LeaveFile>(dataPaths.leaveRequests, data);
}

export async function saveLeaveRequests(
  requests: LeaveRequest[],
): Promise<void> {
  const data = await readLeaveFile();

  await saveLeaveFile({
    ...data,
    requests,
  });
}

export async function saveLeaveQuotaBalances(
  quotaBalances: LeaveQuotaBalance[],
): Promise<void> {
  const data = await readLeaveFile();

  await saveLeaveFile({
    ...data,
    quotaBalances,
  });
}

export async function addLeaveRequest(
  newLeaveRequest: LeaveRequest,
): Promise<LeaveRequest> {
  const requests = await listLeaveRequests();
  const nextRequests = [...requests, newLeaveRequest];

  await saveLeaveRequests(nextRequests);

  return newLeaveRequest;
}

export async function updateLeaveRequest(
  updatedLeaveRequest: LeaveRequest,
): Promise<LeaveRequest> {
  const requests = await listLeaveRequests();

  const index = requests.findIndex(
    (request) => request.id === updatedLeaveRequest.id,
  );

  if (index === -1) {
    throw new NotFoundError("Leave request not found.");
  }

  requests[index] = updatedLeaveRequest;

  await saveLeaveRequests(requests);

  return updatedLeaveRequest;
}

export async function upsertLeaveQuotaBalance(
  input: LeaveQuotaBalance,
): Promise<LeaveQuotaBalance> {
  const balances = await listLeaveQuotaBalances();

  const index = balances.findIndex(
    (balance) => balance.leaveTypeId === input.leaveTypeId,
  );

  if (index === -1) {
    const nextBalances = [...balances, input];
    await saveLeaveQuotaBalances(nextBalances);
    return input;
  }

  balances[index] = input;

  await saveLeaveQuotaBalances(balances);

  return input;
}