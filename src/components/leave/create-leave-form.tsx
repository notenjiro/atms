"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { LEAVE_TYPES, type LeaveTypeId } from "@/modules/leave/leave.types";

type CreateLeaveFormProps = {
  employeeId: string;
  employeeName: string;
  approverName?: string;
  approverEmail?: string;
  className?: string;
};

type FormValues = {
  leaveTypeId: LeaveTypeId;
  startDate: string;
  endDate: string;
  startPortion: "full" | "half-am" | "half-pm";
  endPortion: "full" | "half-am" | "half-pm";
  remarks: string;
};

type ApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: string | string[];
  };
};

const DEFAULT_LEAVE_TYPE_ID: LeaveTypeId = "L001";

const INITIAL_VALUES: FormValues = {
  leaveTypeId: DEFAULT_LEAVE_TYPE_ID,
  startDate: "",
  endDate: "",
  startPortion: "full",
  endPortion: "full",
  remarks: "",
};

function joinClassNames(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

function normalizeErrorDetails(details: string | string[] | undefined): string[] {
  if (!details) {
    return [];
  }

  return Array.isArray(details) ? details : [details];
}

export function CreateLeaveForm({
  employeeId,
  employeeName,
  approverName,
  approverEmail,
  className,
}: CreateLeaveFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const canSubmit = useMemo(() => {
    return (
      values.leaveTypeId.trim() !== "" &&
      values.startDate.trim() !== "" &&
      values.endDate.trim() !== ""
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessages([]);

    try {
      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          employeeName,
          approverName,
          approverEmail,
          leaveTypeId: values.leaveTypeId,
          startDate: values.startDate,
          endDate: values.endDate,
          startPortion: values.startPortion,
          endPortion: values.endPortion,
          remarks: values.remarks.trim() || undefined,
        }),
      });

      const result = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        const details = normalizeErrorDetails(result.error?.details);
        const fallbackMessage =
          result.error?.message || "Unable to create leave request.";

        setErrorMessages(details.length > 0 ? details : [fallbackMessage]);
        return;
      }

      setSuccessMessage("Leave request created successfully.");
      resetForm();
      setIsExpanded(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessages(["Unable to create leave request. Please try again."]);
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
            New leave request
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Submit leave with full-day or half-day selections and send it into
            the lead approval flow.
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
          {isExpanded ? "Close form" : "Request leave"}
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
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Leave type
              </label>
              <select
                value={values.leaveTypeId}
                onChange={(event) =>
                  updateField("leaveTypeId", event.target.value as LeaveTypeId)
                }
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                {LEAVE_TYPES.map((leaveType) => (
                  <option key={leaveType.id} value={leaveType.id}>
                    {leaveType.name}
                  </option>
                ))}
              </select>
            </div>

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

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Start portion
              </label>
              <select
                value={values.startPortion}
                onChange={(event) =>
                  updateField(
                    "startPortion",
                    event.target.value as FormValues["startPortion"],
                  )
                }
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="full">Full day</option>
                <option value="half-am">Half day (AM)</option>
                <option value="half-pm">Half day (PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                End portion
              </label>
              <select
                value={values.endPortion}
                onChange={(event) =>
                  updateField(
                    "endPortion",
                    event.target.value as FormValues["endPortion"],
                  )
                }
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="full">Full day</option>
                <option value="half-am">Half day (AM)</option>
                <option value="half-pm">Half day (PM)</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">Requested by</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {employeeName}
              </p>
              <p className="mt-1 text-xs text-slate-500">{employeeId}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Remarks
            </label>
            <textarea
              value={values.remarks}
              onChange={(event) => updateField("remarks", event.target.value)}
              rows={4}
              placeholder="Add a short reason or any helpful details"
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit leave request"}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}