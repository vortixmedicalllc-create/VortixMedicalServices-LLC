import Image from "next/image";
import Link from "next/link";
import { Mail, Phone, Clock, MapPin } from "lucide-react";
import { services, site } from "@/lib/site";
import { Container } from "@/components/ui/primitives";

const company = [
  { label: "About Us", href: "/about" },
  { label: "How We Work", href: "/how-we-work" },
  { label: "Resources", href: "/resources" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  const year = new Date().getFullYear();
  const { email, phone, hours, address } = site.contact;
  const socials = [
    site.social.linkedin && { href: site.social.linkedin, label: "LinkedIn" },
    site.social.facebook && { href: site.social.facebook, label: "Facebook" },
    site.social.x && { href: site.social.x, label: "X" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <footer className="relative border-t border-line bg-surface-muted">
      {/* thin brand bar: the logo's blue-to-teal stethoscope blend */}
      <div aria-hidden className="h-[3px] bg-[linear-gradient(90deg,var(--brand-blue),var(--brand-tube),var(--brand-teal))]" />
      <Container className="grid gap-12 py-16 lg:grid-cols-12 lg:gap-8 lg:py-20">
        <div className="lg:col-span-4">
          <Link href="/" aria-label={`${site.name}, home`} className="inline-block">
            <Image src={site.logo} alt={site.name} width={2160} height={681} sizes="200px" className="h-auto w-[190px]" />
          </Link>
          <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-muted">
            A B2B healthcare services partner offering DME operational support and medical billing
            solutions for organizations across the United States.
          </p>
          {socials.length > 0 && (
            <ul className="mt-6 flex gap-5">
              {socials.map(({ href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-sm font-semibold text-slate transition-colors hover:text-blue"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FooterCol title="Services" className="lg:col-span-2 lg:col-start-6">
          {services.map((s) => (
            <FooterLink key={s.href} href={s.href}>
              {s.label}
            </FooterLink>
          ))}
          <FooterLink href="/services">All Services</FooterLink>
        </FooterCol>

        <FooterCol title="Company" className="lg:col-span-2">
          {company.map((s) => (
            <FooterLink key={s.href} href={s.href}>
              {s.label}
            </FooterLink>
          ))}
        </FooterCol>

        <FooterCol title="Contact" className="lg:col-span-3">
          {email && (
            <li className="flex items-start gap-3">
              <Mail aria-hidden className="mt-1 size-4 text-teal-ink" />
              <a href={`mailto:${email}`} className="text-muted hover:text-blue">{email}</a>
            </li>
          )}
          {phone && (
            <li className="flex items-start gap-3">
              <Phone aria-hidden className="mt-1 size-4 text-teal-ink" />
              <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="text-muted hover:text-blue">{phone}</a>
            </li>
          )}
          {hours && (
            <li className="flex items-start gap-3 text-muted">
              <Clock aria-hidden className="mt-1 size-4 text-teal-ink" />
              {hours}
            </li>
          )}
          {address && (
            <li className="flex items-start gap-3 text-muted">
              <MapPin aria-hidden className="mt-1 size-4 text-teal-ink" />
              {address}
            </li>
          )}
          <li className="text-muted">
            Business inquiries are welcome through our{" "}
            <Link href="/contact" className="font-semibold text-blue underline-offset-4 hover:underline">
              consultation form
            </Link>
            .
          </li>
        </FooterCol>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col gap-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {site.legalName}. All rights reserved.
          </p>
          <ul className="flex gap-6">
            <li><Link href="/privacy-policy" className="hover:text-blue">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-blue">Terms of Use</Link></li>
            <li><a href="/sitemap.xml" className="hover:text-blue">Sitemap</a></li>
          </ul>
        </Container>
      </div>
    </footer>
  );
}

function FooterCol({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h2 className="eyebrow !text-slate">{title}</h2>
      <ul className="mt-5 space-y-3 text-[0.95rem]">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-muted transition-colors hover:text-blue">
        {children}
      </Link>
    </li>
  );
}
