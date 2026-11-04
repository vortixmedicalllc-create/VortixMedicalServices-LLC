import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listCompanies, listContacts, listDeals } from "@/server/queries/records";
import { listLeads } from "@/server/queries/leads";
import { leadCode, dealCode } from "@/server/services/leads";
import { leadStatusLabels } from "@/server/constants";
import { Badge, Card, EmptyState, PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  if (query.length < 2) {
    return (
      <>
        <PageHeader title="Search" />
        <Card>
          <EmptyState title="Enter at least two characters" text="Search covers leads, contacts, companies, and deals you have access to." />
        </Card>
      </>
    );
  }
  const sp = { q: query };
  // Each query applies the same role-based scope as the module lists.
  const [l, c, co, d] = await Promise.all([listLeads(user, sp), listContacts(user, sp), listCompanies(user, sp), listDeals(user, sp)]);
  const total = l.total + c.total + co.total + d.total;
  const enc = encodeURIComponent(query);

  const Section = ({ title, count, href, children }: { title: string; count: number; href: string; children: React.ReactNode }) => (
    <Card
      title={`${title} (${count})`}
      actions={count > 0 ? <Link href={href} className="text-xs font-semibold text-blue hover:underline">View all in {title}</Link> : undefined}
      bodyClassName="p-0"
    >
      {count ? <ul className="divide-y divide-line">{children}</ul> : <p className="px-5 py-4 text-sm text-muted">No matches.</p>}
    </Card>
  );

  return (
    <>
      <PageHeader title={`Results for "${query}"`} description={`${total} matching record${total === 1 ? "" : "s"}`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Leads" count={l.total} href={`/crm/leads?q=${enc}`}>
          {l.rows.slice(0, 8).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link href={`/crm/leads/${r.id}`} className="min-w-0">
                <span className="block truncate font-semibold hover:text-blue">{`${r.firstName} ${r.lastName}`.trim()}</span>
                <span className="block truncate text-xs text-muted">{leadCode(r.number)} · {r.companyName ?? r.email}</span>
              </Link>
              <Badge>{leadStatusLabels[r.status]}</Badge>
            </li>
          ))}
        </Section>
        <Section title="Contacts" count={c.total} href={`/crm/contacts?q=${enc}`}>
          {c.rows.slice(0, 8).map(({ c: r, companyName }) => (
            <li key={r.id} className="px-5 py-3">
              <Link href={`/crm/contacts/${r.id}`} className="font-semibold hover:text-blue">{`${r.firstName} ${r.lastName}`.trim()}</Link>
              <span className="block text-xs text-muted">{[companyName, r.email].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </Section>
        <Section title="Companies" count={co.total} href={`/crm/companies?q=${enc}`}>
          {co.rows.slice(0, 8).map((r) => (
            <li key={r.id} className="px-5 py-3">
              <Link href={`/crm/companies/${r.id}`} className="font-semibold hover:text-blue">{r.name}</Link>
              <span className="block text-xs text-muted">{[r.city, r.state].filter(Boolean).join(", ")}</span>
            </li>
          ))}
        </Section>
        <Section title="Deals" count={d.total} href={`/crm/deals?q=${enc}`}>
          {d.rows.slice(0, 8).map(({ d: r, companyName, stage }) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link href={`/crm/deals/${r.id}`} className="min-w-0">
                <span className="block truncate font-semibold hover:text-blue">{r.name}</span>
                <span className="block truncate text-xs text-muted">{dealCode(r.number)}{companyName ? ` · ${companyName}` : ""}</span>
              </Link>
              <Badge>{stage.label}</Badge>
            </li>
          ))}
        </Section>
      </div>
    </>
  );
}
