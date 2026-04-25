import { redirect } from "next/navigation";

import { getSession } from "@/modules/auth/auth.session";
import { getIssuePolicySettingsService } from "@/modules/issues/issue.service";
import IssueLogClient from "./issue-log-client";

export default async function IssueLogPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";

  const [issues, policy] = await Promise.all([
    (async () => {
      const res = await fetch(`${baseUrl}/api/issues`, {
        cache: "no-store",
      });

      const json = await res.json();

      return json?.data?.items || [];
    })(),
    getIssuePolicySettingsService(),
  ]);

  return <IssueLogClient session={session} issues={issues} policy={policy} />;
}