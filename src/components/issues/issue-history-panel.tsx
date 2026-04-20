"use client";

import { useEffect, useState } from "react";

type IssueHistoryItem = {
  id: string;
  issueId: string;
  action: "created" | "updated" | "status_changed";
  field?: string;
  from?: string;
  to?: string;
  actorId: string;
  actorName: string;
  createdAt: string;
};

type IssueHistoryPanelProps = {
  issueId: string;
  refreshKey?: number;
};

type IssueHistoryApiResponse = {
  data?: {
    items?: IssueHistoryItem[];
  };
};

function formatDateTime(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFieldLabel(field?: string) {
  if (!field) {
    return "-";
  }

  switch (field) {
    case "projectAccountId":
      return "Project Account ID";
    case "projectAccountCode":
      return "Project Account Code";
    case "projectAccountName":
      return "Project Account Name";
    case "customerName":
      return "Customer";
    case "ownerName":
      return "Owner Name";
    case "ownerEmail":
      return "Owner Email";
    case "externalTicketNo":
      return "External Ticket No";
    case "resolvedAt":
      return "Resolved At";
    case "closedAt":
      return "Closed At";
    case "cancelledAt":
      return "Cancelled At";
    default:
      return field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (char) => char.toUpperCase())
        .trim();
  }
}

function formatActionLabel(action: IssueHistoryItem["action"]) {
  switch (action) {
    case "created":
      return "Created";
    case "updated":
      return "Updated";
    case "status_changed":
      return "Status Changed";
    default:
      return action;
  }
}

function formatValue(value?: string) {
  if (!value || value.trim() === "") {
    return "-";
  }

  return value;
}

function getActionBadgeClass(action: IssueHistoryItem["action"]) {
  switch (action) {
    case "created":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "updated":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "status_changed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function ActionBadge({
  action,
}: {
  action: IssueHistoryItem["action"];
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getActionBadgeClass(
        action,
      )}`}
    >
      {formatActionLabel(action)}
    </span>
  );
}

export default function IssueHistoryPanel({
  issueId,
  refreshKey = 0,
}: IssueHistoryPanelProps) {
  const [items, setItems] = useState<IssueHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);

        const response = await fetch(`/api/issues/${issueId}/history`, {
          cache: "no-store",
        });

        if (!response.ok) {
          setItems([]);
          return;
        }

        const json =
          (await response.json().catch(() => null)) as IssueHistoryApiResponse | null;

        const nextItems = Array.isArray(json?.data?.items) ? json.data.items : [];
        setItems(nextItems);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [issueId, refreshKey]);

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">History</h2>
        <div className="text-sm text-gray-500">
          {loading ? "Loading..." : `${items.length} event${items.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-gray-500">Loading history...</div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No history yet.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border bg-gray-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ActionBadge action={item.action} />
                  {item.field ? (
                    <span className="text-sm font-medium text-gray-700">
                      {formatFieldLabel(item.field)}
                    </span>
                  ) : null}
                </div>

                <div className="text-xs text-gray-500">
                  {formatDateTime(item.createdAt)}
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actor
                  </div>
                  <div className="mt-1 text-sm text-gray-900">
                    {item.actorName}
                  </div>
                  <div className="text-xs text-gray-500">{item.actorId}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Change
                  </div>

                  {item.action === "created" ? (
                    <div className="mt-1 text-sm text-gray-900">
                      Issue created.
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1 text-sm text-gray-900">
                      <div>
                        <span className="font-medium text-gray-600">From:</span>{" "}
                        {formatValue(item.from)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">To:</span>{" "}
                        {formatValue(item.to)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}