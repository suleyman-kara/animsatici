import { EventBrowser } from "@/components/EventBrowser";
import { SubscribeButtons } from "@/components/SubscribeButtons";
import { toCardEvent } from "@/lib/cards";
import { buildTime, getEvents } from "@/lib/data";
import { classify } from "@/lib/dates";
import { SITE_URL } from "@/lib/site";

export default async function HomePage() {
  const builtAt = buildTime();
  // Geçmiş etkinlikler ana sayfaya gönderilmez; yalnızca son birkaç gün içinde bitenler (istemci yeniden sınıflandırırken kaybolmasın diye) dahil.
  const events = (await getEvents()).filter((e) => classify(e, builtAt - 2 * 24 * 60 * 60 * 1000) !== "past");

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl border-2 border-border bg-pop-violet p-6 text-pop-fg shadow-pop-lg sm:p-10">
        <span aria-hidden className="pointer-events-none absolute -right-4 -top-6 select-none text-[9rem] leading-none opacity-20 sm:text-[12rem]">
          30
        </span>
        <div className="relative flex flex-col gap-4">
          <p className="w-fit -rotate-2 rounded-full border-2 border-border bg-pop-yellow px-3 py-1 font-display text-sm font-bold shadow-pop-sm">
            👀 Bu ay kaçırma
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Önümüzdeki{" "}
            <span className="inline-block rotate-2 rounded-xl border-2 border-border bg-pop-mint px-2 shadow-pop-sm">30 gün</span>{" "}
            seni neler bekliyor?
          </h1>
          <p className="max-w-2xl text-base font-medium sm:text-lg">
            Hackathon, kamp, bootcamp, staj, yarışma… Başvurusu bu ay kapanan ya da bu ay başlayan her şey tek sayfada. Her gün
            otomatik güncellenir, üyelik yok.
          </p>
          <SubscribeButtons siteUrl={SITE_URL} />
        </div>
      </section>
      <EventBrowser events={events.map(toCardEvent)} builtAt={builtAt} />
    </div>
  );
}
