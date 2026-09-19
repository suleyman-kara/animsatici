import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  fetchPageContent,
  computeHash,
  hasChanged,
  analyzeChangeWithAI,
  generateGoogleCalendarUrl
} from './core/index.js';

function getDb() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getFirestore();
}

/**
 * 1. Merkezi KampüsRadar Tarayıcısı (Central Radar Scanner)
 * Varsayılan: Her gün 19:00'da (Türkiye Saati: Europe/Istanbul) çalışır.
 * Sıklık ve saat system_settings/scheduler belgesi üzerinden dinamik kontrol edilebilir.
 */
export const centralRadarScanner = onSchedule(
  {
    schedule: '0 19 * * *',
    timeZone: 'Europe/Istanbul',
    timeoutSeconds: 300,
    memory: '512MiB'
  },
  async (event) => {
    console.log('🚀 [KampüsRadar] Merkezi Fırsat ve Duyuru Taraması Başladı (19:00)...');

    try {
      const db = getDb();
      // 1. Aktif kaynakları çek
      const sourcesSnapshot = await db.collection('sources').where('isActive', '!=', false).get();
      if (sourcesSnapshot.empty) {
        console.log('ℹ️ Taranacak aktif kaynak bulunamadı.');
        return;
      }

      console.log(`📋 Toplam ${sourcesSnapshot.size} aktif kaynak taranıyor...`);

      for (const doc of sourcesSnapshot.docs) {
        const source = doc.data();
        const sourceId = doc.id;

        try {
          console.log(`🔍 Taranıyor: ${source.title} (${source.url})`);
          const page = await fetchPageContent(source.url);
          const currentHash = computeHash(page.text);

          const changed = hasChanged(source.lastContentHash, currentHash);

          if (!changed) {
            console.log(`  ⚪ Değişiklik yok: ${source.title}`);
            await doc.ref.update({
              lastCheckedAt: new Date().toISOString()
            });
            continue;
          }

          console.log(`  🔔 Değişiklik tespit edildi! Gemini 3.6 Flash analizi başlatılıyor...`);

          const aiResult = await analyzeChangeWithAI({
            newText: page.text,
            oldText: source.lastCleanText || '',
            pageTitle: source.title || page.title,
            url: source.url,
            apiKey: process.env.GEMINI_API_KEY
          });

          if (!aiResult.hasSignificantChange) {
            console.log(`  💤 Önemsiz teknik değişiklik (sayaç/reklam vb.), bildirim atlanıyor.`);
            await doc.ref.update({
              lastContentHash: currentHash,
              lastCheckedAt: new Date().toISOString()
            });
            continue;
          }

          // Google Takvim bağlantısı üret
          let calendarUrl = null;
          if (aiResult.hasEvent && aiResult.eventDetails?.startDate) {
            calendarUrl = generateGoogleCalendarUrl({
              title: aiResult.eventDetails.title || source.title,
              startDate: aiResult.eventDetails.startDate,
              endDate: aiResult.eventDetails.endDate,
              isAllDay: aiResult.eventDetails.isAllDay,
              details: aiResult.changeSummary,
              location: source.url
            });
          }

          // Yeni fırsatı merkezi "opportunities" koleksiyonuna ekle
          const oppRef = await db.collection('opportunities').add({
            sourceId,
            sourceTitle: source.title,
            sourceUrl: source.url,
            category: source.category || 'general',
            summary: aiResult.changeSummary,
            hasEvent: aiResult.hasEvent,
            eventDetails: aiResult.eventDetails || null,
            calendarUrl,
            detectedAt: new Date().toISOString(),
            createdAt: FieldValue.serverTimestamp()
          });

          console.log(`  ✅ Yeni fırsat kaydedildi! ID: ${oppRef.id}`);

          // Kaynak durumunu güncelle
          await doc.ref.update({
            lastContentHash: currentHash,
            lastCleanText: page.text.slice(0, 3000),
            lastSummary: aiResult.changeSummary,
            lastCheckedAt: new Date().toISOString()
          });

        } catch (sourceErr) {
          console.error(`  ❌ Hata (${source.title}):`, sourceErr.message);
        }
      }

      console.log('🎉 [KampüsRadar] Merkezi tarama döngüsü tamamlandı.');
    } catch (err) {
      console.error('Merkezi tarama genel hatası:', err);
    }
  }
);

/**
 * 2. Anlık Kaynak Kontrolü (Callable Function)
 * Flutter veya Web istemcisi "Şimdi Kontrol Et" dediğinde anında çalışır.
 */
export const checkSourceNow = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB'
  },
  async (request) => {
    const { url, title, oldText } = request.data || {};
    if (!url) {
      throw new HttpsError('invalid-argument', 'URL adresi zorunludur.');
    }

    try {
      const page = await fetchPageContent(url);
      const currentHash = computeHash(page.text);

      const aiResult = await analyzeChangeWithAI({
        newText: page.text,
        oldText: oldText || '',
        pageTitle: title || page.title,
        url,
        apiKey: process.env.GEMINI_API_KEY
      });

      let calendarUrl = null;
      if (aiResult.hasEvent && aiResult.eventDetails?.startDate) {
        calendarUrl = generateGoogleCalendarUrl({
          title: aiResult.eventDetails.title || title || 'Fırsat Etkinliği',
          startDate: aiResult.eventDetails.startDate,
          endDate: aiResult.eventDetails.endDate,
          isAllDay: aiResult.eventDetails.isAllDay,
          details: aiResult.changeSummary,
          location: url
        });
      }

      return {
        success: true,
        title: title || page.title,
        hash: currentHash,
        summary: aiResult.changeSummary,
        hasSignificantChange: aiResult.hasSignificantChange,
        hasEvent: aiResult.hasEvent,
        eventDetails: aiResult.eventDetails,
        calendarUrl,
        checkedAt: new Date().toISOString()
      };
    } catch (err) {
      throw new HttpsError('internal', err.message);
    }
  }
);
