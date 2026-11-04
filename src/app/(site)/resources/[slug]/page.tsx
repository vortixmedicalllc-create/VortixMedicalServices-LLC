import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JsonLd, pageMetadata } from "@/lib/seo";
import { articles, getArticle } from "@/lib/articles";
import { site } from "@/lib/site";
import { ButtonLink, Container, Eyebrow, ScopeNote } from "@/components/ui/primitives";
import { CtaBand } from "@/components/sections/Shared";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return {};
  return pageMetadata({
    title: a.title,
    description: a.excerpt,
    path: `/resources/${a.slug}`,
    noIndex: a.status !== "published",
  });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();

  const related = articles.filter((x) => x.slug !== a.slug && x.category === a.category).slice(0, 2);
  const more = related.length ? related : articles.filter((x) => x.slug !== a.slug).slice(0, 2);

  return (
    <>
      {a.status === "published" && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description: a.excerpt,
            datePublished: a.publishedAt,
            author: a.author ? { "@type": "Person", name: a.author } : { "@type": "Organization", name: site.name },
            publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: `${site.url}${site.logo}` } },
            mainEntityOfPage: `${site.url}/resources/${a.slug}`,
          }}
        />
      )}
      <article>
        <header className="border-b border-line bg-white">
          <Container className="max-w-[820px] pb-14 pt-10 lg:pt-14">
            <Link href="/resources" className="inline-flex items-center gap-2 text-sm text-muted hover:text-blue">
              <ArrowLeft aria-hidden className="size-4" /> All resources
            </Link>
            <Eyebrow className="mt-10">{a.category}</Eyebrow>
            <h1 className="mt-4 text-[2.2rem] font-bold leading-[1.1] sm:text-[2.8rem]">{a.title}</h1>
            <p className="mt-5 text-xl leading-relaxed text-muted">{a.excerpt}</p>
            <p className="mt-6 text-sm text-muted">
              {a.readingMinutes} min read
              {a.publishedAt && ` · ${new Date(a.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
              {a.author && ` · ${a.author}`}
            </p>
            {a.status === "draft-sample" && (
              <ScopeNote className="mt-8">
                <strong className="text-slate">Draft sample article.</strong> This content is preliminary and pending
                editorial review. It is general educational information, not legal, clinical, or compliance advice.
              </ScopeNote>
            )}
          </Container>
        </header>
        <Container className="max-w-[820px] py-14">
          <div className="prose-vortix text-[1.08rem] leading-[1.75]">
            {a.body.map((b, i) => {
              if (b.type === "h2") return <h2 key={i}>{b.text}</h2>;
              if (b.type === "ul")
                return (
                  <ul key={i}>
                    {b.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                );
              return <p key={i}>{b.text}</p>;
            })}
          </div>
          <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-line pt-8">
            <p className="mr-auto text-muted">Want to discuss how this applies to your organization?</p>
            <ButtonLink href="/contact" arrow>Request a Consultation</ButtonLink>
          </div>
        </Container>
      </article>

      <section aria-labelledby="more-heading" className="bg-surface-muted py-16">
        <Container className="max-w-[820px]">
          <h2 id="more-heading" className="text-xl font-bold">More Resources</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {more.map((m) => (
              <li key={m.slug}>
                <Link href={`/resources/${m.slug}`} className="group block py-5">
                  <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-teal-ink">{m.category}</span>
                  <span className="mt-1 block font-display text-lg font-semibold text-slate group-hover:text-blue">{m.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
