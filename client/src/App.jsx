import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import MonitorCard from './components/MonitorCard.jsx';
import AddMonitorModal from './components/AddMonitorModal.jsx';
import CheckResultModal from './components/CheckResultModal.jsx';
import { Bell, Layers, CheckCircle2, AlertCircle, Plus, Loader2 } from 'lucide-react';

export default function App() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    fetchMonitors();
  }, []);

  async function fetchMonitors() {
    try {
      setLoading(true);
      const res = await fetch('/api/monitors');
      const data = await res.json();
      if (data.success) {
        setMonitors(data.monitors || []);
      }
    } catch (err) {
      console.error('Monitörler yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck(monitor) {
    setCheckingId(monitor.id);
    try {
      const res = await fetch(`/api/monitors/${monitor.id}/check`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.success) {
        setCheckResult({
          changed: data.result?.changed,
          summary: data.result?.summary || data.monitor?.lastSummary,
          calendarUrl: data.result?.calendarUrl,
          url: monitor.url,
          error: data.result?.error
        });

        // Listeyi güncelle
        if (data.monitor) {
          setMonitors((prev) =>
            prev.map((m) => (m.id === data.monitor.id ? data.monitor : m))
          );
        }
      }
    } catch (err) {
      setCheckResult({
        changed: false,
        error: err.message,
        url: monitor.url
      });
    } finally {
      setCheckingId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Bu sayfayı takipten çıkarmak istediğinize emin misiniz?')) {
      return;
    }

    try {
      const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMonitors((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      alert('Silme sırasında hata oluştu: ' + err.message);
    }
  }

  function handleAdded(newMonitor) {
    setMonitors((prev) => [newMonitor, ...prev]);
  }

  const activeCount = monitors.filter((m) => m.isActive !== false).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header onOpenAddModal={() => setIsAddModalOpen(true)} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        
        {/* İstatistik & Bilgi Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Toplam Takip</p>
              <p className="text-xl font-bold text-slate-900">{monitors.length}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Aktif Taranan</p>
              <p className="text-xl font-bold text-slate-900">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Otomatik Tarama</p>
              <p className="text-sm font-semibold text-slate-800">Her Akşam 21:00</p>
            </div>
          </div>
        </div>

        {/* Başlık ve Buton */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Kayıtlı Web Siteleri</h2>
            <p className="text-xs text-slate-500">Değişiklik olduğunda özet ve takvim bağlantısı mailinize iletilir.</p>
          </div>
        </div>

        {/* İçerik / Kartlar */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Takipler yükleniyor...</p>
          </div>
        ) : monitors.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-lg mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Henüz Takip Eklenmedi</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Üniversite duyuruları, konser biletleri veya vize randevusu gibi kritik web sitelerini ekleyin; değişiklikleri sizin yerinize takip edip takviminize işleyelim.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              İlk Takibinizi Ekleyin
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {monitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onCheck={handleCheck}
                onDelete={handleDelete}
                isChecking={checkingId === monitor.id}
              />
            ))}
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-400">
          Anımsatıcı © {new Date().getFullYear()} — Akıllı Web Takip ve Google Takvim Asistanı
        </div>
      </footer>

      {/* Modallar */}
      <AddMonitorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={handleAdded}
      />

      <CheckResultModal
        result={checkResult}
        onClose={() => setCheckResult(null)}
      />
    </div>
  );
}
