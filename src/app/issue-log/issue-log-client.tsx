"use client";

import { Upload } from "lucide-react";

import IssuesTable, {
  type IssueTableItem,
} from "@/components/issues/issues-table";
import { AppShell } from "@/components/layout/app-shell";
import type { IssuePolicySettings } from "@/modules/issues/issue.types";
import { useServiceNowImport } from "./use-service-now-import";

type IssueLogClientProps = {
  session: {
    fullName: string;
    email: string;
    role: string;
  };
  issues: IssueTableItem[];
  policy: IssuePolicySettings;
};

export default function IssueLogClient({
  session,
  issues,
  policy,
}: IssueLogClientProps) {
  const { fileInputRef, isImporting, openFilePicker, handleFileChange } =
    useServiceNowImport();

  const slaRows = [
    { label: "Low", hours: policy.slaHoursLow },
    { label: "Medium", hours: policy.slaHoursMedium },
    { label: "High", hours: policy.slaHoursHigh },
    { label: "Critical", hours: policy.slaHoursCritical },
  ];

  return (
    <div className="glass-panel-issue">
      <AppShell
        fullName={session.fullName}
        email={session.email}
        role={session.role}
        title="Issue Log"
        description="Track operational issues in one place with a local-first workflow."
      >
        <div className="space-y-6">
          <section className="glass-panel-issue rounded-[28px] border border-yellow-200/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">
                  Active policy
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-yellow-900">
                  Issue workflow rules in effect
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-yellow-800">
                  These values come directly from Settings and now affect real
                  issue behavior.
                </p>
              </div>

              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={openFilePicker}
                  disabled={isImporting}
                  className="flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                >
                  <Upload className="size-4" />
                  {isImporting ? "Importing..." : "Import ServiceNow"}
                </button>

                <div className="rounded-2xl border border-yellow-200 bg-white/72 px-4 py-3 text-sm text-yellow-800">
                  Change these rules from the Settings page.
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-yellow-200 bg-white/72 p-4">
              <div className="text-sm font-medium text-yellow-800">
                SLA by priority
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {slaRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-2xl border border-yellow-100 bg-yellow-50/50 px-4 py-3"
                  >
                    <div className="text-xs uppercase tracking-[0.14em] text-yellow-700">
                      {row.label}
                    </div>

                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {row.hours}
                    </div>

                    <div className="text-xs text-slate-500">hours</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <IssuesTable issues={issues} policy={policy} />
        </div>
      </AppShell>
    </div>
  );
}