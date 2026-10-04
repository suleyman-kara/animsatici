# KampüsRadar

Türkiye'deki üniversite öğrencileri için hackathon, kamp, bootcamp, staj programı ve kampüs etkinliklerini **tek yerde** toplayan, üyelik gerektirmeyen web sitesi. Etkinlikler her gün kaynak sitelerden otomatik taranır; ziyaretçiler eksik ya da hatalı etkinlikleri bildirebilir ve bir yapay zeka ajanı bu bildirimleri inceler.

## Nasıl çalışır?

```
GitHub Actions (her gün 19:00 TR) ──► npm run scan
   ├─ data/sources/*.json'daki sayfaları çeker, değişmemişse atlar (hash)
   ├─ Gemini sayfadaki TÜM etkinlikleri çıkarır
   ├─ tarihi liste sayfasında yazmayan etkinlikler için etkinliğin kendi sayfasına bakılır (kaynak başına en fazla 10)
   ├─ başlık/tarih alıntısı sayfada birebir geçmeyen etkinlikler reddedilir
   ├─ tekilleştirme + güvenlik eşikleri + şema doğrulaması
   └─ data/ değişikliklerini commit eder → Vercel siteyi yeniden derler

Ziyaretçi /oneri formu ──► /api/oneri ──► GitHub Issue (oneri | hata-bildirimi)
   └─ GitHub Actions: npm run agent
        ├─ arar, sayfaları çeker, tarayıcıyı yeniden çalıştırır, nedeni teşhis eder
        ├─ issue'ya teşhis yorumu yazar
        └─ AGENT_MODE=pr ise düzeltmeyi PR olarak açar → siz onaylarsınız
```

- **Site:** Next.js 16 + Tailwind, Vercel'de statik. Tek sunucu fonksiyonu öneri formudur.
- **Veri:** Veritabanı yok. Her etkinlik `data/events/<id>.json`, her kaynak `data/sources/<id>.json`. Tüm geçmiş git'te.
- **Analitik:** Umami (çerezsiz). Etkinlik bazında "Başvur" ve "Takvime ekle" tıklamaları sayılır.

Kararların gerekçeleri [PLAN.md](PLAN.md), geliştirme kuralları [AGENTS.md](AGENTS.md) dosyasında.

## Yerelde çalıştırma

```bash
npm install
DATA_ROOT=tests/fixtures/sample-data npm run dev   # örnek etkinliklerle
npm run dev                                       # gerçek data/ ile
```

Kontroller: `npm run lint && npm run typecheck && npm test && npm run validate && npm run build`

Tarayıcıyı elle denemek (`.env.local` içinde `GEMINI_API_KEY` gerekir):

```bash
npm run scan -- --dry-run                # hiçbir dosya yazmadan rapor
npm run scan -- --source inzva-events    # tek kaynak
npm run scan -- --force                  # sayfa değişmemiş olsa da yeniden çıkar
```

## Kurulum (bir kez, elle)

İlk kez kuruyorsanız adım adım rehber: **[docs/KURULUM.md](docs/KURULUM.md)**. Kısa özet:

1. **Vercel:** Repoyu içe aktarın. Environment Variables: `NEXT_PUBLIC_SITE_URL`, `CONTACT_EMAIL`, `GITHUB_TOKEN`, `GITHUB_REPO`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_UMAMI_SRC`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (açıklamalar `.env.example`'da).
2. **GitHub token (öneri formu için):** Settings → Developer settings → Fine-grained tokens → yalnızca bu repo, **Issues: Read and write**. Vercel'e `GITHUB_TOKEN` olarak girin.
3. **Cloudflare Turnstile:** Site ekleyin (alan adınız + `*.vercel.app`), anahtarları Vercel'e girin. Bunlar ve token girilmeden form "henüz yapılandırılmadı" der.
4. **Umami Cloud:** Site ekleyin, website ID'yi Vercel'e girin. Sponsorlara panelin herkese açık paylaşım linkini verebilirsiniz.
5. **GitHub repo ayarları:**
   - Secrets → Actions: `GEMINI_API_KEY`
   - Variables → Actions: `AGENT_MODE=comment` (ajanın teşhislerine güvenince `pr` yapın), isteğe bağlı `GEMINI_MODEL`
   - Settings → Actions → General → Workflow permissions: **Read and write**, ✅ **Allow GitHub Actions to create and approve pull requests**
6. **İlk tarama:** Actions → "Günlük tarama" → Run workflow. Etkinlikler commit'lenince site kendiliğinden güncellenir.
7. **Alan adı (önerilir):** Vercel'e bağlayıp `NEXT_PUBLIC_SITE_URL`'i güncelleyin.
8. **Eski Firebase'i kapatın:** Firebase konsolunda `centralRadarScanner` ve `checkSourceNow` fonksiyonlarını silin (Cloud Scheduler işi de silinir). Aksi hâlde eski tarama Gemini maliyeti üretmeye devam eder.

## Günlük işletme

| İş | Nasıl |
|---|---|
| Kaynak eklemek | `data/sources/<id>.json` ekleyin (örnek için mevcut dosyalara bakın) ya da ajanın PR'ını onaylayın |
| Eski/geçersiz kayıtları temizlemek | `npm run prune -- --dry-run` ile listeleyin, `npm run prune` ile silin (yalnızca taramayla eklenmiş ve ilk görüldüğünde zaten bitmiş ya da yılı belirsiz kayıtlar) |
| Hatalı etkinliği düzeltmek | `data/events/<id>.json`'u düzenleyin. Tamamen silip bir daha eklenmemesini istiyorsanız `dedupeKey`'ini `data/blocklist.json`'a ekleyin |
| Sponsorlu etkinlik | Etkinlik dosyasına `"sponsored": { "until": "2026-11-30" }` ekleyin (isteğe bağlı `"label"`). Tarih geçince kendiliğinden düşer. Ajan ve tarayıcı bu alana dokunmaz |
| Taramayı elle başlatmak | Actions → "Günlük tarama" → Run workflow (`source`, `force` seçenekleri var) |
| Bir öneriyi yeniden incelemek | Actions → "Öneri ajanı" → Run workflow (issue numarası, `force`) |
| Ajanın önerdiği değişiklik | `ajan` etiketli PR'ı Vercel önizlemesinden kontrol edip birleştirin |
| İnsan bakması gereken öneriler | `insan-gerekli` etiketli issue'lar |
| Tarama sorunları | `tarama-hatasi` etiketli issue (tarama veya günlük sağlık kontrolü açar) |

Not: GitHub, 60 gün aktivite olmayan public repolarda zamanlanmış workflow'ları devre dışı bırakabilir. Günlük tarama commit'leri bunu genelde önler; yine de "tarama-hatasi" issue'su gelirse Actions sekmesinden workflow'u yeniden etkinleştirin.

## Güvenlik ve veri kalitesi

- Tarayıcı ve ajan, kaynak sayfada **birebir geçmeyen** başlık/tarihleri kabul etmez.
- Bir taramada kaynakların yarısından fazlası hata verirse ya da 40'tan fazla yeni etkinlik çıkarsa hiçbir şey yazılmaz. Önceden etkinlik veren bir kaynak birden sıfır verirse o kaynak atlanır.
- Ajan yalnızca `data/` altına yazabilir, sponsorlu kayıtlara dokunamaz, PR açmadan önce doğrulama ve testleri çalıştırır. Issue metni ve web sayfaları ona güvenilmez veri olarak verilir.
- Öneri formu kişisel veri istemez; Turnstile ve honeypot ile korunur. IP adresi kaydedilmez.

## Eski sürüm

Flutter + Firebase ile yazılmış ilk sürüm kaldırıldı; git geçmişinde duruyor.

## Lisans

Apache 2.0 — bkz. [LICENSE](LICENSE)
