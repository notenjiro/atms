import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/modules/auth/auth.session";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      title="Settings"
      description="Configure system behavior, policies, and workflows."
    >
      <SettingsClient />
    </AppShell>
  );
}