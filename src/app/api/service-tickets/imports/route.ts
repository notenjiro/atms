import { withApiHandler } from "@/lib/api";
import { ok } from "@/lib/respond";

import { listServiceTicketImportsService } from "@/modules/service-tickets/service-ticket.service";

export const GET = withApiHandler(async () => {
  const batches = await listServiceTicketImportsService();

  return ok({
    batches,
    total: batches.length,
  });
});