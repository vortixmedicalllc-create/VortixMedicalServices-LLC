import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { activities, leads, notifications, users, auditLogs } from "@/db/schema";
import { POST } from "@/app/api/contact/route";
import { can, canEdit, canManageUser, canView, assignableRoles } from "@/server/permissions";
import { csvCell, toCsv } from "@/server/csv";
import { validateContact } from "@/lib/contact";

let db: Db;
let owner: string;

const submit = (body: Record<string, unknown>, ip = "10.0.0.1") =>
  POST(new Request("http://localhost/api/contact", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) }));

const valid = {
  fullName: "Jordan Lee Price",
  email: "jordan@harborclinic.com",
  company: "Harbor Clinic",
  jobTitle: "Practice Administrator",
  phone: "",
  service: "Medical Billing",
  message: "We are looking for help with claim denials and A/R follow-up.",
  acknowledge: true,
  website: "",
  startedAt: Date.now() - 10_000,
};

beforeAll(async () => {
  db = await getDb();
  [{ id: owner }] = await db.insert(users).values({ email: "own@int.local", name: "Owner Int", role: "owner" }).returning({ id: users.id });
});

describe("website contact form → CRM lead", () => {
  it("saves a valid inquiry as a New website lead and reports success only after saving", async () => {
    const res = await submit(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const [lead] = await db.select().from(leads).where(eq(leads.emailNormalized, "jordan@harborclinic.com"));
    expect(lead).toBeDefined();
    expect(lead.firstName).toBe("Jordan");
    expect(lead.lastName).toBe("Lee Price");
    expect(lead.sourceKey).toBe("website");
    expect(lead.status).toBe("new");
    expect(lead.serviceKey).toBe("medical_billing");
    expect(lead.isWebsiteInquiry).toBe(true);
    expect(lead.inquiryMessage).toContain("claim denials");
    const acts = await db.select().from(activities).where(eq(activities.leadId, lead.id));
    expect(acts.length).toBe(1);
    const n = await db.select().from(notifications).where(eq(notifications.userId, owner));
    expect(n.some((x) => x.href === `/crm/leads/${lead.id}`)).toBe(true);
    const audits = await db.select().from(auditLogs).where(eq(auditLogs.entityId, lead.id));
    expect(audits[0].action).toBe("lead.create");
  });

  it("flags a repeat submission as a possible duplicate instead of dropping it", async () => {
    const res = await submit({ ...valid, message: "Following up on my earlier inquiry about billing." }, "10.0.0.2");
    expect(res.status).toBe(200);
    const rows = await db.select().from(leads).where(eq(leads.emailNormalized, "jordan@harborclinic.com"));
    expect(rows.length).toBe(2);
    expect(rows.filter((r) => r.possibleDuplicateOfId).length).toBe(1);
  });

  it("rejects honeypot and too-fast submissions without saving", async () => {
    const before = (await db.select().from(leads)).length;
    expect((await submit({ ...valid, email: "bot@spam.com", website: "http://spam" }, "10.0.0.3")).status).toBe(400);
    expect((await submit({ ...valid, email: "fast@spam.com", startedAt: Date.now() }, "10.0.0.4")).status).toBe(400);
    expect((await db.select().from(leads)).length).toBe(before);
  });

  it("validates on the server", async () => {
    const res = await submit({ ...valid, email: "not-an-email", acknowledge: false }, "10.0.0.5");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.fields.email).toBeTruthy();
    expect(body.fields.acknowledge).toBeTruthy();
    expect(validateContact({ ...valid, service: "Patient records" }).service).toBeTruthy();
  });

  it("rate limits repeated submissions from one address", async () => {
    let last = 200;
    for (let i = 0; i < 7; i++) last = (await submit({ ...valid, email: `rl${i}@x.com` }, "10.9.9.9")).status;
    expect(last).toBe(429);
  });
});

describe("permissions", () => {
  const sales = { id: "s1", role: "sales" as const };
  const mgr = { id: "m1", role: "manager" as const };
  const ro = { id: "r1", role: "read_only" as const };
  const ops = { id: "o1", role: "operations" as const };
  it("limits sales users to their own records", () => {
    expect(canView(sales, { assignedToId: "s1" })).toBe(true);
    expect(canView(sales, { assignedToId: "other" })).toBe(false);
    expect(canEdit(sales, { createdById: "s1" })).toBe(true);
    expect(canEdit(sales, { ownerId: "other" })).toBe(false);
    expect(can("sales", "records.assign")).toBe(false);
    expect(can("sales", "team.manage")).toBe(false);
  });
  it("lets managers see and assign everything but not manage users", () => {
    expect(canView(mgr, { ownerId: "x" })).toBe(true);
    expect(canEdit(mgr, { ownerId: "x" })).toBe(true);
    expect(can("manager", "records.assign")).toBe(true);
    expect(can("manager", "team.manage")).toBe(false);
  });
  it("keeps read-only and operations users from changing others' records", () => {
    expect(canView(ro, { ownerId: "x" })).toBe(true);
    expect(canEdit(ro, { ownerId: "x" })).toBe(false);
    expect(canEdit(ro, { ownerId: "r1" })).toBe(false);
    expect(canEdit(ops, { ownerId: "x" })).toBe(false);
    expect(canEdit(ops, { assignedToId: "o1" })).toBe(true);
    expect(can("operations", "records.export")).toBe(false);
  });
  it("only lets Owners manage Owner accounts", () => {
    expect(canManageUser({ id: "a", role: "admin" }, { id: "o", role: "owner" })).toBe(false);
    expect(canManageUser({ id: "o2", role: "owner" }, { id: "o", role: "owner" })).toBe(true);
    expect(assignableRoles("admin")).not.toContain("owner");
    expect(assignableRoles("manager")).toEqual([]);
  });
});

describe("CSV export safety", () => {
  it("neutralizes spreadsheet formulas and escapes quotes", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+1 555")).toBe("'+1 555");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(toCsv(["A"], [["x"]])).toBe("﻿A\r\nx\r\n");
  });
});
