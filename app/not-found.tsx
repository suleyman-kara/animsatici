import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-16">
      <p className="text-5xl" aria-hidden>🫥</p>
      <h1 className="font-display text-3xl font-extrabold">Bu sayfa kaçmış gibi</h1>
      <p className="text-fg-muted">Aradığınız sayfa kaldırılmış ya da adresi değişmiş olabilir.</p>
      <Link href="/" className="pressable rounded-xl border-2 border-border bg-pop-yellow px-4 py-2 font-display font-bold text-pop-fg shadow-pop-sm">Ana sayfaya dön</Link>
    </div>
  );
}
