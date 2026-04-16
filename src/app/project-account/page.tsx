import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { CreateProjectAccountForm } from "@/components/project-accounts/create-project-account-form";
import { getSession } from "@/modules/auth/auth.session";
import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

type ProjectAccountsApiResponse = {
  success?: boolean;
  data?: {
    items?: ProjectAccount[];
  };
};

async function fetchProjectAccounts(): Promise<ProjectAccount[]> {
  const response = await fetch("http://localhost:3000/api/project-accounts", {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as ProjectAccountsApiResponse;

  return json.data?.items ?? [];
}

function getStatusBadgeClassName(status: ProjectAccount["status"]): string {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "expired":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "inactive":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "draft":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export default async function ProjectAccountPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const items = await fetchProjectAccounts();

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      title="Project Accounts"
      description="Manage contracts, track man-day usage, and monitor support coverage."
    >
      <div className="space-y-6">
        <CreateProjectAccountForm />

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Overview</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Project accounts
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review all support contracts, usage levels, and current account
                status in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total accounts
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {items.length}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-700">Code</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Project</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Customer</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Contract</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Period</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Usage</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Remaining</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {item.code}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {item.projectName}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {item.customerName}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {item.contractNo}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <div>{item.startDate}</div>
                      <div className="text-xs text-slate-500">to {item.endDate}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {item.usedManDays} / {item.allocatedManDays}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {item.remainingManDays}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize",
                          getStatusBadgeClassName(item.status),
                        ].join(" ")}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-sm text-slate-500"
                    >
                      No project accounts yet. Create your first account using the
                      form above.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}