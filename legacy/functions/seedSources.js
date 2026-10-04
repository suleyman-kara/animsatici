import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

initializeApp({
  projectId: 'kampus-radar'
});
const db = getFirestore();

async function seed() {
  const catalogPath = path.resolve(process.cwd(), '..', 'data', 'catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.log('Katalog dosyası bulunamadı:', catalogPath);
    return;
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  console.log(`Seeding ${catalog.items.length} sources to Firestore 'sources' collection...`);

  for (const item of catalog.items) {
    const docRef = db.collection('sources').doc(item.id);
    await docRef.set({
      title: item.title,
      url: item.url,
      category: item.category,
      description: item.description,
      tags: item.tags || [],
      isActive: true,
      lastContentHash: '',
      lastCheckedAt: null,
      lastSummary: null
    }, { merge: true });
    console.log(`  ✅ Kaynak eklendi: ${item.title}`);
  }

  // Sistem zamanlama ayarı (Varsayılan 19:00)
  await db.collection('system_settings').doc('scheduler').set({
    scheduledHour: 19,
    timezone: 'Europe/Istanbul',
    frequency: 'daily',
    description: 'Merkezi fırsat ve duyuru tarama zamanlaması (Her gün 19:00)',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log('🎉 Tüm merkezi kaynaklar ve sistem ayarı Firestore\'a aktarıldı!');
}

seed().catch(console.error);
