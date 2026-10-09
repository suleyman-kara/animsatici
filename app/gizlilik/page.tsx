import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Gizlilik", alternates: { canonical: "/gizlilik" } };

export default function PrivacyPage() {
  return (
    <Prose>
      <h1>Gizlilik</h1>
      <p>{SITE_NAME} üyelik sistemi içermez ve sizden kişisel veri istemez.</p>
      <h2>MCP sunucusu</h2>
      <p>
        Asistanınız MCP sunucumuza yalnızca araç çağrılarını gönderir: arama filtreleri (alan, tür, şehir, arama kelimeleri) ve
        GitHub projelerini istediğinizde GitHub kullanıcı adınız. Sohbetleriniz, yüklediğiniz dosyalar (ör. LinkedIn PDF&apos;i)
        ve hazırlanan CV bize gelmez; bunlar kullandığınız yapay zeka uygulamasında kalır ve o uygulamanın gizlilik politikasına
        tabidir. Araç çağrılarının içeriğini saklamayız. Barındırma sağlayıcımız (Vercel) standart erişim kayıtları tutabilir.
      </p>
      <h2>GitHub projeleri</h2>
      <p>
        Kullanıcı adınızla yalnızca GitHub&apos;ın herkese açık API&apos;sinden açık repolarınızı okuruz. GitHub hesabınıza erişim
        izni istemeyiz, token istemeyiz ve sonuçları saklamayız.
      </p>
      <h2>Ziyaret istatistikleri</h2>
      <p>
        Sayfa görüntülemeleri ve &quot;Adresi kopyala&quot; gibi tıklamalar, çerez kullanmayan Umami ile anonim ve toplu olarak
        sayılır. Sizi siteler arasında takip eden bir kimlik oluşturulmaz.
      </p>
      <h2>Öneri formu</h2>
      <p>
        Öneri formuna yazdıklarınız, incelenmek üzere projenin GitHub deposunda <strong>herkese açık</strong> bir kayıt (issue)
        olarak yayınlanır. Bu yüzden formda kişisel bilgi istenmez; lütfen siz de yazmayın. IP adresiniz kayda eklenmez. Spam
        koruması için Cloudflare Turnstile kullanılır.
      </p>
      <h2>Dış bağlantılar</h2>
      <p>Kaynak bağlantıları sizi ilgili kurumların sitelerine götürür; bu sitelerin kendi gizlilik politikaları geçerlidir.</p>
      {CONTACT_EMAIL && (
        <p>
          Sorularınız için: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      )}
    </Prose>
  );
}
