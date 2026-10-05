// Bozuk bir taramanın siteye yansımasını engelleyen eşikler.

export const MAX_ERROR_RATIO = 0.5;
/** Daha önce taranmış bir kaynağın tek taramada getirebileceği yeni etkinlik tabanı. */
export const MIN_NEW_EVENTS_CAP = 25;
export const DROP_PROTECTION_MIN_PREVIOUS = 3;

/** Kaynakların yarısından fazlası hata verdiyse tarama güvenilmezdir. */
export function tooManyErrors(errorCount: number, totalCount: number): boolean {
  return totalCount >= 2 && errorCount / totalCount > MAX_ERROR_RATIO;
}

/**
 * Daha önce taranmış bir kaynak birden olağandışı çok yeni etkinlik getirdiyse (en az 25, ya da önceki ham
 * çıkarımın iki katından fazla) sayfa muhtemelen bozuldu. Yalnızca o kaynak atlanır; tarama sürer.
 * İlk kez taranan kaynakta önceki sayı yoktur, kanıt doğrulaması yeterli koruma sayılır.
 */
export function tooManyNewEvents(newCount: number, previousCount: number | undefined): boolean {
  if (previousCount === undefined) return false;
  return newCount > Math.max(MIN_NEW_EVENTS_CAP, 2 * previousCount);
}

/** Daha önce birkaç etkinlik veren kaynak birden sıfır veriyorsa sayfa yapısı muhtemelen bozuldu. */
export function suspiciousDrop(previousCount: number | undefined, currentCount: number): boolean {
  return (previousCount ?? 0) >= DROP_PROTECTION_MIN_PREVIOUS && currentCount === 0;
}
