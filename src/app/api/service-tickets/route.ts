import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { listServiceTicketsService } from "@/modules/service-tickets/service-ticket.service";
import type {
  ServiceTicketMatchStatus,
  ServiceTicketType,
} from "@/modules/service-tickets/service-ticket.types";

function getSearchParam(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key)?.trim();
  return value || undefined;
}

export const GET = withApiHandler(async (req: Request) => {
  const url = new URL(req.url);

  const projectAccountId = getSearchParam(url, "projectAccountId");
  const projectCode = getSearchParam(url, "projectCode");
  const search = getSearchParam(url, "search");

  const ticketTypeRaw = getSearchParam(url, "ticketType");
  const matchStatusRaw = getSearchParam(url, "matchStatus");

  const ticketType =
    ticketTypeRaw === "incident" ||
    ticketTypeRaw === "request" ||
    ticketTypeRaw === "change" ||
    ticketTypeRaw === "task" ||
    ticketTypeRaw === "all"
      ? (ticketTypeRaw as ServiceTicketType | "all")
      : undefined;

  const matchStatus =
    matchStatusRaw === "matched" ||
    matchStatusRaw === "unmatched" ||
    matchStatusRaw === "all"
      ? (matchStatusRaw as ServiceTicketMatchStatus | "all")
      : undefined;

  const items = await listServiceTicketsService({
    projectAccountId,
    projectCode,
    ticketType,
    matchStatus,
    search,
  });

  return ok({
    items,
    total: items.length,
  });
});