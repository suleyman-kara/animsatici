// Umami özel olayları. Umami yüklenmemişse (env yok, reklam engelleyici vb.) sessizce geçer.

type UmamiData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: UmamiData) => void };
  }
}

export function track(event: string, data?: UmamiData): void {
  try {
    window.umami?.track(event, data);
  } catch {
    // analitik hiçbir zaman kullanıcı akışını bozmamalı
  }
}
