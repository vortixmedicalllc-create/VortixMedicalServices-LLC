"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, UserPlus } from "lucide-react";
import { createUserAction, issueResetLinkAction, setUserActiveAction, updateUserAction, type TeamResult } from "@/server/actions/team";
import { Alert, Field, Input, Select, btn } from "./ui";
import { ConfirmAction, Dialog, SubmitButton, useToast } from "./client";

type Opt = { value: string; label: string };

function LinkNotice({ link, emailed, purpose }: { link: string; emailed?: boolean; purpose: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Alert tone="success">
      <p className="font-semibold">{emailed ? `The ${purpose} link was emailed.` : `Email is not configured, so nothing was sent. Share this one-time ${purpose} link with the person through a secure channel.`}</p>
      <p className="mt-1 text-xs">The link works once. Invite links expire in 72 hours and reset links in 60 minutes. It will not be shown again.</p>
      {!emailed && (
        <div className="mt-2 flex items-center gap-2">
          <input readOnly value={link} aria-label="One-time link" className="h-8 min-w-0 flex-1 rounded border border-line bg-white px-2 font-mono text-xs" onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className={btn("secondary", "sm")}
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            <Copy aria-hidden className="size-3.5" /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </Alert>
  );
}

export function AddUserButton({ roles }: { roles: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      <button type="button" className={btn("primary")} onClick={() => setOpen(true)}>
        <UserPlus aria-hidden className="size-4" /> Add Team Member
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setKey((k) => k + 1);
        }}
        title="Add team member"
      >
        <AddUserForm key={key} roles={roles} />
      </Dialog>
    </>
  );
}

function AddUserForm({ roles }: { roles: Opt[] }) {
  const [state, action] = useActionState<TeamResult, FormData>(createUserAction, { ok: false });
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  if (state.ok && state.link) {
    return (
      <div className="space-y-3">
        <p className="text-sm">{state.message}</p>
        <LinkNotice link={state.link} emailed={state.emailed} purpose="invitation" />
      </div>
    );
  }
  const f = state.fields || {};
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Full name" name="name" required error={f.name}>
        <Input name="name" required maxLength={100} error={f.name} />
      </Field>
      <Field label="Work email" name="email" required error={f.email}>
        <Input name="email" type="email" required maxLength={160} error={f.email} />
      </Field>
      <Field label="Job title" name="jobTitle">
        <Input name="jobTitle" maxLength={100} />
      </Field>
      <Field label="Role" name="role" required error={f.role} hint="Roles control what each person can see and change. See the permissions table on this page.">
        <Select name="role" defaultValue="sales" options={roles} />
      </Field>
      <p className="text-xs text-muted">No password is set here. The person sets their own password through a one-time invitation link.</p>
      <div className="flex justify-end">
        <SubmitButton>Create Account</SubmitButton>
      </div>
    </form>
  );
}

export function UserRowActions({
  user,
  roles,
  self,
}: {
  user: { id: string; name: string; email: string; jobTitle: string | null; role: string; isActive: boolean; hasPassword: boolean };
  roles: Opt[];
  self: boolean;
}) {
  const [edit, setEdit] = useState(false);
  const [link, setLink] = useState<TeamResult | null>(null);
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <button type="button" className={btn("secondary", "sm")} onClick={() => setEdit(true)}>
        Edit
      </button>
      <button
        type="button"
        className={btn("secondary", "sm")}
        onClick={async () => {
          const r = await issueResetLinkAction(user.id);
          if (!r.ok) toast("error", r.error || "Could not create link.");
          else setLink(r);
        }}
      >
        <KeyRound aria-hidden className="size-3.5" /> {user.hasPassword ? "Reset link" : "Invite link"}
      </button>
      {!self && (
        <ConfirmAction
          label={user.isActive ? "Deactivate" : "Activate"}
          title={user.isActive ? `Deactivate ${user.name}?` : `Activate ${user.name}?`}
          message={user.isActive ? "They will be signed out immediately and cannot sign in. Their records and history are kept and remain assigned until you reassign them." : "They will be able to sign in again with their existing password."}
          confirmLabel={user.isActive ? "Deactivate" : "Activate"}
          variant={user.isActive ? "danger" : "secondary"}
          action={async () => {
            const r = await setUserActiveAction(user.id, !user.isActive);
            router.refresh();
            return { ok: r.ok, error: r.error };
          }}
          successText={user.isActive ? "User deactivated." : "User activated."}
        />
      )}
      {edit && <EditUserDialog user={user} roles={roles} onClose={() => setEdit(false)} />}
      <Dialog open={!!link} onClose={() => setLink(null)} title={user.hasPassword ? "Password reset link" : "Invitation link"}>
        {link?.link && <LinkNotice link={link.link} emailed={link.emailed} purpose={user.hasPassword ? "password reset" : "invitation"} />}
      </Dialog>
    </div>
  );
}

function EditUserDialog({ user, roles, onClose }: { user: { id: string; name: string; email: string; jobTitle: string | null; role: string }; roles: Opt[]; onClose: () => void }) {
  const [state, action] = useActionState<TeamResult, FormData>(updateUserAction.bind(null, user.id), { ok: false });
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast("success", state.message || "Saved.");
      router.refresh();
      onClose();
    }
  }, [state, toast, router, onClose]);
  const f = state.fields || {};
  const roleOpts = roles.some((r) => r.value === user.role) ? roles : [{ value: user.role, label: user.role }, ...roles];
  return (
    <Dialog open onClose={onClose} title={`Edit ${user.name}`}>
      <form action={action} className="space-y-4">
        {state.error && <Alert>{state.error}</Alert>}
        <Field label="Full name" name="name" required error={f.name}>
          <Input name="name" defaultValue={user.name} required maxLength={100} />
        </Field>
        <Field label="Work email" name="email" required error={f.email}>
          <Input name="email" type="email" defaultValue={user.email} required maxLength={160} />
        </Field>
        <Field label="Job title" name="jobTitle">
          <Input name="jobTitle" defaultValue={user.jobTitle ?? ""} maxLength={100} />
        </Field>
        <Field label="Role" name="role" hint="Changing a role signs the person out so the new permissions apply immediately.">
          <Select name="role" defaultValue={user.role} options={roleOpts} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={btn("secondary")} onClick={onClose}>
            Cancel
          </button>
          <SubmitButton>Save</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
