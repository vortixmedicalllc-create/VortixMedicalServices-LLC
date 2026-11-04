import { describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { pipelineStages, serviceCategories, leadSources, companySettings } from "@/db/schema";

describe("database migrations", () => {
  it("applies schema and seeds default lookups", async () => {
    const db = await getDb();
    expect((await db.select().from(pipelineStages)).length).toBe(7);
    expect((await db.select().from(serviceCategories)).map((s) => s.key)).toContain("medical_billing");
    expect((await db.select().from(leadSources)).map((s) => s.key)).toContain("website");
    expect((await db.select().from(companySettings))[0].currency).toBe("USD");
  });
});
