import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAnyUser } from "@/server/tokens";
import { AuthShell } from "@/components/crm/AuthShell";
import { Alert } from "@/components/crm/ui";
import { SetupForm } from "./SetupForm";

export const metadata: Metadata = { title: "First-Time Setup | Vortix CRM" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await hasAnyUser()) redirect("/crm/login");
  const enabled = (process.env.CRM_SETUP_TOKEN || "").length >= 16;
  return (
    <AuthShell title="Create the Owner account" intro="This page is available only until the first account exists.">
      {enabled ? (
        <SetupForm />
      ) : (
        <Alert>
          Setup is disabled. Add a random <code className="font-mono">CRM_SETUP_TOKEN</code> of at least 16 characters to your
          environment, restart the server, and return to this page.
        </Alert>
      )}
    </AuthShell>
  );
}
