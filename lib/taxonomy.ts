import type { Field, OpportunityType, Scope, SourceKind } from "./schema";

export const FIELD_LABELS: Record<Field, string> = {
  software: "Yazılım",
  engineering: "Mühendislik",
  design: "Tasarım",
  business: "İş & girişimcilik",
  science: "Bilim",
  general: "Genel",
};

export const TYPE_LABELS: Record<OpportunityType, string> = {
  hackathon: "Hackathon",
  bootcamp: "Bootcamp",
  camp: "Kamp",
  internship: "Staj",
  competition: "Yarışma",
  scholarship: "Burs",
  conference: "Konferans",
  "career-event": "Kariyer etkinliği",
  workshop: "Atölye",
};

export const SCOPE_LABELS: Record<Scope, string> = {
  national: "Türkiye geneli",
  international: "Uluslararası",
  city: "Şehir",
  university: "Üniversite",
};

export const KIND_LABELS: Record<SourceKind, string> = {
  organizer: "Düzenleyicinin sitesi",
  aggregator: "Fırsat listesi",
};
