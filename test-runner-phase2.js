import assert from 'node:assert/strict';
import 'dotenv/config';
import { db } from './src/adapters/dbAdapter.js';
import { buildEmailHtml, sendChangeNotification } from './src/services/emailService.js';
import { runSingleMonitor } from './src/runner.js';

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

console.log('\n🚀 --- Anımsatıcı Aşama 2 Testleri Başlıyor ---\n');

// 1. E-posta Servisi Testleri
console.log('📧 1. E-posta Servisi & HTML Şablon Testleri:');
test('Etkinlik tespit edildiğinde Google Takvim butonu içeren şık HTML üretmeli', () => {
  const calendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Yapay+Zeka+Semineri&dates=20261024T140000Z/20261024T160000Z';
  const html = buildEmailHtml({
    title: 'İTÜ Bilgisayar Kulübü',
    url: 'https://ornek.edu.tr/duyurular',
    summary: '24 Ekim 2026 tarihinde Yapay Zeka Semineri düzenlenecektir.',
    calendarUrl,
    eventDetails: { startDate: '2026-10-24T14:00:00' }
  });

  assert.ok(html.includes('Anımsatıcı'));
  assert.ok(html.includes('İTÜ Bilgisayar Kulübü'));
  assert.ok(html.includes('24 Ekim 2026 tarihinde Yapay Zeka Semineri'));
  assert.ok(html.includes(calendarUrl));
  assert.ok(html.includes('Google Takvim&#39;e Ekle') || html.includes("Google Takvim'e Ekle"));
});

test('Etkinlik yokken Google Takvim butonu üretmemeli, sadece özeti göstermeli', () => {
  const html = buildEmailHtml({
    title: 'Genel Duyurular',
    url: 'https://ornek.edu.tr/genel',
    summary: 'Ders kayıt tarihleri henüz belirlenmemiştir.',
    calendarUrl: null
  });

  assert.ok(!html.includes('calendar.google.com'));
  assert.ok(!html.includes('📅'));
  assert.ok(html.includes('Ders kayıt tarihleri henüz belirlenmemiştir.'));
});

await testAsync('API Key yokken preview modunda e-posta çıktısı üretmeli', async () => {
  const result = await sendChangeNotification({
    to: 'test@example.com',
    title: 'Test Sayfası',
    url: 'https://ornek.edu.tr',
    summary: 'Örnek duyuru özeti',
    calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Test',
    apiKey: undefined
  });

  assert.equal(result.success, true);
  assert.equal(result.mode, 'preview');
  assert.ok(result.html.includes('Örnek duyuru özeti'));
});

// 2. Veritabanı Adaptörü Testleri
console.log('\n🗄️ 2. Veritabanı Adaptörü (dbAdapter) Testleri:');
let createdMonitorId = null;

await testAsync('Yeni bir takip linki ekleyebilmeli', async () => {
  const monitor = await db.addMonitor({
    userId: 'user_test_1',
    userEmail: 'ogrenci@itu.edu.tr',
    title: 'İTÜ Duyuru Panosu',
    url: 'https://ornek.edu.tr/duyurular'
  });

  assert.ok(monitor.id);
  assert.equal(monitor.userEmail, 'ogrenci@itu.edu.tr');
  assert.equal(monitor.isActive, true);
  createdMonitorId = monitor.id;
});

await testAsync('Aktif monitörleri listeleyebilmeli', async () => {
  const activeList = await db.getActiveMonitors();
  assert.ok(activeList.length > 0);
  const found = activeList.find(m => m.id === createdMonitorId);
  assert.ok(found);
});

await testAsync('Monitör durumunu güncelleyebilmeli (hash ve kontrol tarihi)', async () => {
  const updated = await db.updateMonitor(createdMonitorId, {
    lastContentHash: 'hash_12345_test',
    lastCheckedAt: new Date().toISOString()
  });

  assert.equal(updated.lastContentHash, 'hash_12345_test');
  assert.ok(updated.lastCheckedAt);
});

await testAsync('Monitörü veritabanından silebilmeli', async () => {
  const deleted = await db.deleteMonitor(createdMonitorId);
  assert.equal(deleted, true);

  const foundAfter = await db.getMonitorById(createdMonitorId);
  assert.equal(foundAfter, null);
});

console.log(`\n🎉 Aşama 2 testleri başarıyla tamamlandı! (${passedTests}/${totalTests})\n`);
