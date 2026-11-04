import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ButtonLink, Container, ScopeNote, Section, SectionHeader } from "@/components/ui/primitives";
import { CtaBand, PageHero } from "@/components/sections/Shared";

export const metadata: Metadata = pageMetadata({
  title: "How We Work",
  description:
    "From initial inquiry to ongoing review, learn how Vortix Medical Services plans, aligns, and delivers healthcare operations support.",
  path: "/how-we-work",
});

const journey = [
  {
    t: "Initial Inquiry",
    d: "You reach out through our contact form with a brief description of your organization and what you need help with.",
    you: "Share your organization type, services of interest, and a contact person.",
    us: "Review your inquiry and arrange an introductory conversation.",
  },
  {
    t: "Needs Assessment",
    d: "We discuss your current workflows, volumes, systems, and the challenges your team is facing.",
    you: "Walk us through how the work is handled today and where it gets stuck.",
    us: "Ask detailed questions and identify where support would make the most difference.",
  },
  {
    t: "Service Planning",
    d: "We recommend an appropriate scope of services and outline how the engagement would work.",
    you: "Review the proposed scope, responsibilities, and expectations.",
    us: "Prepare a clear plan, including any agreements required before work begins.",
  },
  {
    t: "Workflow Alignment",
    d: "We map how our work fits into your systems and processes, including access, communication, and handoffs.",
    you: "Provide access to the agreed systems and introduce key contacts.",
    us: "Document workflows, checklists, and escalation paths.",
  },
  {
    t: "Service Implementation",
    d: "Work begins according to the agreed plan, typically with closer communication in the early weeks.",
    you: "Answer questions as they arise and share feedback early.",
    us: "Deliver the agreed services and report on progress.",
  },
  {
    t: "Ongoing Communication and Review",
    d: "We review results with you regularly and refine the workflow as your needs evolve.",
    you: "Join periodic reviews and tell us what is changing in your organization.",
    us: "Share reports, raise issues early, and recommend improvements.",
  },
];

export default function HowWeWorkPage() {
  return (
    <>
      <PageHero
        eyebrow="How We Work"
        title="A Clear, Collaborative Path From First Conversation to Ongoing Support."
        crumbs={[{ label: "How We Work" }]}
        intro="Good operational support depends on understanding before action. Our client journey is designed to make expectations clear on both sides."
        actions={<ButtonLink href="/contact" arrow>Start a Conversation</ButtonLink>}
      />

      <Section labelledBy="journey-heading">
        <Container>
          <SectionHeader eyebrow="The Client Journey" title={<span id="journey-heading">Six Stages of Working Together.</span>} />
          <ScopeNote className="reveal mt-6 max-w-2xl">
            The actual onboarding process may differ depending on the selected service, the size of your organization, and
            the systems involved. We confirm the specific steps with you during service planning.
          </ScopeNote>

          <ol className="relative mt-16">
            <span aria-hidden className="absolute bottom-6 left-[23px] top-6 w-[2px] bg-[linear-gradient(180deg,var(--brand-blue),var(--brand-tube),var(--brand-teal))] lg:left-1/2 lg:-translate-x-1/2" />
            {journey.map((s, i) => {
              const right = i % 2 === 1;
              return (
                <li key={s.t} className="reveal relative grid grid-cols-[48px_1fr] gap-6 pb-14 last:pb-0 lg:grid-cols-2 lg:gap-24">
                  <span className="relative z-10 grid size-12 place-items-center rounded-full bg-white font-display text-sm font-bold text-slate ring-[3px] ring-blue lg:absolute lg:left-1/2 lg:top-0 lg:-translate-x-1/2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className={right ? "lg:col-start-2" : "lg:col-start-1 lg:text-right"}>
                    <h3 className="text-[1.45rem] font-bold">{s.t}</h3>
                    <p className="mt-2 text-lg leading-relaxed text-muted">{s.d}</p>
                    <dl className={`mt-5 grid gap-4 rounded-[6px] bg-surface-muted p-5 text-left sm:grid-cols-2 ${right ? "" : "lg:ml-auto"} max-w-xl`}>
                      <div>
                        <dt className="eyebrow !text-[0.66rem]">Your role</dt>
                        <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-slate">{s.you}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow !text-[0.66rem] !text-blue">Our role</dt>
                        <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-slate">{s.us}</dd>
                      </div>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ol>
        </Container>
      </Section>

      <Section tone="tint" labelledBy="principles-heading">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow="Throughout the Engagement" title={<span id="principles-heading">What Stays Constant.</span>} />
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-7">
            {[
              ["Defined points of contact", "You will know who to reach and how, and we will do the same on our side."],
              ["Documented workflows", "Processes are written down so they can be followed consistently and improved deliberately."],
              ["Appropriate access only", "We request access only to the systems and information needed for the agreed work."],
              ["Transparent reporting", "Progress and issues are shared openly, in a format agreed with your team."],
            ].map(([t, d]) => (
              <div key={t} className="reveal border-t-2 border-teal pt-5">
                <h3 className="text-lg font-bold">{t}</h3>
                <p className="mt-2 leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <CtaBand title="Ready to Talk About Your Operations?" text="The first step is a conversation. Tell us about your organization and we will take it from there." cta="Start a Conversation" />
    </>
  );
}
