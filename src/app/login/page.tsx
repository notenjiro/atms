"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoginState = {
  email: string;
  password: string;
};

type LoginApiSuccess = {
  success: true;
  message: string;
  data?: {
    user?: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      status: string;
    };
  };
};

type LoginApiError = {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
};

function isLoginApiError(result: LoginApiSuccess | LoginApiError): result is LoginApiError {
  return result.success === false;
}

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState<LoginState>({
    email: "admin@test.com",
    password: "123456",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const isFormValid = useMemo(() => {
    return form.email.trim().length > 0 && form.password.trim().length > 0;
  }, [form.email, form.password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const result = (await response.json()) as LoginApiSuccess | LoginApiError;

      if (isLoginApiError(result)) {
        setErrorMessage(result.error?.message ?? "Login failed.");
        return;
      }

      if (!response.ok) {
        setErrorMessage("Login failed.");
        return;
      }

      setInfoMessage(result.message || "Login successful.");
      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-2">
          <section className="hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
                ATMS Support
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight">
                Internal support cockpit for issues, contracts, effort, and leave planning.
              </h1>

              <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
                เริ่มจาก login ให้ผ่านก่อน แล้วเราจะค่อยต่อ dashboard, project accounts, issue log,
                reports, calendar และ ServiceNow integration ให้เป็นขบวนรถไฟทั้งเส้น
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Module</p>
                <p className="mt-2 text-lg font-semibold">Issue Log</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Module</p>
                <p className="mt-2 text-lg font-semibold">Contracts</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Module</p>
                <p className="mt-2 text-lg font-semibold">Calendar</p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <p className="text-sm font-medium text-slate-500">Welcome back</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                  Sign in to ATMS
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Use your email and password to access the support workspace.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    placeholder="admin@test.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter your password"
                  />
                </div>

                {errorMessage ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : null}

                {!errorMessage && infoMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {infoMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Development bootstrap
                </p>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p>Email: admin@test.com</p>
                  <p>Password: 123456</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}