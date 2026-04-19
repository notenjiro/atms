"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type TimesheetProjectPickerItem = {
  id: string;
  code: string;
  name: string;
  isChargeable: boolean;
  customerName?: string;
};

type TimesheetProjectPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (project: TimesheetProjectPickerItem) => void;
};

type BootstrapResponse = {
  items?: TimesheetProjectPickerItem[];
};

export function TimesheetProjectPickerDialog({
  open,
  onClose,
  onSelect,
}: TimesheetProjectPickerDialogProps) {
  const [items, setItems] = useState<TimesheetProjectPickerItem[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "chargeable" | "non-charge">("all");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadProjects() {
      try {
        setIsLoading(true);

        const response = await fetch("/api/timesheet-projects/bootstrap", {
          cache: "no-store",
        });

        const result = (await response.json().catch(() => ({}))) as BootstrapResponse;

        if (!response.ok) {
          throw new Error("Unable to load timesheet projects.");
        }

        if (!cancelled) {
          setItems(result.items ?? []);
        }
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load timesheet projects.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        keyword === "" ||
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        (item.customerName ?? "").toLowerCase().includes(keyword);

      const matchesTab =
        tab === "all" ||
        (tab === "chargeable" && item.isChargeable) ||
        (tab === "non-charge" && !item.isChargeable);

      return matchesSearch && matchesTab;
    });
  }, [items, search, tab]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-sm font-medium text-slate-500">Project picker</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Add project to timesheet
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Select a project code first, then add sub-task rows under that
              project in the monthly board.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close project picker"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search project code, name, or customer"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="block w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "chargeable", "non-charge"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={[
                    "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                    tab === value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Loading projects...
              </div>
            ) : null}

            {!isLoading && filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No projects match the current search.
              </div>
            ) : null}

            {!isLoading &&
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.code}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{item.name}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {item.customerName || "No customer"}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          item.isChargeable
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        {item.isChargeable ? "Chargeable" : "Non-charge"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}