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

export const TYPE_EMOJI: Record<Event["type"], string> = {
  hackathon: "🚀",
  bootcamp: "🧑‍💻",
  camp: "🏕️",
  internship: "💼",
  competition: "🏆",
  seminar: "🎤",
  scholarship: "💸",
  conference: "🎟️",
  other: "✨",
};

export const CATEGORY_EMOJI: Record<Source["category"], string> = {
  ceng: "💻",
  career: "📈",
  campus: "🎓",
  community: "🤝",
};

/** Kategori başına "çıkartma" rengi (Tailwind sınıfı). */
export const CATEGORY_POP: Record<Source["category"], string> = {
  ceng: "bg-pop-violet",
  career: "bg-pop-sky",
  campus: "bg-pop-orange",
  community: "bg-pop-pink",
};

export const MODE_LABELS: Record<Event["location"]["mode"], string> = {
  online: "Online",
  "in-person": "Yüz yüze",
  hybrid: "Hibrit",
  unknown: "Konum belli değil",
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
