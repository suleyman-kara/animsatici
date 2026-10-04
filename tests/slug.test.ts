import { describe, expect, it } from "vitest";
import { slugify } from "../lib/slug";

describe("slugify", () => {
  it("Türkçe karakterleri dönüştürür", () => {
    expect(slugify("İTÜ Çılgın Şölen Ğüzel Öğle")).toBe("itu-cilgin-solen-guzel-ogle");
    expect(slugify("IŞIK Üniversitesi")).toBe("isik-universitesi");
  });
  it("noktalama ve boşlukları tireye çevirir", () => {
    expect(slugify("  Hackathon 2026: AI & Web!  ")).toBe("hackathon-2026-ai-web");
  });
  it("uzun metni kelime sınırında keser", () => {
    const s = slugify("bir iki uc dort bes alti yedi", 12);
    expect(s).toBe("bir-iki-uc");
  });
});
