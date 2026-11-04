import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { ButtonLink, Container, Eyebrow, Section, SectionHeader, cx } from "@/components/ui/primitives";
import { CtaBand, PageHero } from "@/components/sections/Shared";
import { services } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description:
    "Vortix Medical Services is a B2B healthcare services company bringing together DME operational support, medical billing, and practical AI for healthcare organizations.",
  path: "/about",
});

const approach = [
  { t: "Listen first", d: "We start by understanding how your organization works today, including what is working well." },
  { t: "Make it clear", d: "Workflows, responsibilities, and expectations are written down and agreed, not assumed." },
  { t: "Fit the solution to the need", d: "We recommend only the services that address the problems you actually have." },
  { t: "Keep improving", d: "Regular reviews help refine processes as your organization and the industry change." },
];

const commitments = [
  "Honest communication about what we can and cannot do",
  "Careful, responsible handling of the information you share with us",
  "Consistent processes and documented workflows",
  "Responsive points of contact",
  "Respect for your team, your patients, and your time",
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Vortix"
        title="Bringing Healthcare Operations and Technology Together."
        crumbs={[{ label: "About Us" }]}
        intro="Vortix Medical Services is a healthcare services company that helps organizations manage the administrative side of care through DME operational support, medical billing, and practical AI solutions."
      />

      {/* Who we are */}
      <Section labelledBy="who-heading">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow="Who We Are" title={<span id="who-heading">A Partner for the Work Behind the Care.</span>} />
          </div>
          <div className="reveal space-y-5 text-lg leading-relaxed text-muted lg:col-span-7">
            <p>
              Healthcare organizations carry a heavy administrative load. Intake, verification, documentation, coding,
              claims, and follow-up all have to be done correctly, and often under time pressure. When that work falls
              behind, it affects cash flow, staff, and ultimately patients.
            </p>
            <p>
              Vortix was formed to help with that load. We work with DME suppliers, medical practices, clinics, and other
              healthcare organizations as a business-to-business partner, supporting their teams with organized processes
              and, where it helps, thoughtfully applied technology.
            </p>
            {/* OWNER ACTION: optionally add a confirmed sentence about the company's founding, location, or leadership here. */}
          </div>
        </Container>
      </Section>

      {/* Mission & vision */}
      <section aria-label="Mission and vision" className="bg-tint">
        <Container className="grid lg:grid-cols-2">
          <div className="reveal border-b border-line py-16 sm:py-20 lg:border-b-0 lg:border-r lg:pr-16">
            <Eyebrow>Our Mission</Eyebrow>
            <p className="mt-6 font-display text-[1.6rem] font-semibold leading-snug text-slate sm:text-[1.9rem]">
              To help healthcare organizations run with greater clarity and efficiency by providing dependable operational
              support and practical technology.
            </p>
          </div>
          <div className="reveal py-16 sm:py-20 lg:pl-16">
            <Eyebrow>Our Vision</Eyebrow>
            <p className="mt-6 font-display text-[1.6rem] font-semibold leading-snug text-slate sm:text-[1.9rem]">
              A healthcare system where administrative work supports care rather than getting in its way.
            </p>
          </div>
        </Container>
      </section>

      {/* Approach */}
      <Section labelledBy="approach-heading">
        <Container>
          <SectionHeader eyebrow="Our Approach" title={<span id="approach-heading">How We Think About the Work.</span>} />
          <ol className="mt-14 grid gap-px overflow-hidden rounded-[6px] bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
            {approach.map((a, i) => (
              <li key={a.t} className="reveal bg-white p-8" style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="font-display text-sm font-bold text-teal-ink">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-5 text-lg font-bold">{a.t}</h3>
                <p className="mt-2 leading-relaxed text-muted">{a.d}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Divisions */}
      <Section tone="muted" labelledBy="divisions-heading">
        <Container>
          <SectionHeader
            eyebrow="Our Divisions"
            title={<span id="divisions-heading">Three Service Divisions, One Standard of Work.</span>}
            intro="Each division operates independently, and each is held to the same expectations for accuracy, communication, and care."
          />
          <div className="mt-14 divide-y divide-line border-y border-line">
            {services.map((s, i) => (
              <Link
                key={s.href}
                href={s.href}
                className="reveal group grid items-baseline gap-3 py-8 transition-colors hover:bg-white sm:grid-cols-12 sm:px-4"
              >
                <span className="font-display text-sm font-bold text-teal-ink sm:col-span-1">{s.number}</span>
                <span className={cx("font-display text-2xl font-bold sm:col-span-4", i === 1 ? "text-slate" : "text-slate", "group-hover:text-blue")}>
                  {s.label}
                </span>
                <span className="text-muted sm:col-span-6">{s.description}</span>
                <span aria-hidden className="hidden text-right font-display text-blue transition-transform group-hover:translate-x-1 sm:col-span-1 sm:block">
                  →
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* Commitment */}
      <Section labelledBy="commit-heading">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader
              eyebrow="Our Commitment"
              title={<span id="commit-heading">What Clients Can Expect From Us.</span>}
            />
            <ButtonLink href="/how-we-work" variant="secondary" arrow className="reveal mt-8">
              How We Work
            </ButtonLink>
          </div>
          <ul className="lg:col-span-7">
            {commitments.map((c) => (
              <li key={c} className="reveal flex gap-5 border-t border-line py-5 text-lg text-slate last:border-b">
                <span aria-hidden className="mt-3 h-[2px] w-5 shrink-0 bg-teal" />
                {c}
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}
