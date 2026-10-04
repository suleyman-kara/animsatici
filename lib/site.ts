export const SITE_NAME = "KampüsRadar";
export const SITE_TAGLINE = "Üniversite öğrencileri için etkinlik radarı";
export const SITE_DESCRIPTION =
  "Türkiye'deki hackathon, kamp, bootcamp, staj programı ve kampüs etkinlikleri tek yerde. Önümüzdeki 30 gün içinde başvurabileceğin ya da katılabileceğin etkinlikler; her hafta güncellenir, üyelik gerekmez.";
// NEXT_PUBLIC_SITE_URL girilmemişse Vercel'in verdiği kalıcı üretim adresi kullanılır.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || "https://kampusradar.vercel.app").replace(/\/$/, "");
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
export const GITHUB_REPO = process.env.GITHUB_REPO || "suleyman-kara/animsatici";
