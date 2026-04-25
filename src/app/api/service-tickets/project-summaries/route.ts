import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { getUnmatchedServiceTicketsService } from "@/modules/service-tickets/service-ticket.service";

export const GET = withApiHandler(async () => {
  const items = await getUnmatchedServiceTicketsService();

  return ok({
    items,
    total: items.length,
  });
});