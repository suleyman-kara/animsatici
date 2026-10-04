import type { Metadata } from "next";
import { OngoingList } from "@/components/OngoingList";
import { toCardEvent } from "@/lib/cards";
import { buildTime, getEvents } from "@/lib/data";
import { classify } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Devam eden etkinlikler",
  description: "Şu anda devam eden kamp, program, yarışma ve staj programları.",
  alternates: { canonical: "/devam-eden" },
};

export default async function OngoingPage() {
  const builtAt = buildTime();
  const events = (await getEvents()).filter((e) => classify(e, builtAt - 2 * 24 * 60 * 60 * 1000) !== "past");
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">🟢 Devam eden etkinlikler</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Şu anda sürmekte olan programlar, kamplar ve yarışmalar. Başvuruları çoğunlukla kapanmıştır; takip etmek ya da
          bir sonraki dönemi kaçırmamak için listeleniyorlar.
        </p>
      </header>
      <OngoingList events={events.map(toCardEvent)} builtAt={builtAt} />
    </div>
  );
}
