import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { LegalPage } from "@/components/sections/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "The terms that govern use of the Vortix Medical Services website.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" intro="By accessing or using this website, you agree to the following terms.">
      <h2>Use of this website</h2>
      <p>
        This website is operated by {site.legalName} and provides general information about our business services. You
        agree to use it only for lawful purposes and not to interfere with its operation or security.
      </p>

      <h2>No professional advice</h2>
      <p>
        Content on this website, including articles in our resource center, is general information. It is not medical,
        legal, billing, coding, or compliance advice and should not be relied upon as such. Payer policies and regulations
        change; confirm current requirements with the appropriate authority or a qualified advisor.
      </p>

      <h2>No client relationship</h2>
      <p>
        Submitting an inquiry or communicating with us through this website does not create a client relationship. Services
        are provided only under a separate written agreement.
      </p>

      <h2>Do not submit health information</h2>
      <p>
        You agree not to submit protected health information or other sensitive personal information through this website.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The Vortix name, logo, and website content are the property of {site.legalName} or its licensors and may not be
        used without permission.
      </p>

      <h2>Disclaimer and limitation of liability</h2>
      <p>
        This website is provided &quot;as is&quot; without warranties of any kind. To the fullest extent permitted by law,
        we are not liable for any damages arising from your use of the website.
      </p>

      <h2>Third-party links</h2>
      <p>We are not responsible for the content or practices of websites we link to.</p>

      <h2>Changes</h2>
      <p>We may update these terms from time to time. The date at the top of this page reflects the latest revision.</p>

      <h2>Governing law</h2>
      <p>
        {/* OWNER ACTION: specify the governing state once confirmed by counsel. */}
        These terms are governed by the laws of the United States and the state in which {site.legalName} is organized,
        without regard to conflict of law principles.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms may be sent through our <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
