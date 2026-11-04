import type { Metadata } from "next";
import { AuthShell } from "@/components/crm/AuthShell";
import { Alert } from "@/components/crm/ui";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Set Password | Vortix CRM", referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Set your password" intro="Choose a password with at least 12 characters, including letters and a number or symbol.">
      {token && token !== "hidden" ? (
        <ResetForm token={token} />
      ) : (
        <Alert>This link is incomplete. Please open the full link you received again.</Alert>
      )}
    </AuthShell>
  );
}
