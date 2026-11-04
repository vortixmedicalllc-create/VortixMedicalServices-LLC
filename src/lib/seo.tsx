import type { Metadata } from "next";
import { site } from "./site";

type PageMeta = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

/** Builds consistent per-page metadata: title, description, canonical and Open Graph. */
export function pageMetadata({ title, description, path, noIndex }: PageMeta): Metadata {
  const url = `${site.url}${path === "/" ? "" : path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url,
      siteName: site.name,
      title: `${title} | ${site.name}`,
      description,
      images: [{ url: site.ogImage, width: 1640, height: 624, alt: `${site.name} brand banner` }],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${site.name}`,
      description,
      images: [site.ogImage],
    },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function serviceSchema(name: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: `${site.url}${path}`,
    areaServed: { "@type": "Country", name: "United States" },
    audience: { "@type": "BusinessAudience", audienceType: "Healthcare organizations" },
    provider: { "@type": "Organization", name: site.name, url: site.url },
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

export const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  logo: `${site.url}${site.logo}`,
  description: site.description,
  areaServed: { "@type": "Country", name: "United States" },
  ...(site.contact.email || site.contact.phone
    ? {
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          ...(site.contact.email ? { email: site.contact.email } : {}),
          ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
          areaServed: "US",
          availableLanguage: "English",
        },
      }
    : {}),
  sameAs: Object.values(site.social).filter(Boolean),
};
