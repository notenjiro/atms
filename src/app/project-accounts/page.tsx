import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ProjectAccountsTabs } from "@/components/project-accounts/project-accounts-tabs";

import { getSession } from "@/modules/auth/auth.session";
import { getProjectAccountsView } from "@/modules/project-accounts/project-account.service";

import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

function calculateSummary(items: ProjectAccount[]) {
  const today = new Date();

  let expiringSoon = 0;
  let totalRemaining = 0;

  for (const item of items) {
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
    <div className="glass-panel-project rounded-[24px] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-violet-500">
        {title}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold leading-none text-slate-900">
          {value}
        </p>
        {hint ? (
          <p className="text-xs font-medium text-violet-400">{hint}</p>
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

  const { activeItems, archivedItems } = await getProjectAccountsView();

  const summary = calculateSummary(activeItems);

  return (
    <div className="glass-panel-project">
      <AppShell
        fullName={session.fullName}
        email={session.email}
        role={session.role}
        title="Project Accounts"
        description="Manage contracts, track man-day usage, and monitor support coverage."
      >
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Accounts"
              value={activeItems.length + archivedItems.length}
            />

            <SummaryCard
              title="Active Contracts"
              value={activeItems.length}
            />

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

          <ProjectAccountsTabs
            activeItems={activeItems}
            archivedItems={archivedItems}
          />
        </div>
      </AppShell>
    </div>
  );
}