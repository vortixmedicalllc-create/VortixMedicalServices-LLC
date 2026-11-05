import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileLock2, Repeat, Handshake, Scale } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { ArrowLink, ButtonLink, Container, Eyebrow, Section, SectionHeader, cx } from "@/components/ui/primitives";
import { CtaBand, FaqSection, ProcessTimeline } from "@/components/sections/Shared";
import { BillingVignette, DmeVignette, HeroVisual } from "@/components/illustrations/Illustrations";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "DME Support and Medical Billing Services",
    description:
      "Vortix Medical Services provides DME operational support and medical billing and revenue cycle services for healthcare organizations in the United States.",
    path: "/",
  }),
  title: { absolute: "Vortix Medical Services | DME Support and Medical Billing Services" },
};

const why = [
  {
    title: "Integrated Healthcare Support",
    text: "DME operations and medical billing under one partner, so information does not have to be re-explained at every handoff.",
  },
  {
    title: "Operational Efficiency",
    text: "We focus on the routine steps that slow teams down, such as verifications, follow-ups, and rework, and help keep them moving.",
  },
  {
    title: "Technology-Driven Solutions",
    text: "We use dependable software tools and clear checklists to reduce manual effort and avoidable errors.",
  },
  {
    title: "Process-Oriented Approach",
    text: "Clear, documented workflows make work predictable, measurable, and easier to improve over time.",
  },
  {
    title: "Scalable Business Support",
    text: "Engage one service or several, and adjust the scope as your volume, staffing, or priorities change.",
  },
  {
    title: "Dedicated Client Focus",
    text: "We take time to understand how your organization works today before recommending what should change.",
  },
];

const audiences = [
  { name: "DME Suppliers", text: "Intake, verification, documentation, and order coordination support." },
  { name: "Medical Practices", text: "Billing, claims follow-up, and administrative workload relief." },
  { name: "Healthcare Clinics", text: "Front-end verification and organized revenue cycle processes." },
  { name: "Physicians", text: "Support that lets clinical time stay focused on patient care." },
  { name: "Medical Groups", text: "Consistent workflows across providers, locations, and payers." },
  { name: "Healthcare Organizations", text: "Operational and billing support shaped around existing systems." },
];

const trust = [
  { Icon: ClipboardCheck, title: "Attention to operational detail", text: "Small errors in documentation, eligibility, or coding create downstream work. We check the details early." },
  { Icon: FileLock2, title: "Responsible handling of information", text: "We design processes around minimum necessary access and careful handling of the information entrusted to us." },
  { Icon: Repeat, title: "Process consistency", text: "Defined steps and checklists help work get done the same way, regardless of volume or who is handling it." },
  { Icon: Handshake, title: "Client-focused service", text: "Regular communication, clear points of contact, and recommendations that fit your organization." },
  { Icon: Scale, title: "Commitment to professional standards", text: "We work within payer requirements and applicable regulations, and we are transparent about what we can and cannot do." },
];

const homeFaq = [
  {
    q: "What services does Vortix Medical Services provide?",
    a: "Vortix provides two service divisions: operational support for durable medical equipment (DME) providers, and medical billing and revenue cycle support for healthcare organizations.",
  },
  {
    q: "Who can benefit from Vortix services?",
    a: "Our services are designed for healthcare businesses, including DME suppliers, medical practices, clinics, physicians, medical groups, and other healthcare organizations that want more organized and efficient operations.",
  },
  {
    q: "What is included in DME operational support?",
    a: "DME support can include patient referral and intake coordination, insurance eligibility verification, prescription and documentation review, prior authorization coordination, and order and delivery coordination with your team. Vortix provides administrative support; we do not manufacture or dispense equipment.",
  },
  {
    q: "What is medical billing support?",
    a: "Medical billing support covers the administrative steps between a patient visit and final payment, such as eligibility checks, coding support, charge entry, claim submission, payment posting, denial management, and accounts receivable follow-up.",
  },
  {
    q: "Can businesses use individual services?",
    a: "Yes. Each service can be engaged on its own. Some organizations choose to combine services where it makes operational sense, but there is no requirement to do so.",
  },
  {
    q: "How can I request a consultation?",
    a: "Use the inquiry form on our Contact page. Tell us a little about your organization and the services you are interested in, and our team will follow up to arrange a conversation.",
  },
  {
    q: "How do I get started?",
    a: "Getting started begins with a conversation about your current workflows and goals. From there, we assess your needs, recommend an appropriate scope, and agree on a plan before any work begins.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* 1. HERO */}
      <section className="relative overflow-hidden bg-white">
        <Container className="grid items-center gap-14 pb-20 pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-10 lg:pb-28 lg:pt-20">
          <div className="lg:col-span-6 xl:col-span-6">
            <Eyebrow>DME Support · Medical Billing</Eyebrow>
            <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-[3.4rem] lg:text-[3.6rem] xl:text-[4.1rem]">
              Smarter Healthcare Operations.{" "}
              <span className="text-blue">Better Business Outcomes.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              Vortix Medical Services brings together DME support and medical billing expertise to help healthcare
              organizations operate with greater clarity, efficiency, and confidence.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/services" arrow>
                Explore Our Services
              </ButtonLink>
              <ButtonLink href="/contact" variant="secondary">
                Request a Consultation
              </ButtonLink>
            </div>
            <dl className="mt-14 grid max-w-sm grid-cols-2 border-t border-line pt-6">
              {[
                ["01", "DME Services", "/services/dme"],
                ["02", "Medical Billing", "/services/medical-billing"],
              ].map(([n, l, h]) => (
                <div key={n} className="pr-3">
                  <dt className="font-display text-xs font-bold text-teal-ink">{n}</dt>
                  <dd className="mt-1">
                    <Link href={h} className="font-display text-[0.92rem] font-semibold text-slate hover:text-blue">
                      {l}
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative lg:col-span-6 xl:col-span-5 xl:col-start-8">
            <HeroVisual className="mx-auto h-auto w-full max-w-[560px]" />
          </div>
        </Container>
      </section>

      {/* 2. INTRODUCTION */}
      <Section tone="muted" labelledBy="intro-heading">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="reveal lg:col-span-5">
            <Eyebrow>Who We Are</Eyebrow>
            <h2 id="intro-heading" className="mt-4 text-[2rem] font-bold sm:text-[2.6rem]">
              Supporting the People Behind Healthcare.
            </h2>
          </div>
          <div className="reveal space-y-5 text-lg leading-relaxed text-muted lg:col-span-6 lg:col-start-7">
            <p>
              Behind every patient encounter is a long list of administrative work: referrals to process, coverage to
              verify, documents to collect, claims to submit, and payments to reconcile. Vortix Medical Services is a
              healthcare services partner that helps organizations manage that work with more structure and less strain
              on their teams.
            </p>
            <p>
              Our two divisions are designed to work independently or together. DME operations create the
              documentation that billing depends on, and billing shows where upstream processes break down.
            </p>
            <ArrowLink href="/about">More about Vortix</ArrowLink>
          </div>
        </Container>
      </Section>

      {/* 3. CORE SERVICES */}
      <Section labelledBy="services-heading">
        <Container>
          <SectionHeader
            eyebrow="Core Services"
            title={<span id="services-heading">Integrated Solutions for Healthcare Operations.</span>}
            intro="Two focused service areas, each built around the day-to-day realities of healthcare administration."
          />

          <div className="mt-16 space-y-24 lg:space-y-32">
            {/* DME */}
            <ServiceFeature
              number="01"
              title="DME Services"
              text="Operational support for durable medical equipment providers, helping manage essential processes from patient intake and documentation to order coordination."
              points={["Referral and intake coordination", "Eligibility verification", "Documentation review", "Prior authorization coordination"]}
              href="/services/dme"
              cta="Explore DME Services"
              visual={<DmeVignette className="w-full max-w-[460px]" />}
            />
            {/* Billing */}
            <ServiceFeature
              reverse
              number="02"
              title="Medical Billing"
              text="Organized revenue cycle support designed to help healthcare organizations manage claims, payment workflows, denials, and accounts receivable."
              points={["Coding and charge entry support", "Claims preparation and submission", "Payment posting", "Denial and A/R follow-up"]}
              href="/services/medical-billing"
              cta="Explore Medical Billing"
              visual={<BillingVignette className="h-auto w-full max-w-[520px]" />}
            />
          </div>
        </Container>
      </Section>

      {/* 4. WHY VORTIX */}
      <Section tone="muted" labelledBy="why-heading">
        <Container>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <SectionHeader
              className="lg:col-span-7"
              eyebrow="Why Vortix"
              title={<span id="why-heading">Built Around the Needs of Modern Healthcare.</span>}
            />
            <p className="reveal text-lg text-muted lg:col-span-5">
              Healthcare organizations need partners who understand both the administrative detail and the bigger
              operational picture. That balance shapes how we work.
            </p>
          </div>
          <ul className="mt-16 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {why.map((w, i) => (
              <li
                key={w.title}
                className="reveal group border-b border-r border-line bg-white p-8 transition-colors duration-300 hover:bg-tint/60 lg:p-10"
                style={{ transitionDelay: `${(i % 3) * 70}ms` }}
              >
                <span className="font-display text-sm font-bold text-teal-ink">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 text-xl font-bold">{w.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{w.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* 5. HOW WE WORK */}
      <Section labelledBy="how-heading">
        <Container>
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <SectionHeader eyebrow="How We Work" title={<span id="how-heading">A Clear Approach to Better Operations.</span>} />
            <ArrowLink href="/how-we-work" className="reveal shrink-0">
              See our full process
            </ArrowLink>
          </div>
          <ProcessTimeline
            className="mt-16"
            steps={[
              { title: "Understand", text: "We learn your operational requirements, current workflows, and the challenges your team faces." },
              { title: "Strategize", text: "We identify the relevant services and design an appropriate workflow for your organization." },
              { title: "Implement", text: "We coordinate and deliver the agreed services, with clear communication along the way." },
              { title: "Optimize", text: "We review workflows regularly and identify opportunities for continued improvement." },
            ]}
          />
        </Container>
      </Section>

      {/* 6. WHO WE SERVE */}
      <Section tone="tint" labelledBy="serve-heading">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeader
              eyebrow="Who We Serve"
              title={<span id="serve-heading">Solutions Designed for Healthcare Organizations.</span>}
              intro="We work with healthcare businesses of different sizes and specialties across the United States."
            />
          </div>
          <ul className="grid gap-px self-start overflow-hidden rounded-[6px] bg-line ring-1 ring-line sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {audiences.map((a, i) => (
              <li key={a.name} className="reveal bg-white p-7" style={{ transitionDelay: `${(i % 2) * 70}ms` }}>
                <h3 className="flex items-center justify-between text-lg font-bold">
                  {a.name}
                  <span aria-hidden className={cx("size-2 rounded-full", i % 2 ? "bg-teal" : "bg-blue")} />
                </h3>
                <p className="mt-2 text-[0.98rem] leading-relaxed text-muted">{a.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* 7. SPOTLIGHT: HOW THE DIVISIONS CONNECT */}
      <section aria-labelledby="spotlight-heading" className="relative overflow-hidden bg-slate-deep py-20 text-white sm:py-28">
        <Container>
          <SectionHeader
            tone="light"
            eyebrow="Service Spotlight"
            title={<span id="spotlight-heading">Two Disciplines That Strengthen Each Other.</span>}
            intro="The quality of a claim depends on the quality of the work that came before it. Our divisions are designed with that connection in mind."
          />
          <div className="relative mt-16 grid gap-10 lg:grid-cols-3 lg:gap-0">
            <span aria-hidden className="absolute left-[16.6%] right-[16.6%] top-[30px] hidden h-[2px] bg-[linear-gradient(90deg,var(--brand-blue),var(--brand-tube),var(--brand-teal))] lg:block" />
            {[
              { n: "01", t: "Clean documentation", d: "Accurate intake, verification, and complete paperwork on DME orders reduce the issues that surface later as denials.", c: "ring-blue" },
              { n: "02", t: "Accurate claims", d: "Billing builds on that foundation, and denial patterns show exactly where upstream processes need attention.", c: "ring-tube" },
              { n: "03", t: "Consistent follow-up", d: "Timely A/R and insurance follow-up closes the loop, and what it reveals feeds back into intake and documentation.", c: "ring-teal" },
            ].map((s, i) => (
              <div key={s.n} className="reveal relative lg:px-10 lg:text-center" style={{ transitionDelay: `${i * 90}ms` }}>
                <span className={cx("relative z-10 grid size-[60px] place-items-center rounded-full bg-slate-deep font-display font-bold ring-[6px] lg:mx-auto", s.c)}>
                  {s.n}
                </span>
                <h3 className="mt-6 text-xl font-bold !text-white">{s.t}</h3>
                <p className="mt-3 leading-relaxed text-white/70">{s.d}</p>
              </div>
            ))}
          </div>
          <p className="reveal mx-auto mt-16 max-w-2xl border-t border-white/15 pt-8 text-center text-white/80">
            Every service is available on its own. Clients choose the combination that fits their organization, and many
            start with a single service.
          </p>
        </Container>
      </section>

      {/* 8. TRUST */}
      <Section labelledBy="trust-heading">
        <Container className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader
              eyebrow="Our Commitments"
              title={<span id="trust-heading">Professional Support. Responsible Operations.</span>}
              intro="Healthcare organizations trust partners with sensitive work. These are the principles we hold ourselves to."
            />
          </div>
          <ul className="space-y-0 lg:col-span-7">
            {trust.map(({ Icon, title, text }) => (
              <li key={title} className="reveal flex gap-6 border-t border-line py-7 last:border-b">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-tint text-blue">
                  <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* 9. FAQ */}
      <FaqSection items={homeFaq} tone="muted" />

      {/* 10. FINAL CTA */}
      <CtaBand />
    </>
  );
}

function ServiceFeature({
  number,
  title,
  text,
  points,
  href,
  cta,
  visual,
  reverse,
}: {
  number: string;
  title: string;
  text: string;
  points: string[];
  href: string;
  cta: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <div className={cx("reveal lg:col-span-6", reverse ? "lg:order-2" : "")}>
        <div className={cx("flex", reverse ? "lg:justify-end" : "")}>{visual}</div>
      </div>
      <div className={cx("reveal lg:col-span-6", reverse ? "lg:order-1" : "")}>
        <p className="font-display text-sm font-bold text-teal-ink">{number}</p>
        <h3 className="mt-3 text-[1.9rem] font-bold sm:text-[2.2rem]">{title}</h3>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">{text}</p>
        <ul className="mt-7 grid max-w-lg gap-3 sm:grid-cols-2">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-slate">
              <span aria-hidden className="mt-[0.7rem] h-[2px] w-3 shrink-0 bg-teal" />
              {p}
            </li>
          ))}
        </ul>
        <Link href={href} className="group mt-9 inline-flex items-center gap-2 font-display text-[0.92rem] font-semibold text-blue hover:text-blue-deep">
          <span className="border-b border-blue/30 pb-0.5 group-hover:border-blue">{cta}</span>
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
