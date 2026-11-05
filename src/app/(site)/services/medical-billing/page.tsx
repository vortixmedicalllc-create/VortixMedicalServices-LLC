import type { Metadata } from "next";
import { JsonLd, pageMetadata, serviceSchema } from "@/lib/seo";
import { ButtonLink, Container, Eyebrow, ScopeNote, Section, SectionHeader, cx } from "@/components/ui/primitives";
import { CtaBand, DetailRow, FaqSection, PageHero } from "@/components/sections/Shared";
import { BillingVignette, RevenueCycleRing } from "@/components/illustrations/Illustrations";

const description =
  "Medical billing and revenue cycle support for healthcare organizations: eligibility verification, coding support, charge entry, claims submission, payment posting, denial management, and A/R follow-up.";

export const metadata: Metadata = pageMetadata({
  title: "Medical Billing Services",
  description,
  path: "/services/medical-billing",
});

const stages = [
  { phase: "Front end", items: ["Patient Registration", "Insurance Eligibility Verification"] },
  { phase: "Middle", items: ["Medical Coding Support", "Charge Entry", "Claims Preparation and Submission"] },
  { phase: "Back end", items: ["Payment Posting", "Denial Management", "Accounts Receivable Follow-up", "Insurance Follow-up", "Reporting and Analytics"] },
];

const codeSets = [
  {
    code: "ICD-10-CM",
    name: "International Classification of Diseases, 10th Revision, Clinical Modification",
    text: "Describes the patient's diagnoses and conditions. Diagnosis codes help establish why a service or item was medically necessary.",
  },
  {
    code: "CPT",
    name: "Current Procedural Terminology",
    text: "Describes the procedures and services performed by physicians and other healthcare professionals, such as office visits, tests, and surgeries.",
  },
  {
    code: "HCPCS Level II",
    name: "Healthcare Common Procedure Coding System",
    text: "Covers products, supplies, and services not included in CPT, including durable medical equipment, ambulance services, and certain drugs.",
  },
];

const denials = [
  { title: "Incorrect or incomplete information", text: "Typos in patient demographics, member IDs, or provider details are among the most common and most preventable causes of rejection." },
  { title: "Missing documentation", text: "Claims that require supporting records, such as medical necessity documentation, may be denied when those records are absent or incomplete." },
  { title: "Eligibility issues", text: "Coverage that was inactive, terminated, or assigned to a different primary payer on the date of service." },
  { title: "Authorization issues", text: "Services provided without a required prior authorization, or outside the approved dates or units." },
  { title: "Coding errors", text: "Mismatched diagnosis and procedure codes, missing modifiers, or codes that do not reflect the documentation." },
];

const faq = [
  {
    q: "What does medical billing support include?",
    a: "Our support covers the core revenue cycle steps: patient registration and eligibility verification, coding support, charge entry, claim preparation and submission, payment posting, denial management, and accounts receivable and insurance follow-up, along with regular reporting.",
  },
  {
    q: "Can you guarantee a specific collection rate or fewer denials?",
    a: "No responsible billing partner can guarantee reimbursement outcomes, because payers make the final decisions. What we can offer is organized, consistent processes designed to reduce preventable errors and keep follow-up timely.",
  },
  {
    q: "Do you work with our existing practice management or billing software?",
    a: "We aim to work within the systems you already use. Software access and workflow details are reviewed during onboarding.",
  },
  {
    q: "Can you help with an existing backlog of unpaid claims?",
    a: "Accounts receivable cleanup is a common reason organizations reach out. We can review the backlog with you during a consultation and discuss an appropriate approach.",
  },
  {
    q: "Do you provide reports?",
    a: "Yes. Reporting is part of the service, and the format and frequency are agreed during onboarding so the information is useful to your team.",
  },
];

export default function MedicalBillingPage() {
  const flat = stages.flatMap((s) => s.items);
  return (
    <>
      <JsonLd data={serviceSchema("Medical Billing and Revenue Cycle Support", description, "/services/medical-billing")} />
      <PageHero
        eyebrow="Service 02 · Medical Billing"
        title="Smarter Medical Billing. Stronger Revenue Cycle Management."
        crumbs={[{ label: "Services", href: "/services" }, { label: "Medical Billing" }]}
        intro="Accurate billing is how healthcare organizations are paid for the care they provide. We help manage the steps between a patient encounter and final payment with structure, consistency, and clear follow-up."
        actions={
          <>
            <ButtonLink href="/contact" arrow>
              Request a Consultation
            </ButtonLink>
            <ButtonLink href="#revenue-cycle" variant="secondary">
              See the Revenue Cycle
            </ButtonLink>
          </>
        }
        aside={<BillingVignette className="mx-auto h-auto w-full max-w-[460px]" />}
      />

      {/* Intro */}
      <Section labelledBy="billing-why">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow="Why It Matters" title={<span id="billing-why">Organized Billing Protects Your Revenue.</span>} />
          </div>
          <div className="reveal space-y-5 text-lg leading-relaxed text-muted lg:col-span-7">
            <p>
              Every claim depends on a chain of details: correct patient and coverage information, codes that reflect
              the documentation, timely submission, and persistent follow-up. A weak link anywhere in that chain can
              delay payment or result in a denial that takes far longer to resolve than it would have taken to prevent.
            </p>
            <p>
              Revenue cycle management brings those steps together into one organized process. Our billing support is
              designed to help your team keep claims accurate, keep accounts receivable current, and understand where
              revenue is being held up.
            </p>
          </div>
        </Container>
      </Section>

      {/* RCM visual */}
      <section id="revenue-cycle" aria-labelledby="rcm-heading" className="scroll-mt-24 bg-tint py-20 sm:py-28">
        <Container>
          <SectionHeader
            eyebrow="Revenue Cycle Management"
            title={<span id="rcm-heading">Ten Connected Stages, One Continuous Cycle.</span>}
            intro="Insights from the back end, such as denial trends, feed back into the front end so the same problems are not repeated."
          />
          <div className="mt-14 grid items-center gap-12 lg:grid-cols-12">
            <div className="reveal lg:col-span-5">
              <RevenueCycleRing count={flat.length} className="mx-auto h-auto w-full max-w-[420px]" />
            </div>
            <div className="grid gap-8 sm:grid-cols-3 lg:col-span-7 lg:grid-cols-3">
              {stages.map((s, si) => {
                const offset = stages.slice(0, si).reduce((n, x) => n + x.items.length, 0);
                return (
                  <div key={s.phase} className="reveal" style={{ transitionDelay: `${si * 80}ms` }}>
                    <p className={cx("border-t-[3px] pt-4 font-display text-xs font-bold uppercase tracking-[0.18em]", si === 0 ? "border-blue text-blue" : si === 1 ? "border-tube text-tube" : "border-teal text-teal-ink")}>
                      {s.phase}
                    </p>
                    <ol className="mt-4 space-y-3">
                      {s.items.map((it, i) => (
                        <li key={it} className="flex gap-3">
                          <a href={`#stage-${offset + i + 1}`} className="flex gap-3 text-slate hover:text-blue">
                            <span className="font-display text-sm font-bold text-muted">{String(offset + i + 1).padStart(2, "0")}</span>
                            <span className="text-[0.98rem] leading-snug">{it}</span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* Detailed stages */}
      <Section labelledBy="billing-services">
        <Container>
          <SectionHeader eyebrow="Our Services" title={<span id="billing-services">Billing Support, Stage by Stage.</span>} />
          <div className="mt-14">
            <DetailRow id="stage-1" index="01" title="Patient Registration" points={["Demographic accuracy", "Insurance card details captured correctly", "Guarantor and responsible party information", "Consistent intake standards"]}>
              <p>Clean claims start at registration. We help make sure patient demographics and insurance details are complete and accurate before services are billed.</p>
            </DetailRow>
            <DetailRow id="stage-2" index="02" title="Insurance Eligibility Verification" points={["Active coverage confirmation", "Copay, deductible, and coinsurance", "Primary and secondary payer order", "Authorization requirements"]}>
              <p>Verifying coverage before the date of service is one of the most effective ways to prevent denials and unexpected patient balances.</p>
            </DetailRow>
            <DetailRow id="stage-3" index="03" title="Medical Coding Support" points={["ICD-10-CM diagnosis coding", "CPT procedure coding", "HCPCS Level II codes", "Modifier review"]}>
              <p>Codes translate clinical documentation into the language payers use. Our coding support focuses on accuracy and consistency with the provider&apos;s documentation. Final clinical documentation remains the responsibility of the treating provider.</p>
            </DetailRow>
            <DetailRow id="stage-4" index="04" title="Charge Entry" points={["Timely charge capture", "Fee schedule alignment", "Place of service and provider details", "Missing charge reconciliation"]}>
              <p>We enter charges accurately and promptly so that services are billed with the correct codes, units, and details, and nothing is left unbilled.</p>
            </DetailRow>
            <DetailRow id="stage-5" index="05" title="Claims Preparation and Submission" points={["Claim scrubbing before submission", "Electronic and paper claims", "Clearinghouse rejection handling", "Timely filing awareness"]}>
              <p>Claims are reviewed for common errors before submission and sent to payers in the required format. Rejections at the clearinghouse level are corrected and resubmitted quickly.</p>
            </DetailRow>
            <DetailRow id="stage-6" index="06" title="Payment Posting" points={["ERA and EOB posting", "Adjustment and write-off coding", "Underpayment identification", "Patient responsibility transfer"]}>
              <p>Accurate posting of payments and adjustments keeps account balances correct and helps reveal underpayments and patterns worth investigating.</p>
            </DetailRow>
            <DetailRow id="stage-7" index="07" title="Denial Management" points={["Denial categorization", "Root cause identification", "Corrected claims and appeals", "Prevention feedback"]}>
              <p>Denials are reviewed, categorized, and worked based on their cause. Just as importantly, recurring causes are shared with your team so they can be prevented upstream.</p>
            </DetailRow>
            <DetailRow id="stage-8" index="08" title="Accounts Receivable Follow-up" points={["Aging review", "Prioritized work queues", "Unpaid and underpaid claims", "Backlog cleanup"]}>
              <p>Outstanding balances are reviewed regularly and prioritized by age and value, so that follow-up happens before claims become difficult or impossible to collect.</p>
            </DetailRow>
            <DetailRow id="stage-9" index="09" title="Insurance Follow-up" points={["Claim status inquiries", "Payer portal and phone follow-up", "Requests for additional information", "Documented outcomes"]}>
              <p>We contact payers about claims that have not been processed or paid, respond to information requests, and document every outcome.</p>
            </DetailRow>
            <DetailRow id="stage-10" index="10" title="Reporting and Analytics" points={["Accounts receivable aging", "Denial trends by cause and payer", "Collections overview", "Agreed reporting cadence"]}>
              <p>Regular reports help you see the health of your revenue cycle and make informed decisions. Report content and frequency are agreed during onboarding.</p>
            </DetailRow>
          </div>
        </Container>
      </Section>

      {/* Coding systems */}
      <Section tone="muted" labelledBy="codes-heading">
        <Container>
          <SectionHeader
            eyebrow="Coding Systems"
            title={<span id="codes-heading">The Code Sets Behind Every Claim.</span>}
            intro="Three standardized code sets are used on most claims in the United States. Each answers a different question about the encounter."
          />
          <div className="mt-14 grid gap-px overflow-hidden rounded-[6px] bg-line ring-1 ring-line lg:grid-cols-3">
            {codeSets.map((c, i) => (
              <article key={c.code} className="reveal bg-white p-8 lg:p-10" style={{ transitionDelay: `${i * 70}ms` }}>
                <p className={cx("font-display text-[1.7rem] font-extrabold tracking-[-0.02em]", i === 1 ? "text-teal-ink" : "text-blue")}>{c.code}</p>
                <h3 className="mt-3 text-[0.95rem] font-semibold leading-snug !text-muted">{c.name}</h3>
                <p className="mt-5 leading-relaxed text-muted">{c.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      {/* Denials */}
      <Section labelledBy="denial-heading">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader
              eyebrow="Denial Prevention"
              title={<span id="denial-heading">Common Reasons Claims Are Denied.</span>}
              intro="Many denials are preventable. Understanding the most frequent causes is the first step toward fewer of them."
            />
            <ScopeNote className="reveal mt-8">
              We focus on preventing avoidable errors and following up thoroughly. We do not promise guaranteed reimbursement
              or zero denials, because payers make the final determination on every claim.
            </ScopeNote>
          </div>
          <ol className="lg:col-span-7">
            {denials.map((d, i) => (
              <li key={d.title} className="reveal grid grid-cols-[3rem_1fr] border-t border-line py-6 last:border-b">
                <span className="font-display text-sm font-bold text-teal-ink">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg font-bold">{d.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{d.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <FaqSection items={faq} title="Medical Billing Questions" tone="muted" />

      <Section className="!py-16">
        <Container className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="reveal">
            <Eyebrow>Related Service</Eyebrow>
            <p className="mt-3 max-w-2xl font-display text-2xl font-bold text-slate">
              Billing runs smoother when DME orders arrive complete. See how we support DME operations.
            </p>
          </div>
          <ButtonLink href="/services/dme" variant="secondary" arrow className="reveal shrink-0">
            Explore DME Services
          </ButtonLink>
        </Container>
      </Section>

      <CtaBand
        title="Let's Review Your Revenue Cycle."
        text="Share where claims are getting stuck or where your team needs support, and we will follow up to discuss next steps."
        cta="Request a Consultation"
      />
    </>
  );
}
