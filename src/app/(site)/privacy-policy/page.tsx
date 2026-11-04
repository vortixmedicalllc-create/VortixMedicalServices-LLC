import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { LegalPage } from "@/components/sections/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Vortix Medical Services collects, uses, and protects information submitted through this website.",
  path: "/privacy-policy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what information we collect through this website, how we use it, and the choices available to you."
    >
      <h2>Scope</h2>
      <p>
        This Privacy Policy applies to the public website operated by {site.legalName} (&quot;Vortix,&quot; &quot;we,&quot;
        &quot;us&quot;). It does not govern services we provide to clients under separate written agreements, which are
        subject to the terms of those agreements.
      </p>

      <h2>Information we collect</h2>
      <h3>Information you provide</h3>
      <p>
        When you submit our business inquiry form, we collect the information you provide: your name, business email,
        company name, job title, optional phone number, service of interest, and your message.
      </p>
      <h3>Information collected automatically</h3>
      <p>
        Like most websites, our hosting infrastructure may record technical information such as IP address, browser
        type, and pages visited, for security and operational purposes.
        {/* OWNER ACTION: if analytics or advertising tools are added, describe them here. */}
      </p>

      <h2>Protected health information</h2>
      <p>
        This website is not intended to collect protected health information (PHI). Please do not submit patient names,
        medical records, insurance details, prescriptions, or other health information through our website. Any
        information we handle on behalf of clients is managed under separate agreements and appropriate safeguards, not
        through this public website.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To respond to your inquiry and arrange consultations</li>
        <li>To operate, maintain, and secure the website</li>
        <li>To comply with legal obligations</li>
      </ul>
      <p>We do not sell personal information submitted through this website.</p>

      <h2>Sharing</h2>
      <p>
        We may share information with service providers who help us operate the website and deliver inquiry messages,
        subject to confidentiality obligations, or when required by law.
      </p>

      <h2>Retention and security</h2>
      <p>
        We keep inquiry information only as long as reasonably necessary for the purposes described above and use
        reasonable administrative and technical measures to protect it. No method of transmission over the internet is
        completely secure.
      </p>

      <h2>Your choices</h2>
      <p>
        You may request access to, correction of, or deletion of personal information you have submitted to us, subject
        to applicable law. Depending on your state of residence, you may have additional rights.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions, please reach us through our <Link href="/contact">contact page</Link>
        {site.contact.email ? <> or at <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></> : null}.
      </p>
    </LegalPage>
  );
}
