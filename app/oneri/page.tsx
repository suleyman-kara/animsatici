import type { Metadata } from "next";
import { SuggestionForm } from "@/components/SuggestionForm";
import { getEvents } from "@/lib/data";

export const metadata: Metadata = {
  title: "Etkinlik öner",
  description: "Sitede olmayan bir etkinliği önerin ya da hatalı bir etkinliği bildirin. Üyelik gerekmez.",
  alternates: { canonical: "/oneri" },
};

export default async function SuggestPage() {
  const events = (await getEvents()).map((e) => ({ id: e.id, title: e.title })).sort((a, b) => a.title.localeCompare(b.title, "tr"));
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">💡 Etkinlik öner</h1>
        <p className="mt-2 text-fg-muted">
          Listede olmayan bir etkinlik mi var, ya da bir bilgi yanlış mı? Etkinliğin adını yazmanız yeterli; gerisini biz
          araştırırız. Üyelik gerekmez.
        </p>
      </header>
      <SuggestionForm events={events} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
    </div>
  );
}
