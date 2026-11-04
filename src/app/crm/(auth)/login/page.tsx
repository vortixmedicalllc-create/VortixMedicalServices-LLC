import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { hasAnyUser } from "@/server/tokens";
import { AuthShell } from "@/components/crm/AuthShell";
import { Alert } from "@/components/crm/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign In | Vortix CRM" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  if (await getCurrentUser()) redirect("/crm/dashboard");
  const sp = await searchParams;
  const noUsers = !(await hasAnyUser());
  return (
    <AuthShell title="Sign in to Vortix CRM" intro="Use the account provided by your administrator.">
      {sp.reset && (
        <Alert tone="success" className="mb-5">
          Your password has been updated. Please sign in.
        </Alert>
      )}
      {noUsers && (
        <Alert tone="info" className="mb-5">
          No accounts exist yet. The first Owner account is created through the{" "}
          <Link href="/crm/setup" className="font-semibold text-blue underline">
            secure setup page
          </Link>
          .
        </Alert>
      )}
      <LoginForm next={sp.next || ""} />
    </AuthShell>
  );
}
