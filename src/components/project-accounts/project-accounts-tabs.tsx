"use client";

import { useMemo, useState } from "react";

import { ProjectAccountsTable } from "@/components/project-accounts/project-accounts-table";
import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

type ProjectAccountsTabsProps = {
  activeItems: ProjectAccount[];
  archivedItems: ProjectAccount[];
};

type ProjectAccountsTabKey = string;

function normalizeStatusLabel(item: ProjectAccount): string {
  const kawariStatus = item.projectStatus?.trim();
  if (kawariStatus) {
    return kawariStatus;
  }

  const systemStatus = item.status?.trim();
  if (systemStatus) {
    return systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1);
  }

  return "Unknown";
}

function getStatusSortWeight(status: string): number {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case "all":
      return 0;
    case "pre-sale":
    case "presale":
      return 1;
    case "implementing":
      return 2;
    case "done":
      return 3;
    case "active":
      return 4;
    case "inactive":
      return 5;
    default:
      return 100;
  }
}

export function ProjectAccountsTabs({
  activeItems,
  archivedItems,
}: ProjectAccountsTabsProps) {
  const allItems = useMemo(
    () => [...activeItems, ...archivedItems],
    [activeItems, archivedItems],
  );

  const tabs = useMemo(() => {
    const statusMap = new Map<string, ProjectAccount[]>();

    for (const item of allItems) {
      const label = normalizeStatusLabel(item);

      if (!statusMap.has(label)) {
        statusMap.set(label, []);
      }

      statusMap.get(label)!.push(item);
    }

    const dynamicTabs = [...statusMap.entries()]
      .sort(([a], [b]) => {
        const weightDiff = getStatusSortWeight(a) - getStatusSortWeight(b);

        if (weightDiff !== 0) {
          return weightDiff;
        }

        return a.localeCompare(b);
      })
      .map(([label, items]) => ({
        key: label,
        label,
        items,
      }));

    return [
      {
        key: "All",
        label: "All",
        items: allItems,
      },
      ...dynamicTabs,
    ];
  }, [allItems]);

  const [activeTab, setActiveTab] = useState<ProjectAccountsTabKey>("All");

  const currentTab =
    tabs.find((tab) => tab.key === activeTab) ??
    tabs[0] ?? {
      key: "All",
      label: "All",
      items: [],
    };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "inline-flex items-center rounded-2xl border px-4 py-2 text-sm font-medium transition",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {tab.label}
              <span
                className={[
                  "ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {tab.items.length}
              </span>
            </button>
          );
        })}
      </div>

      <ProjectAccountsTable
        title={`${currentTab.label} Project Accounts`}
        items={currentTab.items}
        emptyMessage={`No ${currentTab.label.toLowerCase()} project accounts match the current filters.`}
      />
    </section>
  );
}