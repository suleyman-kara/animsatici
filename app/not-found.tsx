import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-16">
      <h1 className="text-2xl font-bold">Sayfa bulunamadı</h1>
      <p className="text-fg-muted">Aradığınız etkinlik kaldırılmış ya da adresi değişmiş olabilir.</p>
      <Link href="/" className="rounded-lg bg-accent px-3 py-2 font-semibold text-accent-fg">Etkinliklere dön</Link>
    </div>
  );
}
