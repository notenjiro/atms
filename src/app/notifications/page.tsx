import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import {
  Bell,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Ticket,
  CalendarDays,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/modules/auth/auth.session";
import { getLeaveBootstrapService } from "@/modules/leave/leave.service";

type LooseIssue = {
  id: string;
  issueNo?: string;
  title?: string;
  openedAt?: string;
  status?: string;
  priority?: string;
};

type NotificationItem = {
  id: string;
  type: "issue" | "leave";
  title: string;
  description: string;
  createdAt: string;
  status?: string;
  priority?: string;
};

function readIssuesSafely(): LooseIssue[] {
  try {
    const filePath = path.join(process.cwd(), "data", "issues.json");

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw || "{}");

    if (Array.isArray(json)) {
      return json;
    }

    if (Array.isArray(json?.items)) {
      return json.items;
    }

    if (Array.isArray(json?.data?.items)) {
      return json.data.items;
    }

    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-panel-notification rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-red-700">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
        </div>

        <div className="glass-chip-notification rounded-2xl p-2 text-red-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function NotificationCard({ item }: { item: NotificationItem }) {
  return (
    <div className="glass-panel-notification rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="glass-chip-notification rounded-xl p-2 text-red-700">
          {item.type === "issue" ? (
            <Ticket className="size-4" />
          ) : (
            <CalendarDays className="size-4" />
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          <p className="mt-1 text-sm text-slate-600">{item.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{new Date(item.createdAt).toLocaleString()}</span>

            {item.status ? (
              <span className="rounded-full bg-white/50 px-2 py-0.5">
                {item.status}
              </span>
            ) : null}

            {item.priority ? (
              <span className="rounded-full bg-white/50 px-2 py-0.5">
                {item.priority}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const issues = readIssuesSafely();

  const { requests } = await getLeaveBootstrapService();

  const issueNotifications: NotificationItem[] = issues
    .filter((i) => ["open", "in_progress", "pending"].includes(i.status ?? ""))
    .map((i) => ({
      id: i.id,
      type: "issue",
      title: `Issue ${i.issueNo || "-"}`,
      description: i.title || "Issue requires attention",
      createdAt: i.openedAt || new Date().toISOString(),
      status: i.status,
      priority: i.priority,
    }));

  const leaveNotifications: NotificationItem[] = requests
    .filter((r) => r.status === "pending")
    .map((r) => ({
      id: r.id,
      type: "leave",
      title: "Leave Request",
      description: `${r.employeeName} requested leave`,
      createdAt: r.createdAt,
      status: r.status,
    }));

  const allNotifications = [...issueNotifications, ...leaveNotifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const criticalIssues = issues.filter((i) => i.priority === "critical").length;
  const pendingLeaves = requests.filter((r) => r.status === "pending").length;

  const today = new Date().toDateString();
  const resolvedToday = issues.filter(
    (i) =>
      i.status === "resolved" &&
      i.openedAt &&
      new Date(i.openedAt).toDateString() === today,
  ).length;

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      title="Notifications"
      description="Real-time signals from issues and leave workflows."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Alerts"
            value={allNotifications.length}
            hint="Combined issue and leave notifications"
            icon={<Bell className="size-5" />}
          />
          <StatCard
            title="Critical Issues"
            value={criticalIssues}
            hint="High priority requiring attention"
            icon={<AlertTriangle className="size-5" />}
          />
          <StatCard
            title="Pending Leave"
            value={pendingLeaves}
            hint="Awaiting approval"
            icon={<Clock3 className="size-5" />}
          />
          <StatCard
            title="Resolved Today"
            value={resolvedToday}
            hint="Recently completed work"
            icon={<CheckCircle2 className="size-5" />}
          />
        </section>

        <section className="space-y-3">
          {allNotifications.length === 0 ? (
            <div className="glass-panel-notification rounded-2xl p-6 text-center text-sm text-slate-500">
              No notifications available
            </div>
          ) : (
            allNotifications.map((item) => (
              <NotificationCard key={item.id} item={item} />
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}