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
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Önümüzdeki 30 gün, <span className="text-accent">tek bakışta.</span>
        </h1>
        <p className="max-w-2xl text-fg-muted">
          Bu ay başvurabileceğin ve katılabileceğin hackathon, kamp, bootcamp, staj programı ve kampüs etkinlikleri. Her
          gün otomatik taranır; üyelik yok — bak, başvur, takvimine ekle.
        </p>
        <SubscribeButtons siteUrl={SITE_URL} />
      </section>
      <EventBrowser events={events.map(toCardEvent)} builtAt={builtAt} />
    </div>
  );
}
