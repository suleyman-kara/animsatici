import { describe, expect, it } from "vitest";
import { isAllowed, parseRobots } from "@/lib/robots";

describe("robots.txt", () => {
  const robots = parseRobots(`
# yorum
User-agent: *
Disallow: /admin
Allow: /admin/public
Disallow: /*.pdf$

User-agent: GPTBot
User-agent: ClaudeBot
Disallow: /

User-agent: Bingbot
Disallow:
`);

  it("genel grupta en uzun kural kazanır", () => {
    expect(isAllowed(robots, "Kampus30Bot", "/etkinlikler")).toBe(true);
    expect(isAllowed(robots, "Kampus30Bot", "/admin/ayarlar")).toBe(false);
    expect(isAllowed(robots, "Kampus30Bot", "/admin/public/x")).toBe(true);
  });

  it("joker ve satır sonu desenlerini uygular", () => {
    expect(isAllowed(robots, "*", "/dosya.pdf")).toBe(false);
    expect(isAllowed(robots, "*", "/dosya.pdf?x=1")).toBe(true);
  });

  it("birden çok user-agent satırı aynı grubu paylaşır, ada özel grup genel grubu geçersiz kılar", () => {
    expect(isAllowed(robots, "ClaudeBot", "/etkinlikler")).toBe(false);
    expect(isAllowed(robots, "gptbot", "/etkinlikler")).toBe(false);
    expect(isAllowed(robots, "Bingbot", "/admin")).toBe(true);
  });

  it("boş robots.txt her şeye izin verir", () => {
    expect(isAllowed(parseRobots(""), "ClaudeBot", "/")).toBe(true);
  });
});
