import assert from 'node:assert/strict';
import 'dotenv/config';
import { computeHash, hasChanged } from './src/core/hasher.js';
import { cleanHtml } from './src/core/scraper.js';
import { formatCalendarDate, generateGoogleCalendarUrl } from './src/core/calendar.js';
import { analyzeChangeWithAI } from './src/core/aiAnalyzer.js';

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

console.log('\n🚀 --- Anımsatıcı Çekirdek Motor Testleri Başlıyor ---\n');

// 1. Hasher Testleri
console.log('📦 1. Hasher (SHA-256) Testleri:');
test('Metin boşluklarını normalize ederek aynı hash değerini üretmeli', () => {
  const text1 = 'İstanbul Teknik Üniversitesi   Etkinlik Duyurusu\n\n';
  const text2 = 'İstanbul Teknik Üniversitesi Etkinlik Duyurusu';
  assert.equal(computeHash(text1), computeHash(text2));
});

test('Farklı metinler için farklı hash üretmeli', () => {
  const hash1 = computeHash('Duyuru A');
  const hash2 = computeHash('Duyuru B');
  assert.notEqual(hash1, hash2);
});

test('hasChanged fonksiyonu eski ve yeni hash arasındaki farkı tespit etmeli', () => {
  const hashA = computeHash('Metin A');
  const hashB = computeHash('Metin B');
  assert.equal(hasChanged(hashA, hashB), true);
  assert.equal(hasChanged(hashA, hashA), false);
  assert.equal(hasChanged('', hashA), true);
});

// 2. Scraper (HTML Temizleme) Testleri
console.log('\n📦 2. Scraper (Gürültü ve HTML Temizleme) Testleri:');
test('Script, style, nav, footer ve reklam gürültülerini temizlemeli', () => {
  const rawHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Etkinlik Sayfası</title>
        <style>body { color: red; }</style>
        <script>console.log("tracking pixel");</script>
      </head>
      <body>
        <nav><a href="/home">Anasayfa</a></nav>
        <div class="cookie-banner">Çerezleri kabul edin.</div>
        <header><h1>Site Başlığı</h1></header>
        <main>
          <h2>Yapay Zeka Zirvesi 2026</h2>
          <p>Tüm öğrencilerimiz davetlidir. Tarih: 24 Ekim 2026 Saat: 14:00.</p>
        </main>
        <footer>© 2026 Tüm Hakları Saklıdır.</footer>
        <div class="ad">Sponsorlu Reklam</div>
      </body>
    </html>
  `;

  const { title, text } = cleanHtml(rawHtml);

  assert.equal(title, 'Test Etkinlik Sayfası');
  assert.ok(text.includes('Yapay Zeka Zirvesi 2026'));
  assert.ok(text.includes('24 Ekim 2026'));
  // Gürültülerin elendiğini doğrula
  assert.ok(!text.includes('tracking pixel'));
  assert.ok(!text.includes('body { color: red; }'));
  assert.ok(!text.includes('Çerezleri kabul edin'));
  assert.ok(!text.includes('Tüm Hakları Saklıdır'));
  assert.ok(!text.includes('Sponsorlu Reklam'));
});

// 3. Calendar (Google Takvim Link Üretici) Testleri
console.log('\n📦 3. Google Calendar URL Üretici Testleri:');
test('Belirtilen tarih ve saat için doğru UTC formatında şablon linki üretmeli', () => {
  const calendarUrl = generateGoogleCalendarUrl({
    title: 'Yapay Zeka Zirvesi',
    startDate: '2026-10-24T14:00:00Z',
    endDate: '2026-10-24T16:00:00Z',
    details: 'Etkinlik Detayları: https://ornek.edu.tr/etkinlik',
    location: 'İTÜ Ayazağa Kampüsü'
  });

  const parsedUrl = new URL(calendarUrl);
  assert.equal(parsedUrl.origin, 'https://calendar.google.com');
  assert.equal(parsedUrl.pathname, '/calendar/render');
  assert.equal(parsedUrl.searchParams.get('action'), 'TEMPLATE');
  assert.equal(parsedUrl.searchParams.get('text'), 'Yapay Zeka Zirvesi');
  assert.equal(parsedUrl.searchParams.get('dates'), '20261024T140000Z/20261024T160000Z');
  assert.ok(parsedUrl.searchParams.get('details').includes('https://ornek.edu.tr/etkinlik'));
  assert.equal(parsedUrl.searchParams.get('location'), 'İTÜ Ayazağa Kampüsü');
});

test('Tüm gün (all-day) etkinliklerinde YYYYMMDD formatında link üretmeli', () => {
  const calendarUrl = generateGoogleCalendarUrl({
    title: 'Son Başvuru Tarihi',
    startDate: '2026-11-01',
    isAllDay: true,
    details: 'Yatay Geçiş Başvurusu'
  });

  const parsedUrl = new URL(calendarUrl);
  assert.equal(parsedUrl.searchParams.get('text'), 'Son Başvuru Tarihi');
  assert.equal(parsedUrl.searchParams.get('dates'), '20261101/20261102');
});

// 4. Gemini AI Analiz Testi (API Key varsa canlı, yoksa simülasyon)
console.log('\n📦 4. Gemini AI Analiz Entegrasyonu:');
if (process.env.GEMINI_API_KEY) {
  await testAsync('Canlı Gemini API çağrısı ile etkinlik ve özet tespiti', async () => {
    const sampleText = `
      Duyurular
      Bahar Dönemi Bilgisayar Mühendisliği Semineri
      Tarih: 24 Ekim 2026 Cumartesi, Saat: 14:00
      Konu: Büyük Dil Modellerinin Geleceği
      Konuşmacı: Prof. Dr. Ahmet Yılmaz
    `;

    const result = await analyzeChangeWithAI({
      newText: sampleText,
      oldText: 'Duyurular\nHenüz aktif bir etkinlik bulunmamaktadır.',
      pageTitle: 'Bilgisayar Mühendisliği Bölümü',
      url: 'https://ornek.edu.tr/duyuru',
      currentDate: '2026-09-15',
      apiKey: process.env.GEMINI_API_KEY
    });

    console.log('    AI Özeti:', result.changeSummary);
    console.log('    Etkinlik Başlığı:', result.eventDetails?.title);
    console.log('    Etkinlik Başlangıcı:', result.eventDetails?.startDate);

    assert.equal(result.hasSignificantChange, true);
    assert.equal(result.hasEvent, true);
    assert.ok(result.changeSummary.length > 5);
    assert.ok(result.eventDetails.startDate.includes('2026-10-24'));
  });
} else {
  test('GEMINI_API_KEY tanımlı değilken yardımcı hata mesajı fırlatmalı', async () => {
    await assert.rejects(
      async () => {
        await analyzeChangeWithAI({
          newText: 'Yeni etkinlik duyurusu',
          apiKey: ''
        });
      },
      /GEMINI_API_KEY/
    );
  });
  console.log('  ℹ️  Canlı Gemini testi için .env dosyasına GEMINI_API_KEY ekleyebilirsiniz.');
}

console.log(`\n🎉 Tüm testler başarıyla tamamlandı! (${passedTests}/${totalTests})\n`);
