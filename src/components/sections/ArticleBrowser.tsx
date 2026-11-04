"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Article, ArticleCategory } from "@/lib/articles";
import { cx } from "@/components/ui/primitives";

export function ArticleBrowser({ articles, categories }: { articles: Article[]; categories: ArticleCategory[] }) {
  const [active, setActive] = useState<ArticleCategory | "All">("All");
  const shown = active === "All" ? articles : articles.filter((a) => a.category === active);

  return (
    <div>
      <div role="group" aria-label="Filter articles by topic" className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line">
        {(["All", ...categories] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={active === c}
            onClick={() => setActive(c)}
            className={cx(
              "-mb-px border-b-2 pb-3 pt-1 font-display text-[0.88rem] font-semibold transition-colors",
              active === c ? "border-blue text-blue" : "border-transparent text-muted hover:text-slate",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {shown.length} {shown.length === 1 ? "article" : "articles"}
      </p>

      {shown.length === 0 ? (
        <p className="py-16 text-muted">No articles in this topic yet.</p>
      ) : (
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {shown.map((a) => (
            <li key={a.slug} className="border-b border-line">
              <Link href={`/resources/${a.slug}`} className="group block py-8">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-teal-ink">{a.category}</span>
                  <span aria-hidden className="text-line">|</span>
                  <span className="text-muted">{a.readingMinutes} min read</span>
                  {a.status === "draft-sample" && (
                    <span className="rounded-[3px] bg-tint px-2 py-0.5 font-display text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-blue-deep">
                      Draft sample
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-xl font-bold leading-snug transition-colors group-hover:text-blue">{a.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{a.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-2 font-display text-sm font-semibold text-blue">
                  Read article <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
