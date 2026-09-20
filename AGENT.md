# 🤖 AGENT.md — KampüsRadar Geliştirici & Ajan El Kitabı

Bu belge, KampüsRadar projesinde çalışacak yapay zeka ajanları ve geliştiriciler için projenin **değişmez operasyonel kurallarını, mimari kararlarını, kritik tuzaklarını ve iş akışlarını** içerir. Yeni bir oturuma başlarken ilk olarak bu belgeyi okuyun.

---

## 📌 Proje Özeti & Canlı Altyapı

* **Proje Adı:** KampüsRadar (CENG ve Üniversite Öğrencileri için Akıllı Fırsat & Etkinlik Ajandası)
* **Canlı Web Adresi:** [https://kampus-radar.web.app](https://kampus-radar.web.app)
* **Firebase Proje ID:** `kampus-radar` (Google Cloud Blaze Planı aktif)
* **Yönetici Hesabı:** `suleymankara600@gmail.com`
* **Temel Mimari:** %100 Sunucusuz (Serverless) Google Cloud Platform
  * **Frontend:** Flutter Web / Multiplatform (`app/` dizini)
  * **Veritabanı:** Cloud Firestore Native (`firestore.rules` ile korumalı)
  * **Sunucusuz Fonksiyonlar:** Firebase Cloud Functions 2nd Gen (Node.js 22, `us-central1`)
  * **Zamanlayıcı:** Cloud Scheduler — Her gün 19:00'da (Europe/Istanbul) `centralRadarScanner`
  * **Yapay Zeka:** Gemini 3.6 Flash (`@google/genai`)

---

## ⚡ Kullanıcı Kuralları & Kritik Direktifler (Zorunlu İlkeler)

### 1. Otomatik Git Commit'i (Soru Sorma, Otomatik Commit At!)
> Kullanıcının kesin talimatı: *"Gerekli noktalarda commit atmamız gerek, bunu da otomatik olarak senin yapmanı istiyorum."*
* Başarıyla derlenen ve canlıya alınan her anlamlı geliştirmeden sonra kullanıcıya sormadan `git add .` ve açıklayıcı bir `git commit -m "..."` atılmalıdır.

### 2. %100 Sunucusuz Mimari (Localhost Bağımlılığı Kesinlikle Yasak!)
* Kullanıcı bilgisayarındaki yerel Node.js sunucusunu kapatmıştır. Bilgisayarın açık tutulmasına ihtiyaç **kesinlikle yoktur**.
* Web derlemesinde veya canlı kodda `http://localhost:3001` adresine **asla istek atılmamalıdır**.
* `app/lib/core/constants.dart` içindeki `apiBaseUrl`, web ortamında (`kIsWeb`) boş dize (`''`) döner.
* Veriler doğrudan **Cloud Firestore** ve **Cloud Functions** üzerinden çalışır.

### 3. Windows PowerShell Sözdizimi Kuralları
* PowerShell'de `&&` karakteri geçerli bir komut birleştirici değildir! Komutları `;` ile bağlayın veya ayrı çalıştırın:
  * ❌ `git add . && git commit` (Hata verir)
  * ✅ `git add .; git commit -m "..."`
* Windows araçları: `npm.cmd`, `npx.cmd`, `C:\Users\suleyman\flutter\bin\flutter.bat`.

### 4. Tarayıcı Önbelleği (Cache Invalidation) Tuzağı
* Flutter Web derlemeleri (`main.dart.js`, `flutter_bootstrap.js`) varsayılan olarak hash'li dosya adı üretmez.
* `firebase.json` içinde `.js` dosyalarına asla `max-age=31536000` (1 yıl) verilmemelidir! Aksi halde kullanıcılar canlıya alınan yeni kodu göremez.
* `firebase.json` yapılandırması her zaman `"Cache-Control": "no-cache, no-store, must-revalidate"` olarak kalmalıdır.
* `app/web/index.html` dosyasında açılışta eski Service Worker ve CacheStorage'ı temizleyen otomatik betik ve `?v=...` sürüm etiketi korunmalıdır.

### 5. Cloud Functions: 10 Saniye Başlatma Zaman Aşımı (Lazy Loading Kuralı)
* Cloud Functions `functions/index.js` modülünün en tepesinde `cheerio`, `axios`, `@google/genai` gibi ağır kütüphaneler statik `import` edilirse, Firebase CLI analiz aşamasında Windows üzerinde 10.000 ms zaman aşımına uğrar (`Timeout after 10000`).
* **Kural:** Fonksiyon içi çekirdek kütüphaneler mutlaka `getCore()` fonksiyonu ile dinamik/tembel (lazy) yüklenmelidir:
  ```javascript
  async function getCore() {
    return await import('./core/index.js');
  }
  ```

### 6. Yönetici (Admin) Güvenlik & Yetki Kontrolü
* Yönetici e-postası: `suleymankara600@gmail.com`.
* `firestore.rules` içerisindeki `isAdmin()` fonksiyonu:
  * `sources` koleksiyonuna sadece admin yazabilir (kullanıcılar okuyabilir).
  * `scan_logs` koleksiyonuna sadece admin okuma/yazma yapabilir.
* Flutter arayüzünde (`home_screen.dart`), yalnızca bu e-posta için sarı renkli **"👑 Yönetici Paneli"** butonu görünür.

### 7. Flutter Beyaz Ekran Önleyici (Radar Preloader)
* `app/web/index.html` içerisinde saf CSS3/HTML5 ile çalışan animasyonlu Radar Preloader bulunmaktadır.
* Flutter motoru `canvaskit.wasm` dosyasını indirirken kullanıcıya ilk 15ms içinde dönen sonar ışını ve nabız dalgaları gösterilir.
* `window.addEventListener('flutter-first-frame', ...)` olayı ile ilk kare ekrana basıldığında preloader 500ms içinde yumuşakça kaybolur.

---

## 🛠️ Sık Kullanılan Geliştirme ve Dağıtım Komutları

```powershell
# 1. Flutter Web Derleme
npm.cmd run build:flutter
# Alternatif doğrudan:
cd app; C:\Users\suleyman\flutter\bin\flutter.bat build web; cd ..

# 2. Firebase Hosting Dağıtımı (Web Canlıya Alma)
npm.cmd run deploy:hosting
# Alternatif:
npx.cmd -y firebase-tools deploy --only hosting

# 3. Firestore Güvenlik Kurallarını Dağıtma
npx.cmd -y firebase-tools deploy --only firestore:rules

# 4. Cloud Functions Dağıtımı (2nd Gen Node 22)
npx.cmd -y firebase-tools deploy --only functions

# 5. Git Durumu ve Otomatik Commit
git status
git add .; git commit -m "feat/fix: ..."
```

---

## 📂 Dizin ve Dosya Haritası

* `app/` — Flutter multiplatform kod tabanı.
  * `lib/main.dart` — Firebase ilklendirme, tema ve AuthGate.
  * `lib/screens/home_screen.dart` — Ana ekran, Takiplerim, Keşfet ve Admin butonu.
  * `lib/screens/admin/admin_dashboard_screen.dart` — Kaynak sağlık durumları, 200 OK/hata metrikleri, canlı test butonu ve tarama logları.
  * `lib/screens/tabs/monitors_tab.dart` — Kullanıcı kişisel takip listesi.
  * `lib/screens/tabs/catalog_tab.dart` — Hazır kanallar vitrini ve öneri formu.
  * `lib/services/firestore_service.dart` — Firestore CRUD, kullanıcı tercihleri, admin kaynak yönetimi.
  * `lib/core/default_catalog.dart` — Yerleşik 7 ana kanal (inzva, Coderspace, Techcareer, Patika, ÇÜ SKS, Baykar, GDG).
  * `web/index.html` — Açılış Radar Preloader'ı ve cache temizleme betiği.
* `functions/` — Firebase Cloud Functions (2nd Gen, Node.js 22).
  * `index.js` — `centralRadarScanner` (19:00 cron) ve `checkSourceNow` (callable test).
  * `core/scraper.js` — `cheerio` & `axios` temiz metin kazıyıcı.
  * `core/aiAnalyzer.js` — Gemini 3.6 Flash fark & etkinlik tespiti.
  * `core/calendar.js` — Google Takvim URL üretici.
* `firestore.rules` — Güvenlik kuralları (kullanıcı izolasyonu + `isAdmin` yetkilendirmesi).
* `firebase.json` — Hosting yönlendirmeleri ve `no-cache` başlıkları.
