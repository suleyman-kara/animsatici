# 🔔 Anımsa (Akıllı Web Takip, RSS Okuyucu & Kişisel Takvim Asistanı)

Web sitelerindeki duyuruları, etkinlikleri, iş/burs ilanlarını ve RSS beslemelerini senin yerine her gün izleyen; değişiklikleri yapay zeka (**Google Gemini 3.6 Flash**) ile süzüp özetleyen ve **tek tıkla Google Takvim'e ekleme** imkanı sunan yeni nesil takip asistanı.

---

## 🎯 Genişletilmiş Proje Vizyonu

Geleneksel takip araçları (Visualping vb.) yalnızca ham sayfa farkı sunarken; standart RSS okuyucular (Feedly vb.) ise her yazıyı ayıklamadan kullanıcının önüne yığar.

**Anımsa**, bu iki dünyayı yapay zekayla birleştirir:
1. **Hibrit İzleme (Web + RSS):** Kullanıcı bir bağlantı girdiğinde sistem sayfada RSS beslemesi varsa otomatik algılar (`rss-parser`); yoksa akıllı web kazıyıcı ve açık kaynak takip araçlarıyla sayfayı izler.
2. **Gürültüden Arındırılmış Günlük Bülten (Daily Digest):** Kullanıcıyı gün boyu onlarca maille boğmak yerine, her akşam tek bir derli toplu bülten gönderir: *"Bugün takip ettiğin 10 kaynaktan 3 tanesinde yeni gelişme oldu."*
3. **Tek Tıkla Google Takvim Entegrasyonu (Killer Feature):** Duyurudaki sınav, seminer, hackathon veya son başvuru tarihini yapay zeka otomatik yakalar ve mailin içerisine doğrudan **[📅 Google Takvim'e Ekle]** butonu koyar.
4. **Çift Yönlü Giriş Kolaylığı (Firebase Auth):** Hem **Google Hesabı** hem de şifresiz **Telefon Numarası (SMS / OTP)** ile mobil ve web'de anında oturum açma.
5. **Mobil ve Web'de Sade Panel (PWA):** Hem masaüstünde temiz bir web paneli hem de telefonda uygulama gibi ana ekrana eklenebilen hafif arayüz.

---

## 📊 Pazar Araştırması & Rekabet Analizi (Neden Anımsa?)

### 1. Global Pazardaki Kritik Boşluk
* **Mevcut Durum (Visualping, PageCrawl.io, Changeflow, Monity.ai):** Bu araçlar piksel veya HTML farkı tespit edip alarm gönderir.
* **En Büyük Eksiklikleri:** Hiçbirinde yerleşik bir **"Google Takvime Ekle"** butonu yoktur. Kullanıcının bir tarihi takvime ekleyebilmesi için **Zapier veya n8n** gibi 3. parti araçlara ek abonelik ücreti ($20-$30/ay) ödeyip teknik entegrasyon yapması gerekir.
* **Anımsa'nın Farkı:** Sıradan bir son kullanıcı için hiçbir teknik ayar gerekmeden, mailin içindeki butona tıklandığı anda Google Takvim'e randevuyu oluşturur.

### 2. Türkiye Pazarındaki Büyük Fırsat
* Türkiye'de web takip alanı sadece çok pahalı ve dar B2B nişlere hapsolmuştur:
  * Kamu İhaleleri (EKAP Analytics, İhalePro, Tendermeister)
  * Mevzuat & Resmi Gazete (Regulfy, MevzuatTR)
* Öğrenciler, akademisyenler, yazılımcılar ve KOBİ'ler için genel amaçlı, Türkçe yapay zeka özetli ve yerel fiyatlandırmalı (TL) bir SaaS çözümü **yoktur**. İnsanlar sayfaları her gün elle yenilemekte veya geçici Telegram botları yazmaktadır.

### 3. Rekabet Karşılaştırma Matrisi (USP)

| Özellik | Visualping / Global | Feedly / RSS | TR İhale Araçları | **Anımsa** |
| :--- | :---: | :---: | :---: | :---: |
| **Google Takvim Butonu** | ❌ (Zapier Şart) | ❌ Yok | ❌ Yok | **✅ Tek Tıkla Hazır** |
| **Web + RSS Hibriti** | ❌ Sadece Web | ❌ Sadece RSS | ❌ Sadece EKAP | **✅ Akıllı Algılama** |
| **Gürültüsüz Günlük Bülten** | ❌ Her değişime mail | ❌ Yüzlerce yazı | ❌ Karmaşık panel | **✅ Akşam Tek Mail** |
| **Türkçe Yapay Zeka Özeti** | Kısıtlı İngilizce | ❌ Yok | Sadece Şartname | **✅ Doğal Türkçe (Gemini)** |
| **Yerel Fiyatlandırma (TL)** | Pahalı ($15-$50/ay) | Pahalı ($8-$18/ay) | Çok Pahalı (B2B) | **✅ Türkiye Dostu** |
| **Giriş Kolaylığı** | Sadece Mail/Google | Sadece Google/Apple | Şirket Vergi No | **✅ Google + SMS OTP** |

---

## 📌 Öncelikli Takip Listesi (Kişisel Notlar & Test Hedefleri)

Sistem canlıya alınırken ve test edilirken öncelikli olarak izlenecek platformlar:

1. **inzva:** Teknoloji ve üniversite gençliği (AI ve algoritma kampları, hackathonlar, başvuru takvimleri).
2. **SKS (Sağlık, Kültür ve Spor Daire Bşk. - ÇÜ vb.):** Üniversite öğrencileri (Kısmi zamanlı iş ilanları, mülakat tarihleri, yemek bursları).
3. **Coderspace:** Genç profesyoneller ve yazılımcılar (Bootcamp'ler, şirketlerin işe alım maratonları).
4. **MÜSİAD İstanbul:** İş dünyası, girişimciler ve KOBİ'ler (Zirveler, ekonomi bültenleri, sektör buluşmaları).

---

## 🏗️ Yeni Sistem Mimarisi ve Çalışma Mantığı

```
                                [ KULLANICI ]
                       (Web veya Mobil PWA Arayüzü)
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       [ Google ile Giriş ]                     [ Telefon (SMS / OTP) ]
                 └───────────────────┬───────────────────┘
                                     │
                                     ▼
                          [ Firebase Firestore ]
                 (Kullanıcılar, Takip Edilen Web & RSS Kaynakları)
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ (Akşam Otomatik Tarama - Cron: 20:00) │
                 ▼                                       ▼
       ┌───────────────────┐                   ┌───────────────────┐
       │   RSS Beslemeleri │                   │   Web Sayfaları   │
       │   (`rss-parser`)  │                   │ (Scraper / Diff)  │
       └─────────┬─────────┘                   └─────────┬─────────┘
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     │ (Yeni Gelişmeler Toplanır)
                                     ▼
                    [ Gemini 3.6 Flash Toplu Analiz ]
                    - Önemsiz sayaç/reklamları temizle.
                    - Günlük bülten formatında Türkçe özet çıkar.
                    - Etkinlik/tarih varsa Google Takvim URL'i üret.
                                     │
                                     ▼
                     [ Tekil "Günlük Özet Bülteni" ]
                     - Kullanıcının mailine tek parça gönderilir.
                     - Panelde "Bugünün Özeti" olarak listelenir.
```

---

## 🔌 Ayrık Mimari & Kendi Sunucuna Taşıma Kolaylığı (Portability)

MVP aşamasında hız, sıfır maliyet ve pratiklik için **Firebase** altyapısını tercih ediyoruz. Ancak projeyi ileride **kendi bağımsız sunucuna (VPS, Docker, SQLite/PostgreSQL)** taşımak istediğinde satıcı kilidine (Vendor Lock-in) takılmaman için mimariyi **"Ayrık (Decoupled)"** olarak inşa ettik:

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
1. **Sıfır Bağımlılıkla Yazılan Motor (`src/core`):** Sayfayı çeken (`cheerio`), reklam/script temizleyen, SHA-256 hash alan, Gemini API'ye sorup tarihi ve özeti çıkaran ve Google Calendar URL'i üreten tüm mantık **saf Node.js** modülü olarak yazıldı.
2. **Veritabanı Köprüsü (Adapter Pattern - `src/adapters/dbAdapter.js`):** Veritabanı sorguları tek bir adaptör dosyası üzerinden yapılıyor. İleride kendi sunucuna geçtiğinde sadece bu dosya içindeki Firestore çağrılarını PostgreSQL/SQLite sorgularıyla değiştirmek yeterli olur.
3. **Zahmetsiz Göç (Migration):** İş mantığına dokunmadan, sadece adaptör katmanını değiştirerek projeyi 5 dolarlık bir Linux sunucuda (Docker ile) çalıştırabilirsin.

---

## ⚡ Hibrit / Polyglot Mimari: Go (Golang) + Node.js İş Birliği

Sistem ölçeği yüzbinlerce web sitesi ve RSS akışına ulaştığında donanım maliyetlerini minimumda tutmak için **Go (Golang)** ve **Node.js** dillerinin en güçlü yönlerini birleştiren hibrit bir mimari kullanıyoruz:

```
┌────────────────────────────────────────┐       ┌────────────────────────────────────────┐
│          GO (GOLANG) MİKROSERVİSİ      │       │          NODE.JS & REACT ALTYAPISI     │
│             "KAS GÜCÜ / WORKER"        │       │          "BEYİN & KULLANICI ALANI"     │
├────────────────────────────────────────┤       ├────────────────────────────────────────┤
│ • 10.000+ RSS ve Web Sayfasını         │       │ • React / Vite Web & Mobil PWA Paneli  │
│   Goroutine'lerle paralel tarama       │       │ • Firebase Auth (Google + SMS Girişi)  │
│ • Devasa ağ (I/O) ve soket yönetimi    │       │ • Gemini 3.6 Flash Entegrasyonu        │
│ • Aşırı düşük RAM tüketimi (~30-50 MB) │  ◄──► │ • Türkçe Özetleme & Takvim URL Üretimi │
│ • Hızlı SHA-256 Hash ve Diff kontrolü  │       │ • Resend ile Şık HTML E-posta Bülteni  │
│ • Değişiklik yoksa Node'u hiç yormaz   │       │ • Kullanıcı Ayarları & REST API        │
└────────────────────────────────────────┘       └────────────────────────────────────────┘
```

### Neden Bu İkili?
* **Go'nun Rolü (Kas Gücü):** Milyonlarca ağ isteğini, Goroutine'ler sayesinde yalnızca ~50 MB RAM tüketerek saniyeler içinde paralel tarar. Sitede değişiklik yoksa süreci hemen kapatarak gereksiz kaynak kullanımını engeller.
* **Node.js'in Rolü (Beyin):** Yapay zeka orkestrasyonu (Gemini 3.6), HTML mail şablonları, Google Takvim linkleri ve kullanıcı paneli gibi hızlı geliştirme ve zengin ekosistem gerektiren alanları yönetir.
* **Haberleşme:** İki servis ortak veritabanı (Firestore / PostgreSQL / Redis) veya hafif REST/gRPC API üzerinden konuşur.

## 🐳 DevOps & Observability Mimarisi (Docker, Prometheus & Grafana)

Proje, yalnızca yerel çalışan bir script değil; **CV'de ve kurumsal bir girişimde fark yaratacak üretim sınıfı (production-grade) bir Cloud-Native altyapı** olarak tasarlanmıştır.

```
                         ┌────────────────────────────────────────────────────────┐
                         │                  DOCKER ORKESTRASYONU                  │
                         │                  (docker-compose.yml)                  │
                         └──────────────────────────┬─────────────────────────────┘
                                                    │
        ┌───────────────────┬───────────────────────┼───────────────────────┬───────────────────┐
        ▼                   ▼                       ▼                       ▼                   ▼
┌──────────────┐    ┌──────────────┐        ┌──────────────┐        ┌──────────────┐    ┌──────────────┐
│  GO CRAWLER  │    │ NODE.JS APP  │        │  PROMETHEUS  │        │   GRAFANA    │    │ ALERTMANAGER │
│  (Worker)    │    │ (API & Web)  │        │ (Metrik DB)  │        │  (Dashboard) │    │  (Telegram)  │
│ Multi-Stage  │    │ Multi-Stage  │        │              │        │              │    │              │
│ ~15-20 MB    │    │ ~120 MB      │        │ Pull Modeli  │        │ Canlı Panel  │    │ Anlık Uyarı  │
└───────┬──────┘    └───────┬──────┘        └───────▲──────┘        └───────▲──────┘    └───────▲──────┘
        │                   │                       │                       │                   │
        └───────────────────┴─────── /metrics ──────┴───────────────────────┴───────────────────┘
```

### 1. Multi-Stage Docker Mimarisi
* **Go Crawler:** Kod derlendikten sonra sadece tek bir binary alınarak boş `alpine`/`scratch` imajına aktarılır. İmaj boyutu **yalnızca 15-20 MB** olur.
* **Node.js & React:** Derleme aşaması ile çalışma aşaması ayrıştırılarak hafif ve güvenli konteynerler üretilir.

### 2. Prometheus Metrikleri (Gözlemlenebilirlik / Observability)
Sistem kör uçuş yapmaz; backend servisleri Prometheus `/metrics` uç noktası üzerinden canlı telemetri üretir:

| Metrik Adı | Tipi | Açıklama |
| :--- | :--- | :--- |
| `sites_scraped_total{status, target}` | **Counter** | Toplam taranan site sayısı ve başarı/hata oranı |
| `scrape_duration_seconds` | **Histogram** | Sitelerin yanıt verme hızları ve ağ gecikmesi |
| `changes_detected_total` | **Counter** | Saptanan duyuru ve içerik değişiklik sayısı |
| `calendar_events_generated_total` | **Counter** | Üretilen Google Takvim bağlantısı sayısı (Temel Değer) |
| `gemini_tokens_used_total` | **Counter** | Yapay zekaya harcanan token ve maliyet takibi |
| `active_monitors_gauge` | **Gauge** | Sistemdeki anlık aktif takip sayısı |

### 3. Grafana Panelleri & Alertmanager
* **Grafana:** Taranan sitelerin sağlık durumunu, yanıt sürelerini ve Gemini token maliyetlerini görselleştirir.
* **Alertmanager:** Bir site 3 kez üst üste 403 (IP Ban) verdiğinde veya hata oranı %5'i aştığında anında **Telegram / Discord** üzerinden uyarı gönderir.

---

## ☁️ Cloud & AWS Ölçeği (Girişim Altyapısı)

Girişimi ölçeklendirirken AWS bulut servislerine uyumlu mimari:
* **AWS ECS (Elastic Container Service) & Fargate:** Sunucu yönetmeden Docker konteynerlerini çalıştırma (Serverless Container).
* **AWS ECR (Elastic Container Registry):** Güvenli Docker imaj depolama ve CI/CD akışı.
* **AWS S3:** Sitelerin geçmiş metin arşivleri ve snapshot depolaması.
* **AWS EventBridge (CloudWatch Events):** Zamanlanmış cron taramalarının bulut üzerinde yönetimi.

---

## ⚠️ Risk Analizi ve Çözümleri (Pre-Mortem)

| # | Risk | Potansiyel Tehlike | Çözüm & Önlem |
|---|---|---|---|
| **1** | **Sahte Değişiklik Alarmları** | Saat, sayaç, dönen reklamlar yüzünden her gün *"Sayfa değişti"* uyarısı gitmesi. | Ham HTML yerine; `<script>`, `<nav>`, `<footer>` temizlenmiş **gövde metni** kıyaslanıyor. |
| **2** | **Mail Kirliliği (Inbox Fatigue)** | 10 site takip edildiğinde günde 10-15 ayrı e-posta gelmesi. | **Günlük Özet Bülteni (Daily Digest):** Akşamları tek bir toplu bülten gönderilir. |
| **3** | **Sunucu IP Blokajı** | Bazı sitelerin veri merkezi IP'lerini engellemesi (403/Captcha). | Varsa otomatik **RSS beslemesi** kullanılır; yoksa gerçekçi `User-Agent` ve açık kaynak proxy çözümleri devreye girer. |
| **4** | **Yapay Zekanın Tarih Şaşırması** | "Önümüzdeki cuma" gibi ifadelerde yanlış yıl/gün üretilmesi. | Gemini'ye sistem promptunda **o günün tam tarihi** veriliyor ve katı JSON şemasıyla ISO formatında çıktı alınıyor. |
| **5** | **Cloud Function Zaman Aşımı** | Çok sayıda sitenin taranmasında 60 saniyelik limitin dolması. | Siteler batch gruplar halinde paralel taranır, her siteye 8-10 saniye zaman aşımı (timeout) konur. |
| **6** | **E-postaların Spama Gitmesi** | Link içeren maillerin gereksiz kutusuna düşmesi. | Resend altyapısı, SPF ve DKIM DNS doğrulamaları kullanılır. |

---

## 📅 Takvime Ekleme (Google Calendar Link Mimarisi)

Kullanıcıdan ek takvim izinleri istemeye gerek kalmadan çalışan URL formatı:

```text
https://calendar.google.com/calendar/render?action=TEMPLATE&text={Baslik}&dates={BaslangicTarihi}/{BitisTarihi}&details={OzetVeLink}
```

* **Örnek Çıktı:**
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Guz+Donemi+Yatay+Gecis+Son+Basvuru&dates=20261024T060000Z/20261024T150000Z&details=Detaylar+ve+kayit:+https://itu.edu.tr/duyuru`

---

## 🗺️ Geliştirme Yol Haritası

- [x] **Aşama 1: Saf Çekirdek Motor (Core Engine)** ✅
  - `cheerio` ve `axios` ile gürültüden arındırılmış metin kazıma.
  - SHA-256 hash hesaplama ve $0 maliyetli değişim tespiti.
  - Gemini 3.6 Flash entegrasyonu (Türkçe özet + ISO tarih çıkarımı).
  - Google Calendar URL üretici.
  - 7/7 birim testi başarıyla geçti.

- [x] **Aşama 2: Veritabanı Adaptörü & E-posta Servisi** ✅
  - Taşınabilir `dbAdapter.js` (Yerel JSON + Firestore uyumlu).
  - Responsive HTML e-posta şablonu ve **[📅 Google Takvim'e Ekle]** butonu.
  - Çoklu site tarama yürütücüsü (`src/runner.js`).
  - Test suite (14/14 test geçti).

- [x] **Aşama 3: Kullanıcı Paneli & REST API** ✅
  - Express REST API (`GET`, `POST`, `DELETE`, `POST /check`).
  - React + Vite + Tailwind CSS dashboard.
  - Anlık test ve simülasyon butonu (`🧪 Simüle Et`).
  - Toplam 18/18 test geçti ve canlıya hazırlandı.

- [ ] **Aşama 4: Hibrit RSS Besleme Okuyucu (`rss-parser`)** ⏳
  - Girilen URL'de otomatik RSS beslemesi arama.
  - RSS akışından yeni başlıkları okuma ve Gemini'ye özetletme.

- [ ] **Aşama 5: Günlük Özet Bülteni (Daily Digest Engine)** ⏳
  - Gün içinde veya akşam toplanan tüm değişimleri tek bir e-posta bülteninde birleştirme.
  - Panelde "Günün Özeti" görünümü.

- [ ] **Aşama 6: Firebase Auth (Google + Telefon SMS) & Mobil PWA** ⏳
  - Google ile Tek Tıkla Giriş.
  - Telefon numarası ve SMS OTP doğrulama.
  - Mobil cihazlar için "Ana Ekrana Ekle" PWA manifesti.

- [ ] **Aşama 7: Açık Kaynak İzleme & ChangeDetection Entegrasyonu** ⏳
  - Gelişmiş JavaScript/SPA sayfaları için açık kaynak container desteği.

---

## 💻 Hızlı Başlangıç

```powershell
# Bağımlılıkları yükleme ve testleri çalıştırma
npm install
npm test

# API ve Arayüzü birlikte başlatma
npm start

# Tarayıcıda aç:
http://localhost:3001
```
