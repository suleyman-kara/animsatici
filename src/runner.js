import 'dotenv/config';
import { db } from './adapters/dbAdapter.js';
import { checkUrlForUpdates, fetchPageContent, analyzeChangeWithAI, generateGoogleCalendarUrl } from './core/index.js';
import { sendChangeNotification } from './services/emailService.js';

/**
 * Runs a single monitoring job for one target URL.
 *
 * @param {Object} monitor - Monitor record from database
 * @param {Object} [options]
 * @param {boolean} [options.simulateChange=false] - If true, appends a test announcement to verify AI & calendar generation
 * @returns {Promise<{ id: string, url: string, changed: boolean, notified: boolean, summary?: string, calendarUrl?: string, error?: string }>}
 */
export async function runSingleMonitor(monitor, { simulateChange = false } = {}) {
  const now = new Date().toISOString();

  try {
    console.log(`🔍 [${monitor.title || 'Takip'}] Kontrol ediliyor: ${monitor.url}`);

    if (simulateChange) {
      console.log(`  🧪 [TEST MODU] Yapay bir duyuru değişikliği simüle ediliyor...`);
      const page = await fetchPageContent(monitor.url);
      const simulatedAnnouncement = `\n\n--- YENİ EKLENEN DUYURU (TEST) ---\n2026-2027 Güz Dönemi Başvuruları Başladı!\nTarih: 28 Ekim 2026 Çarşamba Saat: 14:00\nDetay: Kısmi zamanlı öğrenci alımı sınav ve mülakatı 28 Ekim 2026 günü saat 14:00'te yapılacaktır. Son başvuru aynı gün saat 12:00'dir.`;
      const newText = page.text + simulatedAnnouncement;

      const aiAnalysis = await analyzeChangeWithAI({
        newText,
        oldText: page.text,
        pageTitle: monitor.title || page.title,
        url: monitor.url,
        apiKey: process.env.GEMINI_API_KEY
      });

      let calendarUrl = null;
      if (aiAnalysis?.hasEvent && aiAnalysis.eventDetails?.startDate) {
        calendarUrl = generateGoogleCalendarUrl({
          title: aiAnalysis.eventDetails.title || monitor.title,
          startDate: aiAnalysis.eventDetails.startDate,
          endDate: aiAnalysis.eventDetails.endDate || undefined,
          isAllDay: Boolean(aiAnalysis.eventDetails.isAllDay),
          details: `${aiAnalysis.changeSummary}\n\nKaynak: ${monitor.url}`,
          location: monitor.url
        });
      }

      await sendChangeNotification({
        to: monitor.userEmail,
        title: monitor.title,
        url: monitor.url,
        summary: aiAnalysis.changeSummary,
        calendarUrl,
        eventDetails: aiAnalysis.eventDetails
      });

      return {
        id: monitor.id,
        url: monitor.url,
        changed: true,
        notified: true,
        summary: aiAnalysis.changeSummary,
        calendarUrl,
        simulated: true
      };
    }

    const result = await checkUrlForUpdates({
      url: monitor.url,
      oldHash: monitor.lastContentHash || '',
      apiKey: process.env.GEMINI_API_KEY
    });

    if (!result.hasChanged) {
      console.log(`  ⚪ Değişiklik yok. (Hash: ${result.currentHash.slice(0, 10)}...)`);
      await db.updateMonitor(monitor.id, { lastCheckedAt: now });
      return { id: monitor.id, url: monitor.url, changed: false, notified: false };
    }

    console.log(`  🔔 DEĞİŞİKLİK TESPİT EDİLDİ!`);
    console.log(`     Eski Hash: ${monitor.lastContentHash ? monitor.lastContentHash.slice(0, 10) + '...' : 'Yok (İlk Tarama)'}`);
    console.log(`     Yeni Hash: ${result.currentHash.slice(0, 10)}...`);

    let notified = false;

    // Eğer Gemini analizi önemli bir değişim olduğunu söylüyorsa bildirim gönder
    const shouldNotify = result.aiAnalysis?.hasSignificantChange ?? true;
    const summary = result.aiAnalysis?.changeSummary || 'Sayfada yeni bir güncelleme tespit edildi.';

    if (shouldNotify) {
      console.log(`  ✨ Yapay Zeka Özeti: ${summary}`);
      if (result.calendarUrl) {
        console.log(`  📅 Google Takvim Linki: ${result.calendarUrl}`);
      }

      await sendChangeNotification({
        to: monitor.userEmail,
        title: monitor.title,
        url: monitor.url,
        summary,
        calendarUrl: result.calendarUrl,
        eventDetails: result.aiAnalysis?.eventDetails || null
      });

      notified = true;
    } else {
      console.log(`  ℹ️  Yapay zeka bu değişimin önemsiz (gürültü/sayaç) olduğunu belirledi, bildirim gönderilmedi.`);
    }

    // Veritabanındaki durumu güncelle
    await db.updateMonitor(monitor.id, {
      lastContentHash: result.currentHash,
      lastCheckedAt: now,
      lastChangeDetectedAt: now
    });

    return {
      id: monitor.id,
      url: monitor.url,
      changed: true,
      notified,
      summary,
      calendarUrl: result.calendarUrl
    };
  } catch (err) {
    console.error(`  ❌ Hata (${monitor.url}): ${err.message}`);
    return { id: monitor.id, url: monitor.url, changed: false, notified: false, error: err.message };
  }
}

/**
 * Runs all active monitors registered in the database.
 *
 * @returns {Promise<{ total: number, changed: number, notified: number, errors: number }>}
 */
export async function runAllMonitors() {
  console.log('\n========================================');
  console.log('⏰ Anımsatıcı Tarama Görevi Başlatıldı');
  console.log(`📅 Zaman: ${new Date().toLocaleString('tr-TR')}`);
  console.log('========================================\n');

  const activeMonitors = await db.getActiveMonitors();

  if (activeMonitors.length === 0) {
    console.log('ℹ️  Takip edilecek aktif web sitesi bulunamadı.');
    return { total: 0, changed: 0, notified: 0, errors: 0 };
  }

  console.log(`📋 Toplam ${activeMonitors.length} aktif site taranıyor...\n`);

  let changedCount = 0;
  let notifiedCount = 0;
  let errorCount = 0;

  // Siteleri kontrollü biçimde işle
  for (const monitor of activeMonitors) {
    const res = await runSingleMonitor(monitor);
    if (res.changed) changedCount++;
    if (res.notified) notifiedCount++;
    if (res.error) errorCount++;
  }

  console.log('\n========================================');
  console.log('🏁 Tarama Tamamlandı Özet Raporu:');
  console.log(`   Toplam Taranan: ${activeMonitors.length}`);
  console.log(`   Değişen: ${changedCount}`);
  console.log(`   Bildirilen: ${notifiedCount}`);
  console.log(`   Hatalı: ${errorCount}`);
  console.log('========================================\n');

  return {
    total: activeMonitors.length,
    changed: changedCount,
    notified: notifiedCount,
    errors: errorCount
  };
}

// Doğrudan terminalden çalıştırıldığında (`node src/runner.js`) tetikle
if (process.argv[1]?.endsWith('runner.js')) {
  runAllMonitors().catch(console.error);
}
