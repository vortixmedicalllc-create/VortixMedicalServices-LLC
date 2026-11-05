/**
 * Central business information.
 *
 * OWNER ACTION REQUIRED: Values marked `null` are intentionally empty because
 * they have not been confirmed. Fill them in and they will appear across the
 * site (footer, contact page, structured data) automatically. Nothing is shown
 * for a field until it has a real value.
 */
export const site = {
  name: "Vortix Medical Services",
  shortName: "Vortix",
  tagline: "Smarter Healthcare Operations. Better Business Outcomes.",
  description:
    "Integrated DME support and medical billing solutions designed to help healthcare organizations streamline operations and move forward with confidence.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.example.com").replace(/\/$/, ""),
  logo: "/images/brand/vortix-logo.png",
  ogImage: "/og",

  contact: {
    // TODO(owner): confirmed public business email, e.g. "info@yourdomain.com"
    email: null as string | null,
    // TODO(owner): confirmed public business phone, e.g. "+1 (555) 000-0000"
    phone: null as string | null,
    // TODO(owner): confirmed business hours, e.g. "Monday to Friday, 9:00 AM to 5:00 PM ET"
    hours: null as string | null,
    // TODO(owner): confirmed mailing or office address. Leave null to omit.
    address: null as string | null,
  },

  // TODO(owner): add real profile URLs only. Empty entries are not rendered.
  social: {
    linkedin: null as string | null,
    facebook: null as string | null,
    x: null as string | null,
  },

  // TODO(owner): legal entity name for copyright and legal pages, e.g. "Vortix Medical Services LLC"
  legalName: "Vortix Medical Services",

  // Date the legal pages were last reviewed. Update after legal review.
  legalUpdated: "November 4, 2026",
};

export type NavItem = { label: string; href: string; description?: string };

export const services: (NavItem & { short: string; number: string })[] = [
  {
    number: "01",
    label: "DME Services",
    href: "/services/dme",
    short: "DME operational support",
    description: "Intake, verification, documentation, and order coordination for equipment providers.",
  },
  {
    number: "02",
    label: "Medical Billing",
    href: "/services/medical-billing",
    short: "Revenue cycle support",
    description: "Claims, payment posting, denial management, and A/R follow-up.",
  },
];

export const mainNav: (NavItem & { children?: typeof services })[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Services", href: "/services", children: services },
  { label: "How We Work", href: "/how-we-work" },
  { label: "Resources", href: "/resources" },
  { label: "Contact", href: "/contact" },
];
