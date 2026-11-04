import type { Metadata } from "next";
import { ShieldAlert, Mail, Phone, Clock } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Request a consultation with Vortix Medical Services about DME support, medical billing, or AI services for your healthcare organization.",
  path: "/contact",
});

export default function ContactPage() {
  const { email, phone, hours } = site.contact;
  return (
    <section className="bg-surface-muted">
      <Container className="grid gap-12 pb-24 pt-14 lg:grid-cols-12 lg:gap-16 lg:pt-20">
        <div className="lg:col-span-5">
          <Eyebrow>Contact Us</Eyebrow>
          <h1 className="mt-5 text-[2.35rem] font-bold leading-[1.08] sm:text-5xl">Let&apos;s Talk About Your Healthcare Operations.</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            Tell us about your organization and the services you are interested in.
          </p>

          <div className="mt-10 space-y-6 border-t border-line pt-8">
            <h2 className="eyebrow !text-slate">What happens next</h2>
            <ol className="space-y-5">
              {[
                ["Review", "Our team reviews your inquiry and the services you selected."],
                ["Follow-up", "We contact you to arrange an introductory conversation."],
                ["Consultation", "We discuss your needs and whether our services are a good fit."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-display text-xs font-bold text-blue ring-1 ring-line">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-display font-semibold text-slate">{t}</p>
                    <p className="mt-0.5 text-[0.98rem] text-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {(email || phone || hours) && (
            <ul className="mt-10 space-y-3 border-t border-line pt-8 text-muted">
              {email && (
                <li className="flex gap-3"><Mail aria-hidden className="mt-1 size-4 text-teal-ink" /><a className="hover:text-blue" href={`mailto:${email}`}>{email}</a></li>
              )}
              {phone && (
                <li className="flex gap-3"><Phone aria-hidden className="mt-1 size-4 text-teal-ink" /><a className="hover:text-blue" href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a></li>
              )}
              {hours && (
                <li className="flex gap-3"><Clock aria-hidden className="mt-1 size-4 text-teal-ink" />{hours}</li>
              )}
            </ul>
          )}

          <div className="mt-10 flex gap-4 rounded-[6px] border border-line bg-white p-5">
            <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-blue" />
            <p className="text-[0.95rem] leading-relaxed text-muted">
              <strong className="text-slate">This form is for business inquiries only.</strong> Please do not submit
              patient names, medical records, insurance card information, prescriptions, or any other protected health
              information.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <ContactForm fallbackEmail={email} />
        </div>
      </Container>
    </section>
  );
}
