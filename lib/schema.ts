import { z } from "zod";

// Tek şema kaynağı: site, MCP sunucusu, doğrulayıcı ve kaynak kontrolü bu dosyayı kullanır.

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const Slug = z.string().regex(SLUG_RE, "küçük harf, rakam ve tire içeren bir slug olmalı");
export const HttpUrl = z.url({ protocol: /^https?$/ });

export const FIELDS = ["software", "engineering", "design", "business", "science", "general"] as const;
export const Field = z.enum(FIELDS);
export type Field = z.infer<typeof Field>;

export const OPPORTUNITY_TYPES = [
  "hackathon",
  "bootcamp",
  "camp",
  "internship",
  "competition",
  "scholarship",
  "conference",
  "career-event",
  "workshop",
] as const;
export const OpportunityType = z.enum(OPPORTUNITY_TYPES);
export type OpportunityType = z.infer<typeof OpportunityType>;

/** Kaynağın hitap ettiği coğrafya. `city` ve `university` kapsamında `city` zorunludur. */
export const SCOPES = ["national", "international", "city", "university"] as const;
export const Scope = z.enum(SCOPES);
export type Scope = z.infer<typeof Scope>;

/** `organizer`: fırsatı düzenleyenin kendi sitesi. `aggregator`: başkalarının fırsatlarını listeleyen site. */
export const SOURCE_KINDS = ["organizer", "aggregator"] as const;
export const SourceKind = z.enum(SOURCE_KINDS);
export type SourceKind = z.infer<typeof SourceKind>;

export const Source = z
  .object({
    id: Slug,
    title: z.string().min(1).max(120),
    /** Fırsatların listelendiği sayfa. */
    url: HttpUrl,
    homepage: HttpUrl.optional(),
    organizer: z.string().min(1).max(120).optional(),
    description: z.string().min(1).max(300),
    fields: z.array(Field).min(1),
    types: z.array(OpportunityType).min(1),
    scope: Scope,
    city: z.string().min(1).optional(),
    university: z.string().min(1).optional(),
    kind: SourceKind,
    lang: z.enum(["tr", "en"]),
    /**
     * Yapay zeka asistanlarının bu sayfayı okuması uygun mu? Sitenin kullanım koşulları otomatik
     * erişimi açıkça yasaklıyorsa ya da robots.txt engelliyorsa `false`; asistan yalnızca linki verir.
     */
    aiFetch: z.boolean(),
    /** `aiFetch: false` ise nedeni (kullanıcıya gösterilir). */
    aiFetchNote: z.string().min(1).max(300).optional(),
    /** Sayfa içeriği JavaScript ile yükleniyor; düz HTML okuyan asistanlar boş görebilir. */
    needsJs: z.boolean(),
    /** Sayfanın nasıl okunacağına dair kısa ipucu (asistana gösterilir). */
    hints: z.string().min(1).max(300).optional(),
    /** Dizinde ve MCP sonuçlarında gösterilsin mi? */
    active: z.boolean(),
  })
  .superRefine((s, ctx) => {
    if ((s.scope === "city" || s.scope === "university") && !s.city) {
      ctx.addIssue({ code: "custom", message: "city ve university kapsamında city zorunlu", path: ["city"] });
    }
    if (s.scope === "university" && !s.university) {
      ctx.addIssue({ code: "custom", message: "university kapsamında university zorunlu", path: ["university"] });
    }
    if (!s.aiFetch && !s.aiFetchNote) {
      ctx.addIssue({ code: "custom", message: "aiFetch false ise aiFetchNote ile nedeni yazılmalı", path: ["aiFetchNote"] });
    }
    if (new Set(s.fields).size !== s.fields.length || new Set(s.types).size !== s.types.length) {
      ctx.addIssue({ code: "custom", message: "fields ve types tekrar eden değer içermemeli" });
    }
  });
export type Source = z.infer<typeof Source>;
