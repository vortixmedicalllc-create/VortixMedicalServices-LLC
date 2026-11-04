import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, pageMetadata, serviceSchema } from "@/lib/seo";
import { ButtonLink, Container, Eyebrow, ScopeNote, Section, SectionHeader } from "@/components/ui/primitives";
import { CtaBand, DetailRow, FaqSection, PageHero, ProcessTimeline } from "@/components/sections/Shared";
import { DmeVignette, EquipmentIcon, type EquipmentKey } from "@/components/illustrations/Illustrations";

const description =
  "Operational support for durable medical equipment providers: referral intake, insurance eligibility verification, documentation review, prior authorization coordination, and order coordination.";

export const metadata: Metadata = pageMetadata({
  title: "DME Services",
  description,
  path: "/services/dme",
});

const equipment: { key: EquipmentKey; name: string }[] = [
  { key: "wheelchair", name: "Wheelchairs" },
  { key: "bed", name: "Hospital beds" },
  { key: "walker", name: "Walkers" },
  { key: "cpap", name: "CPAP and BiPAP machines" },
  { key: "oxygen", name: "Oxygen equipment" },
  { key: "nebulizer", name: "Nebulizers" },
  { key: "lift", name: "Patient lifts" },
  { key: "diabetic", name: "Diabetic testing supplies" },
  { key: "wound", name: "Wound care supplies" },
];

const faq = [
  {
    q: "Does Vortix sell, stock, or deliver medical equipment?",
    a: "No. Vortix provides administrative and operational support to DME providers. Your organization remains the supplier of record and is responsible for dispensing, delivering, and servicing equipment. We help coordinate the paperwork and communication around those steps.",
  },
  {
    q: "Which types of equipment can you support?",
    a: "Our processes are designed for common DME categories such as mobility equipment, hospital beds, respiratory equipment including CPAP, BiPAP, oxygen, and nebulizers, patient lifts, and supplies such as diabetic testing and wound care products. Specific coverage and documentation rules vary by payer and item.",
  },
  {
    q: "Can you work within our existing systems?",
    a: "In most cases, yes. During onboarding we review the software, intake channels, and communication methods your team already uses and agree on how our work will fit into them.",
  },
  {
    q: "Do you handle prior authorizations?",
    a: "We coordinate prior authorization requests where a payer requires them, which includes gathering the necessary documentation, submitting requests through the appropriate channels, and tracking status. Payers make all authorization decisions.",
  },
  {
    q: "Can DME support be combined with billing services?",
    a: "Yes, if it suits your organization. Combining the two can reduce handoffs between documentation and claims, but each service is available on its own.",
  },
];

export default function DmePage() {
  return (
    <>
      <JsonLd data={serviceSchema("DME Operational Support", description, "/services/dme")} />
      <PageHero
        eyebrow="Service 01 · DME Services"
        title="Reliable DME Support for Better Healthcare Operations."
        crumbs={[{ label: "Services", href: "/services" }, { label: "DME Services" }]}
        intro="Durable medical equipment helps patients recover, manage chronic conditions, and stay independent at home. For the providers who supply it, every order involves careful intake, verification, and documentation. We help manage that work."
        actions={
          <>
            <ButtonLink href="/contact" arrow>
              Request a Consultation
            </ButtonLink>
            <ButtonLink href="#workflow" variant="secondary">
              View the Workflow
            </ButtonLink>
          </>
        }
        aside={<DmeVignette className="mx-auto w-full max-w-[420px]" />}
      />

      {/* Overview */}
      <Section labelledBy="dme-overview">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow="Overview" title={<span id="dme-overview">DME Services Overview</span>} />
          </div>
          <div className="reveal space-y-5 text-lg leading-relaxed text-muted lg:col-span-7">
            <p>
              Supplying durable medical equipment is as much an administrative task as a logistical one. Before an item
              reaches a patient, a provider typically needs a valid order, confirmation of coverage, supporting clinical
              documentation, and, for some items, prior authorization. Missing any of these can delay care and lead to
              denied or delayed reimbursement.
            </p>
            <p>
              Vortix supports DME providers with the operational steps around each order, helping your team keep
              referrals moving, paperwork complete, and everyone informed.
            </p>
            <ScopeNote className="!mt-8">
              <strong className="text-slate">Our role is operational support.</strong> Vortix does not manufacture, stock,
              sell, dispense, or deliver equipment. Your organization remains the supplier, and we work alongside your
              team on the administrative workflow.
            </ScopeNote>
          </div>
        </Container>
      </Section>

      {/* Equipment examples */}
      <Section tone="tint" labelledBy="equipment-heading">
        <Container>
          <SectionHeader
            eyebrow="Equipment Categories"
            title={<span id="equipment-heading">Supporting Providers Across Common DME Categories.</span>}
            intro="Documentation and coverage requirements differ by item and payer. Our workflows account for those differences."
          />
          <ul className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-[6px] bg-line ring-1 ring-line sm:grid-cols-3 lg:grid-cols-9">
            {equipment.map((e, i) => (
              <li key={e.key} className="reveal flex flex-col items-center bg-white px-3 py-8 text-center" style={{ transitionDelay: `${(i % 9) * 40}ms` }}>
                <EquipmentIcon name={e.key} className={`size-14 ${i % 2 ? "text-teal-ink" : "text-blue"}`} />
                <span className="mt-4 font-display text-[0.82rem] font-semibold leading-snug text-slate">{e.name}</span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Detailed services */}
      <Section labelledBy="dme-services">
        <Container>
          <SectionHeader
            eyebrow="What We Support"
            title={<span id="dme-services">Operational Support at Every Stage of an Order.</span>}
          />
          <div className="mt-14">
            <DetailRow index="01" title="Patient Referral and Intake" points={["Referral receipt and logging", "Patient demographic capture", "Missing information follow-up", "Status updates to referral sources"]}>
              <p>
                Referrals arrive from many directions: physician offices, hospitals, discharge planners, and patients
                themselves. We help organize incoming referrals, confirm that the information needed to begin an order is
                present, and follow up when something is missing.
              </p>
            </DetailRow>
            <DetailRow index="02" title="Insurance Eligibility Verification" points={["Active coverage confirmation", "DME benefit and cost-sharing details", "Prior authorization requirements", "Coordination of benefits checks"]}>
              <p>
                We confirm the patient&apos;s coverage and DME benefits before an order proceeds, including deductibles,
                coinsurance, and whether authorization is required. Early verification helps prevent surprises for the
                provider and the patient.
              </p>
            </DetailRow>
            <DetailRow index="03" title="Prescription and Documentation Review" points={["Standard written order completeness", "Face-to-face and medical necessity documentation", "Signature and date checks", "Item-specific requirements"]}>
              <p>
                Payers expect specific elements in prescriptions and supporting records, and requirements differ by
                item. We review documentation against applicable checklists and flag gaps so they can be resolved with
                the ordering practitioner before the order moves forward.
              </p>
            </DetailRow>
            <DetailRow index="04" title="Prior Authorization Coordination" points={["Requirement identification", "Packet assembly and submission", "Status tracking", "Follow-up on additional requests"]}>
              <p>
                When a payer requires prior authorization, we coordinate the request: assembling documentation,
                submitting through the appropriate channel, and tracking it until a determination is made. Payers make
                all authorization decisions.
              </p>
            </DetailRow>
            <DetailRow index="05" title="Equipment Order Management" points={["Order status tracking", "Communication with your fulfillment team", "Exception and hold management", "Organized order records"]}>
              <p>
                Once an order is cleared, we help keep it on track inside your systems so that your team always knows
                which orders are ready, which are waiting on information, and which need attention.
              </p>
            </DetailRow>
            <DetailRow index="06" title="Delivery Coordination" points={["Scheduling communication", "Proof of delivery collection", "Confirmation logging", "Handoff to billing"]}>
              <p>
                Your organization handles the physical delivery and setup. We support the surrounding administration,
                such as scheduling communication and making sure proof of delivery documentation is collected and filed.
              </p>
            </DetailRow>
            <DetailRow index="07" title="Billing and Claims Coordination" points={["Claim readiness checks", "Handoff to billing teams", "Rental and capped rental tracking", "Denial feedback loops"]}>
              <p>
                DME claims depend on complete documentation and correct modifiers. We help confirm that an order is
                claim-ready and coordinate with your billing team, or with our{" "}
                <Link href="/services/medical-billing" className="text-blue underline underline-offset-4">Medical Billing</Link>{" "}
                division if you choose to engage it.
              </p>
              <ScopeNote className="mt-5">Availability and scope of this service are confirmed during consultation.</ScopeNote>
            </DetailRow>
            <DetailRow index="08" title="Recurring Supply and Refill Coordination" points={["Refill reminder workflows", "Need and usage confirmation", "Documentation renewal tracking", "Reorder scheduling"]}>
              <p>
                Many supplies, such as CPAP replacement parts and diabetic testing supplies, are provided on a recurring
                basis with their own documentation and contact requirements. We help organize refill workflows so they
                are timely and well documented.
              </p>
              <ScopeNote className="mt-5">Availability and scope of this service are confirmed during consultation.</ScopeNote>
            </DetailRow>
          </div>
        </Container>
      </Section>

      {/* Workflow */}
      <section id="workflow" aria-labelledby="dme-workflow" className="scroll-mt-24 bg-slate py-20 text-white sm:py-28">
        <Container>
          <SectionHeader
            tone="light"
            eyebrow="DME Operations Workflow"
            title={<span id="dme-workflow">From Referral to Follow-Up, One Organized Path.</span>}
            intro="A typical order moves through six stages. The exact steps depend on the item, the payer, and your internal processes."
          />
          <ProcessTimeline
            tone="dark"
            className="mt-16"
            steps={[
              { title: "Patient Referral", text: "Referral received, logged, and checked for completeness." },
              { title: "Insurance Verification", text: "Coverage, benefits, and requirements confirmed." },
              { title: "Documentation Review", text: "Orders and records checked against requirements." },
              { title: "Authorization", text: "Requested and tracked when the payer requires it.", note: "Where required" },
              { title: "Order and Delivery", text: "Order coordinated with your team and delivery documented." },
              { title: "Billing and Follow-up", text: "Claim readiness confirmed and handed off for billing." },
            ]}
          />
        </Container>
      </section>

      <FaqSection items={faq} title="DME Services Questions" />

      <Section tone="muted" className="!py-16">
        <Container className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="reveal">
            <Eyebrow>Related Service</Eyebrow>
            <p className="mt-3 max-w-2xl font-display text-2xl font-bold text-slate">
              Pair DME support with medical billing for fewer handoffs between documentation and claims.
            </p>
          </div>
          <ButtonLink href="/services/medical-billing" variant="secondary" arrow className="reveal shrink-0">
            Explore Medical Billing
          </ButtonLink>
        </Container>
      </Section>

      <CtaBand
        title="Let's Talk About Your DME Operations."
        text="Tell us about your order volume, payer mix, and where your team spends the most time. We will follow up to arrange a consultation."
        cta="Request a Consultation"
      />
    </>
  );
}
