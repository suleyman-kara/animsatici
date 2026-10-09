import type { Field, OpportunityType, Source, SourceKind } from "./schema";

// Kaynak süzme. Saf fonksiyonlar: hem sunucuda (MCP) hem tarayıcıda (kaynak dizini) çalışır.

/** Türkçe karakterleri ve büyük/küçük harfi yok sayarak karşılaştırma için sadeleştirir. */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export interface SourceFilter {
  field?: Field;
  type?: OpportunityType;
  city?: string;
  kind?: SourceKind;
  query?: string;
}

/**
 * Kaynakları süzer. `general` alanlı kaynaklar her alana, Türkiye geneli ve uluslararası kaynaklar
 * her şehre uyar. Şehre özel eşleşmeler ve düzenleyici siteleri önce gelir.
 */
export function filterSources(sources: Source[], filter: SourceFilter): Source[] {
  const city = filter.city ? fold(filter.city) : undefined;
  const tokens = filter.query ? fold(filter.query).split(/\s+/).filter(Boolean) : [];
  const localMatch = (s: Source) => Boolean(city && s.city && fold(s.city) === city);

  return sources
    .filter((s) => !filter.field || s.fields.includes(filter.field) || s.fields.includes("general"))
    .filter((s) => !filter.type || s.types.includes(filter.type))
    .filter((s) => !filter.kind || s.kind === filter.kind)
    .filter((s) => !city || s.scope === "national" || s.scope === "international" || localMatch(s))
    .filter((s) => {
      if (!tokens.length) return true;
      const haystack = fold([s.title, s.organizer, s.description, s.hints, s.city, s.university].filter(Boolean).join(" "));
      return tokens.every((t) => haystack.includes(t));
    })
    .sort(
      (a, b) =>
        Number(localMatch(b)) - Number(localMatch(a)) ||
        Number(b.kind === "organizer") - Number(a.kind === "organizer") ||
        a.title.localeCompare(b.title, "tr"),
    );
}
