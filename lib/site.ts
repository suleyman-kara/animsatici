export const SITE_NAME = "Kampüs30";
export const SITE_TAGLINE = "Yapay zeka asistanın için öğrenci fırsatları";
export const SITE_DESCRIPTION =
  "Kampüs30, Claude ve Gemini gibi yapay zeka asistanlarına bağlanan ücretsiz bir MCP sunucusu. Hackathon, kamp, bootcamp, staj ve yarışmaları doğru kaynaklardan bulmanı ve CV'ni hazırlamanı sağlar. Üyelik yok.";
// NEXT_PUBLIC_SITE_URL girilmemişse Vercel'in verdiği kalıcı üretim adresi kullanılır.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || "https://kampus30.com").replace(/\/$/, "");
export const MCP_URL = `${SITE_URL}/mcp`;
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
export const GITHUB_REPO = process.env.GITHUB_REPO || "suleyman-kara/kampus30";
