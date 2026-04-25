import type {
  IssuePriority,
  IssueStatus,
  ServiceNowIssueSyncInput,
} from "@/modules/issues/issue.types";

import type { ServiceTicket } from "./service-ticket.types";

function normalizeText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function mapPriority(ticket: ServiceTicket): IssuePriority {
  const raw = normalizeText(ticket.priority).toLowerCase();

  if (raw.includes("critical") || raw.includes("urgent") || raw.includes("p1") || raw === "1") {
    return "critical";
  }
  if (raw.includes("high") || raw.includes("p2") || raw === "2") {
    return "high";
  }
  if (raw.includes("medium") || raw.includes("p3") || raw === "3") {
    return "medium";
  }
  return "low";
}

function mapStatus(ticket: ServiceTicket): IssueStatus {
  const raw = normalizeText(ticket.state || ticket.status).toLowerCase();

  if (raw.includes("cancel")) return "cancelled";
  if (raw.includes("closed")) return "closed";
  if (raw.includes("resolved")) return "resolved";
  if (raw.includes("progress") || raw.includes("assigned")) return "in_progress";
  if (raw.includes("pending") || raw.includes("hold")) return "pending";

  return "open";
}

function buildCustomerName(ticket: ServiceTicket): string {
  return (
    normalizeText(ticket.company) ||
    normalizeText(ticket.projectName) ||
    normalizeText(ticket.projectCode) ||
    "Unknown"
  );
}

function buildDescription(ticket: ServiceTicket): string {
  const parts = [
    ticket.shortDescription,
    ticket.description,
    ticket.closeNotes ? `Close notes: ${ticket.closeNotes}` : undefined,
    ticket.rootCause ? `Root cause: ${ticket.rootCause}` : undefined,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return parts.join("\n\n") || ticket.title || ticket.ticketNo;
}

function buildOpenedAt(ticket: ServiceTicket): string {
  return (
    ticket.createdAt ||
    ticket.openedAt ||
    ticket.importedAt ||
    new Date().toISOString()
  );
}

export function mapServiceTicketToIssueSyncInput(
  ticket: ServiceTicket,
): ServiceNowIssueSyncInput {
  const ticketNo = normalizeText(ticket.ticketNo);

  return {
    issueNo: ticketNo,
    title: ticket.title || ticket.shortDescription || ticketNo,
    description: buildDescription(ticket),
    customerName: buildCustomerName(ticket),
    projectAccountId: ticket.projectAccountId,
    projectAccountCode: ticket.projectCode || undefined,
    projectAccountName: ticket.projectName || undefined,
    status: mapStatus(ticket),
    priority: mapPriority(ticket),
    ownerName: ticket.assignedTo || ticket.owner || undefined,
    externalTicketNo: ticketNo,
    openedAt: buildOpenedAt(ticket),
    closedAt: ticket.closedAt,
  };
}