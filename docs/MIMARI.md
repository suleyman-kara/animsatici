# Mimari ve tasarım kararları

Bu belge Kampüs30'un nasıl çalıştığını ve neden böyle tasarlandığını anlatır. Kurulum için [KURULUM.md](KURULUM.md), geliştirme kuralları için [AGENTS.md](../AGENTS.md).

## Ürün

- Türkiye'deki üniversite öğrencilerinin hackathon, kamp, bootcamp, staj, yarışma ve burs fırsatlarını **kendi yapay zeka asistanlarıyla** bulabilmesi için ücretsiz bir MCP sunucusu.
- Sunucu fırsat verisi tutmaz. **Kaynak dizini** tutar: fırsatların yayınlandığı sayfalar, alan/tür/şehir etiketleriyle. Sayfaları asistanın kendisi okur.
- CV için asistana bir rehber ve açık GitHub repolarını listeleyen bir araç sunar. CV kullanıcının asistanında hazırlanır, bize gelmez.
- Site (kampus30.com) MCP sunucusunu tanıtır ve kaynak listesini herkese açık yayınlar. Hesap, veritabanı ve kişisel veri yoktur.

## Neden bu tasarım?

- **Asıl değer doğru kaynak.** Genel amaçlı derin araştırma, arama motorunun öne çıkardığı sayfalara gider; kulüp sayfaları ve şirket kariyer sayfaları gözden kaçar. Elle derlenmiş bir dizin bu adımı çözer.
- **Hukuki yük düşük.** Başka sitelerin içeriğini kopyalayıp yeniden yayınlamıyoruz; yalnızca adreslerini ve açıklamalarını listeliyoruz. Sayfayı kullanıcının asistanı, kullanıcının isteğiyle okur.
- **Maliyet sıfıra yakın.** Akıl yürütmeyi kullanıcının asistanı yapar. Sunucumuz yalnızca JSON dosyalarından okur; yapay zeka API'si çağırmaz.
- **Kişisel veri yok.** Sunucuya yalnızca arama filtreleri ve istenirse GitHub kullanıcı adı gelir, saklanmaz.

## Genel bakış

```
Öğrencinin asistanı (Claude, Gemini, …)
   │  MCP (Streamable HTTP)
   ▼
kampus30.com/mcp ──► data/sources/*.json   (kaynak dizini)
   │                └► api.github.com       (get_github_projects)
   ▼
Asistan, aiFetch: true olan sayfaları kendi web erişimiyle okur
```

| Katman | Seçim | Neden |
|---|---|---|
| Site | Next.js 16 (App Router), React 19, Tailwind 4 | Sayfalar build zamanında statik üretilir |
| MCP | `@modelcontextprotocol/sdk`, `app/mcp/route.ts` | Durumsuz Streamable HTTP; Vercel'de sunucusuz çalışır |
| Veri | Repo içinde JSON (`data/sources/`) | Veritabanı yok; her değişiklik PR ile gözden geçirilir, tüm geçmiş git'te |
| Şema | zod (`lib/schema.ts`) | Site, MCP, doğrulama ve kaynak kontrolü aynı şemayı kullanır |
| Zamanlanmış iş | GitHub Actions | Haftalık kaynak kontrolü ve öneri kontrolü |
| Analitik | Umami (çerezsiz) | Çerez bandı gerektirmez |
| Spam koruması | Cloudflare Turnstile + honeypot | Üyelik olmadan form koruması |

## Kaynak dizini

Her kaynak `data/sources/<id>.json` dosyasıdır. Şema `lib/schema.ts`'tedir; önemli alanlar:

| Alan | Anlamı |
|---|---|
| `url` | Fırsatların listelendiği sayfa |
| `fields`, `types` | Alan (yazılım, mühendislik, …) ve fırsat türleri. `general` alanı her alana uyar |
| `scope`, `city`, `university` | Türkiye geneli, uluslararası, şehir ya da üniversite. Şehir aramasında Türkiye geneli kaynaklar da döner |
| `kind` | `organizer`: düzenleyicinin kendi sitesi, `aggregator`: başkalarının fırsatlarını listeleyen site |
| `aiFetch`, `aiFetchNote` | Asistanların sayfayı okuması uygun mu? Kullanım koşulları otomatik erişimi yasaklıyorsa ya da robots.txt engelliyorsa `false`; asistan yalnızca linki ve notu verir |
| `needsJs`, `hints` | Sayfanın JavaScript ile yüklenip yüklenmediği ve nasıl okunacağına dair ipucu |
| `active` | Dizinde ve MCP sonuçlarında gösterilsin mi |

Kaynak listesi `/kaynaklar` sayfasında filtrelenebilir olarak ve `/kaynaklar.json` adresinde ham JSON olarak yayınlanır.

### Sitelerin kurallarına saygı

- Kullanım koşullarında otomatik erişimi açıkça yasaklayan siteler `aiFetch: false` olur (ör. Youthall, anbean KAMPÜS).
- Giriş gerektiren sayfalar listeye alınmaz.
- Sunucu talimatları asistanlardan bot korumalarını aşmamalarını, web sayfalarındaki talimatları uygulamamalarını ister.

## MCP sunucusu

`lib/mcp/server.ts` sunucuyu kurar, `app/mcp/route.ts` HTTP'ye bağlar. Her istek için yeni bir sunucu ve transport oluşturulur (durumsuz mod, JSON yanıt). CORS herkese açıktır.

| Araç | Ne yapar |
|---|---|
| `find_sources` | Alan, tür, şehir, site türü ve serbest metinle kaynakları süzer. Sonuçta İstanbul saatiyle bugünün tarihi ve kısa bir yönerge bulunur |
| `list_categories` | Geçerli alan, tür, kapsam ve şehir değerlerini kaynak sayılarıyla döndürür |
| `get_cv_guide` | Genel ya da ilana göre CV rehberi (Türkçe/İngilizce). LinkedIn için PDF yükleme yolunu anlatır; uydurmama kurallarını içerir |
| `get_github_projects` | Kullanıcı adıyla açık, fork olmayan repoları getirir. Kullanıcı token'ı istenmez |

Komutlar (prompts): `firsat-ara`, `cv-hazirla`. Sunucu talimatları (`SERVER_INSTRUCTIONS`): tarih ve yıl kuralları, link zorunluluğu, `aiFetch` davranışı, güvenilmez içerik.

### Tarih ve yıl kuralı

Asistanların en sık yaptığı hata geçen yılın sayfasını okuyup "başvurular açık" demek. Bu yüzden `find_sources` her yanıtta bugünün tarihini verir ve talimatlar şunu ister: tarihi yalnızca sayfada yazıyorsa ver, yıl yazmıyorsa tahmin etme, bitmiş fırsatları listeleme, her fırsatı linkiyle ver.

## Kaynak kontrolü

`scripts/check-sources.ts`, sayfa içeriğini okumadan iki şeye bakar: sayfa açılıyor mu (HTTP durumu) ve robots.txt ne diyor. robots.txt ayrıştırıcısı `lib/robots.ts`'tedir.

- `*` ya da kullanıcı isteğiyle sayfa okuyan asistan ajanları (`Claude-User`, `ChatGPT-User`, `Perplexity-User`) engelleniyorsa kaynak `aiFetch: false` yapılmalıdır (uyarı).
- Yalnızca model eğitimi için veri toplayan tarayıcılar (`ClaudeBot`, `GPTBot`, `Google-Extended`, `PerplexityBot`) engelleniyorsa bu, kullanıcının isteğiyle okumayı yasaklamaz; bilgi notu düşülür.
- HTTP 401/403/429 "otomatik istekleri engelliyor" sayılır. Geçici ağ hatalarında bir kez yeniden denenir. Sunucunun TLS sertifika zincirini eksik göndermesi bozuk link sayılmaz.
- `aiFetch: false` kaynaklarda engel ve erişim sorunları kontrolü kırmaz; 404 ve 5xx her zaman hatadır.

`.github/workflows/sources.yml`:
- Her pazartesi tüm etkin kaynakları kontrol eder; sorun varsa `kaynak-sagligi` etiketli bir issue açar ya da açık olana yorum ekler.
- Öneri formundan açılan `kaynak-onerisi` issue'larında önerilen adresi kontrol edip sonucu yorum olarak yazar. Issue gövdesi güvenilmez veri olarak yalnızca dosyaya yazılır; yerel ağ adreslerine istek atılmaz.

Kaynaklar elle, PR ile eklenir.

## Site

- `/`: MCP tanıtımı, istemcilere göre kurulum (Claude, Claude Code, Gemini CLI, VS Code, Cursor), örnek sorular, araçlar, ilkeler
- `/kaynaklar`: filtrelenebilir kaynak dizini; `/kaynaklar.json`: ham liste
- `/oneri`: kaynak önerisi ya da geri bildirim → GitHub issue (`/api/oneri`)
- `/hakkinda`, `/gizlilik`

## Kapsam dışı

- Fırsat verisi toplamak, saklamak ya da yayınlamak (önceki sürümün günlük taraması ve etkinlik sayfaları kaldırıldı)
- Hesap, giriş, veritabanı
- CV'yi sunucuda üretmek ya da saklamak
- LinkedIn'den veri çekmek (kullanıcı kendi profil PDF'ini asistanına yükler)

## Tarihçe

- İlk sürüm Flutter + Firebase'di. 2026'da Next.js ile günlük taranan bir etkinlik listesine dönüştü (Gemini ile çıkarım, birebir alıntı doğrulaması, öneri ajanı).
- v3'te (Ekim 2026) proje MCP sunucusu ve kaynak dizinine dönüştü: başka sitelerin içeriğini yeniden yayınlamak yerine öğrencinin kendi asistanını doğru kaynaklara yönlendiriyor. Lisans PolyForm Noncommercial'dan Apache-2.0'a geçti. Önceki kod git geçmişinde duruyor.
