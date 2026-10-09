import type { Metadata } from "next";
import { SuggestionForm } from "@/components/SuggestionForm";

export const metadata: Metadata = {
  title: "Kaynak öner",
  description: "Kampüs30 kaynak listesine yeni bir sayfa önerin ya da geri bildirim gönderin. Üyelik gerekmez.",
  alternates: { canonical: "/oneri" },
};

export default function SuggestPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">💡 Kaynak öner</h1>
        <p className="mt-2 text-fg-muted">
          Hackathon, kamp, staj ya da yarışma duyurularının yayınlandığı bir sayfa mı biliyorsun? Bağlantısını gönder. Kulüp
          sayfaları ve şirket kariyer sayfaları özellikle değerli. Üyelik gerekmez.
        </p>
      </header>
      <SuggestionForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
    </div>
  );
}
