# Kampüs30 Kurulum Rehberi (ilk kez kuranlar için)

Bu rehber, sıfırdan siteyi yayına alıp günlük taramayı ve öneri ajanını çalıştırmanızı adım adım anlatır. Toplam süre yaklaşık **45–60 dakika**. Kullanılan servislerin hepsinin ücretsiz planı başlangıç için yeterlidir.

> **İpucu:** Adımları sırayla yapın. Bazı adımlar bir öncekinin ürettiği bilgiyi (örneğin sitenin adresini) kullanır. Aldığınız anahtarları geçici olarak bir not dosyasına yazın; en sonda sileceksiniz.

## İçindekiler

1. [Gemini API anahtarı](#1-gemini-api-anahtarı)
2. [GitHub repo ayarları](#2-github-repo-ayarları)
3. [İlk taramayı çalıştırmak](#3-ilk-taramayı-çalıştırmak)
4. [Siteyi Vercel'de yayına almak](#4-siteyi-vercelde-yayına-almak)
5. [Cloudflare Turnstile (spam koruması)](#5-cloudflare-turnstile-spam-koruması)
6. [Öneri formu için GitHub token'ı](#6-öneri-formu-için-github-tokenı)
7. [Umami (ziyaretçi istatistikleri)](#7-umami-ziyaretçi-istatistikleri)
8. [Tüm ayarları Vercel'e girmek](#8-tüm-ayarları-vercele-girmek)
9. [Her şeyi test etmek](#9-her-şeyi-test-etmek)
10. [Ajanı PR moduna almak](#10-ajanı-pr-moduna-almak-birkaç-gün-sonra)
11. [Eski Firebase sistemini kapatmak](#11-eski-firebase-sistemini-kapatmak)
12. [İsteğe bağlı: kendi alan adınız](#12-isteğe-bağlı-kendi-alan-adınız)
13. [Sorun giderme](#13-sorun-giderme)

Sonunda tüm değerlerin nereye girildiğini gösteren bir [özet tablo](#özet-hangi-değer-nereye) var.

---

## 1. Gemini API anahtarı

Tarayıcı ve ajan, sayfalardan etkinlik çıkarmak için Gemini kullanır.

1. https://aistudio.google.com/apikey adresine gidin ve Google hesabınızla giriş yapın.
2. **"Create API key"** butonuna tıklayın.
3. Proje sorulursa eski Firebase projeniz olan **kampus-radar**'ı seçebilirsiniz.
4. Oluşan anahtarı (`AIza...` ile başlar) kopyalayıp not dosyanıza yazın.

> Eski sistemde kullandığınız anahtar hâlâ duruyorsa onu da kullanabilirsiniz. Günde 7–30 sayfa taramak çok düşük bir kullanımdır; yine de Google Cloud'da faturalandırma açıksa küçük bir bütçe uyarısı kurmanız iyi olur (bkz. [11. adım](#11-eski-firebase-sistemini-kapatmak)).

---

## 2. GitHub repo ayarları

Günlük tarama ve ajan GitHub Actions'ta çalışır. Bunlar için repoya bir gizli anahtar, bir değişken ve iki izin ayarı gerekiyor.

### 2a. Gemini anahtarını "Secret" olarak eklemek

1. https://github.com/suleyman-kara/kampus30 adresine gidin.
2. Üst menüden **Settings** (dişli simgesi) sekmesine tıklayın.
3. Sol menüde **Secrets and variables** → **Actions**'a tıklayın.
4. **Secrets** sekmesinde **"New repository secret"** butonuna basın.
5. **Name:** `GEMINI_API_KEY`
   **Secret:** 1. adımda aldığınız anahtar
6. **"Add secret"** ile kaydedin.

> Secret'lar bir kez kaydedildikten sonra kimse (siz dahil) değerini göremez. Sadece workflow'lar kullanabilir.

### 2b. Ajan modunu "Variable" olarak eklemek

1. Aynı sayfada **Variables** sekmesine geçin.
2. **"New repository variable"**:
   - **Name:** `AGENT_MODE`
   - **Value:** `comment`
3. **"Add variable"**.

`comment` modunda ajan önerileri inceler ve yalnızca issue'ya yorum yazar; hiçbir dosyayı değiştirmez. Kararlarına güvendiğinizde bunu `pr` yapacaksınız ([10. adım](#10-ajanı-pr-moduna-almak-birkaç-gün-sonra)).

### 2c. Workflow izinleri

1. Sol menüde **Actions** → **General**'a tıklayın.
2. Sayfanın altındaki **"Workflow permissions"** bölümünde:
   - **"Read and write permissions"** seçeneğini işaretleyin.
   - **"Allow GitHub Actions to create and approve pull requests"** kutusunu işaretleyin.
3. **Save**.

Bu ayarlar olmadan tarama verileri commit'leyemez ve ajan PR açamaz.

---

## 3. İlk taramayı çalıştırmak

Siteyi yayına almadan önce veriyi doldurmak iyi olur, böylece site ilk açıldığında boş görünmez.

1. Repoda üstteki **Actions** sekmesine gidin.
   - "Workflows aren't being run on this repository" gibi bir uyarı görürseniz **"I understand my workflows, go ahead and enable them"** butonuna basın.
2. Soldaki listeden **"Günlük tarama"**'yı seçin.
3. Sağdaki **"Run workflow"** açılır butonuna, sonra yeşil **"Run workflow"**'a basın. Seçenekleri boş bırakın.
4. Birkaç saniye sonra listede yeni bir çalışma belirir. Üzerine tıklayıp **scan** işine girerseniz canlı log'u görürsünüz:
   - `🔔 inzva-events: 3 etkinlik kabul, 1 red` → o kaynaktan etkinlik bulundu.
   - `❌ baykar-kariyer: HTTP 403 ...` → site taramayı engelliyor (normal, bazı siteler yapar).
   - En sonda `Özet: ...` satırı.
5. Bittiğinde yeşil ✓ görmelisiniz. Repoda `chore(data): günlük tarama ...` adlı yeni bir commit oluşur ve `data/events/` klasörü dolar.

Kırmızı ✗ görürseniz [Sorun giderme](#13-sorun-giderme) bölümüne bakın. Bu durumda otomatik olarak `tarama-hatasi` etiketli bir issue da açılır.

> Bundan sonra tarama **her gün 19:00'da** kendiliğinden çalışır. Ayrıca her sabah 10:00'da bir sağlık kontrolü yapılır.

---

## 4. Siteyi Vercel'de yayına almak

### 4a. Hesap ve proje

1. https://vercel.com/signup adresine gidin, **"Continue with GitHub"** ile kaydolun. Plan sorulursa **Hobby**'yi seçin.
2. Panelde **"Add New…"** → **"Project"**.
3. "Import Git Repository" listesinde `kampus30` görünmüyorsa **"Adjust GitHub App Permissions"** linkine tıklayın, açılan GitHub sayfasında bu repoya erişim verin.
4. `kampus30` satırında **"Import"**'a basın.
5. Ayarlar ekranında:
   - **Framework Preset:** Next.js (otomatik seçilir)
   - **Root Directory:** `./` (değiştirmeyin)
   - Build ve Output ayarlarına dokunmayın.
6. **"Deploy"**'a basın. 1–2 dakika sonra "Congratulations!" ekranı gelir.

### 4b. Sitenin adresini öğrenmek

Proje sayfasında **"Domains"** altında `kampus30.vercel.app` gibi bir adres görürsünüz. Ad farklı olabilir. Bu adres **sitenizin adresidir**; not edin, sonraki adımlarda lazım olacak.

> Vercel bundan sonra `main` dalına gelen her commit'te siteyi kendiliğinden yeniden yayınlar. Günlük tarama commit attığı için site de her gün güncellenir.

> ⚠️ **Önemli:** Vercel'in ücretsiz Hobby planı **ticari olmayan** kullanım içindir. Sponsorlu etkinlikten para kazanmaya başladığınızda Vercel'in kurallarına göre **Pro** plana geçmeniz gerekir (kişi başı aylık ücretli). O zamana kadar Hobby yeterlidir.

---

## 5. Cloudflare Turnstile (spam koruması)

Öneri formunu botlardan korur. Ücretsizdir; alan adınızın Cloudflare'de olması gerekmez.

1. https://dash.cloudflare.com/sign-up adresinden hesap açın (veya giriş yapın).
2. Sol menüde **Turnstile**'a tıklayın. Göremiyorsanız üstteki arama kutusuna "Turnstile" yazın.
3. **"Add widget"** (veya "Add site"):
   - **Widget name:** `Kampus30`
   - **Hostnames:** 4b'deki adres, ör. `kampus30.vercel.app`. `https://` olmadan yazın. Kendi alan adınız olursa onu da ekleyin.
   - **Widget mode:** **Managed**
4. **"Create"**. İki değer gösterilir:
   - **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** → `TURNSTILE_SECRET_KEY`
5. İkisini de not edin.

---

## 6. Öneri formu için GitHub token'ı

Form, ziyaretçinin önerisini GitHub issue olarak açar. Bunun için **sadece bu repoda, sadece issue açabilen** bir anahtar oluşturacağız.

1. GitHub'da sağ üstteki profil fotoğrafınıza tıklayın → **Settings**.
2. Sol menünün en altında **Developer settings**'e tıklayın.
3. **Personal access tokens** → **Fine-grained tokens** → **"Generate new token"**.
4. Formu doldurun:
   - **Token name:** `kampus30-oneri-formu`
   - **Expiration:** en uzun seçenek (ör. 1 yıl). Süresi dolunca form çalışmaz; takviminize "token yenile" hatırlatması koyun.
   - **Repository access:** **"Only select repositories"** → `suleyman-kara/kampus30`
   - **Permissions** → **Repository permissions** → **Issues** satırını **"Read and write"** yapın. Başka hiçbir izne dokunmayın; **Metadata: Read-only** kendiliğinden eklenir.
5. **"Generate token"**. `github_pat_...` ile başlayan token **yalnızca bir kez** gösterilir; hemen kopyalayıp not edin.

---

## 7. Umami (ziyaretçi istatistikleri)

Kaç kişinin girdiğini ve hangi etkinliğe kaç kez "Başvur" tıklandığını gösterir. Çerez kullanmadığı için çerez onay banner'ı gerekmez.

1. https://cloud.umami.is/signup adresinden ücretsiz hesap açın.
2. **Settings** → **Websites** → **"Add website"**:
   - **Name:** `Kampüs30`
   - **Domain:** 4b'deki adres, ör. `kampus30.vercel.app`
3. Kaydettikten sonra web sitesinin yanındaki **Edit** (veya ayarlar) → **Tracking code** sekmesine gidin. Şuna benzer bir kod görürsünüz:
   ```html
   <script defer src="https://cloud.umami.is/script.js" data-website-id="1234abcd-...."></script>
   ```
   - `src` içindeki adres → `NEXT_PUBLIC_UMAMI_SRC`
   - `data-website-id` içindeki değer → `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
4. İsteğe bağlı: aynı ayarlar sayfasındaki **Share URL** seçeneğini açarsanız, istatistikleri sponsorlara salt okunur bir linkle gösterebilirsiniz.

**Sayılan olaylar:**
- `basvur-tikla`: hangi etkinliğin başvuru linkine tıklandığı, sponsorlu olup olmadığı
- `takvime-ekle`
- `ics-abone`
- `oneri-gonder`

Bunları Umami panelinde **Events** bölümünde görürsünüz.

---

## 8. Tüm ayarları Vercel'e girmek

1. Vercel'de projenizi açın → **Settings** → **Environment Variables**.
2. Aşağıdaki her satır için **Key** ve **Value** alanlarını doldurup **Save**'e basın. **Environments** olarak üçünü de (Production, Preview, Development) seçili bırakın.

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://kampus30.vercel.app` (4b'deki adres, başında `https://` ile, sonunda `/` olmadan) |
| `CONTACT_EMAIL` | Sitede görünecek iletişim e-postanız. İstemiyorsanız eklemeyin |
| `GITHUB_TOKEN` | 6. adımdaki `github_pat_...` |
| `GITHUB_REPO` | `suleyman-kara/kampus30` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 5. adımdaki Site Key |
| `TURNSTILE_SECRET_KEY` | 5. adımdaki Secret Key |
| `NEXT_PUBLIC_UMAMI_SRC` | 7. adımdaki script adresi |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | 7. adımdaki website ID |

3. **Yeniden yayınlayın.** `NEXT_PUBLIC_` ile başlayan değerler yalnızca derleme sırasında okunur, bu yüzden bu adım şart:
   - **Deployments** sekmesine gidin.
   - En üstteki yayının sağındaki **⋯** menüsünden **"Redeploy"** seçin, onaylayın.

> `CONTACT_EMAIL` herkese açık sayfalarda görünür. Kişisel e-postanız yerine bu iş için ayrı bir adres açmanızı öneririm.

---

## 9. Her şeyi test etmek

1. **Site:** Vercel adresinizi açın. Etkinlikler görünüyor mu? Sayfanın altında "Son güncelleme: …" yazmalı.
2. **Kaynaklar:** `/kaynaklar` sayfasında her kaynağın son tarama durumunu görürsünüz.
3. **Takvim:** "Google Takvim'e abone ol" butonunu deneyin.
4. **Öneri formu ve ajan:**
   1. Sitede **Öner** sayfasını açın.
   2. "Eksik etkinlik" sekmesine gerçek bir etkinlik adı yazın (ör. bildiğiniz bir hackathon) ve gönderin.
   3. "Önerinizi buradan takip edebilirsiniz" linki çıkmalı. Linke tıklayınca GitHub'da `oneri` etiketli yeni bir issue görürsünüz.
   4. 1–3 dakika içinde **Actions** sekmesinde **"Öneri ajanı"** çalışır. Ardından issue'ya "🤖 Otomatik inceleme: …" yorumu gelir.
5. **Umami:** Siteye birkaç kez girip bir "Başvur" butonuna tıklayın. Birkaç dakika içinde Umami panelinde görünmeli. Reklam engelleyiciniz varsa sayım engellenebilir; test için kapatın.

---

## 10. Ajanı PR moduna almak (birkaç gün sonra)

Ajanın yorumlarını birkaç öneri boyunca okuyun. Teşhisleri ("zaten listede", "kaynak eksikti" vb.) mantıklıysa:

1. GitHub → **Settings** → **Secrets and variables** → **Actions** → **Variables** sekmesi.
2. `AGENT_MODE` satırındaki kalem simgesine basın, değeri `pr` yapın, kaydedin.

Bundan sonra ajan, değişiklik gerektiren önerilerde `ajan` etiketli bir **pull request** açar. PR'ın nasıl inceleneceği:

1. PR sayfasında **Vercel bot'unun yorumundaki "Preview"** linkine tıklayın; değişikliğin sitede nasıl görüneceğini canlı görürsünüz.
2. **Files changed** sekmesinde hangi etkinlik dosyasının eklendiğini veya değiştiğini görürsünüz.
3. Uygunsa **"Merge pull request"** → **"Confirm merge"**. Site birkaç dakika içinde güncellenir ve ilgili öneri issue'su otomatik kapanır.
4. Uygun değilse **"Close pull request"** ile kapatın.

Ajan emin olamadığı durumlarda issue'ya `insan-gerekli` etiketi koyar. Bunlara ara sıra bakmanız yeterli.

---

## 11. Eski Firebase sistemini kapatmak

Eski Cloud Functions hâlâ her gün çalışıp Gemini'yi çağırıyor olabilir ve eski Flutter sitesi `kampus-radar.web.app`'te yayında.

### 11a. Fonksiyonları silmek (önemli: maliyeti durdurur)

1. https://console.firebase.google.com → **kampus-radar** projesi.
2. Sol menüde **Build** → **Functions**.
3. `centralRadarScanner` satırının sağındaki **⋮** → **Delete function** → onaylayın.
4. Aynısını `checkSourceNow` için yapın.

Zamanlanmış fonksiyon silinince ona bağlı Cloud Scheduler işi de silinir.

### 11b. Eski siteyi kapatmak

Firebase CLI ile, bilgisayarınızdaki terminalden:

```bash
npx firebase-tools login
npx firebase-tools hosting:disable --project kampus-radar
```

### 11c. Faturalandırma

Fonksiyonları sildikten sonra proje artık ücretli bir şey çalıştırmaz. Yine de içiniz rahat etsin istiyorsanız:

1. https://console.cloud.google.com/billing → **Budgets & alerts** → **Create budget**.
2. Ör. aylık 5 USD bütçe ve %50 / %100 e-posta uyarısı kurun.

Gemini anahtarınız aynı projedeyse bu bütçe onu da kapsar.

---

## 12. İsteğe bağlı: kendi alan adınız

Sponsorlar ve SEO için `kampus30.com` gibi kendi alan adınız daha güven verir.

1. Bir alan adı satın alın (ör. Cloudflare Registrar, Namecheap, isimtescil).
2. Vercel → projeniz → **Settings** → **Domains** → alan adınızı yazın → **Add**.
3. Vercel'in gösterdiği DNS kayıtlarını (genelde bir `A` ve bir `CNAME`) alan adını aldığınız yerin DNS ayarlarına ekleyin. Doğrulama birkaç dakika ile birkaç saat sürebilir.
4. Ardından şunları güncelleyin:
   - Vercel'de `NEXT_PUBLIC_SITE_URL` değerini yeni adres yapın ve **Redeploy** edin.
   - Cloudflare Turnstile widget'ının **Hostnames** listesine yeni alan adını ekleyin.
   - Umami'de website **Domain** alanını güncelleyin.

---

## 13. Sorun giderme

| Belirti | Olası neden ve çözüm |
|---|---|
| Tarama kırmızı ✗, log'da `GEMINI_API_KEY tanımlı değil` | 2a adımındaki secret eksik veya adı yanlış yazılmış. Adın büyük harflerle birebir aynı olduğundan emin olun. |
| Tarama kırmızı ✗, log'da `Permission ... denied` veya push hatası | 2c adımındaki "Read and write permissions" ayarı yapılmamış. |
| Tarama ✓ ama `Kaynakların çoğu hata verdi` | Siteler GitHub sunucularını engelliyor olabilir. Log'daki HTTP kodlarına bakın. 403 = engelleme, 404 = adres değişmiş. Adresi değişen kaynağın `data/sources/<id>.json` dosyasındaki `url`'yi güncelleyin. |
| Bir kaynak hep `0 etkinlik` veriyor | Sayfa içeriği JavaScript ile yükleniyor olabilir; bu tür sayfalar şimdilik desteklenmiyor. Kaynağın `"active"` alanını `false` yapın ya da etkinlikleri listeleyen başka bir sayfasını bulun. |
| Form "Öneri formu henüz yapılandırılmadı" diyor | Vercel'de `GITHUB_TOKEN` veya `TURNSTILE_SECRET_KEY` eksik, ya da ekledikten sonra Redeploy yapılmadı. |
| Form "Doğrulama başarısız" diyor | Turnstile widget'ının Hostnames listesinde sitenin adresi yok, ya da site/secret key'leri karışmış. |
| Formda doğrulama kutusu hiç görünmüyor | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` eksik veya Redeploy yapılmadı. |
| Form "kaydedilemedi" diyor | GitHub token'ının süresi dolmuş veya Issues izni yok. 6. adımı tekrarlayıp Vercel'deki değeri güncelleyin ve Redeploy edin. |
| Issue açılıyor ama ajan çalışmıyor | Actions → "Öneri ajanı" log'una bakın. 2a (secret) ve 2c (izinler) adımlarını kontrol edin. Elle yeniden çalıştırmak için: "Öneri ajanı" → Run workflow → issue numarası, `force` işaretli. |
| Ajan PR açamıyor | 2c'deki "Allow GitHub Actions to create and approve pull requests" kutusu işaretli değil. |
| Umami'de veri yok | `NEXT_PUBLIC_UMAMI_*` değerleri eksik veya Redeploy yapılmadı. Reklam engelleyiciyi kapatıp deneyin. |
| Sitede "Son güncelleme" çok eski | Actions'ta "Günlük tarama" çalışıyor mu bakın. GitHub, 60 gün aktivite olmayan repolarda zamanlanmış işleri durdurabilir; Actions sayfasındaki uyarıdan yeniden etkinleştirin. |

---

## Özet: hangi değer nereye?

| Değer | Nereden | Nereye |
|---|---|---|
| Gemini API anahtarı | aistudio.google.com | GitHub → Secrets: `GEMINI_API_KEY` |
| `AGENT_MODE` (`comment` → sonra `pr`) | — | GitHub → Variables |
| Site adresi | Vercel → Domains | Vercel: `NEXT_PUBLIC_SITE_URL`, Turnstile Hostnames, Umami Domain |
| Turnstile Site Key | Cloudflare → Turnstile | Vercel: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |
| Turnstile Secret Key | Cloudflare → Turnstile | Vercel: `TURNSTILE_SECRET_KEY` |
| Fine-grained token (Issues: write) | GitHub → Developer settings | Vercel: `GITHUB_TOKEN` |
| Repo adı | — | Vercel: `GITHUB_REPO` = `suleyman-kara/kampus30` |
| Umami script adresi + website ID | Umami → Tracking code | Vercel: `NEXT_PUBLIC_UMAMI_SRC`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` |
| İletişim e-postası | — | Vercel: `CONTACT_EMAIL` |

Kurulum bitince not dosyanızdaki anahtarları silin; hepsi artık ilgili servislerde güvenle saklanıyor.
