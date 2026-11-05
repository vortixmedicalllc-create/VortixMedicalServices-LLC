import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

// Capture outgoing email instead of sending it.
const sent: { to: string | string[]; subject: string; html: string }[] = [];
vi.mock("@/server/email", async (orig) => {
  const real = await orig<typeof import("@/server/email")>();
  return {
    ...real,
    isEmailConfigured: () => true,
    emailProvider: () => "smtp" as const,
    sendEmail: async (o: { to: string | string[]; subject: string; html: string }) => {
      sent.push(o);
      return { sent: true as const };
    },
  };
});

import { getDb, type Db } from "@/db";
import { notifications, tasks, users } from "@/db/schema";
import { rateLimit } from "@/server/ratelimit";
import { notify } from "@/server/events";
import { flushEmailOutbox } from "@/server/outbox";
import { GET as cron } from "@/app/api/cron/daily/route";

let db: Db;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await getDb();
  [{ id: alice }] = await db.insert(users).values({ email: "alice@v1.test", name: "Alice Admin", role: "admin" }).returning({ id: users.id });
  [{ id: bob }] = await db
    .insert(users)
    .values({ email: "bob@v1.test", name: "Bob Sales", role: "sales", notificationPrefs: { emailAlerts: false } })
    .returning({ id: users.id });
});

afterAll(() => {
  delete process.env.CRON_SECRET;
});

describe("shared rate limiter", () => {
  it("counts attempts in the database and blocks after the limit", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit("test:key", 3, 60_000));
    expect(results).toEqual([false, false, false, true]);
    expect(await rateLimit("test:other", 3, 60_000)).toBe(false);
  });

  it("starts a new window once the old one expires", async () => {
    expect(await rateLimit("test:short", 1, 1)).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(await rateLimit("test:short", 1, 1)).toBe(false);
  });
});

describe("email outbox", () => {
  it("queues email only for people with email alerts on, and sends each once", async () => {
    await notify(db, [alice, bob], { type: "lead_assigned", title: "Lead assigned to you: Test Lead", href: "/crm/leads" });
    const rows = await db.select().from(notifications).where(eq(notifications.title, "Lead assigned to you: Test Lead"));
    expect(rows.find((r) => r.userId === alice)?.emailStatus).toBe("pending");
    expect(rows.find((r) => r.userId === bob)?.emailStatus).toBeNull();

    const first = await flushEmailOutbox();
    expect(first.sent).toBe(1);
    expect(sent.at(-1)?.to).toBe("alice@v1.test");
    expect(sent.at(-1)?.html).toContain("Open in Vortix CRM");

    const second = await flushEmailOutbox();
    expect(second.sent).toBe(0);
  });
});

describe("daily cron job", () => {
  const call = (auth?: string) => cron(new NextRequest("http://localhost/api/cron/daily", { headers: auth ? { authorization: auth } : {} }));

  it("refuses requests without the correct secret", async () => {
    process.env.CRON_SECRET = "a-very-long-cron-secret-value";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
  });

  it("creates overdue reminders and emails them", async () => {
    process.env.CRON_SECRET = "a-very-long-cron-secret-value";
    await db.insert(tasks).values({ title: "Call the clinic back", assignedToId: alice, dueAt: new Date(Date.now() - 3600_000), createdById: alice });
    const res = await call("Bearer a-very-long-cron-secret-value");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const n = await db.select().from(notifications).where(eq(notifications.userId, alice));
    expect(n.some((x) => x.type === "task_overdue" && x.title.includes("Call the clinic back"))).toBe(true);
    expect(sent.some((m) => m.subject.includes("Overdue task: Call the clinic back"))).toBe(true);
  });
});
