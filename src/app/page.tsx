import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/modules/auth/auth.session";

const quickStats = [
  {
    label: "Issues",
    value: "0",
    hint: "Operational items currently in the system",
  },
  {
    label: "Projects",
    value: "0",
    hint: "Project accounts linked to the workspace",
  },
  {
    label: "Leave",
    value: "0",
    hint: "Active or upcoming leave activity",
  },
  {
    label: "Timesheet",
    value: "0",
    hint: "Submitted timesheet activity this period",
  },
] as const;

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      title="Dashboard"
      description="Overview of operations"
    >
      <div className="space-y-6">
        <section className="glass-panel-strong overflow-hidden rounded-[28px] p-8 shadow-xl">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/45 bg-black/5 px-3 py-1 text-xs font-medium tracking-[0.2em] text-slate-600">
              Dashboard
            </div>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Welcome back
            </h2>

            <p className="mt-3 text-base leading-7 text-slate-600">
              This is your operational overview.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickStats.map((item) => (
            <div
              key={item.label}
              className="glass-panel rounded-[24px] p-5 transition hover:bg-white/50 hover:shadow-lg"
            >
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.hint}</p>
            </div>
          ))}
        </section>

        <section className="glass-panel rounded-[28px] p-6 shadow-sm">
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">
            Overview
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            System modules will appear here.
          </p>
        </section>
      </div>
    </AppShell>
  );
}