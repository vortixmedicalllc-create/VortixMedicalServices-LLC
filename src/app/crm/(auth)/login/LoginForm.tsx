"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type FormState } from "@/server/actions/auth";
import { Alert, Field, Input } from "@/components/crm/ui";
import { SubmitButton } from "@/components/crm/client";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" required>
        <Input name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Password" name="password" required>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Signing in">
        Sign In
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/crm/forgot-password" className="text-blue hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
