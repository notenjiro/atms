"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type IssueStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "resolved"
  | "closed"
  | "cancelled";

type IssuePriority = "low" | "medium" | "high" | "critical";

type IssueSource = "manual" | "servicenow" | "email" | "phone";

type UpdateIssueFormProps = {
  issue: {
    id: string;
    title: string;
    description: string;
    customerName: string;
    projectAccountId?: string;
    status: IssueStatus;
    priority: IssuePriority;
    source: IssueSource;
    ownerName?: string;
    ownerEmail?: string;
    externalTicketNo?: string;
  };
};

type UpdateIssuePayload = {
  title: string;
  description: string;
  customerName: string;
  projectAccountId: string;
  status: IssueStatus;
  priority: IssuePriority;
  source: IssueSource;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  externalTicketNo: string;
};

type ProjectAccountItem = {
  id: string;
  code: string;
  projectName: string;
  customerName: string;
};

type ProjectAccountsApiResponse = {
  data?: {
    items?: ProjectAccountItem[];
  };
};

type UserOption = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "manager" | "support" | "viewer";
  status: "active" | "inactive";
};

type UsersApiResponse = {
  data?: {
    items?: UserOption[];
  };
};

export default function UpdateIssueForm({
  issue,
}: UpdateIssueFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projectAccountsLoading, setProjectAccountsLoading] = useState(false);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [projectAccounts, setProjectAccounts] = useState<ProjectAccountItem[]>([]);
  const [owners, setOwners] = useState<UserOption[]>([]);
  const [form, setForm] = useState<UpdateIssuePayload>({
    title: issue.title,
    description: issue.description ?? "",
    customerName: issue.customerName ?? "",
    projectAccountId: issue.projectAccountId ?? "",
    status: issue.status,
    priority: issue.priority,
    source: issue.source,
    ownerId: "",
    ownerName: issue.ownerName ?? "",
    ownerEmail: issue.ownerEmail ?? "",
    externalTicketNo: issue.externalTicketNo ?? "",
  });

  useEffect(() => {
    async function loadProjectAccounts() {
      try {
        setProjectAccountsLoading(true);

        const response = await fetch("/api/project-accounts", {
          cache: "no-store",
        });

        const result =
          (await response.json().catch(() => null)) as ProjectAccountsApiResponse | null;

        if (!response.ok) {
          return;
        }

        const items = Array.isArray(result?.data?.items) ? result.data.items : [];
        setProjectAccounts(items);
      } catch {
        setProjectAccounts([]);
      } finally {
        setProjectAccountsLoading(false);
      }
    }

    async function loadOwners() {
      try {
        setOwnersLoading(true);

        const response = await fetch("/api/users", {
          cache: "no-store",
        });

        const result =
          (await response.json().catch(() => null)) as UsersApiResponse | null;

        if (!response.ok) {
          return;
        }

        const items = Array.isArray(result?.data?.items) ? result.data.items : [];
        setOwners(items);

        const matchedOwner = items.find(
          (item) =>
            item.fullName === (issue.ownerName ?? "") &&
            item.email === (issue.ownerEmail ?? ""),
        );

        if (matchedOwner) {
          setForm((prev) => ({
            ...prev,
            ownerId: matchedOwner.id,
            ownerName: matchedOwner.fullName,
            ownerEmail: matchedOwner.email,
          }));
        }
      } catch {
        setOwners([]);
      } finally {
        setOwnersLoading(false);
      }
    }

    loadProjectAccounts();
    loadOwners();
  }, [issue.ownerEmail, issue.ownerName]);

  function updateField<K extends keyof UpdateIssuePayload>(
    key: K,
    value: UpdateIssuePayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOwnerChange(ownerId: string) {
    const selectedOwner = owners.find((item) => item.id === ownerId);

    setForm((prev) => ({
      ...prev,
      ownerId,
      ownerName: selectedOwner?.fullName ?? "",
      ownerEmail: selectedOwner?.email ?? "",
    }));
  }

  const selectedProjectAccount =
    projectAccounts.find((item) => item.id === form.projectAccountId) ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!form.projectAccountId.trim() && !form.customerName.trim()) {
      toast.error("Customer is required when no project account is selected");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/issues/${issue.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          customerName: form.projectAccountId
            ? undefined
            : form.customerName.trim(),
          projectAccountId: form.projectAccountId.trim(),
          status: form.status,
          priority: form.priority,
          source: form.source,
          ownerName: form.ownerName.trim(),
          ownerEmail: form.ownerEmail.trim(),
          externalTicketNo: form.externalTicketNo.trim(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          result?.error?.message || "Failed to update issue";
        throw new Error(message);
      }

      toast.success("Issue updated");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border bg-white p-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Update Issue</h2>
        <p className="mt-1 text-sm text-gray-600">
          Update the current issue record.
        </p>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="update-issue-title"
          className="text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <input
          id="update-issue-title"
          type="text"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="update-issue-description"
          className="text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="update-issue-description"
          rows={5}
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="update-issue-project-account-id"
            className="text-sm font-medium text-gray-700"
          >
            Project Account
          </label>
          <select
            id="update-issue-project-account-id"
            value={form.projectAccountId}
            onChange={(event) =>
              updateField("projectAccountId", event.target.value)
            }
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
            disabled={projectAccountsLoading}
          >
            <option value="">
              {projectAccountsLoading ? "Loading project accounts..." : "Optional"}
            </option>

            {projectAccounts.map((projectAccount) => (
              <option key={projectAccount.id} value={projectAccount.id}>
                {projectAccount.code} — {projectAccount.projectName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="update-issue-customer-name"
            className="text-sm font-medium text-gray-700"
          >
            Customer
          </label>
          <input
            id="update-issue-customer-name"
            type="text"
            value={selectedProjectAccount?.customerName ?? form.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            placeholder="Required when project account is empty"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
            disabled={Boolean(selectedProjectAccount)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label
            htmlFor="update-issue-status"
            className="text-sm font-medium text-gray-700"
          >
            Status
          </label>
          <select
            id="update-issue-status"
            value={form.status}
            onChange={(event) =>
              updateField("status", event.target.value as IssueStatus)
            }
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="update-issue-priority"
            className="text-sm font-medium text-gray-700"
          >
            Priority
          </label>
          <select
            id="update-issue-priority"
            value={form.priority}
            onChange={(event) =>
              updateField("priority", event.target.value as IssuePriority)
            }
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="update-issue-source"
            className="text-sm font-medium text-gray-700"
          >
            Source
          </label>
          <select
            id="update-issue-source"
            value={form.source}
            onChange={(event) =>
              updateField("source", event.target.value as IssueSource)
            }
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
          >
            <option value="manual">Manual</option>
            <option value="servicenow">ServiceNow</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="update-issue-owner-id"
            className="text-sm font-medium text-gray-700"
          >
            Owner
          </label>
          <select
            id="update-issue-owner-id"
            value={form.ownerId}
            onChange={(event) => handleOwnerChange(event.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
            disabled={ownersLoading}
          >
            <option value="">
              {ownersLoading ? "Loading owners..." : "Optional"}
            </option>

            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.fullName} — {owner.email}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="update-issue-owner-email"
            className="text-sm font-medium text-gray-700"
          >
            Owner Email
          </label>
          <input
            id="update-issue-owner-email"
            type="email"
            value={form.ownerEmail}
            readOnly
            className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-600 outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="update-issue-external-ticket-no"
          className="text-sm font-medium text-gray-700"
        >
          External Ticket No
        </label>
        <input
          id="update-issue-external-ticket-no"
          type="text"
          value={form.externalTicketNo}
          onChange={(event) =>
            updateField("externalTicketNo", event.target.value)
          }
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}