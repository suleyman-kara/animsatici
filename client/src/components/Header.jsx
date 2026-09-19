import React from 'react';
import { Bell, Plus, Sparkles } from 'lucide-react';

export default function Header({ onOpenAddModal }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Anımsatıcı</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-600" /> Gemini 3.6 AI
              </span>
            </div>
            <p className="text-xs text-slate-500">Siteleri senin yerine izler, duyuruları Google Takvimine işler.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Takip Ekle
          </button>
        </div>
      </div>
    </header>
  );
}
