import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Hakkında", alternates: { canonical: "/hakkinda" } };

export default function AboutPage() {
  return (
    <Prose>
      <h1>Hakkında</h1>
      <p>
        {SITE_NAME}, Türkiye&apos;deki üniversite öğrencilerinin kaçırmaması gereken hackathon, kamp, bootcamp, staj programı,
        yarışma ve kampüs etkinliklerini tek bir yerde toplar. Üyelik gerekmez.
      </p>
      <h2>Nasıl çalışır?</h2>
      <ul>
        <li>Her pazar 19:00&apos;da <Link href="/kaynaklar">kaynak sayfalar</Link> taranır; yalnızca önümüzdeki 30 gün içinde başvurulabilecek ya da katılınabilecek etkinlikler alınır.</li>
        <li>Sayfadaki etkinlikler yapay zeka ile çıkarılır. Başlık ve tarih kaynak sayfada birebir geçmiyorsa etkinlik yayınlanmaz.</li>
        <li>Etkinlik özetleri bizim tarafımızdan yazılır; ayrıntılar ve başvuru için her zaman etkinliğin kendi sayfasına yönlendirilirsiniz.</li>
        <li>Eksik veya hatalı bir etkinlik gördüğünüzde <Link href="/oneri">bildirebilirsiniz</Link>; her bildirim incelenir.</li>
      </ul>
      <h2>Etkinliğinizi öne çıkarın</h2>
      <p>
        Bootcamp, hackathon, staj programı veya kampüs etkinliğinizi öğrencilere ulaştırmak isterseniz etkinliğiniz
        &quot;Öne çıkanlar&quot; alanında, açıkça &quot;Sponsorlu&quot; etiketiyle gösterilebilir.
        {CONTACT_EMAIL ? <> İletişim: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></> : null}
      </p>
    </Prose>
  );
}
