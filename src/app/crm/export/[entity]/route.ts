import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { AuthError, requireActionUser } from "@/server/auth";
import { audit } from "@/server/events";
import { labelMaps } from "@/server/lookups";
import { listLeads } from "@/server/queries/leads";
import { listCompanies, listContacts, listDeals } from "@/server/queries/records";
import { dealCode, leadCode } from "@/server/services/leads";
import { companyTypeLabels, contactTypeLabels, leadStatusLabels, priorityLabels, relationshipLabels } from "@/server/constants";
import { csvResponse, toCsv } from "@/server/csv";

export const dynamic = "force-dynamic";

/**
 * Exports exactly the records the signed-in user is authorized to see,
 * using the same filters as the list page. Requires `records.export`.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  try {
    const user = await requireActionUser("records.export");
    const { entity } = await params;
    const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
    const maps = await labelMaps();
    const u = (id: string | null) => (id ? maps.user[id] ?? "" : "");
    let csv: string;
    let count = 0;

    if (entity === "leads") {
      const { rows } = await listLeads(user, sp, { all: true });
      count = rows.length;
      csv = toCsv(
        ["Lead ID", "First Name", "Last Name", "Business Email", "Phone", "Company", "Job Title", "Website", "Industry", "Service Interest", "Lead Source", "Status", "Priority", "Assigned To", "Created", "Last Contact", "Next Follow-up", "Website Inquiry", "Possible Duplicate", "Notes"],
        rows.map((r) => [
          leadCode(r.number), r.firstName, r.lastName, r.email, r.phone, r.companyName, r.jobTitle, r.website, r.industry,
          r.serviceKey ? maps.service[r.serviceKey] ?? r.serviceKey : "", maps.source[r.sourceKey] ?? r.sourceKey,
          leadStatusLabels[r.status], priorityLabels[r.priority], u(r.assignedToId), r.createdAt, r.lastContactAt, r.nextFollowUpAt,
          r.isWebsiteInquiry ? "Yes" : "No", r.possibleDuplicateOfId ? "Yes" : "No", r.notes,
        ]),
      );
    } else if (entity === "contacts") {
      const { rows } = await listContacts(user, sp, true);
      count = rows.length;
      csv = toCsv(
        ["First Name", "Last Name", "Email", "Phone", "Job Title", "Company", "Contact Type", "Owner", "Created", "Notes"],
        rows.map(({ c, companyName }) => [c.firstName, c.lastName, c.email, c.phone, c.jobTitle, companyName, contactTypeLabels[c.contactType], u(c.ownerId), c.createdAt, c.notes]),
      );
    } else if (entity === "companies") {
      const { rows } = await listCompanies(user, sp, true);
      count = rows.length;
      csv = toCsv(
        ["Company Name", "Website", "Business Email", "Phone", "Industry", "Company Type", "Address", "City", "State", "Country", "Owner", "Relationship Status", "Created", "Notes"],
        rows.map((c) => [c.name, c.website, c.email, c.phone, c.industry, companyTypeLabels[c.companyType], c.address, c.city, c.state, c.country, u(c.ownerId), relationshipLabels[c.relationshipStatus], c.createdAt, c.notes]),
      );
    } else if (entity === "deals") {
      const { rows } = await listDeals(user, sp, true);
      count = rows.length;
      csv = toCsv(
        ["Deal ID", "Deal Name", "Company", "Primary Contact", "Service", "Value", "Currency", "Stage", "Probability", "Expected Close", "Owner", "Created", "Last Updated", "Description"],
        rows.map(({ d, companyName, stage, contactFirst, contactLast }) => [
          dealCode(d.number), d.name, companyName, `${contactFirst ?? ""} ${contactLast ?? ""}`.trim(), d.serviceKey ? maps.service[d.serviceKey] ?? d.serviceKey : "",
          d.value, d.currency, stage.label, d.probability, d.expectedCloseDate, u(d.ownerId), d.createdAt, d.updatedAt, d.description,
        ]),
      );
    } else {
      return NextResponse.json({ error: "Unknown export." }, { status: 404 });
    }

    await audit(await getDb(), { actorId: user.id, action: "export.csv", entityType: entity, changes: { rows: count, filters: sp } });
    return csvResponse(entity, csv);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[export] failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
