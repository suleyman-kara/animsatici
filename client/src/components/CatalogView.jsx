import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, ExternalLink, Check, Plus, Loader2, Send } from 'lucide-react';

export default function CatalogView({ monitors, onSubscribe, userEmail }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [suggestForm, setSuggestForm] = useState({ title: '', url: '', category: 'ceng' });
  const [suggestSuccess, setSuggestSuccess] = useState(false);

  useEffect(() => {
    fetchCatalog();
  }, []);

  async function fetchCatalog() {
    try {
      setLoading(true);
      const res = await fetch('/api/catalog');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Katalog yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSuggestSubmit(e) {
    e.preventDefault();
    if (!suggestForm.url.trim()) return;

    try {
      const res = await fetch('/api/catalog/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...suggestForm,
          suggestedBy: userEmail || 'anonymous'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuggestSuccess(true);
        setTimeout(() => {
          setSuggestSuccess(false);
          setSuggestModalOpen(false);
          setSuggestForm({ title: '', url: '', category: 'ceng' });
        }, 1800);
      }
    } catch (err) {
      alert('Öneri gönderilemedi: ' + err.message);
    }
  }

  const filteredItems = activeCategory === 'all' 
    ? items 
    : items.filter(i => i.category === activeCategory);

  const isTracked = (url) => monitors.some(m => m.url === url);

  return (
    <div className="space-y-6">
      
      {/* Üst Karşılama Başlığı */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
            <Compass className="w-3.5 h-3.5" /> Fırsat & Etkinlik Kataloğu
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            CENG ve Kariyer Radarı
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed mb-4">
            Türkiye'deki prestijli yazılım kampları, ödüllü hackathonlar ve üniversite duyuruları. 
            Tek tıkla takibe al, son başvuru tarihlerini Google Takvimine otomatik işleyelim.
          </p>
          <button
            onClick={() => setSuggestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Kendi Okulunu / Topluluğunu Öner
          </button>
        </div>
      </div>

      {/* Kategori Filtre Butonları */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeCategory === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ✨ Tümü ({items.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Katalog Kartları */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Katalog taranıyor...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const tracked = isTracked(item.url);
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl">
                      {item.icon || '📌'}
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">
                    {item.description}
                  </p>

                  {/* Etiketler */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-medium"
                  >
                    Siteye Git <ExternalLink className="w-3 h-3" />
                  </a>

                  {tracked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <Check className="w-3.5 h-3.5" /> Takip Ediliyor
                    </span>
                  ) : (
                    <button
                      onClick={() => onSubscribe(item)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-xs shadow-blue-500/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Takibe Al
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Topluluk Kanalı Öneri Modalı */}
      {suggestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Topluluk / Kampüs Kanalı Öner
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Kendi üniversite kulübünün veya takip edilmesini istediğin bir platformun linkini paylaş; aday havuzuna ekleyelim.
            </p>

            {suggestSuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">Öneriniz Aday Havuzuna Eklendi!</p>
                <p className="text-xs text-slate-500">Değerlendirme sonrası vitrinde yerini alacaktır.</p>
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kanal Başlığı / Adı</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: İTÜ Oyun Geliştirme Kulübü"
                    value={suggestForm.title}
                    onChange={(e) => setSuggestForm({ ...suggestForm, title: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Web Sayfası URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={suggestForm.url}
                    onChange={(e) => setSuggestForm({ ...suggestForm, url: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={suggestForm.category}
                    onChange={(e) => setSuggestForm({ ...suggestForm, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="ceng">💻 CENG & Kodlama</option>
                    <option value="career">🏢 Şirket & Kariyer</option>
                    <option value="campus">🎓 Üniversite & SKS</option>
                    <option value="community">🌐 Topluluk & Etkinlik</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setSuggestModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Öner
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
