import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { activities, companies, companySettings, contacts, deals, leads, notifications, tasks, users, auditLogs } from "@/db/schema";
import { convertLead, createLead, mergeLead, updateLead } from "@/server/services/leads";

let db: Db;
let owner: string;
let sales: string;

beforeAll(async () => {
  db = await getDb();
  [{ id: owner }] = await db.insert(users).values({ email: "owner@test.local", name: "Olivia Owner", role: "owner" }).returning({ id: users.id });
  [{ id: sales }] = await db.insert(users).values({ email: "sam@test.local", name: "Sam Sales", role: "sales" }).returning({ id: users.id });
});

describe("website lead creation", () => {
  it("creates an unassigned website lead and notifies owners/admins", async () => {
    const { lead, duplicate } = await createLead(
      db,
      { firstName: "Dana", lastName: "Reyes", email: "Dana@NorthClinic.com", companyName: "North Clinic LLC", serviceKey: "medical_billing", sourceKey: "website", isWebsiteInquiry: true, inquiryMessage: "We need help with A/R follow-up." },
      null,
    );
    expect(duplicate).toBeNull();
    expect(lead.status).toBe("new");
    expect(lead.sourceKey).toBe("website");
    expect(lead.isWebsiteInquiry).toBe(true);
    expect(lead.assignedToId).toBeNull();
    expect(lead.emailNormalized).toBe("dana@northclinic.com");
    const n = await db.select().from(notifications).where(eq(notifications.userId, owner));
    expect(n.some((x) => x.type === "website_lead")).toBe(true);
    const a = await db.select().from(activities).where(eq(activities.leadId, lead.id));
    expect(a[0].description).toMatch(/website inquiry/);
  });

  it("flags duplicates by email instead of discarding the submission", async () => {
    const { lead, duplicate } = await createLead(db, { firstName: "Dana", email: "dana@northclinic.com", sourceKey: "website", isWebsiteInquiry: true }, null);
    expect(duplicate).not.toBeNull();
    expect(lead.possibleDuplicateOfId).toBe(duplicate!.id);
  });

  it("applies the single-user assignment rule", async () => {
    await db.update(companySettings).set({ assignmentMode: "user", assignmentUserId: sales }).where(eq(companySettings.id, 1));
    const { lead } = await createLead(db, { firstName: "Lee", email: "lee@dmeplus.com", companyName: "DME Plus", sourceKey: "website", isWebsiteInquiry: true }, null);
    expect(lead.assignedToId).toBe(sales);
    const n = await db.select().from(notifications).where(eq(notifications.userId, sales));
    expect(n.length).toBeGreaterThan(0);
    await db.update(companySettings).set({ assignmentMode: "unassigned", assignmentUserId: null }).where(eq(companySettings.id, 1));
  });

  it("applies round-robin assignment across active users", async () => {
    await db.update(companySettings).set({ assignmentMode: "round_robin", roundRobinUserIds: [owner, sales], roundRobinCursor: 0 }).where(eq(companySettings.id, 1));
    const a = await createLead(db, { firstName: "R1", email: "r1@x.com", sourceKey: "website", isWebsiteInquiry: true }, null);
    const b = await createLead(db, { firstName: "R2", email: "r2@x.com", sourceKey: "website", isWebsiteInquiry: true }, null);
    expect([a.lead.assignedToId, b.lead.assignedToId]).toEqual([owner, sales]);
    await db.update(companySettings).set({ assignmentMode: "unassigned" }).where(eq(companySettings.id, 1));
  });
});

describe("lead updates", () => {
  it("records status and assignment changes in history and audit log", async () => {
    const { lead } = await createLead(db, { firstName: "Pat", email: "pat@group.com", sourceKey: "manual" }, owner);
    await updateLead(db, lead.id, { status: "contacted", assignedToId: sales }, owner);
    const acts = await db.select().from(activities).where(eq(activities.leadId, lead.id));
    expect(acts.map((a) => a.type)).toEqual(expect.arrayContaining(["status_change", "assignment_change"]));
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, lead.id));
    expect(logs.some((l) => l.action === "lead.update")).toBe(true);
  });
});

describe("lead conversion", () => {
  it("creates company, contact and deal in one transaction and preserves history", async () => {
    const { lead } = await createLead(db, { firstName: "Morgan", lastName: "Hill", email: "morgan@sunrisedme.com", companyName: "Sunrise DME, Inc.", serviceKey: "dme", sourceKey: "referral" }, owner);
    await db.insert(tasks).values({ title: "Call back", leadId: lead.id, createdById: owner });
    const r = await convertLead(db, lead.id, { createDeal: true, dealValue: "12000" }, owner);
    expect(r.companyCreated && r.contactCreated).toBe(true);
    const [l] = await db.select().from(leads).where(eq(leads.id, lead.id));
    expect(l.status).toBe("converted");
    expect(l.convertedContactId).toBe(r.contactId);
    const [d] = await db.select().from(deals).where(eq(deals.id, r.dealId!));
    expect(d.companyId).toBe(r.companyId);
    expect(d.value).toBe("12000.00");
    const acts = await db.select().from(activities).where(eq(activities.leadId, lead.id));
    expect(acts.every((a) => a.contactId === r.contactId)).toBe(true);
    const [t] = await db.select().from(tasks).where(eq(tasks.leadId, lead.id));
    expect(t.dealId).toBe(r.dealId);
    await expect(convertLead(db, lead.id, {}, owner)).rejects.toThrow(/already been converted/);
  });

  it("reuses an existing company and contact instead of duplicating them", async () => {
    const { lead } = await createLead(db, { firstName: "Morgan", email: "MORGAN@sunrisedme.com", companyName: "Sunrise DME", sourceKey: "email" }, owner);
    const r = await convertLead(db, lead.id, { createDeal: false }, owner);
    expect(r.companyCreated).toBe(false);
    expect(r.contactCreated).toBe(false);
    expect((await db.select().from(companies)).filter((c) => c.nameNormalized === "sunrise dme").length).toBe(1);
    expect((await db.select().from(contacts)).filter((c) => c.emailNormalized === "morgan@sunrisedme.com").length).toBe(1);
  });
});

describe("lead merge", () => {
  it("moves history to the target and archives the duplicate", async () => {
    const a = await createLead(db, { firstName: "Kim", email: "kim@clinic.org", sourceKey: "manual", notes: "Original" }, owner);
    const b = await createLead(db, { firstName: "Kim", email: "kim@clinic.org", sourceKey: "website", isWebsiteInquiry: true, inquiryMessage: "Second inquiry" }, null);
    expect(b.lead.possibleDuplicateOfId).toBe(a.lead.id);
    await mergeLead(db, b.lead.id, a.lead.id, owner);
    const [src] = await db.select().from(leads).where(eq(leads.id, b.lead.id));
    const [tgt] = await db.select().from(leads).where(eq(leads.id, a.lead.id));
    expect(src.mergedIntoId).toBe(a.lead.id);
    expect(src.archivedAt).not.toBeNull();
    expect(tgt.notes).toContain("Second inquiry");
    const acts = await db.select().from(activities).where(eq(activities.leadId, a.lead.id));
    expect(acts.length).toBeGreaterThanOrEqual(3);
  });
});
