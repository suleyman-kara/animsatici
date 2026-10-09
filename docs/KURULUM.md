# Kampüs30 Kurulum Rehberi (ilk kez kuranlar için)

Bu rehber siteyi ve MCP sunucusunu sıfırdan yayına almayı adım adım anlatır. Yapay zeka API anahtarı, veritabanı ya da ücretli bir servis gerekmez.

Kurulum sırasında birkaç anahtar ve adres not edeceksiniz. Bunları geçici olarak bir not dosyasında tutun; en sondaki tabloda hangisinin nereye gittiği özetleniyor.

## İçindekiler

1. [Siteyi Vercel'de yayına almak](#1-siteyi-vercelde-yayına-almak)
2. [Alan adı (kampus30.com)](#2-alan-adı-kampus30com)
3. [Cloudflare Turnstile (spam koruması)](#3-cloudflare-turnstile-spam-koruması)
4. [GitHub token'ı](#4-github-tokenı)
5. [Umami (ziyaretçi istatistikleri)](#5-umami-ziyaretçi-istatistikleri)
6. [Tüm ayarları Vercel'e girmek](#6-tüm-ayarları-vercele-girmek)
7. [GitHub repo ayarları](#7-github-repo-ayarları)
8. [Her şeyi test etmek](#8-her-şeyi-test-etmek)
9. [Sorun giderme](#9-sorun-giderme)

---

## 1. Siteyi Vercel'de yayına almak

1. https://vercel.com/signup adresine gidin, **"Continue with GitHub"** ile kaydolun. Plan sorulursa **Hobby**'yi seçin.
2. Panelde **"Add New…"** → **"Project"**.
3. "Import Git Repository" listesinde `kampus30` görünmüyorsa **"Adjust GitHub App Permissions"** linkine tıklayın ve bu repoya erişim verin.
4. `kampus30` satırında **"Import"**'a basın. Framework Preset otomatik olarak Next.js seçilir; diğer ayarlara dokunmayın.
5. **"Deploy"**'a basın. 1–2 dakika sonra site yayında olur.

Vercel bundan sonra `main` dalına gelen her commit'te siteyi kendiliğinden yeniden yayınlar. Kaynak listesine yapılan her değişiklik de böylece birkaç dakika içinde MCP sunucusuna yansır.

## 2. Alan adı (kampus30.com)

1. Vercel → projeniz → **Settings** → **Domains** → `kampus30.com` yazın → **Add**. `www.kampus30.com`'u da ekleyip ana adrese yönlendirin.
2. Vercel'in gösterdiği DNS kayıtlarını (genelde bir `A` ve bir `CNAME`) alan adını aldığınız yerin DNS ayarlarına ekleyin. Doğrulama birkaç dakika ile birkaç saat sürebilir.

MCP sunucusunun adresi bundan sonra `https://kampus30.com/mcp` olur.

## 3. Cloudflare Turnstile (spam koruması)

Öneri formunu botlardan korur. Ücretsizdir; alan adınızın Cloudflare'de olması gerekmez.

1. https://dash.cloudflare.com/sign-up adresinden hesap açın (veya giriş yapın).
2. Sol menüde **Turnstile** → **"Add widget"**:
   - **Widget name:** `Kampus30`
   - **Hostnames:** `kampus30.com` (ve Vercel'in verdiği `*.vercel.app` adresi)
   - **Widget mode:** **Managed**
3. **"Create"**. İki değer gösterilir: **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, **Secret Key** → `TURNSTILE_SECRET_KEY`.

## 4. GitHub token'ı

Bu token iki iş için kullanılır: öneri formunun issue açması ve `get_github_projects` aracının GitHub API kotasının yükseltilmesi (token'sız istekler saatte 60 ile sınırlı).

1. GitHub → profil fotoğrafı → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **"Generate new token"**.
2. Formu doldurun:
   - **Token name:** `kampus30-site`
   - **Expiration:** en uzun seçenek. Süresi dolunca form çalışmaz; takviminize "token yenile" hatırlatması koyun.
   - **Repository access:** **"Only select repositories"** → `suleyman-kara/kampus30`
   - **Permissions** → **Repository permissions** → **Issues: Read and write**. Başka izne dokunmayın.
3. **"Generate token"**. `github_pat_...` ile başlayan token yalnızca bir kez gösterilir; hemen not edin.

Fine-grained token'lar herkese açık repoları zaten okuyabildiği için `get_github_projects` aracı ek izin gerektirmez.

## 5. Umami (ziyaretçi istatistikleri)

Çerez kullanmadığı için çerez onay banner'ı gerekmez. İsteğe bağlıdır.

1. https://cloud.umami.is/signup adresinden ücretsiz hesap açın.
2. **Settings** → **Websites** → **"Add website"**. Domain: `kampus30.com`.
3. **Tracking code** sekmesindeki koddan `src` adresini `NEXT_PUBLIC_UMAMI_SRC`, `data-website-id` değerini `NEXT_PUBLIC_UMAMI_WEBSITE_ID` olarak not edin.

Sayılan olaylar: `mcp-kopyala` (MCP adresini kopyalama), `kurulum-kopyala` (kurulum ayarını kopyalama), `oneri-gonder`.

## 6. Tüm ayarları Vercel'e girmek

Vercel → projeniz → **Settings** → **Environment Variables**. Her satırı üç ortam (Production, Preview, Development) için ekleyin:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://kampus30.com` |
| `CONTACT_EMAIL` | Sitede görünecek iletişim e-postası (isteğe bağlı) |
| `GITHUB_TOKEN` | 4. adımdaki `github_pat_...` |
| `GITHUB_REPO` | `suleyman-kara/kampus30` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 3. adımdaki Site Key |
| `TURNSTILE_SECRET_KEY` | 3. adımdaki Secret Key |
| `NEXT_PUBLIC_UMAMI_SRC` | 5. adımdaki script adresi |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | 5. adımdaki website ID |

Ardından **Deployments** → en üstteki yayın → **⋯** → **"Redeploy"**. `NEXT_PUBLIC_` ile başlayan değerler yalnızca derleme sırasında okunduğu için bu adım şart.

> `CONTACT_EMAIL` herkese açık sayfalarda görünür; bu iş için ayrı bir adres açmanızı öneririm.

## 7. GitHub repo ayarları

1. Öneri formunun kullandığı etiketleri bir kez oluşturun (GitHub → **Issues** → **Labels** → **New label**, ya da terminalde):
   ```bash
   gh label create kaynak-onerisi --color 0e8a16 --description "Ziyaretçi önerisi: yeni kaynak"
   gh label create geri-bildirim --color 1d76db --description "Ziyaretçi geri bildirimi"
   ```
2. **Settings** → **Actions** → **General** → **Workflow permissions** bölümünde **"Read and write permissions"**'ı seçin. Kaynak kontrolü workflow'u issue açıp yorum yazabilmek için buna ihtiyaç duyar.

`Kaynak kontrolü` workflow'u her pazartesi 09:00'da tüm kaynakları kontrol eder (sayfa açılıyor mu, robots.txt ne diyor). Sorun bulursa `kaynak-sagligi` etiketli bir issue açar. Öneri formundan gelen her kaynak önerisini de kontrol edip sonucu issue'ya yorum olarak yazar.

## 8. Her şeyi test etmek

1. **Site:** `https://kampus30.com` açılıyor mu, `/kaynaklar` sayfasında kaynaklar listeleniyor mu?
2. **MCP sunucusu:** Claude'da **Customize** → **Connectors** → **Add custom connector** → URL: `https://kampus30.com/mcp`. Yeni bir sohbette "Kampüs30 ile İstanbul'daki hackathon kaynaklarını bul" yazın; Claude `find_sources` aracını çağırmalı.
3. **Öneri formu:** `/oneri` sayfasından bir kaynak önerin. Açılan issue'ya birkaç dakika içinde "Otomatik kaynak kontrolü" yorumu gelmeli.
4. **Kaynak kontrolü:** Actions → **Kaynak kontrolü** → **Run workflow** ile elle çalıştırın.

## 9. Sorun giderme

| Belirti | Olası neden ve çözüm |
|---|---|
| Claude bağlantıyı kuramıyor | Adresin `https://kampus30.com/mcp` olduğundan emin olun (sonunda `/` olmadan). Tarayıcıda açınca hata metni görmeniz normaldir; sunucu yalnızca MCP isteklerine yanıt verir. |
| `get_github_projects` "GitHub şu an yanıt vermiyor" diyor | `GITHUB_TOKEN` eksik olabilir (saatte 60 istek sınırına takılır) ya da süresi dolmuştur. |
| Form "Öneri formu henüz yapılandırılmadı" diyor | Vercel'de `GITHUB_TOKEN` veya `TURNSTILE_SECRET_KEY` eksik, ya da ekledikten sonra Redeploy yapılmadı. |
| Form "Doğrulama başarısız" diyor | Turnstile'ın Hostnames listesinde sitenin adresi yok ya da site/secret key'leri karışmış. |
| Form "kaydedilemedi" diyor | Token'ın süresi dolmuş, Issues izni yok ya da `kaynak-onerisi`/`geri-bildirim` etiketleri oluşturulmamış. |
| Kaynak kontrolü bir kaynakta 403 veriyor | Site GitHub sunucularını engelliyor olabilir. Sayfayı tarayıcıda açıp kontrol edin; açılıyorsa sorun yok. |
| Kaynak kontrolü "robots.txt yapay zeka tarayıcılarını engelliyor" diyor | Kaynağın `data/sources/<id>.json` dosyasında `aiFetch` değerini `false` yapıp `aiFetchNote` ile nedenini yazın. |

## Özet: hangi değer nereye?

| Değer | Nereden | Nereye |
|---|---|---|
| Site adresi | — | Vercel: `NEXT_PUBLIC_SITE_URL`, Turnstile Hostnames, Umami Domain |
| Turnstile Site Key / Secret Key | Cloudflare → Turnstile | Vercel: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Fine-grained token (Issues: write) | GitHub → Developer settings | Vercel: `GITHUB_TOKEN` |
| Repo adı | — | Vercel: `GITHUB_REPO` = `suleyman-kara/kampus30` |
| Umami script adresi + website ID | Umami → Tracking code | Vercel: `NEXT_PUBLIC_UMAMI_SRC`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` |
| İletişim e-postası | — | Vercel: `CONTACT_EMAIL` |
