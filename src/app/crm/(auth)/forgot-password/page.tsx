"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestResetAction, type FormState } from "@/server/actions/auth";
import { AuthShell } from "@/components/crm/AuthShell";
import { Alert, Field, Input } from "@/components/crm/ui";
import { SubmitButton } from "@/components/crm/client";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<FormState, FormData>(requestResetAction, {});
  return (
    <AuthShell title="Reset your password" intro="Enter your account email and we will send a one-time reset link.">
      {state.ok ? (
        <Alert tone="success">{state.message}</Alert>
      ) : (
        <form action={action} className="space-y-5">
          {state.error && <Alert>{state.error}</Alert>}
          <Field label="Email" name="email" required>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <SubmitButton className="w-full" pendingText="Sending">
            Send Reset Link
          </SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/crm/login" className="text-blue hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
