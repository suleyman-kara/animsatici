# KampüsRadar v2 — Uygulama Planı

> Bu belge, projeyi Flutter + Firebase mimarisinden **Next.js + GitHub Actions + JSON veri** mimarisine taşımak için uygulanacak plandır.
> Uygulayacak ajan: aşamaları **sırayla** uygula, her aşamanın "Kabul kriterleri" sağlanmadan sonrakine geçme.
> Kararlar bölümündeki maddeler kullanıcıyla konuşularak kesinleşmiştir; yeniden tartışma, alternatif önerme.

---

## 1. Ürün Tanımı

- Türkiye'deki üniversite öğrencilerine (öncelik **CENG / yazılım**) yönelik etkinlikleri (hackathon, kamp, bootcamp, staj programı, seminer, yarışma, burs) tek bir yerde listeleyen **herkese açık** web sitesi.
- **Üyelik yok, giriş yok, ödeme yok, mobil uygulama yok.**
- Etkinlikler her gün otomatik taranır (Gemini ile çıkarılır), siteye kendiliğinden yansır.
- Kullanıcılar üyeliksiz olarak **eksik etkinlik önerebilir** veya **hatalı etkinlik bildirebilir**; bir ajan bunu inceler ve **PR açar**, kullanıcı (proje sahibi) onaylar.
- Gelir: sponsorlu etkinlikler. Sponsorlarla anlaşma ve ödeme **tamamen site dışında** yapılır; sitede yalnızca "Sponsorlu" etiketli öne çıkarma vardır.
- Ziyaretçi ve etkinlik bazlı tıklama istatistikleri tutulur (sponsorlara rapor için).

## 2. Kesinleşmiş Kararlar

| Konu | Karar |
|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind CSS |
| Barındırma | Vercel (Hobby). `output: 'export'` **kullanılmaz** (tek bir API route var). Sayfalar statik üretilir (SSG). |
| Veritabanı | **Yok.** Veri repo içinde JSON dosyalarıdır. |
| Zamanlanmış işler | GitHub Actions (`schedule`) |
| Yapay zeka | Gemini, `@google/genai`. Model adı `GEMINI_MODEL` env değişkeninden okunur, varsayılan `gemini-3.6-flash` |
| Şema doğrulama | `zod` (tek kaynak: `lib/schema.ts`; site, tarayıcı, ajan hepsi bunu kullanır) |
| Script çalıştırma | `tsx` |
| Test | `vitest` |
| Paket yöneticisi | `npm` |
| Analitik | Umami (çerezsiz). Script URL ve website ID env'den gelir; env yoksa script hiç eklenmez |
| Spam koruması | Cloudflare Turnstile + honeypot alanı |
| Öneriler | GitHub Issue olarak toplanır |
| Ajanın yetkisi | Asla doğrudan `main`'e yazmaz; **her zaman PR açar** |
| Tarayıcının yetkisi | Günlük taramayı doğrudan `main`'e commit eder (doğrulamadan geçtiyse) |
| Saat dilimi | Tüm tarihler `Europe/Istanbul`, ISO 8601 + offset (`2026-11-14T10:00:00+03:00`) veya tüm gün için `YYYY-MM-DD` |
| Dil | Arayüz Türkçe. Kod, değişken, dosya adları İngilizce; URL slug'ları Türkçe olabilir (`/etkinlik/...`) |

## 3. Hedef Mimari

```
GitHub Actions (her gün 19:00 TR)  ──►  scripts/scan.ts
   ├─ data/sources/*.json okunur
   ├─ her kaynak: fetch → temizle → hash karşılaştır → (değiştiyse) Gemini ile TÜM etkinlikleri çıkar
   ├─ kanıt doğrulama + tekilleştirme + şema doğrulama + güvenlik eşikleri
   ├─ data/events/*.json ve data/state/*.json güncellenir
   └─ commit → push → Vercel otomatik yeniden derler

Kullanıcı formu (/oneri) ──► /api/oneri (Vercel fonksiyonu) ──► GitHub Issue (etiket: oneri | hata-bildirimi)
   └─ GitHub Actions: scripts/agent.ts (Gemini + araçlar)
         ├─ issue'ya teşhis yorumu yazar
         └─ değişiklik gerekiyorsa agent/issue-<n> dalında PR açar → proje sahibi onaylar
```

## 4. Hedef Dizin Yapısı

```
/
├─ app/                         # Next.js App Router (DİKKAT: eski Flutter `app/` klasörü önce `legacy/flutter-app/`a taşınır, bkz. Aşama 0)
│  ├─ layout.tsx
│  ├─ page.tsx                  # Ana sayfa: Başvurusu açık + Yaklaşan
│  ├─ arsiv/page.tsx
│  ├─ etkinlik/[id]/page.tsx
│  ├─ kaynaklar/page.tsx
│  ├─ oneri/page.tsx
│  ├─ hakkinda/page.tsx         # İletişim + "Sponsor olun" e-posta adresi
│  ├─ gizlilik/page.tsx
│  ├─ takvim.ics/route.ts       # Statik üretilir (dynamic = 'force-static')
│  ├─ api/oneri/route.ts        # Tek dinamik route
│  ├─ sitemap.ts
│  ├─ robots.ts
│  └─ opengraph-image.tsx (+ etkinlik başına)
├─ components/
├─ lib/
│  ├─ schema.ts                 # zod şemaları (Event, Source, ScanState, Blocklist, Feedback)
│  ├─ data.ts                   # build zamanında data/ okur (sadece server)
│  ├─ dates.ts                  # Europe/Istanbul yardımcıları, durum sınıflandırma
│  ├─ slug.ts
│  ├─ calendar.ts               # Google Takvim linki + ICS üretimi (functions/core/calendar.js'ten taşınır)
│  └─ scanner/
│     ├─ fetch.ts               # functions/core/scraper.js'ten taşınır
│     ├─ hash.ts                # functions/core/hasher.js'ten taşınır
│     ├─ extract.ts             # Gemini çıkarımı (YENİ: çoklu etkinlik + kanıt)
│     ├─ verify.ts              # kanıt alıntısını sayfa metninde doğrular
│     ├─ dedupe.ts
│     └─ guards.ts              # güvenlik eşikleri
├─ scripts/
│  ├─ scan.ts
│  ├─ validate.ts               # tüm data/ dosyalarını şemaya göre doğrular
│  ├─ healthcheck.ts
│  ├─ migrate-catalog.ts        # tek seferlik: data/catalog.json → data/sources/*.json
│  └─ agent/
│     ├─ index.ts
│     ├─ tools.ts
│     └─ prompt.ts
├─ data/
│  ├─ sources/<source-id>.json
│  ├─ events/<event-id>.json
│  ├─ state/scan-state.json     # kaynak başına hash, son durum, son hata (YALNIZCA scan.ts yazar)
│  ├─ state/last-scan.json      # son tarama özeti (her taramada değişir → her gün deploy garantisi)
│  ├─ blocklist.json            # asla tekrar eklenmeyecek etkinlik dedupeKey'leri / URL'ler
│  └─ feedback/<tarih>-<issue>.json   # ajanın bulduğu çıkarım hataları (ileride test seti)
├─ tests/
├─ .github/workflows/
│  ├─ ci.yml
│  ├─ scan.yml
│  ├─ healthcheck.yml
│  └─ agent.yml
├─ PLAN.md
└─ AGENTS.md
```

## 5. Veri Şemaları (`lib/schema.ts`)

### Source
```ts
{
  id: string,                 // slug, dosya adıyla aynı
  title: string,
  url: string,                // taranacak liste sayfası
  homepage?: string,
  category: 'ceng' | 'career' | 'campus' | 'community',
  kind: 'listing' | 'single', // listing: birden çok etkinlik listeler
  active: boolean,
  render: 'static' | 'browser', // şimdilik hep 'static'; 'browser' = ileride Playwright
  notes?: string
}
```

### Event
```ts
{
  id: string,                 // slug: "<baslik-slug>-<yyyy-mm>", dosya adıyla aynı, benzersiz
  title: string,
  summary: string,            // KENDİ cümlelerimizle, max 300 karakter. Kaynak metni kopyalanmaz.
  type: 'hackathon' | 'bootcamp' | 'camp' | 'internship' | 'competition' | 'seminar' | 'scholarship' | 'conference' | 'other',
  category: Source['category'],
  organizer?: string,
  startDate?: string,         // ISO (offset'li) veya YYYY-MM-DD
  endDate?: string,
  deadline?: string,          // başvuru son tarihi
  isAllDay: boolean,
  location: { mode: 'online' | 'in-person' | 'hybrid' | 'unknown', city?: string, venue?: string },
  url: string,                // etkinliğin kendi sayfası (yoksa kaynak sayfa)
  sourceId?: string,          // elle/ajan eklendiyse olmayabilir
  alsoSeenAt: string[],       // tekilleştirmede birleşen diğer URL'ler
  tags: string[],
  evidence: {                 // halüsinasyona karşı ZORUNLU
    titleQuote: string,       // sayfa metninden birebir alıntı
    dateQuote?: string,       // tarih geçen birebir alıntı
    pageUrl: string,
    fetchedAt: string
  },
  status: 'active' | 'cancelled',
  origin: 'scan' | 'agent' | 'manual',
  dedupeKey: string,
  firstSeenAt: string,
  lastSeenAt: string,         // tarayıcı etkinliği kaynakta son gördüğü an
  sponsored?: { until: string, label?: string } // Aşama 8
}
```
Kural: `startDate` veya `deadline`'dan en az biri dolu olmalı (`superRefine`).

### Durum sınıflandırma (`lib/dates.ts`, saf fonksiyon, testli)
- **Başvurusu açık:** `deadline` gelecekte.
- **Yaklaşan:** başlangıç gelecekte (ve başvurusu açık değil ya da deadline yok).
- **Devam ediyor:** start ≤ şimdi ≤ end.
- **Geçmiş / arşiv:** bitiş (yoksa başlangıç, yoksa deadline) geçmişte.
- `cancelled` olanlar listede üstü çizili / ayrı rozetle gösterilir, arşive düşer.

---

## Aşama 0 — Hazırlık ve iskelet

1. Yeni dalda çalış. Eski kodu **silme**, taşı:
   - `app/` (Flutter) → `legacy/flutter-app/`
   - `functions/` → `legacy/functions/`
   - `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` → `legacy/firebase/`
   - Kök `package.json`/`package-lock.json` yeniden yazılacak; eskisini `legacy/` altına koy.
   - Silme işlemi Aşama 9'da, **kullanıcı onayıyla** yapılır.
2. Kökte Next.js projesi kur (TypeScript, Tailwind, ESLint, App Router, `src/` YOK).
3. `tsx`, `zod`, `vitest`, `@google/genai`, `cheerio` ekle. `axios` yerine yerleşik `fetch` kullan.
4. `package.json` scriptleri: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test`, `validate`, `scan`, `healthcheck`, `agent`.
5. `.env.example`'ı güncelle: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GITHUB_TOKEN` (yalnızca /api/oneri için), `GITHUB_REPO` (`suleyman-kara/animsatici`), `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_UMAMI_SRC`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, `NEXT_PUBLIC_SITE_URL`, `CONTACT_EMAIL`.
6. `.github/workflows/ci.yml`: push ve PR'da `npm ci && npm run lint && npm run typecheck && npm test && npm run validate && npm run build`.

**Kabul:** `npm run build` geçer, CI yeşil, eski kod `legacy/` altında duruyor.

## Aşama 1 — Veri modeli ve göç

1. `lib/schema.ts`: Bölüm 5'teki şemalar + `ScanState`, `LastScan`, `Blocklist`, `Feedback`.
2. `scripts/migrate-catalog.ts`: `data/catalog.json`'daki 7 öğeyi `data/sources/<id>.json`'a çevir. Kategoriler aynı kalır. Çalıştır, çıktıyı commit et, `catalog.json`'ı sil.
3. `scripts/validate.ts`:
   - tüm `data/**/*.json` dosyalarını ilgili şemayla doğrular,
   - dosya adı == `id` kontrolü,
   - event `sourceId` gerçekten var mı,
   - aynı `dedupeKey` iki dosyada var mı,
   - hata varsa anlaşılır mesajla `exit 1`.
4. `lib/slug.ts`: Türkçe karakter dönüşümü (ç→c, ğ→g, ı→i, İ→i, ö→o, ş→s, ü→u), küçük harf, tire.
5. `lib/dates.ts` + testler (sınıflandırma, TR saat dilimi, tüm gün etkinlikleri).
6. Elle 3–4 örnek etkinlik dosyası ekle (`origin: 'manual'`), siteyi geliştirirken kullanılsın. Gerçek etkinlik olsun, kanıtları dolu olsun.

**Kabul:** `npm run validate` geçer; slug ve dates testleri yazılmış ve geçiyor.

## Aşama 2 — Tarayıcı (`scripts/scan.ts`)

Mevcut mantık `legacy/functions/core/*` ve `legacy/functions/index.js` içinde; referans al ama **çıkarım mantığı değişiyor**: eski sistem sayfa başına tek etkinlik çıkarıyordu, yeni sistem sayfadaki **tüm** etkinlikleri çıkarır.

1. `lib/scanner/fetch.ts`: `scraper.js`'in TypeScript karşılığı (aynı temizleme kuralları, 15 sn timeout, aynı başlıklar). Ayrıca sayfadaki `<a>` linklerini (metin + mutlak href) ayrı bir liste olarak döndür; Gemini'nin etkinlik URL'si üretebilmesi için.
2. `lib/scanner/hash.ts`: `hasher.js` karşılığı.
3. `lib/scanner/extract.ts`:
   - Girdi: sayfa metni (ilk ~15.000 karakter), link listesi, kaynak bilgisi, bugünün tarihi, o kaynaktan bilinen mevcut etkinliklerin kısa listesi (id, başlık, tarih).
   - Çıktı (responseSchema ile): `events: [{ title, summary, type, organizer, startDate, endDate, deadline, isAllDay, location, url, tags, titleQuote, dateQuote, matchesExistingId?, cancelled? }]`.
   - Prompt kuralları (eski prompttan devral + ekle): gürültüyü yoksay; tarihleri ISO'ya çevir, TR saat dilimi; **1 yıldan eski etkinlikleri döndürme**; **`titleQuote` ve `dateQuote` sayfa metninden birebir kopya olmalı**; özet kendi cümlelerimizle ve en fazla 300 karakter; emin olmadığın alanı boş bırak, uydurma.
   - 503/429 için mevcut retry mantığını koru (3 deneme, artan bekleme).
4. `lib/scanner/verify.ts`: `titleQuote` (ve varsa `dateQuote`) normalize edilmiş sayfa metninde geçmiyorsa etkinliği **reddet** ve rapora yaz. `url` sayfadaki linkler arasında yoksa kaynak URL'yi kullan.
5. `lib/scanner/dedupe.ts`:
   - `dedupeKey = slug(title) + '|' + (startDate ?? deadline).slice(0,10)`.
   - Ayrıca bulanık eşleşme: başlık token Jaccard ≥ 0.8 **ve** tarih farkı ≤ 1 gün → aynı etkinlik. Mevcut dosyayı güncelle, yeni URL'yi `alsoSeenAt`'e ekle.
   - `blocklist.json`'daki anahtar/URL'ler asla eklenmez.
   - Testli.
6. Birleştirme kuralları:
   - Yeni etkinlik → yeni dosya, `origin: 'scan'`.
   - Mevcut etkinlik tekrar görüldü → `lastSeenAt` güncellenir; tarih değiştiyse alanlar güncellenir.
   - `cancelled: true` → `status: 'cancelled'`.
   - Kaynakta artık görünmeyen etkinlik **silinmez** (arşiv olarak kalır).
   - `origin: 'agent' | 'manual'` etkinliklerin elle girilmiş alanları tarayıcı tarafından ezilmez; yalnızca `lastSeenAt` ve `alsoSeenAt` güncellenir.
7. Hash değişmediyse Gemini çağrılmaz (maliyet). `data/state/scan-state.json`'a kaynak başına `{ hash, lastCheckedAt, lastStatus, httpStatus, lastError, latencyMs, lastEventCount }` yazılır.
8. `lib/scanner/guards.ts` — bu durumlarda dosyalar **yazılmaz**, `scan` hata koduyla biter ve workflow issue açar:
   - kaynakların %50'sinden fazlası hata verdi,
   - tek bir taramada 40'tan fazla yeni etkinlik çıktı (muhtemel bozulma),
   - önceden ≥3 etkinlik veren bir kaynak 0 etkinlik verdi → yalnızca o kaynak atlanır, raporda uyarı olarak yer alır (tüm tarama durmaz).
9. Kaynaklar 4'lü eşzamanlılıkla taranır; tek bir kaynağın hatası diğerlerini durdurmaz.
10. Sonunda `data/state/last-scan.json` (zaman, sayılar, uyarılar, reddedilen etkinlikler) yazılır ve `npm run validate` çalıştırılır; geçmezse çıkış kodu 1.
11. CLI bayrakları: `--dry-run` (dosya yazmaz, raporu yazdırır), `--source <id>` (tek kaynak), `--force` (hash'i yok say).

**Kabul:** `GEMINI_API_KEY` ile `npm run scan -- --dry-run` 7 kaynakta çalışır ve anlaşılır bir rapor basar; verify/dedupe/guards testleri geçer. Gerçek API anahtarı yoksa, kaydedilmiş örnek sayfa ve Gemini yanıtlarıyla (fixtures) testler çalışır.

## Aşama 3 — Ön yüz

Genel: mobil öncelikli, açık/koyu tema, hızlı, sade. Tüm veri build zamanında `lib/data.ts` ile okunur. İstemci tarafı JS yalnızca filtreleme/arama ve form için.

1. **Ana sayfa (`/`)**: Bölümler "Başvurusu açık" (deadline'a göre sıralı, "Son 3 gün!" rozeti), "Devam eden", "Yaklaşan". Üstte sponsorlu etkinlikler (Aşama 8'de). Filtreler: kategori, tür, şehir/online, metin arama. Filtreler URL query parametresinde tutulur (paylaşılabilir).
   - **Önemli:** durum sınıflandırması build zamanında yapılır ama istemcide de yeniden hesaplanır (sayfa bir gün eski build'den sunulursa yanlış "başvurusu açık" göstermesin).
2. **Etkinlik kartı**: başlık, organizatör, tarih(ler), deadline geri sayımı, konum, tür rozeti, "Başvur / Detay" (dış link), "Takvime ekle" (Google Takvim linki), "Hatalı mı? Bildir" linki (`/oneri?tur=hata&etkinlik=<id>`).
3. **Etkinlik sayfası (`/etkinlik/[id]`)**: `generateStaticParams`; tüm detaylar; kaynak linki ve "son doğrulama: `lastSeenAt`"; `schema.org/Event` JSON-LD; OG görseli (`next/og`); `generateMetadata`.
4. **Arşiv (`/arsiv`)**: geçmiş etkinlikler, yıl/ay gruplu.
5. **Kaynaklar (`/kaynaklar`)**: taranan kaynaklar ve her birinin son tarama durumu (`scan-state.json`). Şeffaflık için.
6. **Takvim akışı (`/takvim.ics`)**: tüm aktif etkinlikler; RFC 5545; `UID = <id>@<domain>`. Ana sayfada "Takvimine abone ol" butonu (`webcal://` ve Google Takvim abonelik linki).
7. `sitemap.ts`, `robots.ts`, kök `metadata`, favicon.
8. Footer: "Son güncelleme: `last-scan.json` zamanı", Hakkında, Gizlilik, Öneri, iletişim/sponsor e-postası (`CONTACT_EMAIL`).
9. **Gizlilik sayfası**: Umami'nin çerezsiz olduğunu, öneri formunda kişisel veri istenmediğini, önerilerin herkese açık GitHub issue olarak yayınlandığını açıkça yaz.

**Kabul:** `npm run build` tüm sayfaları statik üretir; Lighthouse (mobil) Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 90; JSON-LD Google Rich Results testi formatına uygun; 375px genişlikte yatay kaydırma yok.

## Aşama 4 — Workflow'lar

1. **`scan.yml`**
   - `schedule: '0 16 * * *'` (UTC = 19:00 TR) + `workflow_dispatch` (girdiler: `source`, `force`).
   - `concurrency: { group: data-writes, cancel-in-progress: false }`.
   - `permissions: contents: write, issues: write`.
   - Adımlar: checkout → node 22 + npm cache → `npm ci` → `npm run scan` → değişiklik varsa `chore(data): günlük tarama YYYY-MM-DD` mesajıyla commit + push (`github-actions[bot]`).
   - Başarısız olursa `tarama-hatasi` etiketli tek bir açık issue oluştur/güncelle (aynı etiketle açık issue varsa yorum ekle, yenisini açma).
2. **`healthcheck.yml`**: her gün 10:00 TR. `scripts/healthcheck.ts`: `last-scan.json` 48 saatten eskiyse veya son taramada hata oranı yüksekse issue açar (aynı tekilleştirme kuralı).
3. Not: public repolarda GitHub, 60 gün aktivite olmayınca zamanlanmış workflow'ları devre dışı bırakabilir. Bunu README'de belirt ("Actions sekmesinden yeniden etkinleştirin").

**Kabul:** `workflow_dispatch` ile elle tetiklenen tarama commit atar ve Vercel bu commit'i deploy eder; bilerek bozulmuş bir kaynakla hata issue'su açılır.

## Aşama 5 — Analitik (Umami)

1. `components/Analytics.tsx`: env değişkenleri varsa Umami script'ini `next/script` ile ekler, yoksa hiçbir şey eklemez.
2. Özel olaylar (`window.umami?.track`, yoksa sessizce geç):
   - `basvur-tikla` `{ event: id, sponsored: boolean }`
   - `takvime-ekle` `{ event: id }`
   - `ics-abone`
   - `oneri-gonder` `{ tur }`
   - Etkinlik sayfası görüntülemeleri URL'den zaten sayılır.
3. Dış linkler `rel="noopener"` ve UTM parametresi **eklenmez** (kaynak siteleri bozmamak için); ölçüm yalnızca Umami olayıyla.

**Kabul:** env tanımlıyken olaylar Umami panelinde görünür; env yokken konsol hatası yok.

## Aşama 6 — Öneri formu ve `/api/oneri`

1. `/oneri` sayfası, iki sekme:
   - **"Eksik etkinlik"**: serbest metin alanı (zorunlu, 10–1000 karakter: isim, açıklama veya URL), opsiyonel URL alanı.
   - **"Hatalı etkinlik"**: etkinlik seçili gelir (`?etkinlik=<id>`), neden seçimi (tarih yanlış / geçmiş etkinlik / iptal edildi / ilgisiz / kopya / diğer) + opsiyonel not.
   - **E-posta, isim vb. kişisel veri İSTENMEZ.** Formda "Öneriniz herkese açık olarak yayınlanır" uyarısı.
   - Honeypot alanı (görünmez) + Turnstile widget'ı.
2. `app/api/oneri/route.ts` (runtime nodejs):
   - Turnstile token'ını sunucuda doğrula.
   - Honeypot doluysa sessizce 200 dön, issue açma.
   - Girdiyi zod ile doğrula ve uzunlukları sınırla.
   - GitHub REST ile issue aç: başlık `[Öneri] <ilk 60 karakter>` veya `[Hata] <etkinlik başlığı>`; etiket `oneri` veya `hata-bildirimi`; gövde makine tarafından okunabilir bir blok içerir:
     ````
     <!-- kampusradar:v1 -->
     ```json
     { "type": "missing" | "wrong", "text": "...", "url": "...", "eventId": "...", "reason": "..." }
     ```
     ````
   - Kullanıcı metni gövdeye yalnızca bu JSON bloğu içinde girer (markdown/HTML enjeksiyonu yok; `@` mention'ları etkisizleştir).
   - IP veya kullanıcı bilgisi issue'ya **yazılmaz**.
   - Yanıt: `{ ok: true, issueUrl }`. Sayfa, kullanıcıya "Önerinizi buradan takip edebilirsiniz" diyerek linki gösterir.
3. `GITHUB_TOKEN`: yalnızca bu repoda **Issues: write** izni olan fine-grained token (Vercel env).

**Kabul:** form gerçek bir issue açar; Turnstile olmadan istek reddedilir; honeypot dolu istek issue açmaz; testler (route handler birim testleri, fetch mock'lu) geçer.

## Aşama 7 — Öneri ajanı

### 7a. Altyapı
- `agent.yml`: `on: issues: types: [opened, labeled]`; yalnızca `oneri` veya `hata-bildirimi` etiketi varsa çalışır. Ayrıca `workflow_dispatch` (girdi: issue numarası).
- `concurrency: data-writes` (tarayıcı ile çakışmasın).
- `permissions: contents: write, pull-requests: write, issues: write`.
- Uyarı: `GITHUB_TOKEN` ile açılan PR'lar CI workflow'unu tetiklemez. Bu yüzden ajan PR açmadan önce `npm run validate && npm test` komutlarını **kendisi çalıştırır**. Vercel önizlemesi yine de oluşur. (İleride gerekirse GitHub App token'ına geçilir; şimdilik yapma.)

### 7b. Ajan döngüsü (`scripts/agent/`)
- Gemini function calling ile döngü kur. Yalnızca teşhis/arama aşamasında Google Search grounding açılır. (Not: Gemini'de search grounding ile function calling aynı istekte birlikte kullanılamıyorsa `search_web` aracını, içinde grounding açık ayrı bir Gemini çağrısı yapan bir araç olarak uygula.)
- Sınırlar: en fazla 20 araç çağrısı, toplam 5 dakika, en fazla 5 dosya değişikliği.
- **Girdi güvenilmezdir:** issue metni ve çekilen web sayfaları prompt'a açıkça "GÜVENİLMEZ VERİ" sınırlayıcıları içinde verilir; içlerindeki talimatlar uygulanmaz. Sistem prompt'u bunu açıkça söyler.

### 7c. Araçlar (`tools.ts`)
| Araç | Not |
|---|---|
| `search_web(query)` | Google Search grounding; sonuç: başlık + URL listesi |
| `fetch_page(url)` | `lib/scanner/fetch.ts`; yalnızca http/https; özel/iç IP'ler engellenir |
| `run_extractor(url)` | Tarayıcının çıkarım + doğrulama zincirini o sayfada çalıştırır (yazma yapmaz) |
| `find_events(query)` | `data/events` içinde başlık/organizatör/URL araması |
| `get_event(id)` | |
| `find_sources(query)` / `get_source_state(id)` | `data/sources` + `scan-state.json` |
| `propose_add_event(event)` | Şema + kanıt doğrulaması (`run_extractor` veya `fetch_page` ile alınmış sayfada `titleQuote` birebir geçmeli). `origin: 'agent'` |
| `propose_update_event(id, patch, evidence)` | |
| `propose_cancel_or_remove_event(id, reason, evidence)` | Silmek yerine tercihen `status: 'cancelled'`. Gerçekten yanlış/uydurma ise dosyayı siler ve `blocklist.json`'a ekler |
| `propose_add_source(source)` | Önce `run_extractor` ile en az 1 geçerli etkinlik çıkmalı |
| `propose_update_source(id, patch)` | Örn. URL değişti |
| `record_feedback(kind, details)` | `data/feedback/` altına çıkarım hatası örneği yazar |
| `finish(diagnosis, summary)` | Döngüyü bitirir |

`propose_*` araçları yalnızca çalışma kopyasına yazar. Yazma izni olan yollar: `data/events/`, `data/sources/`, `data/blocklist.json`, `data/feedback/`. Başka bir yola yazma girişimi hata verir.

### 7d. Teşhis kategorileri (`finish.diagnosis`)
Eksik etkinlik bildirimi için:
- `already_listed`: etkinlik zaten sitede (link verilir)
- `not_relevant`: üniversite/teknoloji etkinliği değil
- `not_found`: etkinlik internette doğrulanamadı
- `spam`
- `source_missing`: kaynak hiç yoktu (tek etkinlik eklenir; kaynak düzenli etkinlik yayınlıyorsa kaynak da önerilir)
- `source_error`: kaynak var ama tarama hata veriyor (404, engelleme, JS ile yüklenen sayfa)
- `source_moved`: kaynak URL'si değişmiş
- `extraction_miss`: sayfa çekiliyor ama Gemini etkinliği kaçırmış (`record_feedback` zorunlu)
- `filtered_out`: tekilleştirme, blocklist veya 1 yıl kuralı yüzünden elenmiş

Hatalı etkinlik bildirimi için:
- `confirmed_wrong_date`, `confirmed_past`, `confirmed_cancelled`, `confirmed_irrelevant`, `confirmed_duplicate`, `hallucinated` (`record_feedback` zorunlu)
- `report_incorrect`: kayıt doğru, bildirim yanlış

### 7e. Çıktı
- **Her durumda** issue'ya Türkçe, kısa bir teşhis yorumu yazılır: ne bulundu, kanıt linkleri/alıntılar, ne yapıldı.
- Dosya değişikliği varsa:
  - `agent/issue-<n>` dalı oluştur, `npm run validate && npm test` çalıştır.
  - Testler geçerse PR aç. Başlık: `[Ajan] <teşhis>: <kısa açıklama>`. Gövde: teşhis, kanıtlar, değişen dosyalar, `Closes #<n>`. Etiket: `ajan`.
  - Testler geçmezse PR açma; issue'ya hatayı yaz ve `insan-gerekli` etiketi koy.
- Değişiklik yoksa (`already_listed`, `spam`, `not_relevant`, `report_incorrect`): yorum yaz, issue'yu kapat (`state_reason: not_planned` veya `completed`).
- Ajan emin değilse: `insan-gerekli` etiketi koyar, issue'yu açık bırakır.
- **Ajan asla** `main`'e push etmez, PR merge etmez, kod/prompt/workflow dosyası değiştirmez.

### 7f. Kademeli açılış
`AGENT_MODE` repo değişkeni: `comment` (yalnızca yorum yazar, PR açmaz) | `pr`. Varsayılan **`comment`**. Kullanıcı teşhislerin isabetli olduğunu gördükten sonra `pr`'a çevirir.

**Kabul:** Şu senaryolar için fixture'lı (Gemini ve fetch mock'lu) testler geçer: zaten listede olan etkinlik, kaynak yok, extraction_miss, hallucinated, prompt injection içeren issue metni (ajan izin verilmeyen işlem yapmamalı). Canlı repoda `comment` modunda gerçek bir test issue'su doğru teşhis yorumu alır.

## Aşama 8 — Sponsorlu etkinlikler

1. Event şemasında `sponsored?: { until, label? }`. Sponsorlu etkinlikler proje sahibi tarafından elle (PR ile) işaretlenir. Ajan ve tarayıcı bu alana **dokunmaz**; ajanın yazma yollarında bu alanın değişmesi reddedilir.
2. `until` geçmemişse etkinlik ana sayfanın en üstünde "Öne çıkanlar" alanında görünür; normal listede de "Sponsorlu" rozetiyle yer alır.
3. **"Sponsorlu" etiketi her zaman görünür olmalı** (yasal zorunluluk; gizli reklam yasağı).
4. JSON-LD'de sponsorluk bilgisi yer almaz.
5. Hakkında sayfasında "Etkinliğinizi öne çıkarın" bölümü ve `CONTACT_EMAIL`.

**Kabul:** süresi geçen sponsorluk bir sonraki build'de kendiliğinden düşer (istemci tarafında da `until` kontrol edilir).

## Aşama 9 — Temizlik ve dokümantasyon (KULLANICI ONAYI GEREKİR)

1. Kullanıcıdan açık onay al, sonra `legacy/` klasörünü tamamen sil.
2. `README.md`'yi yeni mimariye göre baştan yaz: ne yapar, mimari diyagramı, yerelde çalıştırma, env değişkenleri, workflow'lar, ajan modları, sponsorlu etkinlik nasıl eklenir, veri dosyası nasıl elle düzenlenir.
3. `AGENT.md`'yi baştan yaz. Eski Flutter, Firebase ve PowerShell kuralları kalkar. Yerine: veri kuralları, şema tek kaynağı, ajan güvenlik sınırları, commit kuralları gelir.
4. Firebase tarafı: Cloud Scheduler/Functions'ı kapatma adımlarını README'ye "Kullanıcının yapacakları" olarak yaz (ajan Firebase'e dokunmaz).

---

## Kullanıcının Elle Yapması Gerekenler (ajan bunları yapamaz; README'ye de yazılacak)

1. Vercel'de repoyu içe aktar. Env değişkenlerini gir (`GITHUB_TOKEN`, `GITHUB_REPO`, `TURNSTILE_*`, `NEXT_PUBLIC_UMAMI_*`, `NEXT_PUBLIC_SITE_URL`, `CONTACT_EMAIL`).
2. GitHub repo Secrets: `GEMINI_API_KEY`. Variables: `GEMINI_MODEL` (opsiyonel), `AGENT_MODE=comment`.
3. GitHub'da etiketleri oluştur: `oneri`, `hata-bildirimi`, `ajan`, `insan-gerekli`, `tarama-hatasi` (ya da ajan bunu yapan bir `scripts/setup-labels.ts` yazsın).
4. Fine-grained GitHub token (yalnızca bu repo, Issues: write) oluştur.
5. Cloudflare Turnstile site anahtarı al.
6. Umami Cloud hesabı aç, website ID'yi al.
7. Alan adı al ve Vercel'e bağla (önerilir).
8. Repo Settings → Actions → "Read and write permissions" ve "Allow GitHub Actions to create and approve pull requests" ayarlarını aç.
9. Eski Firebase Functions/Scheduler'ı kapat (fatura oluşmaması için).

## Kapsam Dışı (yapma)

- Kullanıcı hesabı, giriş, takip, bildirim, e-posta bülteni
- Ödeme / sponsor paneli
- Veritabanı
- Playwright ile tarama (`render: 'browser'` alanı yalnızca ileride kullanılmak üzere duruyor)
- "Tüm interneti" tarayan keşif modülü. İlk sürümde kaynaklar elle ve ajan PR'larıyla büyür. Keşif ileride ayrı bir aşamadır.

## Çalışma Kuralları (uygulayan ajan için)

- Her aşama ayrı commit(ler); mesajlar Conventional Commits formatında (`feat:`, `fix:`, `chore:`).
- Her aşama sonunda: `npm run lint && npm run typecheck && npm test && npm run validate && npm run build`.
- Gemini'ye bağlı kod gerçek API olmadan test edilebilmeli (fixture/mock).
- Plandan sapmak gerekirse sapmayı bu dosyanın sonuna "Sapmalar" başlığıyla, gerekçesiyle yaz.

---

## Durum (2026-10-04)

| Aşama | Durum |
|---|---|
| 0 — İskelet | ✅ Eski kod `legacy/` altında; CI eklendi |
| 1 — Veri modeli | ✅ 7 kaynak `data/sources/`'a taşındı |
| 2 — Tarayıcı | ✅ Fixture'larla test edildi. **Gerçek sitelerde ve gerçek Gemini ile henüz çalıştırılmadı** (geliştirme ortamında dış ağ ve API anahtarı yoktu) |
| 3 — Ön yüz | ✅ Mobil/masaüstü, açık/koyu tema ekran görüntüleriyle kontrol edildi. Lighthouse ölçümü yapılmadı |
| 4 — Workflow'lar | ✅ Yazıldı; ilk gerçek çalıştırma GitHub'da yapılacak |
| 5 — Analitik | ✅ |
| 6 — Öneri formu | ✅ Route testleri mock'lu; gerçek Turnstile/GitHub token ile denenmedi |
| 7 — Ajan | ✅ Senaryo testleri mock'lu; varsayılan mod `comment` |
| 8 — Sponsorlu | ✅ |
| 9 — Temizlik | ✅ README ve AGENTS.md yazıldı, `legacy/` kullanıcı onayıyla silindi |

## Sapmalar

1. **Örnek etkinlikler `data/` yerine `tests/fixtures/sample-data/` altında.** Doğrulanmış gerçek etkinlik çekilemediği için canlı siteye uydurma kayıt koymamak adına. Geliştirmede `DATA_ROOT=tests/fixtures/sample-data npm run dev`.
2. **`AGENT.md` → `AGENTS.md`** (+ `CLAUDE.md` → `@AGENTS.md`). Next.js 16 kendi ajan kurallarını `AGENTS.md`'ye yazdığı için iki ayrı dosya yerine tek dosya.
3. **`lastSeenAt` yalnızca sayfa değişip yeniden çıkarım yapıldığında güncellenir.** Her gün tüm etkinlik dosyalarının değişip gürültülü commit'ler oluşmaması için. Kaynağın son kontrol zamanı `/kaynaklar` sayfasında ayrıca görünür.
4. **Tarih içeren her etkinlikte `dateQuote` zorunlu** (planda "varsa" idi). Uydurma tarihlere karşı daha sıkı.
5. Tarama/sağlık hatası issue'ları `gh` CLI ile `.github/scripts/report-issue.sh` üzerinden açılır.
6. Ajanın `search_web` sonuçlarındaki URL'ler Google grounding yönlendirme adresleri olabilir; `fetch_page` yönlendirmeleri (her adımda iç ağ kontrolüyle) izler.
