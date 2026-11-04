"use client";

import { useActionState } from "react";
import { setupOwnerAction, type FormState } from "@/server/actions/auth";
import { Alert, Field, Input } from "@/components/crm/ui";
import { SubmitButton } from "@/components/crm/client";

export function SetupForm() {
  const [state, action] = useActionState<FormState, FormData>(setupOwnerAction, {});
  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Setup token" name="setupToken" required hint="The CRM_SETUP_TOKEN value from the server environment.">
        <Input name="setupToken" type="password" autoComplete="off" required />
      </Field>
      <Field label="Full name" name="name" required>
        <Input name="name" autoComplete="name" required />
      </Field>
      <Field label="Email" name="email" required>
        <Input name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password" name="password" required hint="At least 12 characters, with letters and a number or symbol.">
        <Input name="password" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <SubmitButton className="w-full" pendingText="Creating account">
        Create Owner Account
      </SubmitButton>
    </form>
  );
}
