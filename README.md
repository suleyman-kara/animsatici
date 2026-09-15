# 🔔 Anımsatıcı (Akıllı Web Takip & Takvim Asistanı)

Web sitelerindeki duyuru, etkinlik, kadro ve son başvuru tarihlerini senin yerine her gün izleyen; değişiklikleri yapay zeka (Google Gemini) ile özetleyip **tek tıkla Google Takvim'e ekleme** imkanı sunan modern takip asistanı.

---

## 🎯 Projenin Amacı ve Vizyonu

Geleneksel web takip araçları (Visualping vb.) sitelerdeki değişiklikleri yalnızca görsel ekran görüntüsü veya ham HTML farkı olarak iletir. Bu durum; reklamların, saat sayaçlarının veya menü oynamalarının sahte alarm (false positive) üretmesine neden olur.

**Anımsatıcı** bu süreci yapay zeka ile dönüştürür:
1. Sayfadaki gürültüyü (reklam, saat, sayaç) ayıklar.
2. Gerçek bir duyuru, etkinlik veya son başvuru tarihi var mı tespit eder.
3. Değişimi 1-2 cümleyle Türkçe özetler.
4. **En büyük farkı:** Tespit edilen etkinliği tek tıkla kullanıcının Google Takvimine işleyebilmesi için e-postaya hazır bir **[📅 Google Takvime Ekle]** bağlantısı yerleştirir.

---

## 🏗️ Mimari ve Çalışma Mantığı

```
[ Kullanıcı ]
      │
      ▼ (Google ile Oturum Açma)
[ Firebase Auth ]
      │
      ▼ (URL Ekle / Düzenle)
[ Cloud Firestore ] ──► URL, Kullanıcı E-postası, Son İçerik Özeti (Hash)
      ▲
      │ (Her akşam otomatik tetikleme - Cron: 21:00)
[ Cloud Scheduler ]
      │
      ▼
[ Cloud Functions (Node.js) ]
      │
      ├── 1. Sayfanın HTML'ini çek (Axios / Cheerio)
      ├── 2. Reklam/menü/script temizliği yap, metni çıkar
      ├── 3. SHA-256 Hash kontrolü yap (Fark yoksa sonlandır: $0 Maliyet)
      ├── 4. Değişiklik varsa ──► Gemini API'ye gönder:
      │       - "Değişimi Türkçe özetle"
      │       - "Varsa etkinlik başlığı ve tarihini ISO formatında çıkar"
      ├── 5. Google Calendar şablon linki üret:
      │       https://calendar.google.com/calendar/render?action=TEMPLATE&text=...
      └── 6. Kullanıcıya şık bir e-posta gönder (Resend API)
```

---

## 💻 Teknoloji Yığını (Tech Stack) Seçenekleri ve Öneri

Frontend için alternatifler ve MVP için en mantıklı rota:

### 1. Seçenek: React + Vite + Tailwind CSS (⭐ ÖNERİLEN)
* **Neden?** Next.js gibi sunucu yapılandırması gerektirmez. Saf bir SPA (Single Page Application) olarak çalışır.
* **Öğrenme Eğrisi:** Çok düşüktür. State (giriş yapıldı/yapılmadı, link listesi, ekleme formu) yönetimini en temiz şekilde yapar.
* **Firebase Uyumu:** `firebase deploy --only hosting` komutuyla saniyeler içinde tamamen ücretsiz olarak yayına alınır.

### 2. Seçenek: Next.js (App Router)
* **Neden?** İleride pazarlama/landing page için SEO gerekirse faydalıdır.
* **Dezavantajı:** Sunucu taraflı render (SSR) ve Node.js sunucusu veya Vercel gerektirir. Firebase Backend (Cloud Functions + Firestore) kullanacağımız için Next.js'in sunucu yetenekleri MVP için fazla karmaşık kalabilir.

### 3. Seçenek: Vanilla JS (Düz HTML/CSS/JS)
* **Neden?** Sıfır kütüphane bağımlılığı.
* **Dezavantajı:** Kullanıcı girişi, link ekleme/silme, hata/yükleniyor durumları geliştikçe JavaScript kodu "spagetti" haline gelir ve yönetmesi zorlaşır.

> 💡 **MVP Kararı:** Geliştirme hızını artırmak ve kod karmaşasını önlemek adına **React + Vite + Tailwind CSS** ile başlanması tavsiye edilir.

### Arka Plan ve Altyapı
* **Kimlik Doğrulama:** Firebase Authentication (Google Sign-In)
* **Veritabanı:** Cloud Firestore
* **Zamanlanmış Görevler:** Cloud Scheduler
* **Sunucusuz Fonksiyonlar:** Cloud Functions for Firebase (Node.js)
* **Yapay Zeka:** Google Gemini API (`@google/genai`)
* **E-posta İletimi:** Resend API (Geliştirici dostu, yüksek teslimat oranı)

---

## 🔌 Ayrık Mimari & Kendi Sunucuna Taşıma Kolaylığı (Portability)

MVP aşamasında hız, maliyetsiz test ve pratiklik için **Firebase** altyapısını tercih ediyoruz. Ancak projeyi ileride **kendi bağımsız sunucuna (VPS, Docker, SQLite/PostgreSQL)** taşımak istediğinde satıcı kilidine (Vendor Lock-in) takılmaman için mimariyi **"Ayrık (Decoupled)"** inşa ediyoruz:

```
┌────────────────────────────────────────────────────────┐
│           SAF ÇEKİRDEK MOTOR (Core Engine)             │
│    (Web Kazıma + SHA-256 Hash + Gemini AI + Takvim)    │
│            * Sıfır Firebase / Bulut Bağımlılığı *       │
│           * Saf Node.js / TypeScript Fonksiyonları *    │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  [ ŞİMDİ: MVP AŞAMASI ]       [ İLERİDE: KENDİ SUNUCUN ]
   - Cloud Functions             - Standart Node.js / Express
   - Cloud Scheduler             - `node-cron` Zamanlayıcısı
   - Cloud Firestore             - SQLite / PostgreSQL (Prisma)
   - Firebase Auth               - Kendi Auth / Docker Container
```

### Bu Mimari Bize Ne Kazandırır?
1. **Sıfır Bağımlılıkla Yazılan Motor (`src/core`):**
   * Sayfayı çeken (`cheerio`), reklam/script temizleyen, SHA-256 hash alan, Gemini API'ye sorup tarihi ve özeti çıkaran ve Google Calendar URL'i üreten tüm mantık **saf Node.js** modülü olarak yazılır. İçinde hiçbir Firebase kodu bulunmaz.
2. **Veritabanı Köprüsü (Adapter Pattern):**
   * Veritabanı sorguları tek bir servis dosyası (`dbAdapter.js`) üzerinden yapılır. İleride kendi sunucuna geçtiğinde sadece bu dosya içindeki Firestore çağrılarını PostgreSQL/SQLite sorgularıyla değiştirmek yeterli olur.
3. **Zahmetsiz Göç (Migration):**
   * Kodun %80'ini oluşturan iş mantığına dokunmadan, sadece birkaç dosyalık adaptör değişikliğiyle projeyi kendi kiraladığın 5 dolarlık bir Linux sunucuya (Docker ile) taşıyabilirsin.

---

## ⚠️ MVP Öncesi Risk Analizi ve Çözümleri (Pre-Mortem)

Projeyi hayata geçirirken karşılaşabileceğimiz 6 kritik risk ve aldığımız mühendislik önlemleri:

| # | Risk | Potansiyel Tehlike | Çözüm & Önlem |
|---|---|---|---|
| **1** | **Sahte Değişiklik Alarmları** | Saat, sayaç, dönen reklamlar yüzünden her gün *"Sayfa değişti"* uyarısı gitmesi. | Ham HTML yerine; `<script>`, `<nav>`, `<footer>` temizlenmiş **gövde metni** kıyaslanacak. |
| **2** | **Firestore 1 MB Limiti** | Web sayfalarının kaynak kodlarının Firestore tek doküman sınırını aşması. | Firestore'a ham sayfa kodu **asla yazılmayacak**. Yalnızca 64 karakterlik SHA-256 Hash'i ve kısa metin özeti saklanacak. |
| **3** | **Sunucu IP Blokajı** | Google Cloud IP'lerinin bazı sitelerce bot zannedilip engellenmesi (403/Captcha). | İsteklere gerçekçi `User-Agent` ve `Accept-Language` eklenecek. Aşılamayan siteler için arayüzde şeffaf uyarı verilecek. |
| **4** | **Yapay Zekanın Tarih Şaşırması** | "Önümüzdeki cuma" gibi ifadelerde referans tarih bilinmezse yanlış yıl/gün üretilmesi. | Gemini'ye sistem promptunda **o günün tam tarihi** verilecek ve katı JSON şemasıyla çıktı alınacak. Net tarih yoksa takvim linki üretilmeyecek. |
| **5** | **Cloud Function Zaman Aşımı** | 50+ sitenin sırayla taranması durumunda 60 saniyelik limitin dolması ve fonksiyonun çökmesi. | Siteler `Promise.allSettled` ile kontrollü paralel (batch) taranacak, her siteye 8-10 saniye zaman aşımı (timeout) konacak. |
| **6** | **E-postaların Spama Gitmesi** | Link içeren maillerin Gmail/Outlook tarafından gereksiz kutusuna atılması. | Resend altyapısı kullanılacak, SPF ve DKIM DNS doğrulamaları baştan tamamlanacak. |

---

## 🗄️ Firestore Veri Modeli Taslağı

### `users` Koleksiyonu
```json
{
  "uid": "google_user_123",
  "email": "kullanici@gmail.com",
  "displayName": "Ahmet Yılmaz",
  "plan": "free", // free, pro
  "maxUrls": 3,
  "createdAt": "2026-09-15T09:00:00Z"
}
```

### `monitors` Koleksiyonu
```json
{
  "id": "monitor_abc",
  "userId": "google_user_123",
  "userEmail": "kullanici@gmail.com",
  "title": "İTÜ Duyurular",
  "url": "https://www.itu.edu.tr/duyurular",
  "lastContentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "lastCheckedAt": "2026-09-15T21:00:00Z",
  "lastChangeDetectedAt": "2026-09-15T21:00:00Z",
  "isActive": true
}
```

---

## 📅 Takvime Ekleme (Google Calendar Link Mimarisi)

Kullanıcıdan ek takvim izinleri istemeye gerek kalmadan çalışan URL formatı:

```text
https://calendar.google.com/calendar/render?action=TEMPLATE&text={Baslik}&dates={BaslangicTarihi}/{BitisTarihi}&details={OzetVeLink}
```

* **Örnek Çıktı:**
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Guz+Donemi+Yatay+Gecis+Son+Basvuru&dates=20261024T060000Z/20261024T150000Z&details=Detaylar+ve+kayit:+https://itu.edu.tr/duyuru`

---

## 🗺️ Geliştirme Yol Haritası (MVP)

- [ ] **Aşama 1: Çekirdek Tarama & AI Scripti (Node.js)**
  - Örnek bir web sayfasını çekme ve temiz metne dönüştürme.
  - SHA-256 hash hesaplama.
  - Değişiklik durumunda Gemini API çağrısı ve Google Calendar URL üretimi.
- [ ] **Aşama 2: Firebase Altyapısı**
  - Firebase projesinin açılması ve CLI entegrasyonu.
  - Firestore kurallarının ayarlanması.
  - Scheduled Cloud Function yazımı.
  - Resend ile test maili gönderimi.
- [ ] **Aşama 3: Kullanıcı Arayüzü (React + Vite)**
  - Google Giriş ekranı.
  - Takip listesi (ekle, listele, sil).
  - Firebase Hosting'e deploy.
- [ ] **Aşama 4: Canlı Test ve Doğrulama**
  - Gerçek 2-3 duyuru/etkinlik sitesi ile canlı akış testi.
