import type { MetadataRoute } from "next";
import { getEvents, getLastScan } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, lastScan] = await Promise.all([getEvents(), getLastScan()]);
  const updated = lastScan?.completedAt ?? new Date().toISOString();
  const pages = ["", "/arsiv", "/kaynaklar", "/oneri", "/hakkinda"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: updated,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.5,
  }));
  return [
    ...pages,
    ...events.map((e) => ({ url: `${SITE_URL}/etkinlik/${e.id}`, lastModified: e.lastSeenAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
