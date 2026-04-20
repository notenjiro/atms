"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type CreateIssueFormProps = {
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  onCreated?: () => void;
};

type CreateIssuePayload = {
  title: string;
  description: string;
  customerName: string;
  priority: "low" | "medium" | "high" | "critical";
  source: "manual" | "servicenow" | "email" | "phone";
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  externalTicketNo: string;
  projectAccountId: string;
};

type ApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[] | string | undefined>;
  };
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

const INITIAL_FORM: CreateIssuePayload = {
  title: "",
  description: "",
  customerName: "",
  priority: "medium",
  source: "manual",
  ownerId: "",
  ownerName: "",
  ownerEmail: "",
  externalTicketNo: "",
  projectAccountId: "",
};

function extractApiErrorMessage(payload: ApiErrorResponse | null): string {
  if (!payload?.error) {
    return "Failed to create issue";
  }

  const baseMessage =
    typeof payload.error.message === "string" && payload.error.message.trim()
      ? payload.error.message.trim()
      : "Failed to create issue";

  const details = payload.error.details;

  if (!details || typeof details !== "object") {
    return baseMessage;
  }

  const detailMessages = Object.values(details)
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        );
      }

      if (typeof value === "string" && value.trim().length > 0) {
        return [value];
      }

      return [];
    })
    .filter(Boolean);

  if (detailMessages.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} ${detailMessages.join(" ")}`.trim();
}

export default function CreateIssueForm({
  reporterId,
  reporterName,
  reporterEmail,
  onCreated,
}: CreateIssueFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projectAccountsLoading, setProjectAccountsLoading] = useState(false);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [projectAccounts, setProjectAccounts] = useState<ProjectAccountItem[]>([]);
  const [owners, setOwners] = useState<UserOption[]>([]);
  const [form, setForm] = useState<CreateIssuePayload>(INITIAL_FORM);

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
      } catch {
        setOwners([]);
      } finally {
        setOwnersLoading(false);
      }
    }

    loadProjectAccounts();
    loadOwners();
  }, []);

  function updateField<K extends keyof CreateIssuePayload>(
    key: K,
    value: CreateIssuePayload[K],
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

      const response = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reporterId,
          reporterName,
          reporterEmail,
          title: form.title.trim(),
          description: form.description.trim(),
          customerName: form.projectAccountId
            ? undefined
            : form.customerName.trim() || undefined,
          projectAccountId: form.projectAccountId.trim() || undefined,
          priority: form.priority,
          source: form.source,
          ownerName: form.ownerName.trim() || undefined,
          ownerEmail: form.ownerEmail.trim() || undefined,
          externalTicketNo: form.externalTicketNo.trim() || undefined,
        }),
      });

      const result = (await response.json().catch(() => null)) as ApiErrorResponse | null;

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(result));
      }

      toast.success("Issue created");
      setForm(INITIAL_FORM);
      onCreated?.();
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
      className="space-y-4 rounded-xl border bg-white p-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Create Issue</h2>
        <p className="mt-1 text-sm text-gray-600">
          Capture a new issue in the local issue log.
        </p>
      </div>

      <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-600">
        <div className="font-medium text-gray-800">Reporter</div>
        <div>{reporterName}</div>
        <div>{reporterEmail || "-"}</div>
      </div>

      <div className="space-y-1">
        <label htmlFor="issue-title" className="text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="issue-title"
          type="text"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          placeholder="Issue title"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="issue-description"
          className="text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="issue-description"
          rows={4}
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Describe the issue"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="issue-project-account-id"
            className="text-sm font-medium text-gray-700"
          >
            Project Account
          </label>
          <select
            id="issue-project-account-id"
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
          <p className="text-xs text-gray-500">
            Selecting a project account will derive customer information from the
            selected account.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="issue-customer"
            className="text-sm font-medium text-gray-700"
          >
            Customer
          </label>
          <input
            id="issue-customer"
            type="text"
            value={selectedProjectAccount?.customerName ?? form.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            placeholder="Required when project account is empty"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
            disabled={Boolean(selectedProjectAccount)}
          />
          <p className="text-xs text-gray-500">
            {selectedProjectAccount
              ? "Customer is locked from the selected project account."
              : "Enter customer name if no project account is selected."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="issue-priority"
            className="text-sm font-medium text-gray-700"
          >
            Priority
          </label>
          <select
            id="issue-priority"
            value={form.priority}
            onChange={(event) =>
              updateField(
                "priority",
                event.target.value as CreateIssuePayload["priority"],
              )
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
            htmlFor="issue-source"
            className="text-sm font-medium text-gray-700"
          >
            Source
          </label>
          <select
            id="issue-source"
            value={form.source}
            onChange={(event) =>
              updateField("source", event.target.value as CreateIssuePayload["source"])
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
            htmlFor="issue-owner-id"
            className="text-sm font-medium text-gray-700"
          >
            Owner
          </label>
          <select
            id="issue-owner-id"
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
          <p className="text-xs text-gray-500">
            Owner details will be derived from the selected active user.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="issue-owner-email"
            className="text-sm font-medium text-gray-700"
          >
            Owner Email
          </label>
          <input
            id="issue-owner-email"
            type="email"
            value={form.ownerEmail}
            readOnly
            placeholder="Owner email will appear here"
            className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-600 outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="issue-external-ticket-no"
          className="text-sm font-medium text-gray-700"
        >
          External Ticket No
        </label>
        <input
          id="issue-external-ticket-no"
          type="text"
          value={form.externalTicketNo}
          onChange={(event) => updateField("externalTicketNo", event.target.value)}
          placeholder="Optional external reference"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-gray-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Issue"}
        </button>
      </div>
    </form>
  );
}