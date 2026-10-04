// Bozuk bir taramanın siteye yansımasını engelleyen eşikler.

export const MAX_ERROR_RATIO = 0.5;
export const MAX_NEW_EVENTS_PER_SCAN = 40;
export const DROP_PROTECTION_MIN_PREVIOUS = 3;

/** Kaynakların yarısından fazlası hata verdiyse tarama güvenilmezdir. */
export function tooManyErrors(errorCount: number, totalCount: number): boolean {
  return totalCount >= 2 && errorCount / totalCount > MAX_ERROR_RATIO;
}

export function tooManyNewEvents(newCount: number): boolean {
  return newCount > MAX_NEW_EVENTS_PER_SCAN;
}

/** Daha önce birkaç etkinlik veren kaynak birden sıfır veriyorsa sayfa yapısı muhtemelen bozuldu. */
export function suspiciousDrop(previousCount: number | undefined, currentCount: number): boolean {
  return (previousCount ?? 0) >= DROP_PROTECTION_MIN_PREVIOUS && currentCount === 0;
}
