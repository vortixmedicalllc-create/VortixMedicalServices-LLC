import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Container, Eyebrow } from "@/components/ui/primitives";
import { services } from "@/lib/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
    <Header />
    <main id="main">
    <section className="relative overflow-hidden bg-white">
      <svg aria-hidden viewBox="0 0 600 300" className="pointer-events-none absolute bottom-0 left-0 w-full opacity-60" preserveAspectRatio="none">
        <path d="M0 220 H220 L240 196 L258 250 L280 120 L304 270 L326 220 H600" fill="none" stroke="var(--brand-teal)" strokeOpacity="0.35" strokeWidth="2" />
      </svg>
      <Container className="relative grid min-h-[68vh] items-center gap-12 py-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow>Error 404</Eyebrow>
          <h1 className="mt-5 text-[2.4rem] font-bold leading-[1.08] sm:text-5xl">We couldn&apos;t find that page.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            The page may have moved, or the address may be incorrect. These links can help you find what you are looking
            for.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/" arrow>Back to Home</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">Contact Us</ButtonLink>
          </div>
        </div>
        <nav aria-label="Helpful links" className="lg:col-span-4 lg:col-start-9">
          <p className="eyebrow !text-slate">Our Services</p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {services.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="flex items-baseline gap-4 py-4 font-display font-semibold text-slate hover:text-blue">
                  <span className="text-xs text-teal-ink">{s.number}</span>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </section>
    </main>
    <Footer />
    </>
  );
}
