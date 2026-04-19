"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type CreateTimesheetEntryFormProps = {
  employeeId: string;
  employeeName: string;
};

type FormValues = {
  workDate: string;
  hours: string;
  taskName: string;
  description: string;
  projectAccountId: string;
  projectAccountName: string;
  customerName: string;
  isBillable: "true" | "false";
};

type ApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: string | string[];
  };
};

const INITIAL_VALUES: FormValues = {
  workDate: "",
  hours: "8",
  taskName: "",
  description: "",
  projectAccountId: "",
  projectAccountName: "",
  customerName: "",
  isBillable: "true",
};

function normalizeErrorMessage(result: ApiErrorResponse, fallback: string): string {
  const detail = result.error?.details;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0] ?? fallback;
  }

  if (typeof detail === "string" && detail.trim() !== "") {
    return detail;
  }

  return result.error?.message || fallback;
}

export function CreateTimesheetEntryForm({
  employeeId,
  employeeName,
}: CreateTimesheetEntryFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      values.workDate.trim() !== "" &&
      values.taskName.trim() !== "" &&
      values.hours.trim() !== "" &&
      Number(values.hours) >= 0
    );
  }, [values]);

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setValues(INITIAL_VALUES);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/timesheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          employeeName,
          workDate: values.workDate,
          hours: Number(values.hours),
          taskName: values.taskName.trim(),
          description: values.description.trim() || undefined,
          projectAccountId: values.projectAccountId.trim() || undefined,
          projectAccountName: values.projectAccountName.trim() || undefined,
          customerName: values.customerName.trim() || undefined,
          isBillable: values.isBillable === "true",
          source: "manual",
        }),
      });

      const result = (await response.json().catch(() => ({}))) as ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(result, "Unable to create timesheet entry."),
        );
      }

      toast.success("Timesheet entry created successfully.");
      resetForm();
      setIsExpanded(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create timesheet entry.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Create</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            New timesheet entry
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Capture the work date, hours, task, and project context in a cleaner
            layout than the legacy matrix-style screen.
          </p>
        </div>

        <Button
          type="button"
          variant={isExpanded ? "outline" : "default"}
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? "Close form" : "Add timesheet entry"}
        </Button>
      </div>

      {isExpanded ? (
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field
              label="Work date"
              required
              type="date"
              value={values.workDate}
              onChange={(value) => updateField("workDate", value)}
            />

            <Field
              label="Hours"
              required
              type="number"
              value={values.hours}
              onChange={(value) => updateField("hours", value)}
              min="0"
              max="24"
              step="0.25"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Billable
              </label>
              <select
                value={values.isBillable}
                onChange={(event) =>
                  updateField("isBillable", event.target.value as "true" | "false")
                }
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="true">Billable</option>
                <option value="false">Non-billable</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">Employee</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {employeeName}
              </p>
              <p className="mt-1 text-xs text-slate-500">{employeeId}</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Task name"
              required
              value={values.taskName}
              onChange={(value) => updateField("taskName", value)}
              placeholder="Monthly report delivery, customer support, analysis..."
            />

            <Field
              label="Customer name"
              value={values.customerName}
              onChange={(value) => updateField("customerName", value)}
              placeholder="Customer or account name"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Project account ID"
              value={values.projectAccountId}
              onChange={(value) => updateField("projectAccountId", value)}
              placeholder="Optional for now"
            />

            <Field
              label="Project account name"
              value={values.projectAccountName}
              onChange={(value) => updateField("projectAccountName", value)}
              placeholder="Optional for now"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={4}
              placeholder="Add more detail about the work performed"
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save timesheet entry"}
            </Button>

            <Button type="button" variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}