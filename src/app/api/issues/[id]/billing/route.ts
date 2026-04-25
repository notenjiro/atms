import { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { ok, unauthorized } from "@/lib/respond";
import { getSession } from "@/modules/auth/auth.session";
import {
  getIssueByIdService,
  getIssuePolicySettingsService,
} from "@/modules/issues/issue.service";
import { listServiceTickets } from "@/modules/service-tickets/service-ticket.repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeTicketNo(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

export const GET = withApiHandler(
  async (_req: NextRequest, context: RouteContext) => {
    const session = await getSession();

    if (!session) {
      return unauthorized();
    }

    const { id } = await context.params;
    const issue = await getIssueByIdService(id);
    const policy = await getIssuePolicySettingsService();

    if (!issue) {
      return ok({
        policy,
        serviceTickets: [],
        summary: {
          totalTickets: 0,
          totalBillableHours: 0,
          totalBillableManDays: 0,
          totalNonChargeTickets: 0,
          byPerson: [],
        },
      });
    }

    const ticketKey = normalizeTicketNo(issue.externalTicketNo);
    const allTickets = await listServiceTickets();

    const serviceTickets = allTickets.filter(
      (item) => normalizeTicketNo(item.ticketNo) === ticketKey,
    );

    const byPersonMap = new Map<
      string,
      {
        name: string;
        totalBillableHours: number;
        totalBillableManDays: number;
        tickets: number;
      }
    >();

    let totalBillableHours = 0;
    let totalNonChargeTickets = 0;

    for (const ticket of serviceTickets) {
      totalBillableHours += ticket.billableHours;

      if (ticket.nonChargeReason?.trim()) {
        totalNonChargeTickets += 1;
      }

      const person =
        ticket.assignedTo ||
        ticket.responsibleTo ||
        ticket.owner ||
        ticket.requestedBy ||
        "Unassigned";

      if (!byPersonMap.has(person)) {
        byPersonMap.set(person, {
          name: person,
          totalBillableHours: 0,
          totalBillableManDays: 0,
          tickets: 0,
        });
      }

      const row = byPersonMap.get(person)!;
      row.totalBillableHours += ticket.billableHours;
      row.totalBillableManDays += ticket.billableManDays;
      row.tickets += 1;
    }

    return ok({
      policy,
      serviceTickets,
      summary: {
        totalTickets: serviceTickets.length,
        totalBillableHours,
        totalBillableManDays: totalBillableHours / 8,
        totalNonChargeTickets,
        byPerson: [...byPersonMap.values()].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      },
    });
  },
);