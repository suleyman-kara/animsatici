# 📡 KampüsRadar (CENG & Kampüs Fırsat Radarı)
### Türkiye'nin Üniversite Öğrencileri ve Genç Geliştiricileri İçin Akıllı Etkinlik & Kariyer Ajandası

Web sitelerindeki hackathonları, kodlama kamplarını, staj/iş ilanlarını ve üniversite duyurularını senin yerine 7/24 izleyen; gelişmeleri yapay zeka (**Google Gemini 3.6 Flash**) ile süzüp yapılandıran ve doğrudan **Google Takvim'e tek tıkla işleyen** yeni nesil akıllı kariyer radarı.

* 🌐 **Canlı Uygulama:** [https://kampus-radar.web.app](https://kampus-radar.web.app)
* ☁️ **Altyapı:** %100 Sunucusuz (Serverless) Google Cloud Platform & Cloud Firestore
* 🤖 **Yapay Zeka:** Google Gemini 3.6 Flash Engine
* 📅 **Takvim Entegrasyonu:** Tek tıkla Google Takvim senkronizasyonu

---

## 🎯 Projenin Temel Misyonu & Yaşanan Dönüşüm (The Strategic Pivot)

Geleneksel web takip araçları kullanıcıya URL girdirir, sayfa kodunu seçtirir ve her ufak piksel/reklam değişiminde yüzlerce sahte spam alarm üretir. Öğrenciler web kazıma uzmanı değildir; URL peşinde koşmak, bozuk linklerle uğraşmak istemezler.

**KampüsRadar**, bu sürtünmeyi tamamen ortadan kaldıran **"Küratörlü & Doğrulanmış Etkinlik Platformu"** modelini benimsemiştir:
* **Öğrenci Açısından:** URL girmek veya teknik ayar yapmak yok. Tek tıkla ilgilendiği kanalları (*inzva, Coderspace, Techcareer, Baykar, Üniversite SKS*) takip eder; anında kişiselleştirilmiş, dopdolu bir etkinlik ajandasına sahip olur.
* **Yönetici Açısından:** Kaynaklar merkezi Yönetici Panelinde izlenir; sitelerin sağlık durumları (200 OK / Hata) ve yapay zekanın çıkardığı takvim verileri anlık test edilir. Sıfır hatalı link, %100 güvenilir veri.

---

## ✨ Temel Özellikler & Canlı Altyapı

### 1. 🚀 %100 Sunucusuz (Serverless) 7/24 Bulut Mimarisi
* Bilgisayarınızı açık tutmaya sıfır ihtiyaç; sistem Google Cloud altyapısında 7/24 bağımsız yaşar.
* **Cloud Scheduler & Functions 2nd Gen:** Her gün saat **19:00'da (Türkiye Saati)** çalışan `centralRadarScanner`, tüm merkezi kaynakları arka planda otomatik olarak tarar.
* **Akıllı SHA-256 Değişim Tespiti:** Sitede gerçek bir metin değişikliği yoksa yapay zekaya istek atılmaz ($0 gereksiz maliyet).

### 2. 🧠 Gemini 3.6 Flash ile Akıllı Takvim Çıkarımı
* Sayfadaki reklamlar, gezinme menüleri ve sayaçlar ayıklanarak salt içerik Gemini'ye teslim edilir.
* Gemini; etkinlik başlığını, başlangıç-bitiş tarih ve saatlerini ve özetini doğal Türkçeyle JSON olarak yakalar.
* Otomatik olarak **`[📅 Google Takvim'e Ekle]`** linki oluşturulur; tıklandığı an kullanıcının ajandasına işlenir.
* **Anti-Halüsinasyon (1 Yıl Kuralı):** 1 yıldan eski arşiv/duyurular yapay zeka tarafından elenir, takvim daima güncel kalır.

### 3. 👑 Yönetici Paneli (Admin Dashboard)
* Yalnızca yetkili yönetici hesabına (`suleymankara600@gmail.com`) özel tam yetkili kontrol paneli.
* **Kaynak Sağlık Durumu:** Sitelerin HTTP yanıt kodları (`🟢 200 OK`, `🔴 404/500/HATA`), gecikme süreleri (`ms`) ve son tarama zamanı.
* **Hata İzleme & Canlı Simülasyon:** Herhangi bir kaynağı tek tıkla (`⚡ Test Et`) bulutta anında test etme ve hata detayını görme.
* **Kataloğu Eşitle:** Tek tıkla hazır katalog kaynaklarını merkezi tarama havuzuna aktarma.
* **Tarama Günlükleri (Scan Logs):** Geçmiş 19:00 tarama döngülerinin başarı oranları ve yakalanan fırsat istatistikleri.

### 4. 🌟 Kesintisiz Açılış (Animasyonlu Radar Preloader)
* Flutter Web motorunun ilk indirilme anında (canvaskit/wasm) yaşanan 3-4 saniyelik beyaz ekran beklemesi kaldırıldı.
* Doğrudan HTML5/CSS3 ile çalışan dönen sonar/radar ışını, nabız dalgaları ve yükleme çubuğu ilk **15 milisaniyede** ekrana gelir; ilk Flutter karesi çizildiğinde pürüzsüzce kaybolur.

---

## 🔮 Gelecek Vizyonu & Yeni Nesil Yol Haritası (Next-Gen Roadmap)

### 🎙️ 1. Akıllı Tanışma & Kurulum Sihirbazı (Smart Onboarding)
* İlk kez kayıt olan öğrenciyi boş ekran yerine çok modlu (multimodal) karşılama karşılar:
  * **Sesle Konuşma:** Mikrofon butonuna basarak kendini anlatır: *"Ben İTÜ Bilgisayar 3. sınıfım, hackathon ve AI kampları arıyorum."*
  * **Hazır Çipler:** `CENG`, `1. Sınıf`, `Yapay Zeka`, `Yaz Stajı`, `Ödüllü Hackathonlar` tek tıkla seçilir.
  * **Serbest Metin:** Dileyen metin kutusuna hedeflerini yazar.
* **Gemini Sıfırıncı Dakika Kurulumu:** Öğrencinin ilgi alanlarına en uygun 4-5 kanal otomatik takibe alınır ve takvimine yaklaşan etkinlikler saniyeler içinde doldurulur.

### 📅 2. Üç Aşamalı Etkinlik Zaman Tüneli
* **🟢 Güncel & Başvurusu Açık:** Kayıt olunabilen aktif fırsatlar (Örn: *"Son 3 Gün!"* geri sayımı).
* **⏳ Gelecek Etkinlikler:** Tarihi duyurulmuş, yakında başlayacak hackathon ve kamplar.
* **📁 Geçmiş / Arşiv:** Tamamlanmış etkinlikler. Öğrencilerin *"Geçen sene Baykar stajı hangi ay açılmıştı?"*, *"inzva kış kampı ne zamandı?"* gibi dönemsel planlama yapabilmesini sağlar.

### 🏛️ 3. Topluluk Öneri Havuzu (Community Sourcing)
* Kullanıcılar link kazıma zahmetine girmeden *"Topluluk / Kampüs Öner"* formuyla istedikleri sayfayı aday havuzuna iletir.
* Yönetici panelinde çok talep alan kaynaklar tek tıkla test edilip merkezi sisteme alınır.

### 🔔 4. İnce Ayarlı Bildirim Tercihleri
* Kullanıcı bildirim e-postasını belirleyebilir veya kapatabilir.
* Bildirim sıklığını seçebilir: ⚡ Anında, ⏰ Günlük Akşam Bülteni (19:00 / 21:00), 📅 Haftalık Özet veya 🔕 Sessiz mod.
* Sadece takip ettiği kurumların bildirimlerini alır.

### 🔍 5. Haftalık Kaynak Keşif Laboratuvarı (Admin Sandbox)
* Yöneticinin haftalık rutininde yeni keşfettiği siteleri bir sandbox ortamında simüle edip, Gemini çıktısını canlı önizleyip onaylayarak sisteme dahil etmesi.

---

## 🏗️ Sistem Mimarisi

```
                                [ KULLANICI ]
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
              [ Google ile Giriş ]           [ Akıllı Onboarding ]
              (Firebase Google Auth)        (Ses / Çip / Metin ile Tanışma)
                       │                             │
                       └──────────────┬──────────────┘
                                      ▼
                           [ FLUTTER WEB / APP ]
                           (https://kampus-radar.web.app)
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
          [ Etkinlik Ajandası ]  [ Kanal Takibi ]   [ 👑 Yönetici Paneli ]
          (Güncel/Gelecek/Arşiv) (inzva, Baykar..)   (Sağlık & 200 OK İzleme)
                 │                    │                    │
                 └────────────────────┼────────────────────┘
                                      ▼
                          [ CLOUD FIRESTORE ]
              (users, sources, opportunities, scan_logs, candidatePool)
                                      ▲
                                      │ (7/24 Otonom Tarama & Sağlık)
                        ┌─────────────┴─────────────┐
                        │ CLOUD FUNCTIONS (2nd Gen) │
                        │  - centralRadarScanner    │ ◄── Cloud Scheduler (19:00 Cron)
                        │  - checkSourceNow         │ ◄── Anlık Canlı Test
                        └─────────────┬─────────────┘
                                      ▼
                             [ GEMINI 3.6 FLASH ]
                           - Doğal Türkçe Özetleme
                           - Başlangıç/Bitiş Tarihi Çıkarımı
                           - 1 Yıl Kuralı & Takvim URL Üretimi
```

---

## 🛠️ Geliştirici & Komut Başlangıç Rehberi

Detaylı ajan talimatları ve operasyonel kurallar için lütfen [AGENT.md](file:///c:/Users/suleyman/Documents/repos/animsatici/AGENT.md) belgesini inceleyin.

```powershell
# Flutter Web Derleme
npm.cmd run build:flutter

# Firebase Hosting Dağıtımı (Web Canlıya Alma)
npm.cmd run deploy:hosting

# Cloud Functions Dağıtımı
npx.cmd -y firebase-tools deploy --only functions

# Firestore Güvenlik Kuralları Dağıtımı
npx.cmd -y firebase-tools deploy --only firestore:rules
```

---

## 📄 Lisans
Bu proje MIT lisansı ile korunmaktadır.
