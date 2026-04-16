"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type CreateProjectAccountFormProps = {
  className?: string;
};

type FormValues = {
  projectName: string;
  customerName: string;
  contractNo: string;
  startDate: string;
  endDate: string;
  allocatedManDays: string;
  usedManDays: string;
  note: string;
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
  projectName: "",
  customerName: "",
  contractNo: "",
  startDate: "",
  endDate: "",
  allocatedManDays: "",
  usedManDays: "0",
  note: "",
};

function joinClassNames(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

export function CreateProjectAccountForm({
  className,
}: CreateProjectAccountFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const canSubmit = useMemo(() => {
    return (
      values.projectName.trim() !== "" &&
      values.customerName.trim() !== "" &&
      values.contractNo.trim() !== "" &&
      values.startDate.trim() !== "" &&
      values.endDate.trim() !== "" &&
      values.allocatedManDays.trim() !== ""
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
    setErrorMessages([]);
  }

  function normalizeErrorDetails(details: string | string[] | undefined): string[] {
    if (!details) {
      return [];
    }

    return Array.isArray(details) ? details : [details];
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessages([]);

    try {
      const response = await fetch("/api/project-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: values.projectName.trim(),
          customerName: values.customerName.trim(),
          contractNo: values.contractNo.trim(),
          startDate: values.startDate,
          endDate: values.endDate,
          allocatedManDays: Number(values.allocatedManDays),
          usedManDays: Number(values.usedManDays || "0"),
          note: values.note.trim() || undefined,
        }),
      });

      const result = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        const details = normalizeErrorDetails(result.error?.details);
        const fallbackMessage =
          result.error?.message || "Unable to create project account.";

        setErrorMessages(details.length > 0 ? details : [fallbackMessage]);
        return;
      }

      setSuccessMessage("Project account created successfully.");
      resetForm();
      setIsExpanded(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessages(["Unable to create project account. Please try again."]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className={joinClassNames(
        "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Create</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            New project account
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Add a customer support contract, allocate man-days, and prepare the
            account for future alerts and reporting.
          </p>
        </div>

        <Button
          type="button"
          variant={isExpanded ? "outline" : "default"}
          onClick={() => {
            setIsExpanded((current) => !current);
            setErrorMessages([]);
            setSuccessMessage("");
          }}
        >
          {isExpanded ? "Close form" : "Add project account"}
        </Button>
      </div>

      {successMessage ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {isExpanded ? (
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {errorMessages.length > 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-semibold text-rose-700">
                Please fix the following:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-rose-700">
                {errorMessages.map((message) => (
                  <li key={message}>• {message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field
              label="Project name"
              required
              value={values.projectName}
              onChange={(value) => updateField("projectName", value)}
              placeholder="ERP Support"
            />

            <Field
              label="Customer name"
              required
              value={values.customerName}
              onChange={(value) => updateField("customerName", value)}
              placeholder="ABC Co., Ltd."
            />

            <Field
              label="Contract number"
              required
              value={values.contractNo}
              onChange={(value) => updateField("contractNo", value)}
              placeholder="CNT-001"
            />

            <Field
              label="Start date"
              required
              type="date"
              value={values.startDate}
              onChange={(value) => updateField("startDate", value)}
            />

            <Field
              label="End date"
              required
              type="date"
              value={values.endDate}
              onChange={(value) => updateField("endDate", value)}
            />

            <Field
              label="Allocated man-days"
              required
              type="number"
              min="0"
              step="0.01"
              value={values.allocatedManDays}
              onChange={(value) => updateField("allocatedManDays", value)}
              placeholder="100"
            />

            <Field
              label="Used man-days"
              type="number"
              min="0"
              step="0.01"
              value={values.usedManDays}
              onChange={(value) => updateField("usedManDays", value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Note
            </label>
            <textarea
              value={values.note}
              onChange={(event) => updateField("note", event.target.value)}
              rows={4}
              placeholder="Optional notes for this account"
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create project account"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setSuccessMessage("");
              }}
              disabled={isSubmitting}
            >
              Reset
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date" | "number";
  required?: boolean;
  min?: string;
  step?: string;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  min,
  step,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>

      <input
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  );
}