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
  Filter,
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

type NotificationSettings = {
  enableIssueAlerts: boolean;
  enableLeaveAlerts: boolean;
  criticalIssuesOnly: boolean;
  maxItems: number;
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

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enableIssueAlerts: true,
  enableLeaveAlerts: true,
  criticalIssuesOnly: false,
  maxItems: 20,
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

function readNotificationSettings(): NotificationSettings {
  try {
    const filePath = path.join(process.cwd(), "data", "settings.json");

    if (!fs.existsSync(filePath)) {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw || "{}");
    const notifications =
      typeof json?.notifications === "object" && json.notifications !== null
        ? json.notifications
        : {};

    const maxItems =
      typeof notifications.maxItems === "number" &&
      Number.isFinite(notifications.maxItems) &&
      notifications.maxItems > 0
        ? Math.floor(notifications.maxItems)
        : DEFAULT_NOTIFICATION_SETTINGS.maxItems;

    return {
      enableIssueAlerts:
        typeof notifications.enableIssueAlerts === "boolean"
          ? notifications.enableIssueAlerts
          : DEFAULT_NOTIFICATION_SETTINGS.enableIssueAlerts,
      enableLeaveAlerts:
        typeof notifications.enableLeaveAlerts === "boolean"
          ? notifications.enableLeaveAlerts
          : DEFAULT_NOTIFICATION_SETTINGS.enableLeaveAlerts,
      criticalIssuesOnly:
        typeof notifications.criticalIssuesOnly === "boolean"
          ? notifications.criticalIssuesOnly
          : DEFAULT_NOTIFICATION_SETTINGS.criticalIssuesOnly,
      maxItems,
    };
  } catch (error) {
    console.error(error);
    return DEFAULT_NOTIFICATION_SETTINGS;
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

function PolicyCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-panel-notification rounded-2xl border border-red-200/70 bg-white/72 p-4">
      <div className="flex items-start gap-3">
        <div className="glass-chip-notification rounded-xl p-2 text-red-700">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-700">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{hint}</p>
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

  const settings = readNotificationSettings();
  const issues = readIssuesSafely();
  const { requests } = await getLeaveBootstrapService();

  const filteredIssues = settings.enableIssueAlerts
    ? issues
        .filter((i) => ["open", "in_progress", "pending"].includes(i.status ?? ""))
        .filter((i) =>
          settings.criticalIssuesOnly ? i.priority === "critical" : true,
        )
    : [];

  const issueNotifications: NotificationItem[] = filteredIssues.map((i) => ({
    id: i.id,
    type: "issue",
    title: `Issue ${i.issueNo || "-"}`,
    description: i.title || "Issue requires attention",
    createdAt: i.openedAt || new Date().toISOString(),
    status: i.status,
    priority: i.priority,
  }));

  const filteredLeaveRequests = settings.enableLeaveAlerts
    ? requests.filter((r) => r.status === "pending")
    : [];

  const leaveNotifications: NotificationItem[] = filteredLeaveRequests.map((r) => ({
    id: r.id,
    type: "leave",
    title: "Leave Request",
    description: `${r.employeeName} requested leave`,
    createdAt: r.createdAt,
    status: r.status,
  }));

  const allNotifications = [...issueNotifications, ...leaveNotifications]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, settings.maxItems);

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
        <section className="glass-panel-notification rounded-[28px] border border-red-200/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Active policy</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-red-900">
                Notification rules in effect
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-red-800">
                These values come directly from Settings and now decide what
                appears in the Notifications stream.
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-white/72 px-4 py-3 text-sm text-red-800">
              Change notification rules from the Settings page.
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <PolicyCard
              title="Issue alerts"
              value={settings.enableIssueAlerts ? "Enabled" : "Disabled"}
              hint="Controls whether issue-based alerts appear in the stream."
              icon={<Ticket className="size-4" />}
            />
            <PolicyCard
              title="Leave alerts"
              value={settings.enableLeaveAlerts ? "Enabled" : "Disabled"}
              hint="Controls whether pending leave requests appear in the stream."
              icon={<CalendarDays className="size-4" />}
            />
            <PolicyCard
              title="Issue filter"
              value={settings.criticalIssuesOnly ? "Critical only" : "All active priorities"}
              hint="Controls whether notifications include only critical issues or all active issues."
              icon={<Filter className="size-4" />}
            />
            <PolicyCard
              title="Maximum items"
              value={`${settings.maxItems} item${settings.maxItems === 1 ? "" : "s"}`}
              hint="Controls how many notifications are shown on this page."
              icon={<Bell className="size-4" />}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Alerts"
            value={allNotifications.length}
            hint="Visible after current notification filters"
            icon={<Bell className="size-5" />}
          />
          <StatCard
            title="Critical Issues"
            value={criticalIssues}
            hint="Critical issues in the issue store"
            icon={<AlertTriangle className="size-5" />}
          />
          <StatCard
            title="Pending Leave"
            value={pendingLeaves}
            hint="Pending leave requests in the leave store"
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
              No notifications available for the current settings.
            </div>
          ) : (
            allNotifications.map((item) => (
              <NotificationCard key={`${item.type}-${item.id}`} item={item} />
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}