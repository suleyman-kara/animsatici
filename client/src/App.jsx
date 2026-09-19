import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import MonitorCard from './components/MonitorCard.jsx';
import AddMonitorModal from './components/AddMonitorModal.jsx';
import CheckResultModal from './components/CheckResultModal.jsx';
import CatalogView from './components/CatalogView.jsx';
import { auth, loginWithGoogle, logoutUser, onAuthStateChanged } from './firebase.js';
import { Radio, Layers, CheckCircle2, Bell, Plus, Loader2, Compass } from 'lucide-react';

export default function App() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [activeTab, setActiveTab] = useState('monitors');
  const [user, setUser] = useState(null);

  // Firebase Auth durumunu dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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

  async function handleLogin() {
    try {
      await loginWithGoogle();
    } catch (err) {
      alert('Giriş yapılamadı: ' + err.message);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Çıkış hatası:', err);
    }
  }

  function handleOpenAddModal(initialData = null) {
    setModalInitialData(initialData);
    setIsAddModalOpen(true);
  }

  function handleSubscribeFromCatalog(item) {
    handleOpenAddModal({
      title: item.title,
      url: item.url
    });
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
    setActiveTab('monitors');
  }

  const activeCount = monitors.filter((m) => m.isActive !== false).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header
        onOpenAddModal={() => handleOpenAddModal(null)}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1">
        
        {/* Sekme 1: Keşfet & Katalog */}
        {activeTab === 'catalog' ? (
          <CatalogView
            monitors={monitors}
            onSubscribe={handleSubscribeFromCatalog}
            userEmail={user?.email}
          />
        ) : (
          /* Sekme 2: Takiplerim */
          <div>
            {/* İstatistik & Bilgi Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Toplam Takip</p>
                  <p className="text-2xl font-black text-slate-900">{monitors.length}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Aktif Taranan</p>
                  <p className="text-2xl font-black text-slate-900">{activeCount}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Akıllı Tarama</p>
                  <p className="text-xs font-bold text-slate-800">Her Gün 21:00 (Periyodik)</p>
                </div>
              </div>
            </div>

            {/* Başlık ve Buton */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Takip Ettiğim Sayfalar</h2>
                <p className="text-xs text-slate-500">Yeni bir etkinlik veya tarih yakalandığında takvim linkiniz hazırlanır.</p>
              </div>
              <button
                onClick={() => setActiveTab('catalog')}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Compass className="w-3.5 h-3.5" /> Kataloğa Göz At
              </button>
            </div>

            {/* İçerik / Kartlar */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Takipler yükleniyor...</p>
              </div>
            ) : monitors.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto my-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Henüz Takip Eklenmedi</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  İster inzva, Coderspace gibi hazır fırsat kanallarından birini seçin, ister kendi üniversitenizin duyuru sayfasını ekleyin.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <Compass className="w-4 h-4" />
                    Katalogdan Fırsat Seç
                  </button>
                  <button
                    onClick={() => handleOpenAddModal(null)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Özel Link Ekle
                  </button>
                </div>
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
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-400">
          KampüsRadar © {new Date().getFullYear()} — Bilgisayar Mühendisliği & Fırsat Radarı
        </div>
      </footer>

      {/* Modallar */}
      <AddMonitorModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalInitialData(null);
        }}
        onAdded={handleAdded}
        user={user}
        initialData={modalInitialData}
      />

      <CheckResultModal
        result={checkResult}
        onClose={() => setCheckResult(null)}
      />
    </div>
  );
}
