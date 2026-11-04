"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Health = { status: string; hint: string };

/** Shown when a CRM page fails on the server. Checks the database status so the cause is visible. */
export default function CrmError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);
  const dbProblem = health && health.status !== "ok";
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="eyebrow">Vortix CRM</p>
      <h1 className="mt-3 text-2xl font-bold">{dbProblem ? "The CRM cannot reach its database" : "Something went wrong"}</h1>
      <p className="mt-3 text-muted">
        {dbProblem ? health.hint : "The page could not be loaded. Try again, and if it keeps happening, check the server logs."}
      </p>
      {dbProblem && <p className="mt-2 text-sm text-muted">Status code: {health.status}</p>}
      {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="rounded-[5px] bg-blue px-4 py-2.5 font-display text-sm font-semibold text-white hover:bg-blue-deep">
          Try again
        </button>
        <Link href="/" className="rounded-[5px] px-4 py-2.5 font-display text-sm font-semibold text-slate ring-1 ring-line hover:bg-surface-muted">
          Go to the website
        </Link>
      </div>
    </main>
  );
}
