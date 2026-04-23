"use client";

import type { ProjectAccount } from "@/modules/project-accounts/project-account.types";

type ProjectAccountsTableProps = {
  title: string;
  items: ProjectAccount[];
  emptyMessage?: string;
};

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) {
    return "-";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

/** 🔥 ใช้ค่าคำนวณจริง ไม่พึ่ง field stored */
function getComputedRemaining(item: ProjectAccount): number {
  const allocated = item.allocatedManDays ?? 0;
  const used = item.usedManDays ?? 0;
  return Math.max(allocated - used, 0);
}

function getRemainingColor(item: ProjectAccount): string {
  const allocated = item.allocatedManDays ?? 0;
  if (allocated <= 0) {
    return "text-gray-400";
  }

  const remaining = getComputedRemaining(item);
  const ratio = remaining / allocated;

  if (ratio <= 0.1) return "text-red-600 font-semibold";
  if (ratio <= 0.3) return "text-orange-500 font-semibold";
  return "text-green-600";
}

function getStatusBadgeClass(statusRaw?: string, fallback?: string): string {
  const status = (statusRaw || fallback || "").toLowerCase();

  if (status.includes("pre")) return "bg-yellow-100 text-yellow-700";
  if (status.includes("implement")) return "bg-blue-100 text-blue-700";
  if (status === "done") return "bg-purple-100 text-purple-700";
  if (status === "active") return "bg-green-100 text-green-700";
  if (status === "inactive") return "bg-gray-100 text-gray-600";

  return "bg-gray-100 text-gray-500";
}

function getDaysUntil(endDate: string): number | null {
  if (!endDate) return null;

  const target = new Date(endDate);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );

  return Math.ceil(
    (startOfTarget.getTime() - startOfToday.getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

function buildProjectHealthPills(item: ProjectAccount): Array<{
  text: string;
  className: string;
}> {
  const pills: Array<{ text: string; className: string }> = [];
  const status = (item.projectStatus || item.status || "").toLowerCase();

  if (status !== "active" && status !== "implementing") {
    return pills;
  }

  // 🔥 Expiring
  const daysUntil = getDaysUntil(item.endDate);

  if (daysUntil !== null) {
    if (daysUntil < 30) {
      pills.push({
        text: "expiring",
        className: "bg-red-100 text-red-700",
      });
    } else if (daysUntil < 90) {
      pills.push({
        text: "expiring",
        className: "bg-yellow-100 text-yellow-700",
      });
    }
  }

  // 🔥 Exhausting (ใช้ค่าคำนวณจริง)
  const allocated = item.allocatedManDays ?? 0;
  if (allocated > 0) {
    const remaining = getComputedRemaining(item);
    const ratio = remaining / allocated;

    if (ratio < 0.1) {
      pills.push({
        text: "exhausting",
        className: "bg-red-100 text-red-700",
      });
    } else if (ratio < 0.3) {
      pills.push({
        text: "exhausting",
        className: "bg-yellow-100 text-yellow-700",
      });
    }
  }

  if (pills.length === 0) {
    pills.push({
      text: "normal",
      className: "bg-green-100 text-green-700",
    });
  }

  return pills;
}

export function ProjectAccountsTable({
  title,
  items,
  emptyMessage,
}: ProjectAccountsTableProps) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">
          {emptyMessage || "No data"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-left px-4 py-3"></th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Allocated</th>
                <th className="text-right px-4 py-3">Used</th>
                <th className="text-right px-4 py-3">Remaining</th>
                <th className="text-right px-4 py-3">Contract Value</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const displayStatus =
                  item.projectStatus || item.status || "unknown";

                const remaining = getComputedRemaining(item);
                const healthPills = buildProjectHealthPills(item);

                return (
                  <tr
                    key={item.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    {/* Project */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {item.projectName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.contractNo}
                      </div>
                    </td>

                    {/* Health Pills */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {healthPills.map((pill, i) => (
                          <span
                            key={`${item.id}-pill-${i}`}
                            className={`text-xs px-2 py-1 rounded-full font-medium ${pill.className}`}
                          >
                            {pill.text}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3 text-gray-700">
                      {item.customerName}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(
                          item.projectStatus,
                          item.status,
                        )}`}
                      >
                        {displayStatus}
                      </span>
                    </td>

                    {/* Allocated */}
                    <td className="px-4 py-3 text-right text-gray-800">
                      {formatNumber(item.allocatedManDays)}
                    </td>

                    {/* Used */}
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatNumber(item.usedManDays)}
                    </td>

                    {/* Remaining (🔥 computed) */}
                    <td
                      className={`px-4 py-3 text-right ${getRemainingColor(
                        item,
                      )}`}
                    >
                      {formatNumber(remaining)}
                    </td>

                    {/* Contract Value */}
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatNumber(item.projectServiceContractPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}