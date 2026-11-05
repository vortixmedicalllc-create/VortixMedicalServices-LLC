import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { ButtonLink, Container, Section, SectionHeader } from "@/components/ui/primitives";
import { CtaBand, PageHero } from "@/components/sections/Shared";
import { BillingVignette, DmeVignette } from "@/components/illustrations/Illustrations";

export const metadata: Metadata = pageMetadata({
  title: "Our Services",
  description:
    "Explore Vortix Medical Services: DME operational support, and medical billing and revenue cycle services for healthcare organizations.",
  path: "/services",
});

const items = [
  {
    n: "01",
    title: "DME Services",
    href: "/services/dme",
    text: "Operational support for durable medical equipment providers, from referral intake and eligibility verification to documentation review, prior authorization coordination, and order coordination.",
    list: ["Patient referral and intake", "Insurance eligibility verification", "Prescription and documentation review", "Prior authorization coordination", "Order and delivery coordination"],
    visual: <DmeVignette className="w-full max-w-[380px]" />,
  },
  {
    n: "02",
    title: "Medical Billing",
    href: "/services/medical-billing",
    text: "Organized revenue cycle support that helps healthcare organizations manage claims, payment workflows, denials, and accounts receivable.",
    list: ["Eligibility and registration", "Coding support and charge entry", "Claims preparation and submission", "Payment posting and denial management", "A/R and insurance follow-up"],
    visual: <BillingVignette className="h-auto w-full max-w-[440px]" />,
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Services"
        title="Two Focused Ways We Support Healthcare Operations."
        crumbs={[{ label: "Services" }]}
        intro="Engage one service or combine them. Each division is built around the administrative work that keeps healthcare organizations running."
        actions={<ButtonLink href="/contact" arrow>Request a Consultation</ButtonLink>}
      />
      <Section>
        <Container>
          <div className="space-y-6">
            {items.map((s) => (
              <article key={s.n} className="reveal group grid overflow-hidden rounded-[6px] border border-line lg:grid-cols-12">
                <div className="flex items-center justify-center bg-tint p-8 sm:p-10 lg:col-span-5">{s.visual}</div>
                <div className="p-8 sm:p-10 lg:col-span-7 lg:p-12">
                  <p className="font-display text-sm font-bold text-teal-ink">{s.n}</p>
                  <h2 className="mt-3 text-[1.9rem] font-bold">
                    <Link href={s.href} className="hover:text-blue">{s.title}</Link>
                  </h2>
                  <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{s.text}</p>
                  <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                    {s.list.map((l) => (
                      <li key={l} className="flex gap-3 text-slate">
                        <span aria-hidden className="mt-[0.7rem] h-[2px] w-3 shrink-0 bg-teal" />
                        {l}
                      </li>
                    ))}
                  </ul>
                  <Link href={s.href} className="mt-8 inline-flex items-center gap-2 font-display text-[0.92rem] font-semibold text-blue hover:text-blue-deep">
                    View {s.title} <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </Section>
      <Section tone="muted" className="!py-16">
        <Container>
          <SectionHeader
            eyebrow="Not Sure Where to Start?"
            title="We Can Help You Decide."
            intro="Many organizations know where the pressure is, but not which service addresses it. A short conversation is usually enough to point in the right direction."
          />
          <ButtonLink href="/how-we-work" variant="secondary" className="reveal mt-8" arrow>
            See How We Work
          </ButtonLink>
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
