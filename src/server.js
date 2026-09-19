import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import 'dotenv/config';
import { db } from './adapters/dbAdapter.js';
import { runSingleMonitor } from './runner.js';
import { fetchPageContent, computeHash } from './core/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const CATALOG_PATH = path.join(process.cwd(), 'data', 'catalog.json');

function getCatalogData() {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Katalog okunurken hata:', err.message);
  }
  return { featuredCategories: [], items: [], candidatePool: [] };
}

function saveCatalogData(data) {
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Sağlık kontrolü
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Küratörlü Takip Kataloğu (Keşfet)
app.get('/api/catalog', (req, res) => {
  try {
    const { category } = req.query;
    const catalog = getCatalogData();
    let items = catalog.items || [];
    if (category && category !== 'all') {
      items = items.filter(item => item.category === category);
    }
    res.json({
      success: true,
      categories: catalog.featuredCategories || [],
      items,
      total: items.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Aday Havuzuna Yeni Kanal Öner (Kendi Kendini Büyüten Topluluk Motoru)
app.post('/api/catalog/suggest', (req, res) => {
  try {
    const { title, url, category, description, suggestedBy } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'Kanal URL adresi zorunludur.' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: 'Geçersiz URL formatı.' });
    }

    const catalog = getCatalogData();
    catalog.candidatePool = catalog.candidatePool || [];

    const existing = catalog.candidatePool.find(c => c.url === url.trim());
    if (existing) {
      existing.votes = (existing.votes || 1) + 1;
      existing.lastSuggestedAt = new Date().toISOString();
    } else {
      catalog.candidatePool.push({
        id: 'candidate_' + Date.now(),
        title: title?.trim() || 'Önerilen Takip',
        url: url.trim(),
        category: category || 'general',
        description: description?.trim() || '',
        votes: 1,
        suggestedBy: suggestedBy || 'anonymous',
        createdAt: new Date().toISOString(),
        status: 'pending_review'
      });
    }

    saveCatalogData(catalog);
    res.status(201).json({ success: true, message: 'Kanal öneriniz aday havuzuna eklendi.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Monitörleri listele (Opsiyonel userId filtreli)
app.get('/api/monitors', async (req, res) => {
  try {
    const { userId } = req.query;
    const monitors = await db.getAllMonitors(userId || null);
    res.json({ success: true, monitors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Yeni monitör ekle
app.post('/api/monitors', async (req, res) => {
  try {
    const { title, url, userEmail, userId } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'Web sitesi URL adresi zorunludur.' });
    }
    if (!userEmail || !userEmail.trim()) {
      return res.status(400).json({ success: false, error: 'Bildirim e-posta adresi zorunludur.' });
    }

    // URL formatı kontrolü
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: 'Geçersiz URL formatı. Lütfen http:// veya https:// ile başlayın.' });
    }

    const monitor = await db.addMonitor({
      title: title?.trim() || 'Yeni Takip Sayfası',
      url: url.trim(),
      userEmail: userEmail.trim(),
      userId: userId?.trim() || 'default_user'
    });

    // İlk eklemede başlangıç hash'ini arka planda al
    fetchPageContent(monitor.url)
      .then(page => {
        const initialHash = computeHash(page.text);
        return db.updateMonitor(monitor.id, {
          title: title?.trim() || page.title || 'Takip Edilen Sayfa',
          lastContentHash: initialHash,
          lastCheckedAt: new Date().toISOString()
        });
      })
      .catch(err => {
        console.warn(`[Başlangıç Taraması Uyarısı] ${monitor.url}:`, err.message);
      });

    res.status(201).json({ success: true, monitor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Monitörü sil
app.delete('/api/monitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteMonitor(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Monitör bulunamadı.' });
    }
    res.json({ success: true, message: 'Monitör silindi.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// "Şimdi Kontrol Et" - Tekil Monitör Testi / Manuel Tetikleme
app.post('/api/monitors/:id/check', async (req, res) => {
  try {
    const { id } = req.params;
    const { simulateChange } = req.body || {};
    const monitor = await db.getMonitorById(id);
    if (!monitor) {
      return res.status(404).json({ success: false, error: 'Monitör bulunamadı.' });
    }

    const result = await runSingleMonitor(monitor, { simulateChange: Boolean(simulateChange) });
    const updatedMonitor = await db.getMonitorById(id);

    res.json({
      success: true,
      result,
      monitor: updatedMonitor
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// İstemci (Client) statik dosyalarını sun (Build edilmişse)
const clientDist = path.resolve(process.cwd(), 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Sunucuyu başlat
export const server = app.listen(PORT, () => {
  console.log(`🌐 Anımsatıcı API Sunucusu http://localhost:${PORT} üzerinde çalışıyor.`);
});

export default app;
