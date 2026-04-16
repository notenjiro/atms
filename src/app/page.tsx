import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/modules/auth/auth.session";

const quickStats = [
  {
    label: "Open Issues",
    value: "24",
    hint: "Awaiting triage and follow-up",
  },
  {
    label: "Active Contracts",
    value: "12",
    hint: "Under support coverage",
  },
  {
    label: "Remaining Man-Days",
    value: "186.5",
    hint: "Across all active accounts",
  },
  {
    label: "Team on Leave",
    value: "3",
    hint: "Planned leave this month",
  },
] as const;

const moduleCards = [
  {
    title: "Issue Log",
    description:
      "Capture support work, ownership, effort usage, status tracking, and external ticket references.",
    status: "Ready for build",
  },
  {
    title: "Project Accounts",
    description:
      "Track contract dates, remaining man-days, notification recipients, and expiry alert rules.",
    status: "Next priority",
  },
  {
    title: "Reports",
    description:
      "Summarize monthly effort by project account and by person, then export to Excel and PDF.",
    status: "Planned",
  },
  {
    title: "Leave Calendar",
    description:
      "Show a shared monthly board for leave events and contract expiry milestones in one place.",
    status: "Planned",
  },
] as const;

const recentActivities = [
  {
    title: "Authentication flow completed",
    meta: "Login, session, middleware, bootstrap user",
    tone: "success",
  },
  {
    title: "English-only system UI enabled",
    meta: "All user-facing text will stay in English from this point onward",
    tone: "info",
  },
  {
    title: "Project account module queued",
    meta: "Contract dates, effort balance, notifications",
    tone: "warning",
  },
] as const;

const roadmap = [
  {
    step: "01",
    title: "Shared app shell",
    description: "Sidebar, header, logout button, and reusable page structure.",
  },
  {
    step: "02",
    title: "Project account master",
    description: "Customer contracts, support period, man-day balance, and alert settings.",
  },
  {
    step: "03",
    title: "Issue logging workflow",
    description: "Local-first issue capture with future ServiceNow sync support.",
  },
  {
    step: "04",
    title: "Calendar and reporting",
    description: "Monthly board, effort rollups, visual summaries, and exports.",
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
      title="Operations Dashboard"
      description="Overview of support operations, contract coverage, effort visibility, and upcoming delivery milestones."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
                Internal ITMS Support Workspace
              </div>

              <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
                A single place for support issues, contracts, effort visibility, and team
                calendar planning.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                The core authentication foundation is already working. The next visual phase is
                to turn this into a full operational cockpit with project accounts, issue
                logging, effort reporting, and contract alerts.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                  Auth Ready
                </span>
                <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-200">
                  JSON Storage Ready
                </span>
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
                  UI Shell Active
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-slate-300">Current user</p>
                <p className="mt-3 text-lg font-semibold text-white">{session.email}</p>
                <p className="mt-1 text-sm text-slate-300">{session.fullName}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-slate-300">Current phase</p>
                <p className="mt-3 text-lg font-semibold text-white">Visual foundation</p>
                <p className="mt-1 text-sm text-slate-300">
                  Building the shared operational shell before the first business module.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickStats.map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.hint}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Core Modules</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  Product overview
                </h3>
              </div>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Preview
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {moduleCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-lg font-semibold text-slate-900">{card.title}</h4>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {card.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Latest status</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Recent activity
              </h3>

              <div className="mt-6 space-y-4">
                {recentActivities.map((activity) => (
                  <ActivityItem
                    key={activity.title}
                    title={activity.title}
                    meta={activity.meta}
                    tone={activity.tone}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Delivery plan</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Next milestones
              </h3>

              <div className="mt-6 space-y-5">
                {roadmap.map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                      {item.step}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ActivityItem({
  title,
  meta,
  tone,
}: {
  title: string;
  meta: string;
  tone: "success" | "warning" | "info";
}) {
  const dotClassName =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : "bg-sky-500";

  const badgeClassName =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-sky-200 bg-sky-50 text-sky-700";

  const badgeText = tone === "success" ? "Ready" : tone === "warning" ? "Next" : "Info";

  return (
    <div className="flex items-start gap-4 rounded-[22px] border border-slate-200 p-4">
      <div className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dotClassName}`} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${badgeClassName}`}
          >
            {badgeText}
          </span>
        </div>

        <p className="mt-1 text-sm leading-6 text-slate-600">{meta}</p>
      </div>
    </div>
  );
}