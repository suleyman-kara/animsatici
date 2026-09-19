import React from 'react';
import { Globe, Mail, Clock, RefreshCw, Trash2, ExternalLink, Sparkles } from 'lucide-react';

export default function MonitorCard({ monitor, onCheck, onDelete, isChecking }) {
  const formatDate = (isoString) => {
    if (!isoString) return 'Henüz taranmadı';
    const d = new Date(isoString);
    return d.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-1">
            {monitor.title || 'Takip Edilen Sayfa'}
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Aktif
          </span>
        </div>

        <a
          href={monitor.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline break-all mb-3"
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="line-clamp-1">{monitor.url}</span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
        </a>

        <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{monitor.userEmail}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Son Kontrol: {formatDate(monitor.lastCheckedAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCheck(monitor, false)}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            title="Web sayfasını canlı olarak tara"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-blue-600' : ''}`} />
            {isChecking ? 'Taranıyor...' : 'Kontrol Et'}
          </button>

          <button
            onClick={() => onCheck(monitor, true)}
            disabled={isChecking}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            title="Sayfada yeni bir duyuru çıkmış gibi simüle et ve takvim linkini test et"
          >
            <span>🧪</span>
            <span>Simüle Et</span>
          </button>
        </div>

        <button
          onClick={() => onDelete(monitor.id)}
          title="Takibi Sil"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
