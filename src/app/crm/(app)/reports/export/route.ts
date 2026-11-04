import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { AuthError, requireActionUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { audit } from "@/server/events";
import { getSettings } from "@/server/lookups";
import { getReports } from "@/server/queries/reports";
import { csvResponse, toCsv } from "@/server/csv";
import { dateRange } from "@/components/crm/lists";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireActionUser("reports.view");
    if (!can(user.role, "records.export")) throw new AuthError();
    const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
    const settings = await getSettings();
    const { from, to } = dateRange(sp);
    const reports = await getReports(
      user,
      { from, to, service: sp.service, assignee: can(user.role, "records.view_all") ? sp.assignee : undefined },
      settings.timezone,
      settings.currency,
    );
    const r = reports.find((x) => x.key === sp.report);
    if (!r) return NextResponse.json({ error: "Unknown report." }, { status: 404 });
    await audit(await getDb(), { actorId: user.id, action: "export.report", entityType: "report", entityId: r.key, changes: { filters: sp } });
    return csvResponse(`report-${r.key}`, toCsv(r.headers, r.rows));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[report export] failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
