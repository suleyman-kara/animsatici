import { EventDate } from "../schema";
import { classify, endInstant, inWindow, startInstant, WINDOW_DAYS } from "../dates";
import type { Page } from "./fetch";
import type { ExtractedEvent } from "./extract";

// Halüsinasyona karşı: modelin verdiği alıntılar sayfa metninde birebir geçmeli.

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Karşılaştırma için metni sadeleştirir: küçük harf, tek tip tırnak/tire, tek boşluk. */
export function normalizeForMatch(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKC")
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteAppears(quote: string, normalizedPage: string): boolean {
  const q = normalizeForMatch(quote);
  return q.length >= 3 && normalizedPage.includes(q);
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

const MAX_YEAR_WRAP_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Alıntıda yıl yoksa kabul edilen en uzak tarih: daha uzağı büyük ihtimalle yanlış yıla taşınmış eski bir etkinliktir. */
export const MAX_YEARLESS_DAYS_AHEAD = 30;

/** Alıntıda yıl geçiyor mu? ("2026", "07.08.2026", "07/08/26") */
export function quoteHasYear(quote: string | undefined): boolean {
  if (!quote) return false;
  return /(?:^|\D)(?:19|20)\d{2}(?:\D|$)/.test(quote) || /\b\d{1,2}[./-]\d{1,2}[./-]\d{2}\b/.test(quote);
}

/**
 * Bitiş başlangıçtan önceyse: "28 Aralık – 3 Ocak" gibi yıl dönen aralıklarda modelin bitişe
 * yanlış yıl yazması olasıdır; bir yıl eklemek makul (≤90 gün) bir aralık veriyorsa düzeltilir.
 * Düzeltilemiyorsa null döner (kayıt reddedilir).
 */
export function orderedEndDate(start: string | undefined, end: string | undefined): string | undefined | null {
  if (!start || !end || startInstant(end) >= startInstant(start)) return end;
  const bumped = `${Number(end.slice(0, 4)) + 1}${end.slice(4)}`;
  const span = startInstant(bumped) - startInstant(start);
  return span >= 0 && span <= MAX_YEAR_WRAP_DAYS * 24 * 60 * 60 * 1000 ? bumped : null;
}

type Dated = { startDate?: string; endDate?: string; deadline?: string; dateQuote?: string };

export type RelevanceProblem = {
  reason: string;
  /** Etkinlik ileride 30 günlük pencereye gireceği için reddedildiyse, kaynağın yeniden taranacağı an. */
  revisitAt?: number;
};

/**
 * Etkinlik siteye alınmaya uygun mu? Yalnızca önümüzdeki 30 gün içinde yapılabilecek etkinlikler alınır:
 * devam eden, son başvurusu 30 gün içinde kapanan ya da 30 gün içinde başlayan. Bitmiş etkinlikler ve
 * alıntısında yıl olmayan uzak tarihler (yılı yanlış tahmin edilmiş eski etkinlik) reddedilir.
 */
export function relevanceProblem(e: Dated, now: number): RelevanceProblem | null {
  if (!e.startDate && !e.deadline) return { reason: "tarih bilgisi yok" };
  const dated = { startDate: e.startDate, endDate: e.endDate, deadline: e.deadline, status: "active" as const };
  if (classify(dated, now) === "past") return { reason: "etkinlik geçmişte kalmış" };
  if (!quoteHasYear(e.dateQuote)) {
    const anchor = e.deadline ?? e.startDate!;
    if (startInstant(anchor) - now > MAX_YEARLESS_DAYS_AHEAD * DAY_MS) {
      // Bilerek yeniden ziyaret edilmez: yılı tahmin edilmiş eski etkinlik, tarihi yaklaşınca yanlışlıkla kabul edilebilir.
      return { reason: `tarihte yıl yazmıyor ve ${anchor.slice(0, 10)} çok uzak; yılı yanlış tahmin edilmiş eski bir etkinlik olabilir` };
    }
  }
  if (!inWindow(dated, now)) {
    const window = WINDOW_DAYS * DAY_MS;
    const upcoming = [e.deadline && endInstant(e.deadline), e.startDate && startInstant(e.startDate)].filter(
      (t): t is number => typeof t === "number" && t > now,
    );
    const revisitAt = Math.max(now, Math.min(...upcoming) - window);
    return { reason: `${WINDOW_DAYS} günden daha ileri tarihli`, revisitAt };
  }
  return null;
}

export type Rejection = {
  title: string;
  reason: string;
  /** Tarihi liste sayfasında olmayan ama kendi sayfasına link verilen etkinlik: detay sayfasına bakılabilir. */
  detailUrl?: string;
  /** İleri tarihli olduğu için reddedildi; bu anda (ms) kaynak sayfa değişmemiş olsa da yeniden taranmalı. */
  revisitAt?: number;
};
export type VerifyResult = { accepted: ExtractedEvent[]; rejected: Rejection[] };

export function verifyEvents(
  events: ExtractedEvent[],
  page: Pick<Page, "text" | "links" | "finalUrl">,
  now: number = Date.now(),
): VerifyResult {
  const normalizedPage = normalizeForMatch(page.text);
  const linkSet = new Map(page.links.map((l) => [normalizeUrl(l.href), l.href]));
  const result: VerifyResult = { accepted: [], rejected: [] };

  for (const event of events) {
    const reject = (reason: string, followable = false) => {
      const linked = followable && event.url ? linkSet.get(normalizeUrl(event.url)) : undefined;
      const detailUrl = linked && normalizeUrl(linked) !== normalizeUrl(page.finalUrl) ? linked : undefined;
      result.rejected.push({ title: event.title, reason, ...(detailUrl && { detailUrl }) });
    };

    if (!quoteAppears(event.titleQuote, normalizedPage)) {
      reject("başlık alıntısı sayfada bulunamadı");
      continue;
    }
    const dates = [event.startDate, event.endDate, event.deadline].filter((d): d is string => !!d);
    if (!event.startDate && !event.deadline) {
      // Yalnızca bitiş tarihi olan kayıt da şemaya uymaz; detay sayfasında tam tarih aranır.
      reject("tarih bilgisi yok", true);
      continue;
    }
    if (!event.dateQuote || !quoteAppears(event.dateQuote, normalizedPage)) {
      reject("tarih alıntısı sayfada bulunamadı", true);
      continue;
    }
    const invalid = dates.find((d) => !EventDate.safeParse(d).success);
    if (invalid) {
      reject(`geçersiz tarih biçimi: ${invalid}`);
      continue;
    }
    const outOfRange = dates.find((d) => {
      const t = startInstant(d);
      return t < now - YEAR_MS || t > now + 2 * YEAR_MS;
    });
    if (outOfRange) {
      reject(`tarih makul aralığın dışında: ${outOfRange}`);
      continue;
    }

    const endDate = orderedEndDate(event.startDate, event.endDate);
    if (endDate === null) {
      reject(`bitiş tarihi başlangıçtan önce: ${event.startDate} → ${event.endDate}`);
      continue;
    }

    const problem = relevanceProblem({ ...event, endDate }, now);
    if (problem) {
      result.rejected.push({ title: event.title, reason: problem.reason, ...(problem.revisitAt && { revisitAt: problem.revisitAt }) });
      continue;
    }

    const linked = event.url ? linkSet.get(normalizeUrl(event.url)) : undefined;
    result.accepted.push({ ...event, endDate, url: linked ?? page.finalUrl });
  }
  return result;
}
