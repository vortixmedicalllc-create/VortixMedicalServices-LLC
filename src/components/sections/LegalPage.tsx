import type { ReactNode } from "react";
import { Container, ScopeNote } from "@/components/ui/primitives";
import { PageHero } from "./Shared";
import { site } from "@/lib/site";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} crumbs={[{ label: title }]} intro={intro} />
      <Container className="max-w-[820px] py-16">
        <p className="text-sm text-muted">Last updated: {site.legalUpdated}</p>
        {/* OWNER ACTION: have this page reviewed by qualified legal counsel before launch. */}
        <ScopeNote className="mt-6">
          This document is provided as a starting template and should be reviewed by qualified legal counsel before the
          website is launched.
        </ScopeNote>
        <div className="prose-vortix mt-6 text-[1.05rem] leading-[1.75]">{children}</div>
      </Container>
    </>
  );
}
