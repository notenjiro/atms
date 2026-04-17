import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock3, FolderKanban, ReceiptText } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getSession } from "@/modules/auth/auth.session";

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-950">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default async function TimesheetPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      title="Timesheet"
      description="Prepare the next operational module for daily effort tracking and future project linkage."
    >
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Next module
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Timesheet workspace
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            This route is now live in navigation and ready for the next build
            phase. The next step is to define the timesheet domain, reference
            dimensions, and the first entry screen.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/leave">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200"
              >
                Back to Leave
              </Button>
            </Link>
            <Button
              type="button"
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              disabled
            >
              Start timesheet form
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <FeatureCard
            title="Daily entries"
            description="Capture date, effort, task description, and future work classification in a clean daily input flow."
            icon={<Clock3 className="size-5" />}
          />
          <FeatureCard
            title="Project linkage"
            description="Optionally connect time entries to project accounts once the first operational version is stable."
            icon={<FolderKanban className="size-5" />}
          />
          <FeatureCard
            title="Monthly reporting"
            description="Prepare the data shape for downstream reporting, summaries, and export after the entry flow is confirmed."
            icon={<ReceiptText className="size-5" />}
          />
        </section>
      </div>
    </AppShell>
  );
}