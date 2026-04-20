"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type IssueStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "resolved"
  | "closed"
  | "cancelled";

type IssueStatusActionsProps = {
  issueId: string;
  currentStatus: IssueStatus;
  onUpdated?: () => void;
};

function nextActions(status: IssueStatus): Array<{ label: string; to: IssueStatus }> {
  switch (status) {
    case "open":
      return [
        { label: "Start Progress", to: "in_progress" },
        { label: "Cancel", to: "cancelled" },
      ];
    case "in_progress":
      return [
        { label: "Mark Pending", to: "pending" },
        { label: "Resolve", to: "resolved" },
      ];
    case "pending":
      return [
        { label: "Resume", to: "in_progress" },
        { label: "Cancel", to: "cancelled" },
      ];
    case "resolved":
      return [
        { label: "Close", to: "closed" },
        { label: "Reopen", to: "open" },
      ];
    case "closed":
      return [{ label: "Reopen", to: "open" }];
    case "cancelled":
      return [{ label: "Reopen", to: "open" }];
    default:
      return [];
  }
}

export default function IssueStatusActions({
  issueId,
  currentStatus,
  onUpdated,
}: IssueStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(next: IssueStatus) {
    try {
      setLoading(next);

      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.error?.message || "Failed to update status";
        throw new Error(msg);
      }

      toast.success("Status updated");
      onUpdated?.();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  const actions = nextActions(currentStatus);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="text-sm font-medium text-gray-500">Quick Actions</div>

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.to}
            type="button"
            onClick={() => updateStatus(action.to)}
            disabled={loading !== null}
            className="rounded-lg border px-3 py-2 text-sm font-medium bg-black text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading === action.to ? "Updating..." : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}