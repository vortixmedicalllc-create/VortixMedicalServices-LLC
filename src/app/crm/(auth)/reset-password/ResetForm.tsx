"use client";

import { useActionState, useEffect } from "react";
import { resetPasswordAction, type FormState } from "@/server/actions/auth";
import { Alert, Field, Input } from "@/components/crm/ui";
import { SubmitButton } from "@/components/crm/client";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  // Keep the one-time token out of the visible address bar and browser history.
  useEffect(() => {
    window.history.replaceState(null, "", "/crm/reset-password");
  }, []);
  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" required>
        <Input name="password" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <Field label="Confirm password" name="confirm" required>
        <Input name="confirm" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <SubmitButton className="w-full">Save Password</SubmitButton>
    </form>
  );
}
