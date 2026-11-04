import type { Metadata } from "next";
import { ArrowRight, CornerDownLeft, UserCheck } from "lucide-react";
import { JsonLd, pageMetadata, serviceSchema } from "@/lib/seo";
import { ButtonLink, Container, Eyebrow, ScopeNote, Section, SectionHeader, cx } from "@/components/ui/primitives";
import { CtaBand, FaqSection, PageHero } from "@/components/sections/Shared";
import { AiVignette } from "@/components/illustrations/Illustrations";

const description =
  "Practical AI and automation for healthcare administration: documentation assistance, voice agents, chatbots, document processing, billing workflow automation, and operational analytics, always with human review.";

export const metadata: Metadata = pageMetadata({
  title: "AI Services",
  description,
  path: "/services/ai",
});

/**
 * OWNER ACTION: set `status` to "available" only for capabilities Vortix
 * currently delivers. All others are shown as solutions scoped per engagement.
 */
type Status = "available" | "custom";

const modules: {
  slug: string;
  title: string;
  status: Status;
  does: string;
  how: string;
  application: string;
  benefit: string;
}[] = [
  {
    slug: "documentation",
    title: "AI Medical Documentation",
    status: "custom",
    does: "Assists with drafting administrative and clinical documentation, such as visit note drafts, summaries, and correspondence, from structured inputs or dictation.",
    how: "Source material is captured, the AI produces a draft in an agreed format, and the responsible clinician or staff member reviews, edits, and approves it before it becomes part of any record.",
    application: "Practices and clinics where providers and staff spend significant time on documentation after hours.",
    benefit: "Less time spent on first drafts, with the responsible professional remaining the author of record.",
  },
  {
    slug: "voice-agents",
    title: "AI Voice Agents",
    status: "custom",
    does: "Handles routine inbound or outbound calls, such as appointment reminders, order status questions, or refill confirmations, using natural spoken conversation.",
    how: "The agent follows approved scripts and business rules, recognizes when a request falls outside its scope, and transfers the caller or creates a task for staff.",
    application: "Organizations with high call volumes for predictable, non-clinical questions.",
    benefit: "Routine calls are handled consistently, and staff time is freed for conversations that need a person.",
  },
  {
    slug: "chatbots",
    title: "AI Chatbots",
    status: "custom",
    does: "Answers common questions on a website or internal portal, such as hours, service information, required documents, or process steps.",
    how: "Responses are grounded in content your organization approves. Questions outside that scope are routed to your team rather than answered by guesswork.",
    application: "Public websites and internal staff help desks with repetitive questions.",
    benefit: "Faster answers for routine questions and fewer interruptions for staff.",
  },
  {
    slug: "document-processing",
    title: "Intelligent Document Processing",
    status: "custom",
    does: "Reads incoming documents such as referrals, orders, and faxes, classifies them, and extracts key information into structured fields.",
    how: "Documents are captured, classified by type, and key fields are extracted with confidence indicators. Low-confidence results are flagged for a person to verify.",
    application: "DME providers and practices that receive large volumes of faxed or scanned paperwork.",
    benefit: "Less manual data entry and faster routing of documents to the right queue.",
  },
  {
    slug: "billing-automation",
    title: "Medical Billing Workflow Automation",
    status: "custom",
    does: "Automates repetitive billing tasks such as claim status checks, work queue assignment, and preparing information for follow-up.",
    how: "Rules and AI-assisted steps run within agreed boundaries. Billing staff review exceptions and approve any action that affects a claim or account.",
    application: "Billing teams managing large volumes of routine follow-up.",
    benefit: "More staff time for complex accounts and denials that require judgment.",
  },
  {
    slug: "insurance-extraction",
    title: "Insurance Information Extraction",
    status: "custom",
    does: "Captures payer, member, and plan details from insurance cards and eligibility responses into structured data.",
    how: "Information is extracted from the provided image or response, checked against expected formats, and presented for staff confirmation before it is saved.",
    application: "Registration and intake teams entering coverage information manually.",
    benefit: "Fewer keying errors in the details that most often cause claim rejections.",
  },
  {
    slug: "workflow-automation",
    title: "Workflow Automation",
    status: "custom",
    does: "Connects the steps between systems and teams, such as creating tasks, sending notifications, and moving work between queues when conditions are met.",
    how: "Workflows are mapped with your team, automated step by step, and monitored. Exceptions are routed to a person.",
    application: "Any repetitive administrative process with clear rules and handoffs.",
    benefit: "Fewer dropped handoffs and more predictable turnaround times.",
  },
  {
    slug: "analytics",
    title: "AI-Powered Operational Analytics",
    status: "custom",
    does: "Summarizes operational data such as volumes, turnaround times, and denial patterns to highlight trends and potential issues.",
    how: "Data from agreed sources is organized and analyzed, and findings are presented in plain language for leadership and operations teams to review.",
    application: "Leaders who need a clearer view of operational performance.",
    benefit: "Earlier visibility into bottlenecks and better-informed decisions.",
  },
];

const flow = [
  { title: "Information Input", text: "Documents, calls, forms, or data enter the workflow." },
  { title: "AI Processing", text: "Content is classified, extracted, drafted, or summarized." },
  { title: "Generated Output", text: "Results are produced with clear confidence indicators." },
  { title: "Human Review", text: "A qualified person checks, edits, and approves.", human: true },
  { title: "Approved Workflow", text: "Only approved output moves into your systems." },
];

const faq = [
  {
    q: "Does AI make medical decisions?",
    a: "No. The AI solutions we discuss support administrative and operational work. They do not diagnose, prescribe, or make clinical or final medical decisions. Qualified people review and approve outputs before they are used.",
  },
  {
    q: "Are these ready-made products?",
    a: "The capabilities on this page are service categories that are scoped and configured for each organization. During a consultation, we discuss which are appropriate for your needs, what would be involved, and what is realistic for your environment.",
  },
  {
    q: "How is sensitive information protected?",
    a: "Any solution that involves patient information is designed with access controls, minimum necessary data use, and appropriate agreements and security review before it is deployed. We do not use the public contact form to collect patient information.",
  },
  {
    q: "Will AI replace our staff?",
    a: "The goal is to reduce repetitive work so your team can focus on tasks that require experience and judgment. People remain responsible for reviewing outputs and handling exceptions.",
  },
  {
    q: "Where should an organization start with AI?",
    a: "Usually with one well-defined, repetitive process that has clear rules and measurable volume, such as document intake or claim status checks. Starting small makes it easier to evaluate results and build confidence.",
  },
];

export default function AiPage() {
  return (
    <>
      <JsonLd data={serviceSchema("AI and Automation Services for Healthcare Operations", description, "/services/ai")} />
      <PageHero
        eyebrow="Service 03 · AI Services"
        title="Intelligent AI Solutions for Modern Healthcare."
        crumbs={[{ label: "Services", href: "/services" }, { label: "AI Services" }]}
        intro="Practical AI and automation capabilities designed to simplify administrative work and support more connected healthcare operations."
        actions={
          <>
            <ButtonLink href="/contact" arrow>
              Discuss an AI Project
            </ButtonLink>
            <ButtonLink href="#modules" variant="secondary">
              View Capabilities
            </ButtonLink>
          </>
        }
        aside={<AiVignette className="mx-auto h-auto w-full max-w-[460px]" />}
      />

      {/* Principles */}
      <Section labelledBy="ai-principles">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow="Our Approach" title={<span id="ai-principles">Useful Technology, Applied Responsibly.</span>} />
          </div>
          <div className="reveal space-y-5 text-lg leading-relaxed text-muted lg:col-span-7">
            <p>
              Healthcare administration involves a great deal of reading, typing, checking, and routing. Much of it
              follows clear rules, which makes it well suited to careful automation. Our AI services focus on those
              practical tasks rather than on technology for its own sake.
            </p>
            <ul className="!mt-8 grid gap-4 text-[1.02rem] text-slate sm:grid-cols-2">
              {[
                "People review and approve outputs",
                "AI never makes final medical decisions",
                "Solutions are scoped to a defined process",
                "Privacy and access controls are designed in from the start",
              ].map((p) => (
                <li key={p} className="flex gap-3">
                  <span aria-hidden className="mt-[0.7rem] h-[2px] w-3 shrink-0 bg-teal" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* Workflow diagram */}
      <section aria-labelledby="ai-flow" className="bg-slate-deep py-20 text-white sm:py-28">
        <Container>
          <SectionHeader
            tone="light"
            eyebrow="How It Works"
            title={<span id="ai-flow">Every Workflow Includes a Human Checkpoint.</span>}
            intro="AI produces a result. A person decides whether it is right. Only approved output moves forward."
          />
          <ol className="mt-16 grid gap-4 lg:grid-cols-5 lg:gap-0">
            {flow.map((f, i) => (
              <li key={f.title} className="reveal relative flex lg:block" style={{ transitionDelay: `${i * 90}ms` }}>
                <div
                  className={cx(
                    "relative flex-1 rounded-[6px] p-6 lg:mr-8 lg:min-h-[200px]",
                    f.human ? "bg-teal text-white" : "bg-white/[0.04] ring-1 ring-inset ring-white/12",
                  )}
                >
                  <span className={cx("font-display text-xs font-bold tracking-[0.18em]", f.human ? "text-white" : "text-teal-soft")}>
                    STEP {String(i + 1).padStart(2, "0")}
                  </span>
                  {f.human && <UserCheck aria-hidden className="absolute right-5 top-5 size-5" />}
                  <h3 className="mt-4 text-lg font-bold !text-white">{f.title}</h3>
                  <p className={cx("mt-2 text-[0.95rem] leading-relaxed", f.human ? "text-white/90" : "text-white/65")}>{f.text}</p>
                </div>
                {i < flow.length - 1 && (
                  <ArrowRight aria-hidden className="absolute right-1 top-1/2 hidden size-5 -translate-y-1/2 text-teal-soft lg:block" />
                )}
              </li>
            ))}
          </ol>
          <p className="reveal mt-6 flex items-center gap-3 text-sm text-white/70 lg:ml-[60%]">
            <CornerDownLeft aria-hidden className="size-4 text-teal-soft" />
            Corrections at review are returned to improve the next result.
          </p>
        </Container>
      </section>

      {/* Modules */}
      <Section id="modules" labelledBy="modules-heading" className="scroll-mt-20">
        <Container className="grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <SectionHeader eyebrow="Capabilities" title={<span id="modules-heading">AI Service Areas</span>} />
              <ScopeNote className="reveal mt-6">
                These are service categories that are scoped and configured for each client. Availability, timelines,
                and technical requirements are confirmed during consultation. They are not presented as ready-made
                products.
              </ScopeNote>
              <nav aria-label="AI service areas" className="reveal mt-8 hidden lg:block">
                <ol className="space-y-1 border-l border-line">
                  {modules.map((m, i) => (
                    <li key={m.slug}>
                      <a href={`#${m.slug}`} className="-ml-px flex gap-3 border-l-2 border-transparent py-1.5 pl-4 text-[0.95rem] text-muted transition-colors hover:border-blue hover:text-blue">
                        <span className="font-display text-xs font-bold leading-6 text-teal-ink">{String(i + 1).padStart(2, "0")}</span>
                        {m.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </aside>
          <div className="space-y-6 lg:col-span-8">
            {modules.map((m, i) => (
              <article key={m.slug} id={m.slug} className="reveal scroll-mt-28 rounded-[6px] border border-line bg-white p-7 sm:p-9">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="font-display text-sm font-bold text-teal-ink">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-2 text-[1.45rem] font-bold">{m.title}</h3>
                  </div>
                  <span
                    className={cx(
                      "rounded-[3px] px-2.5 py-1 font-display text-[0.7rem] font-semibold uppercase tracking-[0.12em]",
                      m.status === "available" ? "bg-teal text-white" : "bg-tint text-blue-deep",
                    )}
                  >
                    {m.status === "available" ? "Available" : "Scoped per engagement"}
                  </span>
                </div>
                <dl className="mt-7 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                  {[
                    ["What it does", m.does],
                    ["How the workflow operates", m.how],
                    ["Business application", m.application],
                    ["Operational benefit", m.benefit],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="eyebrow !text-[0.68rem] !text-slate">{k}</dt>
                      <dd className="mt-2 leading-relaxed text-muted">{v}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <FaqSection items={faq} title="AI Services Questions" tone="muted" />

      <Section className="!py-16">
        <Container className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="reveal">
            <Eyebrow>Where AI Helps Most</Eyebrow>
            <p className="mt-3 max-w-2xl font-display text-2xl font-bold text-slate">
              Automation works best on well-run processes. See how we support DME operations and medical billing.
            </p>
          </div>
          <div className="reveal flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/services/dme" variant="secondary">DME Services</ButtonLink>
            <ButtonLink href="/services/medical-billing" variant="secondary">Medical Billing</ButtonLink>
          </div>
        </Container>
      </Section>

      <CtaBand
        title="Explore What AI Could Do for Your Operations."
        text="Tell us which processes take the most manual effort. We will follow up to discuss whether and how automation could help."
        cta="Start a Conversation"
      />
    </>
  );
}
