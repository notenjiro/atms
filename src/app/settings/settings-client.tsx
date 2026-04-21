"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Users,
  CalendarDays,
  Clock3,
  Save,
  ShieldAlert,
  Bell,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

type SettingsShape = {
  general: {
    workspaceName: string;
    timeZone: string;
    workHoursPerDay: number;
    dateFormat: string;
  };
  users: {
    defaultRole: string;
    leadRole: string;
  };
  leave: {
    annual: number;
    sick: number;
    requireApproval: boolean;
  };
  timesheet: {
    hoursPerDay: number;
    allowWeekend: boolean;
    lockAfterDays: number;
  };
  issue: {
    requireOwnerToStartProgress: boolean;
    requireOwnerToResolve: boolean;
    allowReopenClosed: boolean;
    slaHoursLow: number;
    slaHoursMedium: number;
    slaHoursHigh: number;
    slaHoursCritical: number;
  };
  reports: {
    showIssueMetrics: boolean;
    showLeaveMetrics: boolean;
    showTimesheetMetrics: boolean;
    maxRecentMonths: number;
  };
  calendar: {
    showPendingLeave: boolean;
    allowEmployeeTeamCalendarView: boolean;
    upcomingDays: number;
  };
  notifications: {
    enableIssueAlerts: boolean;
    enableLeaveAlerts: boolean;
    criticalIssuesOnly: boolean;
    maxItems: number;
  };
};

const defaultSettings: SettingsShape = {
  general: {
    workspaceName: "ATMS Support",
    timeZone: "Asia/Bangkok",
    workHoursPerDay: 8,
    dateFormat: "DD/MM/YYYY",
  },
  users: {
    defaultRole: "staff",
    leadRole: "lead",
  },
  leave: {
    annual: 10,
    sick: 30,
    requireApproval: true,
  },
  timesheet: {
    hoursPerDay: 8,
    allowWeekend: false,
    lockAfterDays: 3,
  },
  issue: {
    requireOwnerToStartProgress: true,
    requireOwnerToResolve: true,
    allowReopenClosed: true,
    slaHoursLow: 72,
    slaHoursMedium: 24,
    slaHoursHigh: 8,
    slaHoursCritical: 4,
  },
  reports: {
    showIssueMetrics: true,
    showLeaveMetrics: true,
    showTimesheetMetrics: true,
    maxRecentMonths: 6,
  },
  calendar: {
    showPendingLeave: true,
    allowEmployeeTeamCalendarView: false,
    upcomingDays: 30,
  },
  notifications: {
    enableIssueAlerts: true,
    enableLeaveAlerts: true,
    criticalIssuesOnly: false,
    maxItems: 20,
  },
};

function normalizeSettings(data: any): SettingsShape {
  return {
    general: {
      ...defaultSettings.general,
      ...(data?.general || {}),
    },
    users: {
      ...defaultSettings.users,
      ...(data?.users || {}),
    },
    leave: {
      ...defaultSettings.leave,
      ...(data?.leave || {}),
    },
    timesheet: {
      ...defaultSettings.timesheet,
      ...(data?.timesheet || {}),
    },
    issue: {
      ...defaultSettings.issue,
      ...(data?.issue || {}),
    },
    reports: {
      ...defaultSettings.reports,
      ...(data?.reports || {}),
    },
    calendar: {
      ...defaultSettings.calendar,
      ...(data?.calendar || {}),
    },
    notifications: {
      ...defaultSettings.notifications,
      ...(data?.notifications || {}),
    },
  };
}

function TabButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "glass-panel-settings bg-white/60 text-slate-900"
          : "text-slate-600 hover:bg-white/30"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel-settings rounded-2xl p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
      />
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 px-3 py-3 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 rounded border-slate-300"
      />
      <span>{label}</span>
    </label>
  );
}

export default function SettingsClient() {
  const [tab, setTab] = useState<
    | "general"
    | "users"
    | "leave"
    | "timesheet"
    | "issue"
    | "reports"
    | "calendar"
    | "notifications"
  >("general");
  const [settings, setSettings] = useState<SettingsShape>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/settings")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setSettings(normalizeSettings(data));
      })
      .catch((error) => {
        console.error(error);
        if (!isMounted) {
          return;
        }
        setSettings(defaultSettings);
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    try {
      setSaving(true);

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      const data = await response.json();
      setSettings(normalizeSettings(data?.settings));
      toast.success("Settings saved successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="glass-panel-settings rounded-xl p-6 text-sm text-slate-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel-settings rounded-[28px] p-6 flex justify-between items-start gap-4">
        <div>
          <div className="glass-chip-settings inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-700">
            Settings
          </div>

          <h2 className="mt-4 text-3xl font-semibold text-slate-900">
            System configuration
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Configure system behavior, policies, and workflows.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          <Save className="size-4" />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton
          label="General"
          icon={<Settings className="size-4" />}
          active={tab === "general"}
          onClick={() => setTab("general")}
        />
        <TabButton
          label="Users & Roles"
          icon={<Users className="size-4" />}
          active={tab === "users"}
          onClick={() => setTab("users")}
        />
        <TabButton
          label="Leave"
          icon={<CalendarDays className="size-4" />}
          active={tab === "leave"}
          onClick={() => setTab("leave")}
        />
        <TabButton
          label="Timesheet"
          icon={<Clock3 className="size-4" />}
          active={tab === "timesheet"}
          onClick={() => setTab("timesheet")}
        />
        <TabButton
          label="Issue Log"
          icon={<ShieldAlert className="size-4" />}
          active={tab === "issue"}
          onClick={() => setTab("issue")}
        />
        <TabButton
          label="Calendar"
          icon={<CalendarDays className="size-4" />}
          active={tab === "calendar"}
          onClick={() => setTab("calendar")}
        />
        <TabButton
          label="Reports"
          icon={<BarChart3 className="size-4" />}
          active={tab === "reports"}
          onClick={() => setTab("reports")}
        />
        <TabButton
          label="Notifications"
          icon={<Bell className="size-4" />}
          active={tab === "notifications"}
          onClick={() => setTab("notifications")}
        />
      </div>

      {tab === "general" && (
        <Section title="General">
          <Input
            label="Workspace Name"
            value={settings.general.workspaceName}
            onChange={(e) =>
              setSettings({
                ...settings,
                general: {
                  ...settings.general,
                  workspaceName: e.target.value,
                },
              })
            }
          />
          <Input
            label="Time Zone"
            value={settings.general.timeZone}
            onChange={(e) =>
              setSettings({
                ...settings,
                general: {
                  ...settings.general,
                  timeZone: e.target.value,
                },
              })
            }
          />
          <Input
            label="Work Hours / Day"
            type="number"
            value={settings.general.workHoursPerDay}
            onChange={(e) =>
              setSettings({
                ...settings,
                general: {
                  ...settings.general,
                  workHoursPerDay: Number(e.target.value),
                },
              })
            }
          />
          <Input
            label="Date Format"
            value={settings.general.dateFormat}
            onChange={(e) =>
              setSettings({
                ...settings,
                general: {
                  ...settings.general,
                  dateFormat: e.target.value,
                },
              })
            }
          />
        </Section>
      )}

      {tab === "users" && (
        <Section title="Users & Roles">
          <Input
            label="Default Role"
            value={settings.users.defaultRole}
            onChange={(e) =>
              setSettings({
                ...settings,
                users: {
                  ...settings.users,
                  defaultRole: e.target.value,
                },
              })
            }
          />
          <Input
            label="Lead Role"
            value={settings.users.leadRole}
            onChange={(e) =>
              setSettings({
                ...settings,
                users: {
                  ...settings.users,
                  leadRole: e.target.value,
                },
              })
            }
          />
        </Section>
      )}

      {tab === "leave" && (
        <Section title="Leave">
          <Input
            label="Annual Leave"
            type="number"
            value={settings.leave.annual}
            onChange={(e) =>
              setSettings({
                ...settings,
                leave: {
                  ...settings.leave,
                  annual: Number(e.target.value),
                },
              })
            }
          />
          <Input
            label="Sick Leave"
            type="number"
            value={settings.leave.sick}
            onChange={(e) =>
              setSettings({
                ...settings,
                leave: {
                  ...settings.leave,
                  sick: Number(e.target.value),
                },
              })
            }
          />
          <Checkbox
            label="Require Approval"
            checked={settings.leave.requireApproval}
            onChange={(e) =>
              setSettings({
                ...settings,
                leave: {
                  ...settings.leave,
                  requireApproval: e.target.checked,
                },
              })
            }
          />
        </Section>
      )}

      {tab === "timesheet" && (
        <Section title="Timesheet">
          <Input
            label="Hours / Day"
            type="number"
            value={settings.timesheet.hoursPerDay}
            onChange={(e) =>
              setSettings({
                ...settings,
                timesheet: {
                  ...settings.timesheet,
                  hoursPerDay: Number(e.target.value),
                },
              })
            }
          />
          <Input
            label="Lock After Days"
            type="number"
            value={settings.timesheet.lockAfterDays}
            onChange={(e) =>
              setSettings({
                ...settings,
                timesheet: {
                  ...settings.timesheet,
                  lockAfterDays: Number(e.target.value),
                },
              })
            }
          />
          <Checkbox
            label="Allow Weekend Entry"
            checked={settings.timesheet.allowWeekend}
            onChange={(e) =>
              setSettings({
                ...settings,
                timesheet: {
                  ...settings.timesheet,
                  allowWeekend: e.target.checked,
                },
              })
            }
          />
        </Section>
      )}

      {tab === "issue" && (
        <Section title="Issue Log">
          <Checkbox
            label="Require owner before moving to In Progress"
            checked={settings.issue.requireOwnerToStartProgress}
            onChange={(e) =>
              setSettings({
                ...settings,
                issue: {
                  ...settings.issue,
                  requireOwnerToStartProgress: e.target.checked,
                },
              })
            }
          />
          <Checkbox
            label="Require owner before Resolve / Close"
            checked={settings.issue.requireOwnerToResolve}
            onChange={(e) =>
              setSettings({
                ...settings,
                issue: {
                  ...settings.issue,
                  requireOwnerToResolve: e.target.checked,
                },
              })
            }
          />
          <Checkbox
            label="Allow reopen from Closed / Cancelled"
            checked={settings.issue.allowReopenClosed}
            onChange={(e) =>
              setSettings({
                ...settings,
                issue: {
                  ...settings.issue,
                  allowReopenClosed: e.target.checked,
                },
              })
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="SLA Hours - Low"
              type="number"
              value={settings.issue.slaHoursLow}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  issue: {
                    ...settings.issue,
                    slaHoursLow: Number(e.target.value),
                  },
                })
              }
            />
            <Input
              label="SLA Hours - Medium"
              type="number"
              value={settings.issue.slaHoursMedium}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  issue: {
                    ...settings.issue,
                    slaHoursMedium: Number(e.target.value),
                  },
                })
              }
            />
            <Input
              label="SLA Hours - High"
              type="number"
              value={settings.issue.slaHoursHigh}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  issue: {
                    ...settings.issue,
                    slaHoursHigh: Number(e.target.value),
                  },
                })
              }
            />
            <Input
              label="SLA Hours - Critical"
              type="number"
              value={settings.issue.slaHoursCritical}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  issue: {
                    ...settings.issue,
                    slaHoursCritical: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        </Section>
      )}

      {tab === "reports" && (
        <Section title="Reports">
          <Checkbox
            label="Show issue metrics"
            checked={settings.reports.showIssueMetrics}
            onChange={(e) =>
              setSettings({
                ...settings,
                reports: {
                  ...settings.reports,
                  showIssueMetrics: e.target.checked,
                },
              })
            }
          />
          <Checkbox
            label="Show leave metrics"
            checked={settings.reports.showLeaveMetrics}
            onChange={(e) =>
              setSettings({
                ...settings,
                reports: {
                  ...settings.reports,
                  showLeaveMetrics: e.target.checked,
                },
              })
            }
          />
          <Checkbox
            label="Show timesheet metrics"
            checked={settings.reports.showTimesheetMetrics}
            onChange={(e) =>
              setSettings({
                ...settings,
                reports: {
                  ...settings.reports,
                  showTimesheetMetrics: e.target.checked,
                },
              })
            }
          />
          <Input
            label="Recent months window"
            type="number"
            value={settings.reports.maxRecentMonths}
            onChange={(e) =>
              setSettings({
                ...settings,
                reports: {
                  ...settings.reports,
                  maxRecentMonths: Number(e.target.value),
                },
              })
            }
          />
        </Section>
      )}

      {tab === "calendar" && (
        <Section title="Calendar">
          <Checkbox
            label="Show pending leave in calendar visibility"
            checked={settings.calendar.showPendingLeave}
            onChange={(e) =>
              setSettings({
                ...settings,
                calendar: {
                  ...settings.calendar,
                  showPendingLeave: e.target.checked,
                },
              })
            }
          />
          <Checkbox
            label="Allow employees to view full team calendar"
            checked={settings.calendar.allowEmployeeTeamCalendarView}
            onChange={(e) =>
              setSettings({
                ...settings,
                calendar: {
                  ...settings.calendar,
                  allowEmployeeTeamCalendarView: e.target.checked,
                },
              })
            }
          />
          <Input
            label="Upcoming window (days)"
            type="number"
            value={settings.calendar.upcomingDays}
            onChange={(e) =>
              setSettings({
                ...settings,
                calendar: {
                  ...settings.calendar,
                  upcomingDays: Number(e.target.value),
                },
              })
            }
          />
        </Section>
      )}

      {tab === "notifications" && (
        <Section title="Notifications">
          <Checkbox
            label="Enable issue alerts"
            checked={settings.notifications.enableIssueAlerts}
            onChange={(e) =>
              setSettings({
                ...settings,
                notifications: {
                  ...settings.notifications,
                  enableIssueAlerts: e.target.checked,
                },
              })
            }
          />
          <Checkbox
            label="Enable leave alerts"
            checked={settings.notifications.enableLeaveAlerts}
            onChange={(e) =>
              setSettings({
                ...settings,
                notifications: {
                  ...settings.notifications,
                  enableLeaveAlerts: e.target.checked,
                },
              })
            }
          />
          <Checkbox
            label="Show critical issues only"
            checked={settings.notifications.criticalIssuesOnly}
            onChange={(e) =>
              setSettings({
                ...settings,
                notifications: {
                  ...settings.notifications,
                  criticalIssuesOnly: e.target.checked,
                },
              })
            }
          />
          <Input
            label="Maximum items on Notifications page"
            type="number"
            value={settings.notifications.maxItems}
            onChange={(e) =>
              setSettings({
                ...settings,
                notifications: {
                  ...settings.notifications,
                  maxItems: Number(e.target.value),
                },
              })
            }
          />
        </Section>
      )}
    </div>
  );
}