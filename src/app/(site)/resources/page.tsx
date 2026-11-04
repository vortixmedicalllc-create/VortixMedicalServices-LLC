import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { articles, categories } from "@/lib/articles";
import { Container, ScopeNote, Section } from "@/components/ui/primitives";
import { CtaBand, FaqSection, PageHero } from "@/components/sections/Shared";
import { ArticleBrowser } from "@/components/sections/ArticleBrowser";

export const metadata: Metadata = pageMetadata({
  title: "Resources",
  description:
    "Guides and insights on healthcare operations, DME documentation, medical billing, revenue cycle management, and practical AI in healthcare administration.",
  path: "/resources",
});

const faq = [
  {
    q: "Who are these resources written for?",
    a: "Our resources are written for healthcare business owners, administrators, billing teams, and DME providers who want practical, plain-language explanations of operational topics.",
  },
  {
    q: "Is this content legal, clinical, or compliance advice?",
    a: "No. Resources are general and educational. Payer policies and regulations change, so always confirm current requirements with the relevant payer or a qualified advisor.",
  },
  {
    q: "How often is new content added?",
    a: "We add articles as they are completed and reviewed. Draft sample articles are labeled as such until they are finalized.",
  },
  {
    q: "Can I suggest a topic?",
    a: "Yes. Use our contact form and select \"Other\" as the service of interest. We welcome questions that would help other healthcare organizations.",
  },
];

export default function ResourcesPage() {
  const [featured, ...rest] = articles;
  return (
    <>
      <PageHero
        eyebrow="Resource Center"
        title="Practical Guidance for Healthcare Operations."
        crumbs={[{ label: "Resources" }]}
        intro="Clear explanations of DME documentation, medical billing, revenue cycle management, and practical uses of AI in healthcare administration."
      />

      <Section className="!pt-16">
        <Container>
          <ScopeNote className="mb-12 max-w-3xl">
            Articles marked <strong className="text-slate">Draft sample</strong> are preliminary educational content
            prepared for this site and are pending final editorial review. They are general information, not legal,
            clinical, or compliance advice.
          </ScopeNote>

          {/* Featured */}
          <Link
            href={`/resources/${featured.slug}`}
            className="reveal group grid overflow-hidden rounded-[6px] border border-line lg:grid-cols-12"
          >
            <div className="relative flex min-h-[220px] items-end bg-slate p-8 lg:col-span-5 lg:p-10">
              <svg aria-hidden viewBox="0 0 300 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
                <circle cx="240" cy="40" r="90" fill="none" stroke="var(--brand-blue)" strokeOpacity="0.5" strokeWidth="22" />
                <path d="M0 160 H90 L102 146 L112 176 L124 110 L138 190 L150 160 H300" fill="none" stroke="var(--brand-teal)" strokeOpacity="0.6" strokeWidth="2" />
              </svg>
              <span className="relative font-display text-xs font-bold uppercase tracking-[0.2em] text-teal-soft">Featured · {featured.category}</span>
            </div>
            <div className="p-8 lg:col-span-7 lg:p-12">
              {featured.status === "draft-sample" && (
                <span className="rounded-[3px] bg-tint px-2 py-0.5 font-display text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-blue-deep">
                  Draft sample
                </span>
              )}
              <h2 className="mt-4 text-[1.8rem] font-bold leading-tight transition-colors group-hover:text-blue sm:text-[2.1rem]">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{featured.excerpt}</p>
              <span className="mt-6 inline-flex items-center gap-2 font-display text-sm font-semibold text-blue">
                Read article <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          <h2 className="mt-20 text-[1.6rem] font-bold">All Articles</h2>
          <div className="mt-6">
            <ArticleBrowser articles={rest} categories={categories} />
          </div>
        </Container>
      </Section>

      <FaqSection items={faq} title="About Our Resources" tone="muted" />
      <CtaBand title="Have a Question About Your Operations?" text="If an article raised questions about your own workflows, we are happy to talk them through." cta="Get in Touch" />
    </>
  );
}
