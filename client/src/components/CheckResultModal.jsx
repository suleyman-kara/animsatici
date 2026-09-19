import React from 'react';
import { X, CheckCircle, Info, Calendar, ExternalLink, Sparkles, FlaskConical } from 'lucide-react';

export default function CheckResultModal({ result, onClose, onSimulate }) {
  if (!result) return null;

  const { changed, summary, calendarUrl, url, error, simulated, monitor } = result;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {error ? (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            ) : changed ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            )}
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {error
                ? 'Tarama Hatası'
                : changed
                ? 'Değişiklik Tespit Edildi!'
                : 'Değişiklik Bulunamadı'}
              {simulated && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  🧪 Test Simülasyonu
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <p className="font-semibold mb-1">Siteye erişilirken hata oluştu:</p>
              <p>{error}</p>
            </div>
          ) : changed ? (
            <>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <p className="font-semibold">
                    {simulated
                      ? 'Sayfada yeni bir duyuru simüle edildi ve Gemini analizi çalıştı.'
                      : 'Sayfadaki içerik güncellendi.'}
                  </p>
                  <p className="mt-0.5 text-emerald-700">
                    {simulated
                      ? 'Yapay zeka metni inceledi, tarihi ayıkladı ve Google Takvim bağlantısını oluşturdu.'
                      : 'Yeni parmak izi (hash) kaydedildi ve e-posta bildirimi tetiklendi.'}
                  </p>
                </div>
              </div>

              {summary && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Gemini 3.6 Flash Yapay Zeka Özeti:
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed">{summary}</p>
                </div>
              )}

              {calendarUrl && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-2">
                  <div className="text-xs font-semibold text-blue-900 flex items-center justify-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Etkinlik / Son Tarih Yakalandı!
                  </div>
                  <p className="text-xs text-blue-700">
                    Tek bir tıkla kendi Google Takviminize kaydedebilirsiniz:
                  </p>
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-all mt-1"
                  >
                    📅 Google Takvim'e Ekle
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
              <Info className="w-7 h-7 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Sayfada Yeni Bir Değişiklik Yok</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Son taranan içerik ile güncel içerik birebir aynı. Gerçek bir değişim olmadığı için gereksiz yapay zeka maliyeti ve mail gürültüsü oluşmadı ($0 maliyet).
                </p>
              </div>

              {monitor && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-[11px] text-slate-600 mb-2">
                    Yapay zekanın bu sayfada yeni bir duyuru çıktığında nasıl özet çıkardığını ve takvim butonu ürettiğini görmek ister misiniz?
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      if (onSimulate) onSimulate(monitor, true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    Bu Sayfada Değişim Simüle Et
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
