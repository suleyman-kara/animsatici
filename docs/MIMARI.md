# Mimari ve tasarım kararları

Bu belge Kampüs30'un nasıl çalıştığını ve neden böyle tasarlandığını anlatır. Kurulum için [KURULUM.md](KURULUM.md), geliştirme kuralları için [AGENTS.md](../AGENTS.md).

## Ürün

- Türkiye'deki üniversite öğrencilerine (öncelik bilgisayar/yazılım) yönelik hackathon, kamp, bootcamp, staj programı, yarışma, burs ve konferansları tek yerde listeleyen, **üyeliksiz** bir web sitesi.
- Ana sayfa yalnızca **önümüzdeki 30 gün içinde** başvurusu kapanan ya da başlayan etkinlikleri gösterir. Devam edenler `/devam-eden` sayfasındadır. Bu bir görüntüleme kuralıdır; kayıtlar 30 günle sınırlı değildir.
- Etkinlikler her gün otomatik taranır. Ziyaretçiler eksik ya da hatalı etkinlik bildirebilir; bildirimi bir yapay zeka ajanı inceler.
- Gelir modeli sponsorlu etkinliklerdir. Anlaşma ve ödeme site dışında yapılır; sitede yalnızca her zaman görünür "Sponsorlu" etiketiyle öne çıkarma vardır.

## Genel bakış

```
GitHub Actions (her gün 19:00 TR) ──► scripts/scan.ts ──► data/ ──► commit ──► Vercel derler
Ziyaretçi /oneri ──► /api/oneri ──► GitHub Issue ──► scripts/agent ──► yorum veya PR
```

| Katman | Seçim | Neden |
|---|---|---|
| Site | Next.js 16 (App Router), React 19, Tailwind 4 | Tüm sayfalar build zamanında statik üretilir; tek dinamik route öneri formudur |
| Barındırma | Vercel | Her `main` commit'inde otomatik derleme, PR'larda önizleme |
| Veri | Repo içinde JSON | Veritabanı yok: maliyet sıfır, tüm geçmiş git'te, her değişiklik gözden geçirilebilir |
| Zamanlanmış işler | GitHub Actions | Tarama, sağlık kontrolü, ajan |
| Yapay zeka | Gemini (`@google/genai`), varsayılan `gemini-3.6-flash` | Yapılandırılmış çıktı, function calling, Google Search grounding |
| Şema | zod (`lib/schema.ts`) | Site, tarayıcı, ajan ve doğrulama aynı şemayı kullanır |
| Analitik | Umami (çerezsiz) | Çerez bandı gerektirmez; sponsorlara herkese açık panel verilebilir |
| Spam koruması | Cloudflare Turnstile + honeypot | Üyelik olmadan form koruması |

## Veri

```
data/
├─ sources/<id>.json        taranacak kaynak sayfalar
├─ events/<id>.json         etkinlikler (tek dosya = tek etkinlik)
├─ state/scan-state.json    kaynak başına hash, son durum, hata, sonuçsuz detay sayfaları (yalnızca tarayıcı yazar)
├─ state/last-scan.json     son tarama özeti; her gün değiştiği için her gün deploy olur
├─ blocklist.json           asla tekrar eklenmeyecek dedupeKey'ler ve URL'ler
└─ feedback/                ajanın bulduğu çıkarım hataları (gelecekte değerlendirme seti)
```

Şemaların tamamı `lib/schema.ts`'tedir. Önemli kurallar:

- Bir etkinlikte `startDate` ya da `deadline`'dan en az biri bulunur; `endDate` başlangıçtan önce olamaz.
- Tarihler `Europe/Istanbul`'dadır: tüm gün için `YYYY-MM-DD`, saatli için `+03:00` offset'li ISO.
- `evidence` zorunludur: başlık, tarih ve yıl alıntıları kaynak sayfadan **birebir** kopyalanır.
- `sponsored` alanına yalnızca proje sahibi dokunur.

## Tarama hattı

`lib/scanner/run.ts` her aktif kaynak için 4'lü eşzamanlılıkla şunları yapar:

1. **Çek** (`fetch.ts`): sayfa metni ve linkleri. Sayfa hash'i değişmediyse Gemini çağrılmaz.
2. **Çıkar** (`extract.ts`): Gemini sayfadaki tüm etkinlikleri yapılandırılmış JSON olarak döndürür; her alan için sayfadan birebir alıntı ister.
3. **Doğrula** (`verify.ts`):
   - Başlık ve tarih alıntıları sayfa metninde birebir geçmeyen etkinlik reddedilir.
   - **Yıl asla tahmin edilmez.** Başlangıç ve son başvurunun yılı alıntılarda açıkça yazmalıdır.
   - Bitmiş etkinlikler alınmaz; ters tarih aralıkları ya düzeltilir (yıl dönümü) ya da reddedilir.
4. **Detay sayfası** (`details.ts`): liste sayfasında tarihi ya da yılı olmayan etkinliklerin kendi sayfası açılır. Kaynak başına en fazla 30 sayfaya bakılır, sonuçsuz sayfalar 7 gün tekrar açılmaz.
5. **Tekilleştir ve birleştir** (`dedupe.ts`, `merge.ts`):
   - `dedupeKey` başlık slug'ı ile tarihten oluşur. Ayrıca bulanık eşleşme yapılır: başlık benzerliği ≥ 0,8 ve tarih farkı ≤ 1 gün.
   - Elle ya da ajanla eklenmiş alanlar ezilmez.
6. **Güvenlik eşikleri** (`guards.ts`):
   - Daha önce çalışmış kaynakların yarısından fazlası hata verirse ya da 40'tan fazla yeni etkinlik çıkarsa hiçbir şey yazılmaz.
   - Önceden ≥ 3 etkinlik veren bir kaynak birden 0 verirse yalnızca o kaynak atlanır.
7. **Şema doğrulaması**: geçmezse tarama başarısız sayılır ve `tarama-hatasi` issue'su açılır.

Ayrıca `healthcheck.yml` her gün son taramanın 48 saatten eski olup olmadığını kontrol eder.

## Öneri ajanı

- `/api/oneri` formdan gelen öneriyi `oneri` ya da `hata-bildirimi` etiketli bir GitHub issue'suna çevirir. Kullanıcı metni gövdeye yalnızca bir JSON bloğu içinde girer; IP ya da kişisel veri yazılmaz.
- `agent.yml` bu issue'larda Gemini function-calling döngüsünü çalıştırır:
  - En fazla 20 araç çağrısı yapar, 5 dakika çalışır ve 5 dosya değiştirir.
  - Araçları: web araması, sayfa çekme, tarayıcının çıkarım hattını bir sayfada çalıştırma, veri arama ve `propose_*` yazma araçları.
- Ajan yalnızca `data/events/`, `data/sources/`, `data/feedback/` ve `data/blocklist.json`'a yazabilir. Kod, prompt ya da workflow değiştiremez, `main`'e push edemez, `sponsored` alanına dokunamaz.
- Issue metni ve web sayfaları prompt'a "güvenilmez veri" sınırlayıcıları içinde girer.
- `AGENT_MODE=comment` modunda ajan yalnızca teşhis yorumu yazar. `pr` modunda değişikliği, doğrulama ve testleri geçtikten sonra PR olarak açar.

## Site

- **Sayfalar:**
  - `/` (30 günlük pencere)
  - `/devam-eden`
  - `/etkinlik/[id]` (JSON-LD ve OG görseliyle)
  - `/kaynaklar` (tarama durumu)
  - `/oneri`, `/hakkinda`, `/gizlilik`
  - `/takvim.ics`
- **Zamana bağlı hesaplar** (aşama, geri sayım, sponsorluk süresi) tarayıcıda da yapılır (`useNow`). Böylece bir gün eski build yanlış "başvurusu açık" göstermez.
- **Takvim:** ICS akışı ve "Takvime ekle" yalnızca son başvuru ve başlangıç günlerini içerir. Uzun etkinliklerin bütün süresi takvimi kirletmez.
- **Analitik olayları:** `basvur-tikla`, `takvime-ekle`, `ics-abone`, `oneri-gonder`.

## Kapsam dışı

- Üyelik, giriş, kişisel bildirim, e-posta bülteni
- Ödeme ya da sponsor paneli
- JavaScript ile yüklenen sayfaları tarama. `render: "browser"` alanı ileride kullanılmak üzere duruyor; bu tür kaynaklar şimdilik `active: false`.

## Tarihçe

- İlk sürüm Flutter + Firebase'di; 2026'da bu mimariye taşındı ve eski kod silindi (git geçmişinde duruyor).
- Proje önce "KampüsRadar", sonra "Kampüs30" adını aldı. Issue gövdelerindeki `<!-- kampusradar:v1 -->` ve ajan yorumlarındaki `<!-- kampusradar-agent -->` işaretleri, eski issue'larla uyum için bilerek değiştirilmedi.
