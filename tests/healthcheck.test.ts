import { describe, expect, it } from "vitest";
import { checkHealth } from "../scripts/healthcheck";

const base = { startedAt: "2026-10-04T19:00:00+03:00", completedAt: "2026-10-04T19:02:00+03:00", status: "success" as const, totalSources: 10, successCount: 10, unchangedCount: 0, errorCount: 0, newEvents: 0, updatedEvents: 0, warnings: [], rejected: [] };
const at = (s: string) => Date.parse(s);

describe("checkHealth", () => {
  it("sağlıklı", () => expect(checkHealth(base, at("2026-10-05T12:00:00+03:00"))).toEqual([]));
  it("haftalık tarama için 8 güne kadar sağlıklı", () => expect(checkHealth(base, at("2026-10-12T12:00:00+03:00"))).toEqual([]));
  it("eski tarama", () => expect(checkHealth(base, at("2026-10-13T12:00:00+03:00"))[0]).toMatch(/saat önce/));
  it("çok hata", () => expect(checkHealth({ ...base, errorCount: 4 }, at("2026-10-05T12:00:00+03:00"))).toHaveLength(1));
  it("kayıt yok", () => expect(checkHealth(null)).toHaveLength(1));
});
