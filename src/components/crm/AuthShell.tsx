import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-tint lg:flex lg:flex-col lg:justify-between lg:p-14">
        <Link href="/" aria-label="Vortix Medical Services website">
          <Image src="/images/brand/vortix-logo.png" alt="Vortix Medical Services" width={2160} height={681} className="h-auto w-[200px]" priority />
        </Link>
        <svg aria-hidden viewBox="0 0 400 400" className="absolute -right-24 top-1/2 h-[560px] -translate-y-1/2">
          <circle cx="200" cy="200" r="150" fill="none" stroke="var(--brand-blue)" strokeOpacity="0.12" strokeWidth="40" />
          <circle cx="200" cy="200" r="64" fill="none" stroke="var(--brand-teal)" strokeOpacity="0.25" strokeWidth="2" />
        </svg>
        <div className="relative max-w-md">
          <p className="eyebrow">Vortix CRM</p>
          <p className="mt-4 font-display text-3xl font-bold leading-tight text-slate">
            Business relationships, follow-ups, and pipeline in one place.
          </p>
          <p className="mt-4 text-muted">
            Internal use only. This system stores business contact and sales information. Do not enter patient health
            information.
          </p>
        </div>
      </aside>
      <main id="main" className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-[400px]">
          <Image src="/images/brand/vortix-logo.png" alt="Vortix Medical Services" width={2160} height={681} className="mb-12 h-auto w-[170px] lg:hidden" priority />
          <h1 className="text-[1.75rem] font-bold">{title}</h1>
          {intro && <div className="mt-2 text-muted">{intro}</div>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
