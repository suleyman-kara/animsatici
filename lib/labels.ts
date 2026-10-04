import type { Event, Source } from "./schema";
import type { EventPhase } from "./dates";

export const CATEGORY_LABELS: Record<Source["category"], string> = {
  ceng: "Yazılım & CENG",
  career: "Kariyer",
  campus: "Kampüs",
  community: "Topluluk",
};

export const TYPE_LABELS: Record<Event["type"], string> = {
  hackathon: "Hackathon",
  bootcamp: "Bootcamp",
  camp: "Kamp",
  internship: "Staj",
  competition: "Yarışma",
  seminar: "Seminer",
  scholarship: "Burs",
  conference: "Konferans",
  other: "Diğer",
};

export const MODE_LABELS: Record<Event["location"]["mode"], string> = {
  online: "Online",
  "in-person": "Yüz yüze",
  hybrid: "Hibrit",
  unknown: "Konum belirtilmemiş",
};

export const PHASE_LABELS: Record<EventPhase, string> = {
  open: "Başvurusu açık",
  ongoing: "Devam ediyor",
  upcoming: "Yaklaşan",
  past: "Geçmiş",
};

export function locationText(location: Event["location"]): string {
  if (location.mode === "online") return "Online";
  const place = [location.venue, location.city].filter(Boolean).join(", ");
  if (location.mode === "hybrid") return place ? `${place} + Online` : "Hibrit";
  return place || MODE_LABELS[location.mode];
}
