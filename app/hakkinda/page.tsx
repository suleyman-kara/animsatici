import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { CONTACT_EMAIL, GITHUB_REPO, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Hakkında", alternates: { canonical: "/hakkinda" } };

export default function AboutPage() {
  return (
    <Prose>
      <h1>Hakkında</h1>
      <p>
        {SITE_NAME}, Türkiye&apos;deki üniversite öğrencilerinin hackathon, kamp, bootcamp, staj, yarışma ve burs fırsatlarını
        kendi yapay zeka asistanlarıyla bulabilmesi için yapılmış ücretsiz, açık kaynak bir projedir.
      </p>
      <h2>Nasıl çalışır?</h2>
      <ul>
        <li>Fırsatların yayınlandığı sayfaları alan, tür ve şehre göre etiketleyip <Link href="/kaynaklar">herkese açık bir listede</Link> tutarız.</li>
        <li>Asistanın bir MCP sunucusu üzerinden bu listeye bakar, isteğine uygun sayfaları kendi web erişimiyle okur ve fırsatları linkleriyle getirir.</li>
        <li>Biz fırsat verisi toplamayız ya da yayınlamayız; listede yalnızca sayfaların adresi ve açıklaması bulunur.</li>
        <li>CV hazırlamak için asistanına bir rehber ve açık GitHub projelerini listeleyen bir araç sunarız. CV senin asistanında hazırlanır.</li>
      </ul>
      <h2>Sitelerin kurallarına saygı</h2>
      <ul>
        <li>Kullanım koşullarında otomatik erişimi yasaklayan siteler &quot;yalnızca link&quot; olarak işaretlenir; asistanlardan bu sayfaları okumamaları istenir.</li>
        <li>Giriş gerektiren sayfalar listeye alınmaz. Asistanlardan bot korumalarını aşmaya çalışmamaları istenir.</li>
        <li>Kaynak listesi haftada bir kontrol edilir: sayfa açılıyor mu, robots.txt ne diyor.</li>
        <li>
          Sitenizin listede yer almasını istemiyorsanız ya da bilgisi yanlışsa{" "}
          {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>bize yazın</a> : <Link href="/oneri?tur=geri-bildirim">geri bildirim gönderin</Link>}; hemen düzeltiriz.
        </li>
      </ul>
      <h2>Katkı</h2>
      <p>
        Kod ve kaynak listesi <a href={`https://github.com/${GITHUB_REPO}`} target="_blank" rel="noopener">GitHub&apos;da</a>, Apache-2.0
        lisansıyla. Yeni kaynakları <Link href="/oneri">öneri formundan</Link> ya da doğrudan pull request ile ekleyebilirsin.
      </p>
    </Prose>
  );
}
