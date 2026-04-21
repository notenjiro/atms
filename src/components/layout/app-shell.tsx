"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  PlaneTakeoff,
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
};

const primaryNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Project Accounts", href: "/project-accounts", icon: FolderKanban },
  { label: "Leave", href: "/leave", icon: PlaneTakeoff },
  { label: "Timesheet", href: "/timesheet", icon: Clock3 },
  { label: "Issue Log", href: "/issue-log", icon: Ticket },
  { label: "Reports", href: "/report", icon: ScrollText },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
];

const secondaryNavigation: NavigationItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getTheme(pathname: string) {
  if (pathname === "/project-accounts" || pathname.startsWith("/project-accounts/")) {
    return {
      rootClassName: "theme-project-accounts",
      panelClassName: "glass-panel-project",
      chipClassName: "glass-chip-project",
      strongPanelClassName: "glass-panel-project",
      activeClassName: "glass-panel-project bg-white/58 text-slate-950 shadow-sm",
      hoverClassName: "hover:bg-white/34 hover:backdrop-blur-xl hover:text-slate-900",
      badgeClassName: "bg-violet-100/80 text-violet-700",
      contentClassName:
        "bg-[radial-gradient(circle_at_top_right,rgba(221,214,254,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(243,232,255,0.18),transparent_26%),linear-gradient(180deg,rgba(248,245,255,0.22),rgba(242,237,255,0.1))]",
      headerSolidClassName:
        "bg-violet-100/95 border-violet-200/80 backdrop-blur supports-[backdrop-filter]:bg-violet-100/85",
    };
  }

  if (pathname === "/leave" || pathname.startsWith("/leave/")) {
    return {
      rootClassName: "theme-leave",
      panelClassName: "glass-panel-leave",
      chipClassName: "glass-chip-leave",
      strongPanelClassName: "glass-panel-leave",
      activeClassName: "glass-panel-leave bg-white/58 text-slate-950 shadow-sm",
      hoverClassName: "hover:bg-white/34 hover:backdrop-blur-xl hover:text-slate-900",
      badgeClassName: "bg-orange-100/80 text-orange-700",
      contentClassName:
        "bg-[radial-gradient(circle_at_top_right,rgba(253,230,138,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(254,243,199,0.18),transparent_26%),linear-gradient(180deg,rgba(255,251,235,0.22),rgba(255,247,237,0.1))]",
      headerSolidClassName:
        "bg-orange-100/95 border-orange-200/80 backdrop-blur supports-[backdrop-filter]:bg-orange-100/85",
    };
  }

  if (pathname === "/timesheet" || pathname.startsWith("/timesheet/")) {
    return {
      rootClassName: "theme-timesheet",
      panelClassName: "glass-panel-timesheet",
      chipClassName: "glass-chip-timesheet",
      strongPanelClassName: "glass-panel-timesheet",
      activeClassName: "glass-panel-timesheet bg-white/58 text-slate-950 shadow-sm",
      hoverClassName: "hover:bg-white/34 hover:backdrop-blur-xl hover:text-slate-900",
      badgeClassName: "bg-emerald-100/80 text-emerald-700",
      contentClassName:
        "bg-[radial-gradient(circle_at_top_right,rgba(187,247,208,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(220,252,231,0.18),transparent_26%),linear-gradient(180deg,rgba(240,253,244,0.22),rgba(236,253,245,0.1))]",
      headerSolidClassName:
        "bg-emerald-100/95 border-emerald-200/80 backdrop-blur supports-[backdrop-filter]:bg-emerald-100/85",
    };
  }

  if (pathname === "/issue-log" || pathname.startsWith("/issue-log/")) {
    return {
      rootClassName: "theme-issue-log",
      panelClassName: "glass-panel-issue",
      chipClassName: "glass-chip-issue",
      strongPanelClassName: "glass-panel-issue",
      activeClassName: "glass-panel-issue bg-white/58 text-slate-950 shadow-sm",
      hoverClassName: "hover:bg-white/34 hover:backdrop-blur-xl hover:text-slate-900",
      badgeClassName: "bg-yellow-100/80 text-yellow-700",
      contentClassName:
        "bg-[radial-gradient(circle_at_top_right,rgba(254,240,138,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(254,249,195,0.18),transparent_26%),linear-gradient(180deg,rgba(254,252,232,0.22),rgba(254,249,195,0.1))]",
      headerSolidClassName:
        "bg-yellow-100/95 border-yellow-200/80 backdrop-blur supports-[backdrop-filter]:bg-yellow-100/85",
    };
  }

  if (pathname === "/report" || pathname.startsWith("/report/")) {
    return {
      rootClassName: "theme-report",
      panelClassName: "glass-panel-report",
      chipClassName: "glass-chip-report",
      strongPanelClassName: "glass-panel-report",
      activeClassName: "glass-panel-report bg-white/58 text-slate-950 shadow-sm",
      hoverClassName: "hover:bg-white/34 hover:backdrop-blur-xl hover:text-slate-900",
      badgeClassName: "bg-pink-100/80 text-pink-700",
      contentClassName:
        "bg-[radial-gradient(circle_at_top_right,rgba(251,207,232,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(252,231,243,0.18),transparent_26%),linear-gradient(180deg,rgba(253,242,248,0.22),rgba(252,231,243,0.1))]",
      headerSolidClassName:
        "bg-pink-100/95 border-pink-200/80 backdrop-blur supports-[backdrop-filter]:bg-pink-100/85",
    };
  }

  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) {
    return {
      rootClassName: "theme-calendar",
      panelClassName: "glass-panel-calendar",
      chipClassName: "glass-chip-calendar",
      strongPanelClassName: "glass-panel-calendar",
      activeClassName: "glass-panel-calendar bg-white/58 text-slate-950 shadow-sm",
      hoverClassName: "hover:bg-white/34 hover:backdrop-blur-xl hover:text-slate-900",
      badgeClassName: "bg-sky-100/80 text-sky-700",
      contentClassName:
        "bg-[radial-gradient(circle_at_top_right,rgba(191,219,254,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(224,242,254,0.18),transparent_26%),linear-gradient(180deg,rgba(239,246,255,0.22),rgba(224,242,254,0.1))]",
      headerSolidClassName:
        "bg-sky-100/95 border-sky-200/80 backdrop-blur supports-[backdrop-filter]:bg-sky-100/85",
    };
  }

  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return {
      rootClassName: "theme-notification",
      panelClassName: "glass-panel-notification",
      chipClassName: "glass-chip-notification",
      strongPanelClassName: "glass-panel-notification",
      activeClassName:
        "glass-panel-notification bg-white/58 text-slate-950 shadow-sm",
      hoverClassName: "hover:bg-white/34 hover:backdrop-blur-xl hover:text-slate-900",
      badgeClassName: "bg-red-100/80 text-red-700",
      contentClassName:
        "bg-[radial-gradient(circle_at_top_right,rgba(254,202,202,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(254,226,226,0.18),transparent_26%),linear-gradient(180deg,rgba(254,242,242,0.22),rgba(254,226,226,0.1))]",
      headerSolidClassName:
        "bg-red-100/95 border-red-200/80 backdrop-blur supports-[backdrop-filter]:bg-red-100/85",
    };
  }

  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return {
      rootClassName: "theme-settings",
      panelClassName: "glass-panel-settings",
      chipClassName: "glass-chip-settings",
      strongPanelClassName: "glass-panel-settings",
      activeClassName:
        "glass-panel-settings bg-white/58 text-slate-950 shadow-sm",
      hoverClassName: "hover:bg-white/34 hover:backdrop-blur-xl hover:text-slate-900",
      badgeClassName: "bg-orange-100/80 text-orange-700",
      contentClassName:
        "bg-[radial-gradient(circle_at_top_right,rgba(251,191,163,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(254,215,170,0.18),transparent_26%),linear-gradient(180deg,rgba(255,247,237,0.22),rgba(254,226,226,0.1))]",
      headerSolidClassName:
        "bg-orange-100/95 border-orange-200/80 backdrop-blur supports-[backdrop-filter]:bg-orange-100/85",
    };
  }

  return {
    rootClassName: "theme-dashboard",
    panelClassName: "glass-panel",
    chipClassName: "glass-chip",
    strongPanelClassName: "glass-panel-strong",
    activeClassName: "glass-panel bg-white/55 text-slate-950 shadow-sm",
    hoverClassName: "hover:bg-white/30 hover:backdrop-blur-xl hover:text-slate-900",
    badgeClassName: "bg-white/65 text-slate-700",
    contentClassName:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))]",
    headerSolidClassName:
      "bg-slate-100/95 border-slate-200/80 backdrop-blur supports-[backdrop-filter]:bg-slate-100/85",
  };
}

function SidebarContent({
  pathname,
  sidebarCollapsed,
  setSidebarOpen,
  setSidebarCollapsed,
  theme,
  initials,
  isLoggingOut,
  handleLogout,
}: {
  pathname: string;
  sidebarCollapsed: boolean;
  setSidebarOpen: (value: boolean) => void;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  theme: ReturnType<typeof getTheme>;
  initials: string;
  isLoggingOut: boolean;
  handleLogout: () => Promise<void>;
}) {
  return (
    <>
      <div className="relative z-10 flex h-20 items-center gap-3 border-b border-white/40 px-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold tracking-[0.2em] text-slate-900",
            theme.chipClassName,
          )}
        >
          {initials}
        </div>

        {!sidebarCollapsed ? (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              ATMS Support
            </p>
            <p className="mt-1 truncate text-sm text-slate-600">
              Internal workspace
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setSidebarCollapsed((current) => !current)}
          className="ml-auto hidden rounded-xl border border-white/45 bg-white/30 p-2 text-slate-600 transition hover:bg-white/50 hover:text-slate-900 lg:inline-flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-3 py-5">
        <nav className="space-y-6">
          <div>
            {!sidebarCollapsed ? (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Workspace
              </p>
            ) : null}

            <div className="mt-2 space-y-1.5">
              {primaryNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = isNavItemActive(pathname, item.href);

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                      isActive
                        ? theme.activeClassName
                        : cn("text-slate-600", theme.hoverClassName),
                      sidebarCollapsed && "justify-center px-2",
                    )}
                    title={item.label}
                  >
                    <Icon
                      className={cn(
                        "size-5 shrink-0",
                        isActive
                          ? "text-slate-950"
                          : "text-slate-500 group-hover:text-slate-900",
                      )}
                    />

                    {!sidebarCollapsed ? (
                      <>
                        <span className="truncate">{item.label}</span>
                        <span
                          className={cn(
                            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            isActive ? theme.badgeClassName : "bg-white/35 text-slate-600",
                          )}
                        >
                          BETA
                        </span>
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

            <div className="mt-2 space-y-1.5">
              {secondaryNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = isNavItemActive(pathname, item.href);

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                      isActive
                        ? theme.activeClassName
                        : cn("text-slate-600", theme.hoverClassName),
                      sidebarCollapsed && "justify-center px-2",
                    )}
                    title={item.label}
                  >
                    <Icon
                      className={cn(
                        "size-5 shrink-0",
                        isActive
                          ? "text-slate-950"
                          : "text-slate-500 group-hover:text-slate-900",
                      )}
                    />

                    {!sidebarCollapsed ? (
                      <>
                        <span className="truncate">{item.label}</span>
                        <span
                          className={cn(
                            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            isActive ? theme.badgeClassName : "bg-white/35 text-slate-600",
                          )}
                        >
                          BETA
                        </span>
                      </>
                    ) : null}
                  </a>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      <div className="relative z-10 p-3">
        <div className={cn("rounded-[28px] p-1", theme.panelClassName)}>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "w-full justify-center rounded-2xl border border-white/45 bg-white/38 text-slate-900 shadow-sm hover:bg-white/56",
              sidebarCollapsed && "px-0",
            )}
          >
            <LogOut className="size-4" />
            {!sidebarCollapsed ? (
              <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
            ) : null}
          </Button>
        </div>
      </div>
    </>
  );
}

function SidebarShell({
  children,
  theme,
}: {
  children: ReactNode;
  theme: ReturnType<typeof getTheme>;
}) {
  return (
    <div className="relative isolate flex h-full flex-col overflow-hidden">
      <div className={cn("absolute inset-0", theme.strongPanelClassName)} />
      <div className="absolute inset-0 bg-white/82" />
      <div className="absolute inset-0 backdrop-blur-[18px]" />
      {children}
    </div>
  );
}

export function AppShell({
  fullName,
  email,
  role,
  title,
  description,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const theme = getTheme(pathname);

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
    <div className={cn("relative min-h-screen text-slate-900", theme.rootClassName)}>
      <div className={cn("fixed inset-0 -z-10", theme.contentClassName)} />

      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/12 backdrop-blur-sm transition lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen items-stretch">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 h-screen border-r border-white/45 transition-all duration-300 lg:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            sidebarCollapsed ? "w-[92px]" : "w-[280px]",
          )}
        >
          <SidebarShell theme={theme}>
            <SidebarContent
              pathname={pathname}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarOpen={setSidebarOpen}
              setSidebarCollapsed={setSidebarCollapsed}
              theme={theme}
              initials={initials}
              isLoggingOut={isLoggingOut}
              handleLogout={handleLogout}
            />
          </SidebarShell>
        </aside>

        <aside
          className={cn(
            "hidden shrink-0 border-r border-white/45 lg:block",
            sidebarCollapsed ? "w-[92px]" : "w-[280px]",
          )}
        >
          <div className="sticky top-0 h-screen">
            <SidebarShell theme={theme}>
              <SidebarContent
                pathname={pathname}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarOpen={setSidebarOpen}
                setSidebarCollapsed={setSidebarCollapsed}
                theme={theme}
                initials={initials}
                isLoggingOut={isLoggingOut}
                handleLogout={handleLogout}
              />
            </SidebarShell>
          </div>
        </aside>

        <div className="relative min-w-0 flex-1">
          <header
            className={cn(
              "sticky top-0 z-30 border-b",
              theme.headerSolidClassName,
            )}
          >
            <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex rounded-2xl border border-white/40 bg-white/50 p-2.5 text-slate-700 shadow-sm transition hover:bg-white/70 lg:hidden"
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
                <div className={cn("rounded-2xl px-4 py-2 text-right", theme.chipClassName)}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Signed in as
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {fullName}
                  </p>
                </div>

                <div className={cn("rounded-2xl px-4 py-2", theme.chipClassName)}>
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

          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}