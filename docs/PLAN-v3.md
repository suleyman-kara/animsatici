# Kampüs30 v3 — Yol Haritası

> v2 ([PLAN.md](../PLAN.md)) "veritabanı yok, üyelik yok" üzerine kuruldu. v3'ün hedefleri bu iki kararı kaldırıyor:
> yazılıma dokunmadan yönetim (admin paneli), Google ile giriş ve kişisel etkinlik akışı, markaların kendi sayfası.
> Aşamalar **sırayla** uygulanır; her aşama kendi başına yayına alınabilir ve "Kabul kriterleri" sağlanmadan sonrakine geçilmez.

---

## 0. Neden mimari değişmeli?

| İhtiyaç | Bugünkü mimaride neden zor |
|---|---|
| Panelden kaynak/etkinlik düzenleme | Her değişiklik bir git commit'i + tam site build'i (1–3 dk). Aynı anda tarama ve düzenleme çakışır. |
| Kullanıcı hesabı, profil, kişisel akış | Kişiye özel veri git'e yazılamaz (KVKK, gizlilik, hacim). |
| Marka hesapları ve yetkiler | Rol/yetki ve onay akışı için kalıcı, sorgulanabilir bir depo gerekir. |
| Binlerce etkinlik ve kaynak | Her etkinlik için statik sayfa + OG görseli; build süresi doğrusal büyür. |

**Öneri:** Supabase (Postgres + Google ile giriş + dosya deposu + `pgvector`) ve Vercel'de sayfaların **istek üzerine yenilenmesi** (ISR + `revalidateTag`).
Tek serviste veritabanı, kimlik doğrulama ve vektör araması olduğu için tek kişilik bir proje için en az parça bunu gerektirir.
Alternatif: Neon (Postgres) + Auth.js. Daha esnek ama iki ayrı parça kurulur.

## 1. Kesinleşmesi gereken kararlar (proje sahibi)

1. Veritabanı/kimlik: **Supabase** (önerilen) mi, Neon + Auth.js mi?
2. Barındırma: Sponsorlu içerik ticari kullanım sayılır; **Vercel Hobby ticari kullanıma izin vermez.** Sponsorluk başlamadan Vercel Pro'ya geçilmeli (ya da Cloudflare gibi bir alternatif değerlendirilmeli).
3. Git'teki `data/` JSON'ları: veritabanına taşındıktan sonra yalnızca **günlük yedek/dışa aktarım** olarak mı kalsın, yoksa tamamen mi kalksın? (Öneri: yedek olarak kalsın.)
4. Ses ile tanıtım: ses kaydı **saklanmaz**, yalnızca yazıya çevrilir. Bu kabul mü?

---

## Aşama 0 — Tarama sağlamlaştırma ✅ (yapıldı: `claude/tender-ramanujan-6fiurq`)

- Ortak Gemini eşzamanlılık sınırı ve kota beklemesine uyan yeniden deneme; sayfa çekmede yeniden deneme
- Süre bütçesi ve en eski taranan kaynağa öncelik; kaynak bazında bozulma eşiği
- 30 günden eski etkinliklerin otomatik silinmesi; uzun sayfaların parçalara bölünmesi
- Hata düzeltmeleri: aynı gün biten saatli etkinlik, detay sayfası ölü önbelleği, doğrulanmayan `matchesExistingId`

Kalan küçük işler (Aşama 1'den bağımsız yapılabilir):
- [ ] Ajan `--force` ile yeniden çalışınca açık PR varsa 422 ile çöküyor → mevcut PR'ı bulup güncelle (`scripts/agent/index.ts`).
- [ ] Ajan PR'larında CI çalışmıyor (`GITHUB_TOKEN` kısıtı) → GitHub App token'ı ile PR aç. (Aşama 2'de öneriler panele taşınınca bu iş kendiliğinden ortadan kalkabilir.)

---

## Aşama 1 — Veri katmanını veritabanına taşı

**Amaç:** Tek doğruluk kaynağı Postgres olsun; site, tarayıcı ve ajan aynı katmanı kullansın. Bu aşama sonunda kullanıcıya görünen hiçbir şey değişmez.

1. **Depo arayüzü.** `lib/store.ts`'teki fonksiyonları bir `Store` arayüzüne çevir (`readEvents`, `writeEvent`, `readSources`, …).
   İki uygulama: `JsonStore` (bugünkü; testler ve fixture'lar bunu kullanmaya devam eder, testler ağa çıkmaz) ve `DbStore` (Supabase).
2. **Şema.** `lib/schema.ts` tek kaynak olmaya devam eder; SQL tabloları ondan türetilir:
   `sources`, `events`, `source_scan_state`, `scan_runs` (bugünkü `last-scan.json`), `blocklist`, `feedback`, `audit_log`.
   `events` tablosuna ek alanlar: `locked_fields text[]` (elle düzeltilen alanları tarayıcı ezmesin), `updated_by`.
3. **Taşıma betiği.** `scripts/migrate-to-db.ts`: `data/` → veritabanı (tekrar çalıştırılabilir, upsert).
4. **Tarama.** GitHub Actions'ta çalışmaya devam eder ama commit atmaz, veritabanına yazar. Bittiğinde sitenin
   `/api/revalidate` ucunu (gizli anahtarla) çağırır. Günlük `data/` dışa aktarımı yedek olarak commit edilir (karar 3).
5. **Site.** `generateStaticParams` yalnızca güncel etkinlikleri üretir; diğerleri ilk istekte üretilir (ISR).
   Veri `cacheTag("events")` ile etiketlenir; tarama ya da admin değişikliği `revalidateTag` ile yalnızca gerekeni yeniler.
   (Next 16 API'leri için önce `node_modules/next/dist/docs/` okunur.)
6. **Kurallar.** `AGENTS.md` güncellenir: "Veritabanı yok" kaldırılır, yazma alanı kuralı (3) tablolar üzerinden yeniden yazılır.

**Kabul kriterleri:** Site veritabanından aynı içeriği gösterir; `npm test` ağa çıkmadan geçer; tarama veritabanına yazar ve
sayfalar 1 dakika içinde güncellenir; yedek dışa aktarım `npm run validate`'ten geçer.

---

## Aşama 2 — Admin paneli (`/admin`)

**Amaç:** Proje sahibi hiç kod/terminal açmadan kaynakları ve etkinlikleri yönetebilsin.

1. **Giriş.** Supabase Auth ile Google girişi. `profiles.role` alanı: `admin | brand | user`. `/admin` yalnızca `admin`.
   Yetki kontrolü hem sunucu tarafında (route/handler) hem veritabanında (Row Level Security) yapılır.
2. **Kaynaklar sayfası.**
   - Liste: ad, URL, kategori, aktif/pasif, son tarama durumu, son hata, son çıkarılan etkinlik sayısı.
   - Ekle: URL gir → **"Önizle"** çıkarıcıyı çalıştırır (bugünkü ajanın `run_extractor` aracı) ve bulunan/reddedilen etkinlikleri gösterir → kaydet.
   - Düzenle / pasifleştir / sil. **"Şimdi tara"**: tek kaynak için taramayı tetikler (`workflow_dispatch` ya da kısa süreli bir uç).
3. **Etkinlikler sayfası.**
   - Tablo: arama, kaynak, durum (açık/yaklaşan/devam eden/geçmiş), köken (tarama/ajan/elle/marka) filtreleri.
   - Düzenleme formu: `Event` zod şemasıyla doğrulanır. Düzenlenen alanlar `locked_fields`'a eklenir (tarayıcı ezmez; kilit kaldırılabilir).
   - İptal et / sil / engel listesine ekle. Sponsorluk alanını **yalnızca admin** ayarlar.
   - Elle etkinlik ekleme (kanıt alıntısı zorunlu değil, `origin: manual`).
4. **Tarama raporu.** Son taramalar, reddedilen etkinlikler ve nedenleri; reddedilen bir kayıt için "elle ekle" kısayolu.
5. **Öneriler.** Ziyaretçi önerileri GitHub issue yerine `suggestions` tablosuna düşer; ajan sonucunu panelde
   "öneri → değişiklik önizlemesi → onayla/reddet" olarak gösterir. (GitHub issue akışı istenirse paralel kalabilir.)
6. **Denetim kaydı.** Her değişiklik `audit_log`'a: kim, ne zaman, önce/sonra.

**Kabul kriterleri:** Kaynak ekleme → önizleme → kaydetme → tarama → sitede görünme akışı tamamen panelden yapılır;
elle düzeltilen tarih bir sonraki taramada ezilmez; admin olmayan hesap `/admin` ve ilgili API'lere erişemez (testli).

---

## Aşama 3 — Google ile giriş ve kişisel etkinlik akışı

**Amaç:** Kullanıcı kendini bir paragrafla ya da sesle anlatır, ona uyan etkinliklerden otomatik bir akış oluşur.

1. **Konu sınıflandırması.** Bugünkü serbest `tags` alanı eşleştirme için yeterince tutarlı değil. Kontrollü bir konu listesi
   (`topics`: ör. yapay-zeka, web, mobil, siber-güvenlik, veri, oyun, girişimcilik, tasarım, kariyer…) tanımlanır.
   Tarayıcı her etkinliğe bu listeden konu atar; eski etkinlikler bir kerelik betikle etiketlenir.
2. **Etkinlik vektörleri.** Her etkinlik için Gemini embedding üretilir ve `pgvector` sütununa yazılır (tarama sırasında).
3. **Profil oluşturma.**
   - Google ile giriş → "Kendini anlat" ekranı: metin kutusu ya da tarayıcıda ses kaydı.
   - Ses Gemini ile yazıya çevrilir, **ses dosyası saklanmaz**.
   - Metinden Gemini ile yapılandırılmış profil çıkarılır: konular, seviye (ön lisans/lisans/yüksek lisans/mezun), bölüm, şehir,
     çevrim içi tercih, ilgilendiği etkinlik türleri. Bu profil kullanıcıya **gösterilir ve düzenlenebilir** (şeffaflık).
   - Profil metninin embedding'i saklanır.
4. **Akış (`/akisim`).** Puan = konu eşleşmesi + vektör benzerliği + şehir/çevrim içi uyumu + başvuru tarihinin yakınlığı.
   Yalnızca güncel etkinlikler (30 gün penceresi). Sponsorlu içerik akışta da "Sponsorlu" etiketiyle ve sınırlı sayıda gösterilir.
   Giriş yapmamış ziyaretçi için bugünkü ana sayfa aynen kalır.
5. **Gizlilik (KVKK).** Bu aşamayla "kişisel veri toplanmaz" kuralı (8) değişir:
   aydınlatma metni ve açık rıza, `/gizlilik` sayfasının yeniden yazılması, hesabı ve tüm verileri silme, verileri indirme,
   en az veri ilkesi (yalnızca e-posta, ad ve profil). Ses ve ham metin isteğe bağlı olarak silinebilir.
6. **Sonra (isteğe bağlı).** Haftalık e-posta özeti, "beni ilgilendirmiyor" geri bildirimiyle puanlamanın iyileşmesi.

**Kabul kriterleri:** Yeni kullanıcı 1 dakika içinde kişisel akışını görür; profil düzenlenince akış değişir;
hesap silme tüm kişisel veriyi kaldırır; eşleştirme mantığı sahte embedding/LLM istemcisiyle test edilir (ağa çıkmadan).

---

## Aşama 4 — Marka sayfaları ve sponsorlu içerik

**Amaç:** Markalar kendi sayfasını açıp etkinliklerini yönetebilsin; sponsorlu yerleşim kontrollü kalsın.

1. **Kurumlar.** `organizations` (ad, slug, logo, açıklama, web sitesi, doğrulanmış mı) ve `organization_members` (kullanıcı, rol: sahip/editör).
   Kurum başvurusu → admin onayı → doğrulanmış rozet. Taranan etkinlikler `organizer` alanından kuruma bağlanabilir.
2. **Marka sayfası (`/marka/[slug]`).** Kurum bilgisi ve güncel etkinlikleri. Marka paneli (`/panel`) yalnızca kendi kurumunu görür.
3. **Marka etkinlikleri.** Markanın eklediği/düzenlediği etkinlik `origin: brand` olur ve **moderasyon kuyruğuna** düşer;
   admin onayından sonra yayınlanır. (Kanıt alıntısı kuralı tarama içindir; marka içeriğinde bunun yerini moderasyon alır.)
   Taranmış bir etkinliği markası sahiplenirse alanlar kilitlenir, tarayıcı ezmez.
4. **Sponsorluk.** Anlaşma ve ödeme site dışında kalır (v2 kararı). Sponsorluğu yalnızca admin açar ve süresini belirler;
   "Sponsorlu" etiketi her yerde zorunlu (yasal). Markaya tıklama/görüntülenme raporu (Umami olayları ya da kendi sayaçlarımız).
5. **İleride.** Site içi ödeme istenirse ayrı bir aşama olarak ele alınır (fatura, sözleşme, iade süreçleri).

**Kabul kriterleri:** Marka hesabı yalnızca kendi kurumunun kayıtlarını değiştirebilir (RLS testli); onaysız içerik
sitede görünmez; sponsorlu her kart ve sayfada etiket görünür.

---

## Önerilen sıra ve kabaca efor

| Aşama | Kabaca süre | Bağımlılık |
|---|---|---|
| 0 kalanları | 0,5 gün | — |
| 1 Veritabanı | 3–5 gün | Karar 1, 3 |
| 2 Admin paneli | 4–6 gün | Aşama 1 |
| 3 Kişisel akış | 5–8 gün | Aşama 1 (2 ile paralel olabilir), karar 4 |
| 4 Marka sayfaları | 4–6 gün | Aşama 2, karar 2 |

Her aşama ayrı bir PR (ya da PR dizisi) olarak gelir; her PR'da
`npm run lint && npm run typecheck && npm test && npm run validate && npm run build` geçer.
