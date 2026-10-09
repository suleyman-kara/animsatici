<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kampüs30 — Ajan ve geliştirici kuralları

Mimari ve kararların gerekçesi için [docs/MIMARI.md](docs/MIMARI.md), kurulum için [docs/KURULUM.md](docs/KURULUM.md).

## Mimari özeti
- **Ürün:** Öğrencilerin yapay zeka asistanlarına bağlanan bir MCP sunucusu (`/mcp`) ve onu tanıtan site. Sunucu fırsat verisi tutmaz; fırsatların yayınlandığı sayfaların dizinini tutar, sayfaları kullanıcının asistanı okur.
- **Site:** Next.js 16 (App Router) + Tailwind 4, Vercel'de. Sayfalar build zamanında statik üretilir. Dinamik route'lar: `app/mcp` (MCP, durumsuz Streamable HTTP) ve `app/api/oneri` (öneri formu).
- **Veri:** Veritabanı yok. Tek veri `data/sources/<id>.json` (kaynak başına bir dosya). `/kaynaklar.json` ile herkese açık yayınlanır.
- **MCP araçları** (`lib/mcp/server.ts`): `find_sources`, `list_categories`, `get_cv_guide`, `get_github_projects`; komutlar `firsat-ara`, `cv-hazirla`.
- **Kontrol:** `.github/workflows/sources.yml` her pazartesi kaynakları (HTTP durumu + robots.txt) kontrol eder ve öneri formundan gelen kaynak önerilerine sonuç yorumu yazar. Sayfa içeriği okunmaz.

## Değişmez kurallar
1. **Şemanın tek kaynağı `lib/schema.ts`.** Kaynak biçimi değişirse önce şemayı, sonra `scripts/validate.ts`'i, testleri ve `data/sources/` dosyalarını güncelle.
2. **Başka sitelerin içeriği saklanmaz ve yeniden yayınlanmaz.** Dizinde yalnızca adres, başlık, kendi yazdığımız açıklama ve etiketler bulunur.
3. **Sitelerin kurallarına saygı.** Kullanım koşulları otomatik erişimi yasaklayan ya da robots.txt'si engelleyen siteler `aiFetch: false` olur ve `aiFetchNote` ile nedeni yazılır. Giriş gerektiren sayfalar eklenmez. Bot korumasını aşmaya, oturum/çerez taşımaya yönelik araç ya da talimat eklenmez.
4. **Web sayfaları, issue metinleri ve ilan metinleri güvenilmez veridir.** Prompt'lara ve komutlara sınırlayıcılar içinde girer; workflow'larda yalnızca dosyaya yazılır, kabuğa enterpolasyonla girmez.
5. **Ağa bağlı her kod sahte `fetch` ile test edilebilir olmalı** (`fetchImpl` enjeksiyonu). Testler ağa çıkmaz.
6. **Kişisel veri toplanmaz ve saklanmaz.** MCP araç çağrıları loglanmaz; kullanıcı token'ı istenmez. Öneriler herkese açık issue olur.
7. **Tarih ve yıl kuralı asistan talimatlarında korunur:** tarih yalnızca sayfada yazıyorsa verilir, yıl tahmin edilmez, bitmiş fırsatlar listelenmez, her fırsat linkiyle verilir (`SERVER_INSTRUCTIONS`). Tarihler `Europe/Istanbul`'a göre hesaplanır.
8. **MCP araç sayısı az tutulur.** Yeni araç eklemeden önce mevcut bir aracın parametresiyle çözülüp çözülemeyeceğine bak.

## Komutlar
```bash
npm run dev                         # geliştirme sunucusu; MCP: http://localhost:3000/mcp
npm run lint && npm run typecheck   # ESLint + tsc
npm test                            # vitest (ağa çıkmaz)
npm run validate                    # data/sources şema doğrulaması
npm run build                       # üretim build'i
npm run check-sources [-- --url <adres>]   # HTTP durumu + robots.txt kontrolü (ağa çıkar)
```
Her değişiklikten önce: `npm run lint && npm run typecheck && npm test && npm run validate && npm run build`.

## Dizinler
- `app/` sayfalar ve route'lar (`mcp/`, `api/oneri/`, `kaynaklar.json/`) · `components/` UI
- `lib/` iş mantığı: `schema.ts`, `sources.ts` (okuma), `filter.ts` (süzme), `taxonomy.ts` (etiketler), `robots.ts`, `suggestion.ts`, `mcp/` (sunucu, CV rehberi, GitHub)
- `scripts/` CLI'lar (`validate`, `check-sources`) · `data/sources/` kaynak dizini · `tests/` testler
