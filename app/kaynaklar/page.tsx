import type { Metadata } from "next";
import Link from "next/link";
import { SourceDirectory } from "@/components/SourceDirectory";
import { getActiveSources } from "@/lib/sources";
import { GITHUB_REPO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kaynaklar",
  description: "Kampüs30'un yapay zeka asistanlarına önerdiği fırsat kaynaklarının tam listesi: hackathon, kamp, bootcamp, staj ve yarışma sayfaları.",
  alternates: { canonical: "/kaynaklar" },
};

export default async function SourcesPage() {
  const sources = await getActiveSources();
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">📚 Kaynaklar</h1>
        <p className="max-w-2xl text-fg-muted">
          MCP sunucusu asistanına bu sayfaları önerir. Liste herkese açık: istersen{" "}
          <a href="/kaynaklar.json" className="font-medium text-fg underline">JSON olarak indir</a> ya da{" "}
          <a href={`https://github.com/${GITHUB_REPO}/tree/main/data/sources`} target="_blank" rel="noopener" className="font-medium text-fg underline">GitHub&apos;da incele</a>.
          &quot;Yalnızca link&quot; işaretli siteler otomatik erişimi yasakladığı için asistanlar okumaz; linkini verir.
          Eksik bir sayfa mı var? <Link href="/oneri" className="font-medium text-fg underline">Öner</Link>.
        </p>
      </header>
      <SourceDirectory sources={sources} />
    </div>
  );
}
