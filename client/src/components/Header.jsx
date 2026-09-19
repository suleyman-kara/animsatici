import React from 'react';
import { Radio, Plus, Sparkles, LogOut, Compass, Layers } from 'lucide-react';

export default function Header({ 
  onOpenAddModal, 
  user, 
  onLogin, 
  onLogout,
  activeTab,
  onTabChange
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Logo & Marka */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">KampüsRadar</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  <Sparkles className="w-3 h-3 text-indigo-600" /> CENG & AI
                </span>
              </div>
              <p className="text-xs text-slate-500">Etkinlik, hackathon ve kampüs fırsatlarını Google Takvimine işler.</p>
            </div>
          </div>

          {/* Mobil Giriş/Profil Butonu */}
          <div className="md:hidden">
            {user ? (
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                title="Çıkış Yap"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg"
              >
                Giriş
              </button>
            )}
          </div>
        </div>

        {/* Sekmeler (Takiplerim vs Keşfet) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => onTabChange?.('monitors')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'monitors'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Takiplerim
          </button>
          <button
            onClick={() => onTabChange?.('catalog')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'catalog'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            Keşfet & Katalog
          </button>
        </div>

        {/* Sağ Butonlar & Profil */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Kullanıcı'}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500/30"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {(user.displayName || user.email || 'K').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left pr-1">
                <p className="text-xs font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-400 leading-none">Bağlı</p>
              </div>
              <button
                onClick={onLogout}
                title="Çıkış Yap"
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google ile Giriş
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Özel Takip Ekle
          </button>
        </div>

      </div>
    </header>
  );
}
