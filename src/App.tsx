import { useState, ReactNode, FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { processNewsBatch, generateNews, ProcessedNews } from './services/gemini';
import { 
  FileEdit,
  Sparkles,
  Zap,
  Loader2,
  Trash2,
  ChevronRight,
  Copy,
  Check,
  Newspaper,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Info
} from 'lucide-react';

export default function App() {
  const [input, setInput] = useState('');
  const [generateInput, setGenerateInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [processMode, setProcessMode] = useState<'meta' | 'full'>('meta');
  
  const [activeResults, setActiveResults] = useState<ProcessedNews[]>([]);
  const [activeGenerated, setActiveGenerated] = useState<ProcessedNews[]>([]);
  
  const [currentView, setCurrentView] = useState<'change' | 'generate' | 'contact'>('change');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleProcess = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const data = await processNewsBatch(input, processMode);
      const newsWithIds = data.map((item, idx) => ({ ...item, id: `NEWS_P_${Date.now()}_${idx}` }));
      setActiveResults(newsWithIds);
      setCurrentView('change');
    } catch (error: any) {
      alert(error.message || 'Haberler işlenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!generateInput.trim()) return;
    setLoading(true);
    try {
      const data = await generateNews(generateInput);
      const newsWithIds = data.map((item, idx) => ({ ...item, id: `NEWS_G_${Date.now()}_${idx}` }));
      setActiveGenerated(newsWithIds);
      setCurrentView('generate');
    } catch (error: any) {
      alert(error.message || 'Haber üretilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (news: ProcessedNews) => {
    const text = `${news.formattedHeadline.toLocaleUpperCase('tr-TR')}\n\n${news.spot}\n\n${news.content}`;
    navigator.clipboard.writeText(text);
    setCopiedId(news.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar - Hidden on mobile, sticky on desktop */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 pb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Newspaper className="text-white" size={20} />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 tracking-tighter uppercase">Manşet AI</div>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Editör Paneli</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase px-3 py-2 tracking-widest mb-1">ARAÇLAR</div>
            <div className="space-y-1">
              <button 
                onClick={() => setCurrentView('change')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all transform active:scale-[0.98] ${
                  currentView === 'change' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-indigo-600 active:bg-indigo-50'
                }`}
              >
                <FileEdit size={18} />
                <span>Haber Düzenle</span>
              </button>
              <button 
                onClick={() => setCurrentView('generate')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all transform active:scale-[0.98] ${
                  currentView === 'generate' 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' 
                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-emerald-600 active:bg-emerald-50'
                }`}
              >
                <Sparkles size={18} />
                <span>Yeni Haber Üret</span>
              </button>
              <button 
                onClick={() => setCurrentView('contact')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all transform active:scale-[0.98] ${
                  currentView === 'contact' 
                    ? 'bg-slate-800 text-white shadow-md shadow-slate-100' 
                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 active:bg-slate-100'
                }`}
              >
                <MessageSquare size={18} />
                <span>İletişim</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="px-4 py-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <LayoutDashboard size={12} /> HIZLI İSTATİSTİK
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">DÜZENLENEN</p>
                  <p className="text-sm font-black text-indigo-600">{activeResults.length}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">ÜRETİLEN</p>
                  <p className="text-sm font-black text-emerald-600">{activeGenerated.length}</p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 italic text-[10px] text-slate-400 text-center font-medium">
          Manşet AI v2.0.0 • Local Engine
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative pb-16 md:pb-0">
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="md:hidden w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Newspaper className="text-white" size={16} />
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm font-medium text-slate-400">Mod:</span>
              <span className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                {currentView === 'change' ? (
                  <>
                    <FileEdit size={16} className="text-indigo-600" />
                    Haber Düzenleme
                  </>
                ) : currentView === 'generate' ? (
                  <>
                    <Sparkles size={16} className="text-emerald-600" />
                    Yapay Zeka Üretimi
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} className="text-slate-600" />
                    İletişim & Geri Bildirim
                  </>
                )}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {currentView === 'change' && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setProcessMode('meta')}
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${processMode === 'meta' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Meta
                </button>
                <button 
                  onClick={() => setProcessMode('full')}
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${processMode === 'full' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Tam
                </button>
              </div>
            )}

            <button 
              onClick={() => {
                if (currentView === 'change') setInput('');
                else setGenerateInput('');
              }}
              className="p-2 md:p-2.5 bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
              title="Girişi Temizle"
            >
              <Trash2 size={18} className="md:w-5 md:h-5" />
            </button>
            <button 
              onClick={currentView === 'change' ? handleProcess : handleGenerate}
              disabled={loading || (currentView === 'change' ? !input.trim() : !generateInput.trim())}
              className={`px-3 md:px-6 py-2 md:py-2.5 text-white text-[11px] md:text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 transform active:scale-[0.97] ${
                currentView === 'change' 
                  ? 'bg-indigo-600 shadow-indigo-100/50 hover:bg-indigo-700 active:bg-indigo-800' 
                  : 'bg-emerald-600 shadow-emerald-100/50 hover:bg-emerald-700 active:bg-emerald-800'
              } disabled:bg-slate-200 disabled:shadow-none disabled:active:scale-100`}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              <span className="hidden sm:inline">{loading ? 'İşleniyor...' : currentView === 'change' ? 'Editörü Başlat' : 'Haberi Üret'}</span>
              <span className="sm:hidden">{loading ? '...' : currentView === 'change' ? 'Başlat' : 'Üret'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 md:p-8">
          <AnimatePresence mode="wait">
            {currentView === 'change' ? (
              <motion.div 
                key="change"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-6 lg:h-full lg:overflow-hidden"
              >
                {/* Info Panel for News Editing Mode */}
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={processMode}
                  className={`px-6 py-4 rounded-2xl border flex items-center gap-4 ${
                    processMode === 'meta' 
                      ? 'bg-blue-50/50 border-blue-100 text-blue-700' 
                      : 'bg-indigo-50/50 border-indigo-100 text-indigo-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    processMode === 'meta' ? 'bg-blue-100' : 'bg-indigo-100'
                  }`}>
                    <Info size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest mb-0.5">
                      {processMode === 'meta' ? 'Sadece Meta Modu Aktif' : 'Tam İçerik Modu Aktif'}
                    </h4>
                    <p className="text-[11px] font-medium opacity-80">
                      {processMode === 'meta' 
                        ? 'Bu modda orijinal haber metniniz korunur. AI sadece yeni başlık, ilgi çekici spot ve metni bölen ara başlıklar üretir.' 
                        : 'Bu modda haberiniz AI tarafından tamamen baştan yazılır. Daha akıcı, profesyonel ve özgün bir anlatım sunar.'}
                    </p>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 flex-1 overflow-visible lg:overflow-hidden">
                  <div className="flex flex-col gap-4 h-[400px] lg:h-full lg:overflow-hidden">
                    <div className="px-1">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Değiştirilecek Haberler</h3>
                    </div>
                    <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Birden fazla haber metnini buraya yapıştırabilirsiniz..."
                        className="flex-1 p-6 md:p-8 text-sm text-slate-600 leading-relaxed font-mono outline-none resize-none placeholder:text-slate-300 custom-scroll border-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 h-auto lg:h-full lg:overflow-hidden">
                    <div className="px-1">
                      <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">İşlenen Versiyonlar</h3>
                    </div>
                    <div className="flex-1 bg-indigo-50/10 rounded-3xl border border-indigo-100/50 shadow-inner lg:overflow-hidden flex flex-col">
                      <div className="flex-1 lg:overflow-y-auto custom-scroll p-4 md:p-8 space-y-6 md:y-8">
                        {activeResults.length > 0 ? (
                          activeResults.map((news) => (
                            <ResultCard key={news.id} news={news} copyToClipboard={copyToClipboard} copiedId={copiedId} toggleExpand={toggleExpand} expandedIds={expandedIds} />
                          ))
                        ) : (
                          <EmptyState icon={<FileEdit size={32} />} title="Haber Bekleniyor" desc="Metinleri sol panele ekleyerek işleme başlayın. AI haberlerinizi profesyonelce düzenleyecektir." />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : currentView === 'generate' ? (
              <motion.div 
                key="generate"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:h-full overflow-visible lg:overflow-hidden"
              >
                <div className="flex flex-col gap-4 h-[300px] lg:h-full lg:overflow-hidden">
                  <div className="px-1">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Haber Konusu / Detay</h3>
                  </div>
                  <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                    <textarea
                      value={generateInput}
                      onChange={(e) => setGenerateInput(e.target.value)}
                      placeholder="Haber konusunu veya anahtar kelimeleri buraya yazın..."
                      className="flex-1 p-6 md:p-8 text-sm text-slate-600 leading-relaxed font-mono outline-none resize-none placeholder:text-slate-300 custom-scroll border-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 h-auto lg:h-full lg:overflow-hidden">
                  <div className="px-1">
                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Sizin İçin Üretilen</h3>
                  </div>
                  <div className="flex-1 bg-emerald-50/10 rounded-3xl border border-emerald-100/50 shadow-inner lg:overflow-hidden flex flex-col">
                    <div className="flex-1 lg:overflow-y-auto custom-scroll p-4 md:p-8 space-y-6 md:y-8">
                      {activeGenerated.length > 0 ? (
                        activeGenerated.map((news) => (
                          <ResultCard key={news.id} news={news} copyToClipboard={copyToClipboard} copiedId={copiedId} toggleExpand={toggleExpand} expandedIds={expandedIds} color="emerald" />
                        ))
                      ) : (
                        <EmptyState icon={<Sparkles size={32} />} title="Prompt Bekleniyor" desc="Bir konu yazın ve Yapay Zeka'nın sizin için kapsamlı ve profesyonel bir haber üretmesini bekleyin." />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="contact"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex items-center justify-center"
              >
                <div className="max-w-4xl w-full bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col md:flex-row">
                  <div className="bg-slate-900 p-8 md:p-12 text-white md:w-5/12 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 md:mb-8 backdrop-blur-xl border border-white/10">
                        <MessageSquare className="text-white" size={20} />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-4 leading-tight">Bize Ulaşın</h2>
                      <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed">
                        Manşet AI deneyiminizi geliştirmek için her türlü geri bildirime açığız.
                      </p>
                    </div>
                    <div className="relative z-10 mt-8 md:mt-12">
                      <div className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors cursor-pointer group mb-4">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                          <Mail size={14} />
                        </div>
                        <span className="text-[10px] md:text-xs font-bold tracking-wider break-all">samettbuyuk@gmail.com</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-8 md:p-12 md:w-7/12 bg-white flex flex-col justify-center">
                    <div className="space-y-6 md:y-8">
                      <div className="space-y-2">
                        <h3 className="text-lg md:text-xl font-bold text-slate-900">Geri Bildirimleriniz Değerli</h3>
                        <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                          Uygulamada gördüğünüz eksiklikleri, hataları veya yeni özellik önerilerinizi bize iletebilirsiniz.
                        </p>
                      </div>
                      
                      <div className="space-y-4 md:y-6">
                        <div className="flex items-start gap-4 p-4 md:p-5 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                            <Sparkles className="text-indigo-600" size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs md:text-sm font-bold text-slate-800 mb-0.5 md:mb-1 tracking-tight">Yeni Özellikler</h4>
                            <p className="text-[10px] text-slate-500 font-medium">Hangi araçları burada görmek istersiniz?</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 md:p-5 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                            <Trash2 className="text-red-500" size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs md:text-sm font-bold text-slate-800 mb-0.5 md:mb-1 tracking-tight">Hata Bildirimi</h4>
                            <p className="text-[10px] text-slate-500 font-medium">İşleyişte bir sorun mu fark ettiniz?</p>
                          </div>
                        </div>
                      </div>
                      
                      <a 
                        href="mailto:samettbuyuk@gmail.com"
                        className="w-full h-12 md:h-14 bg-indigo-600 text-white rounded-2xl font-black text-[11px] md:text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                      >
                        <Mail size={16} />
                        E-Posta Gönder
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Nav for Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 h-16 flex items-center justify-between z-30 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
          <button 
            onClick={() => setCurrentView('change')}
            className={`flex flex-col items-center gap-1 transition-all ${currentView === 'change' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <FileEdit size={20} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Düzenle</span>
          </button>
          <button 
            onClick={() => setCurrentView('generate')}
            className={`flex flex-col items-center gap-1 transition-all ${currentView === 'generate' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <Sparkles size={20} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Üret</span>
          </button>
          <button 
            onClick={() => setCurrentView('contact')}
            className={`flex flex-col items-center gap-1 transition-all ${currentView === 'contact' ? 'text-slate-800' : 'text-slate-400'}`}
          >
            <MessageSquare size={20} />
            <span className="text-[9px] font-black uppercase tracking-tighter">İletişim</span>
          </button>
        </nav>

        <footer className="hidden md:flex h-10 bg-white border-t border-slate-200 px-8 items-center justify-between text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] shrink-0">
          <div>GİZLİLİK MODU: VERİLER SAKLANMAZ</div>
          <div className="flex gap-6">
            <span>Powered by Google Gemini</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

const ResultCard: FC<ResultCardProps> = ({ news, copyToClipboard, copiedId, toggleExpand, expandedIds, color = 'indigo' }) => {
  const isIndigo = color === 'indigo';
  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-2xl border ${isIndigo ? 'border-indigo-100 hover:border-indigo-200' : 'border-emerald-100 hover:border-emerald-200'} shadow-sm p-6 space-y-6 group transition-all`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1 flex-1">
          <span className={`text-[10px] font-black ${isIndigo ? 'text-indigo-400' : 'text-emerald-400'} uppercase tracking-widest`}>ÖNERİLEN BAŞLIK</span>
          <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
            {news.formattedHeadline}
          </h2>
          {news.originalHeadline && news.originalHeadline !== "" && (
            <p className="text-[10px] text-slate-400 italic font-medium">Kaynak Odaklı: {news.originalHeadline.substring(0, 80)}...</p>
          )}
        </div>
        <button
          onClick={() => copyToClipboard(news)}
          className={`p-2.5 rounded-xl transition-all border shrink-0 active:scale-90 ${
            copiedId === news.id 
              ? 'bg-emerald-500 text-white border-emerald-500' 
              : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
        >
          {copiedId === news.id ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>

      <div className={`p-4 ${isIndigo ? 'bg-indigo-50/50 border-indigo-100/50' : 'bg-emerald-50/50 border-emerald-100/50'} border rounded-xl space-y-1`}>
        <span className={`text-[10px] font-black ${isIndigo ? 'text-indigo-400' : 'text-emerald-400'} uppercase tracking-widest`}>SPOT / ÖZET</span>
        <p className="text-sm text-slate-700 leading-relaxed font-semibold italic">
          {news.spot}
        </p>
      </div>

      <div className="space-y-4">
        <motion.div 
          initial={false}
          animate={{ height: expandedIds.has(news.id) ? 'auto' : '3.5rem' }}
          className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap overflow-hidden relative"
        >
          {news.content}
          {!expandedIds.has(news.id) && (
            <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent" />
          )}
        </motion.div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-50">
        <button 
          onClick={() => toggleExpand(news.id)}
          className={`text-[10px] font-bold ${isIndigo ? 'text-indigo-600 hover:text-indigo-700' : 'text-emerald-600 hover:text-emerald-700'} flex items-center gap-1 uppercase tracking-widest transition-all active:scale-95`}
        >
          {expandedIds.has(news.id) ? 'Kısalt' : 'Haberin Tamamı'} 
          <ChevronRight size={14} className={`transition-transform ${expandedIds.has(news.id) ? 'rotate-90' : ''}`} />
        </button>
      </div>
    </motion.article>
  );
};

interface ResultCardProps {
  news: ProcessedNews;
  copyToClipboard: (n: ProcessedNews) => void;
  copiedId: string | null;
  toggleExpand: (id: string) => void;
  expandedIds: Set<string>;
  color?: 'indigo' | 'emerald';
}

function EmptyState({ icon, title, desc }: { icon: ReactNode, title: string, desc: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-12">
       <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 text-slate-300">
         {icon}
       </div>
       <h3 className="text-slate-400 font-semibold mb-2 uppercase tracking-widest text-xs">{title}</h3>
       <p className="text-slate-300 text-[11px] max-w-[280px] leading-relaxed">{desc}</p>
    </div>
  );
}
