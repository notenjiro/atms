"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Ticket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppShellProps = {
  fullName: string;
  email: string;
  role: string;
  title: string;
  description?: string;
  children: ReactNode;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  active?: boolean;
  disabled?: boolean;
};

const primaryNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "Project Accounts",
    href: "#",
    icon: FolderKanban,
    badge: "Next",
    disabled: true,
  },
  {
    label: "Issue Log",
    href: "#",
    icon: Ticket,
    badge: "Planned",
    disabled: true,
  },
  {
    label: "Reports",
    href: "#",
    icon: ScrollText,
    disabled: true,
  },
  {
    label: "Calendar",
    href: "#",
    icon: CalendarDays,
    disabled: true,
  },
];

const secondaryNavigation: NavigationItem[] = [
  {
    label: "Notifications",
    href: "#",
    icon: Bell,
    disabled: true,
  },
  {
    label: "Settings",
    href: "#",
    icon: Settings,
    disabled: true,
  },
];

export function AppShell({
  fullName,
  email,
  role,
  title,
  description,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = useMemo(() => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return "AT";
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [fullName]);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout request failed");
      }

      window.location.href = "/login";
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-slate-200 bg-slate-950 text-slate-100 shadow-2xl transition-all duration-300",
          sidebarCollapsed ? "w-[92px]" : "w-[280px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold tracking-[0.2em] text-white">
            AT
          </div>

          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                ATMS Support
              </p>
              <p className="mt-1 truncate text-sm text-slate-300">
                Internal workspace
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            className="ml-auto hidden rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:inline-flex"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-900">
                {initials}
              </div>

              {!sidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {fullName}
                  </p>
                  <p className="truncate text-xs text-slate-400">{email}</p>
                </div>
              ) : null}
            </div>

            {!sidebarCollapsed ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Role
                </p>
                <p className="mt-1 text-sm font-medium capitalize text-slate-100">
                  {role}
                </p>
              </div>
            ) : null}
          </div>

          <nav className="mt-6 space-y-6">
            <div>
              {!sidebarCollapsed ? (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Workspace
                </p>
              ) : null}

              <div className="mt-2 space-y-1">
                {primaryNavigation.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      aria-disabled={item.disabled}
                      onClick={(event) => {
                        if (item.disabled) {
                          event.preventDefault();
                        }

                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                        item.active
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-300 hover:bg-white/10 hover:text-white",
                        item.disabled && "cursor-not-allowed opacity-70",
                        sidebarCollapsed && "justify-center px-2",
                      )}
                      title={item.label}
                    >
                      <Icon
                        className={cn(
                          "size-5 shrink-0",
                          item.active
                            ? "text-slate-950"
                            : "text-slate-400 group-hover:text-white",
                        )}
                      />

                      {!sidebarCollapsed ? (
                        <>
                          <span className="truncate">{item.label}</span>

                          {item.badge ? (
                            <span
                              className={cn(
                                "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                item.active
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-white/10 text-slate-300",
                              )}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            </div>

            <div>
              {!sidebarCollapsed ? (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  System
                </p>
              ) : null}

              <div className="mt-2 space-y-1">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      aria-disabled={item.disabled}
                      onClick={(event) => {
                        if (item.disabled) {
                          event.preventDefault();
                        }

                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white",
                        item.disabled && "cursor-not-allowed opacity-70",
                        sidebarCollapsed && "justify-center px-2",
                      )}
                      title={item.label}
                    >
                      <Icon className="size-5 shrink-0 text-slate-400 group-hover:text-white" />

                      {!sidebarCollapsed ? (
                        <span className="truncate">{item.label}</span>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        <div className="border-t border-white/10 p-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "w-full justify-center rounded-2xl border border-white/10 bg-white text-slate-950 hover:bg-slate-100",
              sidebarCollapsed && "px-0",
            )}
          >
            <LogOut className="size-4" />
            {!sidebarCollapsed ? (
              <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
            ) : null}
          </Button>
        </div>
      </aside>

      <div
        className={cn(
          "min-h-screen transition-all duration-300",
          sidebarCollapsed ? "lg:pl-[92px]" : "lg:pl-[280px]",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  ATMS Support
                </p>
                <h1 className="truncate text-xl font-semibold text-slate-950">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Signed in as
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {fullName}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Role
                </p>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                  {role}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}