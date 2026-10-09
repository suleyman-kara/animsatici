import { describe, expect, it } from "vitest";
import { filterSources, fold } from "@/lib/filter";
import { Source } from "@/lib/schema";
import { readSources } from "@/lib/sources";
import { validateSources } from "../scripts/validate";
import { makeSource } from "./helpers";

describe("data/sources", () => {
  it("tüm kaynaklar şemaya uyar", async () => {
    expect(await validateSources()).toEqual([]);
  });

  it("otomatik erişimi yasaklayan siteler yalnızca link olarak işaretli", async () => {
    const sources = await readSources();
    for (const id of ["youthall-etkinlikler", "anbean-kampus"]) {
      const s = sources.find((x) => x.id === id);
      expect(s?.aiFetch, id).toBe(false);
      expect(s?.aiFetchNote, id).toBeTruthy();
    }
  });
});

describe("Source şeması", () => {
  it("aiFetch false ise gerekçe ister", () => {
    expect(() => makeSource({ aiFetch: false })).toThrow(/aiFetchNote/);
    expect(makeSource({ aiFetch: false, aiFetchNote: "Koşullar yasaklıyor" }).aiFetch).toBe(false);
  });

  it("şehir ve üniversite kapsamında şehir ister", () => {
    expect(() => makeSource({ scope: "city" })).toThrow(/city/);
    expect(() => makeSource({ scope: "university", city: "Ankara" })).toThrow(/university/);
    expect(makeSource({ scope: "university", city: "Ankara", university: "ODTÜ" }).university).toBe("ODTÜ");
  });

  it("tekrar eden alan değerlerini reddeder", () => {
    expect(Source.safeParse({ ...makeSource(), types: ["hackathon", "hackathon"] }).success).toBe(false);
  });
});

describe("filterSources", () => {
  const sources = [
    makeSource({ id: "ulusal-yazilim", title: "Ulusal Yazılım", fields: ["software"], types: ["hackathon", "bootcamp"] }),
    makeSource({ id: "genel-liste", title: "Genel Liste", fields: ["general"], types: ["internship"], kind: "aggregator" }),
    makeSource({ id: "izmir-kulup", title: "İzmir Kulübü", fields: ["software"], types: ["hackathon"], scope: "city", city: "İzmir" }),
    makeSource({ id: "ankara-kulup", title: "Ankara Kulübü", fields: ["engineering"], types: ["competition"], scope: "city", city: "Ankara" }),
  ];
  const ids = (filter: Parameters<typeof filterSources>[1]) => filterSources(sources, filter).map((s) => s.id);

  it("genel alanlı kaynaklar her alana uyar", () => {
    expect(ids({ field: "software" })).toEqual(expect.arrayContaining(["ulusal-yazilim", "genel-liste", "izmir-kulup"]));
    expect(ids({ field: "software" })).not.toContain("ankara-kulup");
  });

  it("şehir filtresi ulusal kaynakları da döndürür, şehre özel eşleşme önce gelir", () => {
    const result = ids({ city: "izmir" });
    expect(result[0]).toBe("izmir-kulup");
    expect(result).toContain("ulusal-yazilim");
    expect(result).not.toContain("ankara-kulup");
  });

  it("serbest metin Türkçe karakterden bağımsız arar", () => {
    expect(ids({ query: "IZMIR kulubu" })).toEqual(["izmir-kulup"]);
    expect(fold("İĞNE Işık")).toBe("igne isik");
  });

  it("tür ve site türü filtreleri birlikte çalışır", () => {
    expect(ids({ type: "hackathon", kind: "organizer" })).toEqual(["izmir-kulup", "ulusal-yazilim"]);
    expect(ids({ type: "internship", kind: "organizer" })).toEqual([]);
  });
});
