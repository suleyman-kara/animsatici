# 🔔 Anımsa (Kod Adı: DevRadar / KampüsRadar)
### Bilgisayar Mühendisliği (CENG) ve Genç Geliştiriciler İçin Akıllı Fırsat, Hackathon ve Takvim Radarı

Web sitelerindeki hackathonları, yarışmaları, yazılım kamplarını, staj/iş fırsatlarını ve üniversite duyurularını senin yerine 7/24 izleyen; gelişmeleri yapay zeka (**Google Gemini 3.6 Flash**) ile süzüp özetleyen ve doğrudan **tek tıkla Google Takvim'e ekleme** imkanı sunan yeni nesil akıllı radar asistanı.

---

## 🎯 Keskin Niş ve Problem (The Acute Need)

Türkiye'de ve dünyada yazılım ekosisteminde her hafta onlarca kritik etkinlik gerçekleşmektedir:
* 🧠 **inzva:** Algoritma yarışmaları, AI/Deep Learning kampları.
* 🚀 **Coderspace:** Şirketlerin ödüllü hackathonları, kodlama maratonları ve işe alım challenge'ları.
* 💻 **Techcareer & Patika:** Ücretsiz bootcamp'ler ve şirket sponsorlu eğitim kohortları.
* 🎓 **Üniversite & SKS:** Kısmi zamanlı öğrenci iş ilanları, yemek bursları, laboratuvar ve bölüm duyuruları (ör. Çukurova Üni., İTÜ, ODTÜ).
* ✈️ **Teknoloji Girişimleri & Savunma:** Baykar, T3 Vakfı (Teknofest), Trendyol Tech, Commencis geliştirici etkinlikleri.

**Temel Problem:** Bu duyurular onlarca farklı web sitesine, alt sayfalara ve portallara dağılmıştır. Mühendislik öğrencileri ve genç geliştiriciler her gün bu sayfaları tek tek gezemez; sonuç olarak **son başvuru tarihleri, formlar ve kariyer fırsatları sürekli kaçırılır.**

---

## 💡 Çözüm & Katil Özellik (Killer Feature / USP)

Geleneksel web takip araçları (Visualping, ChangeDetection vb.) sadece piksel veya ham HTML farkı sunarak yüzlerce sahte spam alarm üretir ve takvime eklemek için pahalı 3. parti araçlar (Zapier/n8n) ister.

**Anımsa**, bu problemi son adıma kadar çözerek ortadan kaldırır:
1. **Gürültüden Arındırılmış Akıllı Kazıma:** Sayfadaki reklamlar, gezinme çubukları (`nav`), çerez pop-up'ları ve altbilgiler (`footer`) ayıklanır.
2. **0 Dolar Maliyetli SHA-256 Hash Kontrolü:** Sayfada gerçek bir metin değişikliği yoksa yapay zekaya istek atılmaz; maliyet sıfırda tutulur.
3. **Gemini 3.6 Flash ile Doğal Türkçe Çıkarım:** Sayfa metni doğrudan Gemini'ye verilir; model bir insan gibi okuyarak etkinliğin başlığını, son başvuru tarihini ve 1-2 cümlelik net özetini JSON formatında yakalar.
4. **Tek Tıkla Google Takvim'e Ekleme (1-Click Calendar Action):** Kullanıcıya giden bildirimde (e-posta veya anlık push) doğrudan **`[📅 Google Takvim'e Ekle]`** linki bulunur. Tıklandığı anda etkinlik tarihi, saati, özeti ve başvuru linki kullanıcının ajandasına işlenir.

---

## 🔄 Kendi Kendini Büyüten Topluluk Motoru (Crowdsourced Feed Engine)

Anımsa, yöneticinin tek tek link eklemesine bağımlı kalmadan **kendi kendine genişleyen** bir platform olarak kurgulanmıştır:

```
                  [ Kullanıcı Yeni Web Sitesi / Topluluk Ekler ]
                                         │
                                         ▼
                     [ Kullanıcının Kendi Panelinde Anında Aktif Olur ]
                                         │
                                         ▼
                        [ Arka Planda "Aday Havuzu"na Düşer ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [ Kural 1: Çoklu Talep ]                        [ Kural 2: Gemini Doğrulaması ]
(Farklı kullanıcılar aynı linki eklerse)         ("Bu kamuya açık bir etkinlik sayfasıdır")
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                     [ "Keşfet / Katalog" Vitrinine Terfi Eder ]
             (Tüm CENG öğrencileri tek tıkla "+ Takip Et" yapabilir)
```

1. **Küratörlü Keşfet / Katalog Vitrini:** Kullanıcı ilk girdiğinde boş ekran yerine *inzva, Coderspace, Techcareer, SKS* gibi hazır kanalları görür ve tek tıkla takibe başlar (*Cold Start çözümü*).
2. **Özel Link Ekleme:** Dileyen her kullanıcı kendi okulunun, bölümünün veya takip ettiği bir şirketin sayfasını anında ekleyebilir.
3. **Organik Büyüme:** Eklenen linkler aday havuzunda toplanır; popülerleşen veya yapay zeka tarafından onaylanan linkler otomatik olarak genel vitrine geçer. Sen uyurken bile platformun veritabanı zenginleşir.

---

## ⚖️ Hukuki Boyut ve Etik Kazıma İlkeleri (Gentle Scraping)

İnternetten etkinlik ve duyuru bilgisi toplamak hem yasal hem de kurumlar açısından bir **kazan-kazan (win-win)** fırsatıdır:

* **Olgusal Veri (Factual Data) Teliflenemez:** Etkinliğin adı, başlama/bitiş tarihi ve son başvuru saati telif hakkına tabi yaratıcı bir eser değil; halka açık bir olgudur (*hiQ Labs v. LinkedIn* gibi küresel emsal davalar).
* **Nitelikli Başvuru Trafiği (Win-Win):** Anımsa içeriği kopyalamaz; "Etkinlik açıldı, kaçırma ve **[inzva'nın Orijinal Sayfasına Git]**" diyerek o kuruma tam hedef kitlesinden nitelikli başvuru trafiği yönlendirir.
* **Sunucu Dostu Hız (Rate Limiting):** Saniyede onlarca istek atan agresif botlar yerine; günde 1 kez veya birkaç saatte bir nazik `GET` isteği atılarak sunucular asla yorulmaz.
* **KVKK & Kişisel Veri Güvencesi:** Kullanıcı girişi gerektiren veya kişisel verilerin yer aldığı hiçbir alana girilmez; yalnızca kamuya açık duyurular okunur.

---

## 🏗️ Sistem Mimarisi ve Teknoloji Yığını

Platform, hem bir mobil girişim vizyonunu hem de güçlü bir **Backend & DevOps portfolyosunu** yansıtacak şekilde çok dilli (polyglot) ve katmanlı olarak tasarlanmıştır:

```
                             [ KULLANICI ]
                ┌──────────────────┼──────────────────┐
                ▼                  ▼                  ▼
           [ iOS App ]       [ Android App ]    [ Web Dashboard ]
                └──────────────────┬──────────────────┘
                                   │
                        ┌──────────┴──────────┐
                        │   FLUTTER (DART)    │ ◄── Tek Kod Tabanı
                        │  (app.animsa.com)   │     (Mobile & Web App)
                        └──────────┬──────────┘
                                   │ (Saf JSON REST API)
                                   ▼
                        ┌─────────────────────┐
                        │   NODE.JS EXPRESS   │ ◄── Statik Landing Page
                        │   REST API ENGINE   │     (animsa.com - Hızlı SEO)
                        └──────────┬──────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
        [ Go Crawler Worker ]             [ Gemini 3.6 Flash ]
     (Goroutines: 10K+ Site/RSS)       (Özetleme & Google Takvim)
                  │                                 │
                  └────────────────┬────────────────┘
                                   ▼
                  [ FCM & E-posta Bildirimleri ]
                  - Kilit ekranı bildirimleri (iOS/Android)
                  - Akşam Daily Digest e-posta bülteni
```

### 1. Frontend: Flutter (Dart)
* **Tek Kod Tabanı:** Hem tarayıcıda (`app.animsa.com`) hem de iOS ve Android'de native hızda çalışır.
* **FCM Push Bildirimleri:** Kritik bir etkinlik çıktığında telefonun kilit ekranına düşer; bildirimin altında doğrudan **[📅 Google Takvim'e Ekle]** aksiyon butonu bulunur.
* *(Geliştirme sürecinin başında React 18 + Vite + Tailwind CSS ile doğrulanmış bir web MVP prototipi hazırlanmıştır).*

### 2. Backend API: Node.js (Express 5 REST API)
* Flutter ve istemcilerin kolayca tükettiği saf JSON REST API (`/api/monitors`, `/api/catalog`, `/api/catalog/suggest`).
* Bağımsız `dbAdapter.js` mimarisi sayesinde veritabanı geçişleri (Yerel JSON $\rightarrow$ Firestore veya PostgreSQL) sıfır eforla yapılır.

### 3. Ölçek & DevOps Hedefi (Backend & CV Showcase): Go + Docker + Prometheus
* **Go (Golang) Worker:** Kullanıcı sayısı ve takip edilen siteler binlere ulaştığında, siteleri tarama işini Go'nun hafif `goroutine`'leri üstlenir. 10.000 site saniyeler içinde paralel taranır.
* **Docker & Docker Compose:** API ve Worker servisleri bağımsız konteynerler olarak paketlenir.
* **Prometheus & Grafana:** Saniyede taranan site sayısı, HTTP 200/403/500 hata oranları ve Gemini API yanıt süreleri gerçek zamanlı izlenir.

---

## 📊 Rekabet Karşılaştırma Matrisi

| Özellik | Visualping / Global | Feedly / RSS | TR İhale Siteleri | **Anımsa (DevRadar)** |
| :--- | :---: | :---: | :---: | :---: |
| **Odak & Kitle** | Kurumsal B2B | Genel Okuyucu | Kamu İhaleleri | **CENG & Genç Yazılımcılar** |
| **Google Takvim Butonu** | ❌ (Zapier Şart) | ❌ Yok | ❌ Yok | **✅ Tek Tıkla Hazır** |
| **Küratörlü Hazır Katalog**| ❌ Boş Liste | Kısmen | ❌ Sadece EKAP | **✅ inzva, Coderspace, SKS** |
| **Aday Havuzu (Crowdsource)**| ❌ Yok | ❌ Yok | ❌ Yok | **✅ Kendi Kendini Büyüten** |
| **Türkçe Yapay Zeka Özeti**| Kısıtlı İngilizce | ❌ Yok | Sadece Şartname | **✅ Doğal Türkçe (Gemini)** |
| **Mobil Kilit Ekranı (Push)**| Ücretli / Zayıf | Basit Bildirim | SMS | **✅ Flutter + FCM Aksiyonu** |

---

## 📅 Takvime Ekleme (Google Calendar URL Mimarisi)

Kullanıcıdan karmaşık OAuth izinleri istemeden, doğrudan tarayıcı veya Google Takvim mobil uygulamasını açan evrensel format:

```text
https://calendar.google.com/calendar/render?action=TEMPLATE&text={Baslik}&dates={BaslangicTarihi}/{BitisTarihi}&details={OzetVeLink}
```

* **Örnek Çıktı:**
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=inzva+AI+Camp+Son+Basvuru&dates=20261024T060000Z/20261024T150000Z&details=Detaylar+ve+kayit:+https://inzva.com/events`

---

## 🏷️ İsim ve Rebranding Notu
Proje geliştirme sürecinde **Anımsa** kod adıyla yürütülmektedir. Canlıya çıkış ve pazarlama aşamasında, yazılım ve kariyer odağını tam yansıtması adına **DevRadar**, **KampüsRadar** veya **Fırsat.dev** isimlerine geçiş planlanmaktadır.

---

## 🗺️ Geliştirme Yol Haritası

- [x] **Aşama 1: Saf Çekirdek Motor (Core Engine)** ✅
  - `cheerio` ve `axios` ile gürültüden arındırılmış metin kazıma.
  - SHA-256 hash hesaplama ve $0 maliyetli değişim tespiti.
  - Gemini 3.6 Flash entegrasyonu (Türkçe özet + ISO tarih çıkarımı).
  - Google Calendar URL üretici.
  - 7/7 birim testi geçti.

- [x] **Aşama 2: Veritabanı Adaptörü & E-posta Servisi** ✅
  - Taşınabilir `dbAdapter.js` (Yerel JSON + Firestore uyumlu).
  - Responsive HTML e-posta şablonu ve **[📅 Google Takvim'e Ekle]** butonu.
  - Çoklu site tarama yürütücüsü (`src/runner.js`).
  - 14/14 test geçti.

- [x] **Aşama 3: REST API & Web Prototipi** ✅
  - Express 5 REST API (`GET`, `POST`, `DELETE`, `POST /check`).
  - React + Vite + Tailwind CSS dashboard prototipi.
  - 18/18 test geçti.

- [x] **Aşama 4: Küratörlü Katalog & Aday Havuzu Altyapısı** ✅
  - `data/catalog.json` (CENG, Kariyer, Kampüs ve Topluluk kanalları).
  - `GET /api/catalog` ve kategori filtreleme.
  - `POST /api/catalog/suggest` ile kendi kendini besleyen aday havuzu.
  - 21/21 test geçti.

- [ ] **Aşama 5: Flutter Çoklu Platform Uygulaması (iOS, Android & Web)** ⏳
  - Tek Dart kod tabanı ile mobil (Play Store & App Store) ve `app.animsa.com` web paneli.
  - REST API ve Katalog entegrasyonu.
  - Firebase Cloud Messaging (FCM) ile kilit ekranına Google Takvim aksiyonlu bildirimler.

- [ ] **Aşama 6: Go Worker & DevOps Konteynerizasyonu** ⏳
  - Yüksek hacimli taramalar için Go worker servisi.
  - Docker Compose ortamı ve Prometheus/Grafana metrik izleme.

---

## 💻 Hızlı Başlangıç

```powershell
# Bağımlılıkları yükleme ve testleri çalıştırma
npm install
npm test

# API ve Web Arayüzünü birlikte başlatma
npm start

# Tarayıcıda aç:
http://localhost:3001
```
