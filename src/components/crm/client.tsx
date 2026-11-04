"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { btn, type BtnVariant } from "./ui";
import { cx } from "@/components/ui/primitives";

/* ---------------- Submit button with pending state ---------------- */

export function SubmitButton({ children, variant = "primary", size, className, pendingText }: { children: ReactNode; variant?: BtnVariant; size?: "sm" | "md"; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={cx(btn(variant, size), className)}>
      {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {pending ? pendingText || "Saving" : children}
    </button>
  );
}

/* ---------------- Toasts ---------------- */

type Toast = { id: number; tone: "success" | "error"; text: string };
const ToastCtx = createContext<(tone: Toast["tone"], text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-2.5 rounded-[6px] border border-line bg-white p-3.5 text-[0.88rem] text-slate shadow-[0_12px_32px_-12px_rgba(19,42,51,0.35)]"
          >
            {t.tone === "success" ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-ink" /> : <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-[#b42318]" />}
            <span className="flex-1">{t.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-muted hover:text-slate">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------------- Dialog (native <dialog>, accessible) ---------------- */

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      requestAnimationFrame(() => d.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        "m-auto w-[calc(100vw-2rem)] rounded-[8px] border border-line bg-white p-0 text-slate shadow-[0_24px_64px_-24px_rgba(19,42,51,0.5)] backdrop:bg-slate-deep/40",
        wide ? "max-w-2xl" : "max-w-lg",
      )}
    >
      {open && (
        <div>
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id={titleId} className="text-[1.05rem] font-bold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded p-1 text-muted hover:bg-surface-muted hover:text-slate">
              <X className="size-4" />
            </button>
          </header>
          <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Button that asks for confirmation, then runs a server action. */
export function ConfirmAction({
  label,
  title,
  message,
  confirmLabel,
  action,
  variant = "secondary",
  size = "sm",
  successText,
}: {
  label: ReactNode;
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<{ ok: boolean; error?: string }>;
  variant?: BtnVariant;
  size?: "sm" | "md";
  successText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <>
      <button type="button" className={btn(variant, size)} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-[0.92rem] leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={btn("secondary")} onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            className={btn(variant === "danger" ? "danger" : "primary")}
            onClick={async () => {
              setBusy(true);
              const r = await action();
              setBusy(false);
              setOpen(false);
              toast(r.ok ? "success" : "error", r.ok ? successText || "Done." : r.error || "Something went wrong.");
            }}
          >
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </Dialog>
    </>
  );
}

/**
 * datetime-local shows the viewer's local time but carries no time zone. This
 * input converts the chosen local time to an ISO timestamp in the browser, so
 * the server stores the exact moment regardless of where it runs.
 */
export function DateTimeInput({ name, defaultIso, error, className }: { name: string; defaultIso?: string | null; error?: string; className?: string }) {
  const toLocal = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  // Computed after mount: the server does not know the viewer's time zone.
  const [local, setLocal] = useState("");
  useEffect(() => {
    setLocal(toLocal(defaultIso));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <>
      <input
        id={`f-${name}`}
        type="datetime-local"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `e-${name}` : undefined}
        className={cx(
          "h-10 w-full rounded-[5px] border border-line bg-white px-3 text-[0.92rem] text-slate hover:border-[#c3d2da] focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20",
          className,
        )}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
