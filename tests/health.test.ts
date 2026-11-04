import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { resetDbForTests } from "@/db";

describe("/api/health", () => {
  afterEach(() => {
    delete process.env.VERCEL;
    resetDbForTests();
  });

  it("reports ok when the database is migrated", async () => {
    resetDbForTests();
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  it("reports not_configured on a host without DATABASE_URL, without leaking details", async () => {
    resetDbForTests();
    process.env.VERCEL = "1";
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.status).toBe("not_configured");
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\//);
  });
});
