import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { ButtonLink, Container, Eyebrow, Section, SectionHeader, cx } from "@/components/ui/primitives";
import { Accordion, type FaqItem } from "@/components/ui/Accordion";
import { TubeFlourish } from "@/components/illustrations/Illustrations";
import { JsonLd, faqSchema } from "@/lib/seo";

/* ---------------- Interior page hero ---------------- */

export function PageHero({
  eyebrow,
  title,
  intro,
  crumbs,
  actions,
  aside,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  crumbs: { label: string; href?: string }[];
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-white">
      <TubeFlourish className="pointer-events-none absolute -right-24 top-0 hidden h-full w-[60%] lg:block" />
      <Container className={cx("relative grid gap-12 pb-16 pt-10 sm:pb-20 lg:pb-24 lg:pt-14", !!aside && "lg:grid-cols-12 lg:items-center")}>
        <div className={cx(aside ? "lg:col-span-7" : "max-w-4xl")}>
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
              <li>
                <Link href="/" className="hover:text-blue">Home</Link>
              </li>
              {crumbs.map((c) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  <ChevronRight aria-hidden className="size-3.5 text-line" />
                  {c.href ? (
                    <Link href={c.href} className="hover:text-blue">{c.label}</Link>
                  ) : (
                    <span aria-current="page" className="text-slate">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <Eyebrow className="mt-12 lg:mt-16">{eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[2.35rem] font-bold leading-[1.08] sm:text-5xl lg:text-[3.6rem]">{title}</h1>
          <div className="mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">{intro}</div>
          {actions && <div className="mt-10 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {aside && <div className="lg:col-span-5">{aside}</div>}
      </Container>
    </section>
  );
}

/* ---------------- Closing call to action ---------------- */

export function CtaBand({
  title = "Let's Build Better Healthcare Operations Together.",
  text = "Connect with Vortix Medical Services to discuss your organization's operational needs.",
  cta = "Get in Touch",
  href = "/contact",
}: {
  title?: string;
  text?: string;
  cta?: string;
  href?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-slate">
      <svg aria-hidden viewBox="0 0 800 400" className="pointer-events-none absolute -right-40 top-1/2 hidden h-[140%] -translate-y-1/2 md:block">
        <circle cx="560" cy="200" r="190" fill="none" stroke="var(--brand-blue)" strokeOpacity="0.35" strokeWidth="42" />
        <circle cx="560" cy="200" r="120" fill="none" stroke="var(--brand-teal)" strokeOpacity="0.25" strokeWidth="2" />
      </svg>
      <Container className="relative py-20 sm:py-24">
        <div className="reveal max-w-2xl">
          <span className="rule-accent" />
          <h2 className="mt-8 text-[2rem] font-bold leading-[1.12] !text-white sm:text-[2.6rem]">{title}</h2>
          <p className="mt-5 text-lg leading-relaxed text-white/75">{text}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={href} variant="light" arrow>
              {cta}
            </ButtonLink>
            <ButtonLink href="/services" variant="outline-light">
              Explore Our Services
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------------- Process timeline ---------------- */

export type Step = { title: string; text: string; note?: string };

/** Horizontal on large screens, vertical rail on small screens. */
export function ProcessTimeline({ steps, className, tone = "light" }: { steps: Step[]; className?: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const cols = steps.length <= 4 ? "lg:grid-cols-4" : steps.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-6";
  return (
    <ol className={cx("relative grid gap-0 lg:gap-6", cols, className)}>
      {/* horizontal rail */}
      <span
        aria-hidden
        className="absolute left-0 right-0 top-[22px] hidden h-[2px] bg-[linear-gradient(90deg,var(--brand-blue),var(--brand-tube),var(--brand-teal))] lg:block"
      />
      {steps.map((s, i) => (
        <li key={s.title} className="reveal relative grid grid-cols-[46px_1fr] gap-5 pb-10 last:pb-0 lg:block lg:pb-0" style={{ transitionDelay: `${i * 80}ms` }}>
          {/* vertical rail */}
          {i < steps.length - 1 && (
            <span aria-hidden className={cx("absolute bottom-0 left-[22px] top-[46px] w-[2px] lg:hidden", dark ? "bg-white/15" : "bg-line")} />
          )}
          <span
            className={cx(
              "relative z-10 grid size-[46px] place-items-center rounded-full font-display text-sm font-bold ring-[3px]",
              dark ? "bg-slate text-white ring-teal" : "bg-white text-slate",
              !dark && (i % 2 === 0 ? "ring-blue" : "ring-teal"),
            )}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="lg:mt-7 lg:pr-2">
            <h3 className={cx("text-lg font-bold", dark && "!text-white")}>{s.title}</h3>
            <p className={cx("mt-2 text-[0.98rem] leading-relaxed", dark ? "text-white/70" : "text-muted")}>{s.text}</p>
            {s.note && <p className={cx("mt-2 text-sm italic", dark ? "text-teal-soft" : "text-teal-ink")}>{s.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- FAQ ---------------- */

export function FaqSection({
  items,
  title = "Frequently Asked Questions",
  intro,
  tone = "white",
}: {
  items: FaqItem[];
  title?: string;
  intro?: ReactNode;
  tone?: "white" | "muted";
}) {
  return (
    <Section tone={tone} labelledBy="faq-heading">
      <JsonLd data={faqSchema(items)} />
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="reveal lg:sticky lg:top-32">
            <Eyebrow>FAQ</Eyebrow>
            <h2 id="faq-heading" className="mt-4 text-[2rem] font-bold sm:text-[2.4rem]">{title}</h2>
            {intro && <div className="mt-5 text-muted">{intro}</div>}
            <p className="mt-6 text-muted">
              Have a question that is not covered here?{" "}
              <Link href="/contact" className="font-semibold text-blue underline-offset-4 hover:underline">
                Send us a note
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="reveal lg:col-span-8">
          <Accordion items={items} />
        </div>
      </Container>
    </Section>
  );
}

/* ---------------- Numbered detail block (service pages) ---------------- */

export function DetailRow({
  index,
  title,
  children,
  points,
  id,
  aside,
}: {
  index: string;
  title: string;
  children: ReactNode;
  points?: string[];
  id?: string;
  aside?: ReactNode;
}) {
  return (
    <article id={id} className="reveal grid scroll-mt-32 gap-6 border-t border-line py-12 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-4">
        <p className="font-display text-sm font-bold text-teal-ink">{index}</p>
        <h3 className="mt-3 text-[1.45rem] font-bold leading-snug">{title}</h3>
        {aside}
      </div>
      <div className="lg:col-span-8">
        <div className="max-w-2xl text-[1.04rem] leading-relaxed text-muted">{children}</div>
        {points && (
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-[0.98rem] text-slate">
                <span aria-hidden className="mt-[0.6rem] h-[2px] w-3 shrink-0 bg-teal" />
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export { SectionHeader };
