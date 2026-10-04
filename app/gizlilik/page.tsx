import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Gizlilik", alternates: { canonical: "/gizlilik" } };

export default function PrivacyPage() {
  return (
    <Prose>
      <h1>Gizlilik</h1>
      <p>{SITE_NAME} üyelik sistemi içermez ve sizden kişisel veri istemez.</p>
      <h2>Ziyaret istatistikleri</h2>
      <p>
        Sayfa görüntülemeleri ve &quot;Başvur&quot;, &quot;Takvime ekle&quot; gibi tıklamalar, çerez kullanmayan Umami ile anonim
        ve toplu olarak sayılır. Sizi siteler arasında takip eden bir kimlik oluşturulmaz, reklam amaçlı profil çıkarılmaz.
      </p>
      <h2>Öneri ve hata bildirimleri</h2>
      <p>
        Öneri formuna yazdıklarınız, incelenmek üzere projenin GitHub deposunda <strong>herkese açık</strong> bir kayıt (issue)
        olarak yayınlanır. Bu yüzden formda ad, e-posta veya telefon gibi kişisel bilgi istenmez; lütfen siz de yazmayın.
        IP adresiniz kayda eklenmez. Spam koruması için Cloudflare Turnstile kullanılır.
      </p>
      <h2>Dış bağlantılar</h2>
      <p>Etkinlik bağlantıları sizi ilgili kurumların sitelerine götürür; bu sitelerin kendi gizlilik politikaları geçerlidir.</p>
      {CONTACT_EMAIL && (
        <p>
          Sorularınız için: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      )}
    </Prose>
  );
}
