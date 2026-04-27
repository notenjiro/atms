"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";

import type { ReportFilterOptions, ReportStatus } from "@/modules/report/report.service";

type ReportFilterFormProps = {
  filter: {
    projectAccountId?: string;
    projectCode?: string;
    fromDate?: string;
    toDate?: string;
    statuses?: ReportStatus[];
  };
  options: ReportFilterOptions;
};

const STATUS_OPTIONS: Array<{
  value: ReportStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

function getProjectAccountLabel(
  item: ReportFilterOptions["projectAccounts"][number],
): string {
  return [item.customerName, item.code, item.name].filter(Boolean).join(" · ");
}

export default function ReportFilterForm({
  filter,
  options,
}: ReportFilterFormProps) {
  const projectAccountListId = useId();
  const projectCodeListId = useId();

  const [projectAccountSearch, setProjectAccountSearch] = useState(() => {
    const selected = options.projectAccounts.find(
      (item) => item.id === filter.projectAccountId,
    );

    return selected ? getProjectAccountLabel(selected) : "";
  });

  const [projectCodeSearch, setProjectCodeSearch] = useState(
    filter.projectCode ?? "",
  );

  const selectedProjectAccountId = useMemo(() => {
    const matched = options.projectAccounts.find(
      (item) => getProjectAccountLabel(item) === projectAccountSearch,
    );

    return matched?.id ?? "";
  }, [options.projectAccounts, projectAccountSearch]);

  const selectedProjectCode = useMemo(() => {
    const exactMatch = options.projectCodes.find(
      (item) => item === projectCodeSearch,
    );

    return exactMatch ?? projectCodeSearch.trim();
  }, [options.projectCodes, projectCodeSearch]);

  return (
    <form className="mt-6 space-y-4">
      <input
        type="hidden"
        name="projectAccountId"
        value={selectedProjectAccountId}
      />
      <input type="hidden" name="projectCode" value={selectedProjectCode} />

      <div className="grid gap-3 xl:grid-cols-[1.35fr_1.35fr_0.85fr_0.85fr_auto_auto] xl:items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Project Account
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              list={projectAccountListId}
              value={projectAccountSearch}
              onChange={(event) => setProjectAccountSearch(event.target.value)}
              placeholder="Search company, code, project..."
              className="w-full rounded-xl border bg-white px-9 py-2 text-sm"
            />
          </div>
          <datalist id={projectAccountListId}>
            {options.projectAccounts.map((item) => (
              <option key={item.id} value={getProjectAccountLabel(item)} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Project Code
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              list={projectCodeListId}
              value={projectCodeSearch}
              onChange={(event) => setProjectCodeSearch(event.target.value)}
              placeholder="Search or type project code..."
              className="w-full rounded-xl border bg-white px-9 py-2 text-sm"
            />
          </div>
          <datalist id={projectCodeListId}>
            {options.projectCodes.map((projectCode) => (
              <option key={projectCode} value={projectCode} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">From</label>
          <input
            name="fromDate"
            type="date"
            defaultValue={filter.fromDate ?? ""}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">To</label>
          <input
            name="toDate"
            type="date"
            defaultValue={filter.toDate ?? ""}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-pink-500 px-5 text-sm font-medium text-white transition hover:bg-pink-600"
        >
          Apply
        </button>

        <a
          href="/report"
          className="inline-flex h-10 items-center justify-center rounded-xl border bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Reset
        </a>
      </div>

      <div className="rounded-2xl border bg-white/70 p-3">
        <div className="mb-2 text-sm font-medium text-slate-700">Status</div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((item) => (
            <label
              key={item.value}
              className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name="status"
                value={item.value}
                defaultChecked={filter.statuses?.includes(item.value) ?? false}
                className="size-4 rounded border-slate-300"
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>
    </form>
  );
}