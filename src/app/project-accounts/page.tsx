import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { CreateProjectAccountForm } from "@/components/project-accounts/create-project-account-form";
import { ProjectAccountsTable } from "@/components/project-accounts/project-accounts-table";
import { getSession } from "@/modules/auth/auth.session";
import {
  getArchivedProjectAccounts,
  getProjectAccounts,
} from "@/modules/project-accounts/project-account.service";
import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

function calculateSummary(items: ProjectAccount[]) {
  const today = new Date();

  let active = 0;
  let expiringSoon = 0;
  let totalRemaining = 0;

  for (const item of items) {
    if (item.status === "active") {
      active++;
    }

    const endDate = new Date(item.endDate);
    const diffDays = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays >= 0 && diffDays <= 30) {
      expiringSoon++;
    }

    totalRemaining += item.remainingManDays || 0;
  }

  return {
    total: items.length,
    active,
    expiringSoon,
    totalRemaining,
  };
}

function formatEffort(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 5,
      });
}

function SummaryCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold leading-none text-slate-900">
          {value}
        </p>
        {hint ? (
          <p className="text-xs font-medium text-slate-400">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export default async function ProjectAccountsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const activeItems = await getProjectAccounts();
  const archivedItems = await getArchivedProjectAccounts();
  const summary = calculateSummary(activeItems);
  const items = [...activeItems, ...archivedItems];

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      title="Project Accounts"
      description="Manage contracts, track man-day usage, and monitor support coverage."
    >
      <div className="space-y-5">
        <CreateProjectAccountForm />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Accounts" value={summary.total} />
          <SummaryCard title="Active Contracts" value={summary.active} />
          <SummaryCard
            title="Expiring Soon"
            value={summary.expiringSoon}
            hint="≤ 30 days"
          />
          <SummaryCard
            title="Remaining Man-days"
            value={formatEffort(summary.totalRemaining)}
          />
        </section>

        <ProjectAccountsTable items={items} />
      </div>
    </AppShell>
  );
}