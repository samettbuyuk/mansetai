import { useState, useEffect, ReactNode, FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { processNewsBatch, generateNews, ProcessedNews } from './services/gemini';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { saveUser, saveNewsHistory, getNewsHistory, getNextId, deleteNewsItem, clearNewsHistory } from './services/database';
import { 
  FileEdit,
  History,
  Sparkles,
  BookOpen,
  LayoutDashboard,
  Zap,
  Loader2,
  Trash2,
  ChevronRight,
  Copy,
  Check,
  Newspaper,
  UserCircle,
  LogIn,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [input, setInput] = useState('');
  const [generateInput, setGenerateInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [processMode, setProcessMode] = useState<'meta' | 'full'>('meta');
  
  const [activeResults, setActiveResults] = useState<ProcessedNews[]>([]);
  const [activeGenerated, setActiveGenerated] = useState<ProcessedNews[]>([]);
  
  const [history, setHistory] = useState<{date: string, news: ProcessedNews[]}[]>([]);
  const [generateHistory, setGenerateHistory] = useState<{date: string, news: ProcessedNews[]}[]>([]);
  
  const [currentView, setCurrentView] = useState<'change_active' | 'change_history' | 'generate_active' | 'generate_history'>('change_active');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        saveUser({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL
        });
        syncHistory(u.uid);
      } else {
        setHistory([]);
        setGenerateHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const syncHistory = async (uid: string) => {
    const changed = await getNewsHistory(uid, 'history_changed');
    const generated = await getNewsHistory(uid, 'history_generated');
    setHistory(changed);
    setGenerateHistory(generated);
  };

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
      
      const newsWithIds = [];
      for (const item of data) {
        const nextId = user ? await getNextId(user.uid) : Date.now();
        newsWithIds.push({ ...item, id: `NEWS_${nextId}` });
      }

      setActiveResults(newsWithIds);
      if (user) {
        await saveNewsHistory(user.uid, newsWithIds, 'history_changed');
        await syncHistory(user.uid);
      }
      
      setCurrentView('change_active');
    } catch (error) {
      alert('Haberler işlenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!generateInput.trim()) return;
    setLoading(true);
    try {
      const data = await generateNews(generateInput);
      
      const newsWithIds = [];
      for (const item of data) {
        const nextId = user ? await getNextId(user.uid) : Date.now();
        newsWithIds.push({ ...item, id: `NEWS_${nextId}` });
      }

      setActiveGenerated(newsWithIds);
      if (user) {
        await saveNewsHistory(user.uid, newsWithIds, 'history_generated');
        await syncHistory(user.uid);
      }
      
      setCurrentView('generate_active');
    } catch (error) {
      alert('Haber üretilirken bir hata oluştu.');
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

  const handleDeleteItem = async (itemId: string, type: 'history_changed' | 'history_generated') => {
    if (!user) return;
    try {
      await deleteNewsItem(user.uid, itemId, type);
      await syncHistory(user.uid);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleClearHistory = async (type: 'history_changed' | 'history_generated') => {
    if (!user) return;
    if (!confirm('Tüm geçmişi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      await clearNewsHistory(user.uid, type);
      await syncHistory(user.uid);
    } catch (error) {
      console.error("Clear history error:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-8 pb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Newspaper className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tighter">MANŞET AI</h1>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Editör Paneli</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scroll p-4 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase px-3 py-2 tracking-widest">KULLANICI</div>
          {user ? (
            <div className="px-3 py-3 mb-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
               <UserCircle className="text-indigo-400" size={32} />
               <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.displayName}</p>
                  <button onClick={() => signOut(auth)} className="text-[10px] text-red-500 font-bold hover:underline">Oturumu Kapat</button>
               </div>
            </div>
          ) : (
            <div className="px-3 py-3 mb-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col gap-2">
               <p className="text-[10px] text-indigo-600 font-bold leading-tight">Geçmişinizi saklamak için giriş yapın.</p>
               <button 
                 onClick={signInWithGoogle}
                 className="w-full flex items-center justify-center gap-2 bg-white border border-indigo-200 py-2 rounded-xl text-[10px] font-bold text-indigo-600 hover:bg-slate-50 transition-all uppercase tracking-tighter shadow-sm"
               >
                 <LogIn size={12} />
                 Google Giriş
               </button>
            </div>
          )}

          <div className="text-[11px] font-bold text-slate-400 uppercase px-3 py-2 tracking-widest">DÜZENLEME</div>
          <button 
            onClick={() => setCurrentView('change_active')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'change_active' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <FileEdit size={18} />
            <span>Haber Değiştir</span>
          </button>
          <button 
            onClick={() => setCurrentView('change_history')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'change_history' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <History size={18} />
            <span>Değiştirme Geçmişi</span>
          </button>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase px-3 py-2 tracking-widest">ÜRETİM</div>
            <button 
              onClick={() => setCurrentView('generate_active')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'generate_active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Sparkles size={18} />
              <span>Haber Üret</span>
            </button>
            <button 
              onClick={() => setCurrentView('generate_history')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'generate_history' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <BookOpen size={18} />
              <span>Üretme Geçmişi</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 italic text-[10px] text-slate-400 text-center">
          Manşet AI v1.7.0
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400">Görünüm:</span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-tighter">
                {currentView === 'change_active' && 'Haber Değiştirme'}
                {currentView === 'change_history' && 'Değiştirme Geçmişi'}
                {currentView === 'generate_active' && 'Haber Üretimi'}
                {currentView === 'generate_history' && 'Üretme Geçmişi'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {currentView === 'change_active' && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                <button 
                  onClick={() => setProcessMode('meta')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${processMode === 'meta' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Sadece Meta
                </button>
                <button 
                  onClick={() => setProcessMode('full')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${processMode === 'full' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Tam İçerik
                </button>
              </div>
            )}

            <button 
              onClick={() => {
                if (currentView.startsWith('change')) setInput('');
                else setGenerateInput('');
              }}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Girişi Temizle"
            >
              <Trash2 size={20} />
            </button>
            <button 
              onClick={currentView.startsWith('change') ? handleProcess : handleGenerate}
              disabled={loading || (currentView.startsWith('change') ? !input.trim() : !generateInput.trim())}
              className={`px-6 py-2 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                currentView.startsWith('change') 
                  ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' 
                  : 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'
              } disabled:bg-slate-200 disabled:shadow-none`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {loading ? 'İşleniyor...' : currentView.startsWith('change') ? 'Toplu İşlemi Başlat' : 'Haberi Üret'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-8">
          {currentView === 'change_active' && (
            <div className="grid grid-cols-2 gap-8 h-full overflow-hidden">
              <div className="flex flex-col gap-6 h-full overflow-hidden">
  <div className="flex justify-between items-end px-1">
    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Değiştirilecek Haberler</h2>
    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">Mod: {processMode === 'meta' ? 'Meta' : 'Tam İçerik'}</span>
  </div>
  <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
    <textarea
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Değiştirilecek haberleri buraya yapıştırın..."
      className="flex-1 p-8 text-sm text-slate-600 leading-relaxed font-mono outline-none resize-none placeholder:text-slate-300 custom-scroll border-none"
    />
  </div>
</div>

<div className="flex flex-col gap-6 h-full overflow-hidden">
  <div className="flex justify-between items-end px-1">
    <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Sonuç (Haber Paketi)</h2>
    {activeResults.length > 0 && <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
      <Zap size={12} className="text-emerald-500" /> {activeResults.length} Hazır
    </span>}
  </div>
  <div className="flex-1 bg-indigo-50/10 rounded-3xl border border-indigo-100/50 shadow-inner overflow-hidden flex flex-col">
    <div className="flex-1 overflow-y-auto custom-scroll p-8 space-y-8">
      <AnimatePresence mode="popLayout">
        {activeResults.length > 0 ? (
          activeResults.map((news, index) => (
            <ResultCard key={news.id || index} news={news} copyToClipboard={copyToClipboard} copiedId={copiedId} toggleExpand={toggleExpand} expandedIds={expandedIds} />
          ))
        ) : (
          <EmptyState icon={<FileEdit size={32} />} title="Bekleniyor" desc="Haberleri sol panele ekleyerek işleme başlayın." />
        )}
      </AnimatePresence>
    </div>
  </div>
</div>
            </div>
          )}

          {currentView === 'generate_active' && (
            <div className="grid grid-cols-2 gap-8 h-full overflow-hidden">
              <div className="flex flex-col gap-6 h-full overflow-hidden">
  <div className="flex justify-between items-end px-1">
    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Haber Konusu / Prompt</h2>
  </div>
  <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
    <textarea
      value={generateInput}
      onChange={(e) => setGenerateInput(e.target.value)}
      placeholder="Üretilecek haber konusunu detaylıca yazın..."
      className="flex-1 p-8 text-sm text-slate-600 leading-relaxed font-mono outline-none resize-none placeholder:text-slate-300 custom-scroll border-none"
    />
  </div>
</div>

<div className="flex flex-col gap-6 h-full overflow-hidden">
  <div className="flex justify-between items-end px-1">
    <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Üretilen Haber</h2>
  </div>
  <div className="flex-1 bg-emerald-50/10 rounded-3xl border border-emerald-100/50 shadow-inner overflow-hidden flex flex-col">
    <div className="flex-1 overflow-y-auto custom-scroll p-8 space-y-8">
      <AnimatePresence mode="popLayout">
        {activeGenerated.length > 0 ? (
          activeGenerated.map((news, index) => (
            <ResultCard key={news.id || index} news={news} copyToClipboard={copyToClipboard} copiedId={copiedId} toggleExpand={toggleExpand} expandedIds={expandedIds} color="emerald" />
          ))
        ) : (
          <EmptyState icon={<Sparkles size={32} />} title="Bekleniyor" desc="Haber konusunu yazın ve 'Haberi Üret'e basın." />
        )}
      </AnimatePresence>
    </div>
  </div>
</div>
            </div>
          )}

          {(currentView === 'change_history' || currentView === 'generate_history') && (
            <HistoryView 
              data={currentView === 'change_history' ? history : generateHistory} 
              copyToClipboard={copyToClipboard} 
              isGuest={!user}
              onDelete={(id) => handleDeleteItem(id, currentView === 'change_history' ? 'history_changed' : 'history_generated')}
              onClearAll={() => handleClearHistory(currentView === 'change_history' ? 'history_changed' : 'history_generated')}
            />
          )}
        </div>

        <footer className="h-12 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
          <div>Oturum Durumu • AKTİF</div>
          <div className="flex gap-6">
            <span>AI Motoru: Gemini 3 Flash</span>
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border ${isIndigo ? 'border-indigo-100' : 'border-emerald-100'} shadow-sm p-6 space-y-6 group`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1">
          <span className={`text-[10px] font-black ${isIndigo ? 'text-indigo-400' : 'text-emerald-400'} uppercase tracking-widest`}>BAŞLIK</span>
          <h3 className="text-xl font-bold text-slate-900 leading-tight">
            {news.formattedHeadline}
          </h3>
          <p className="text-[10px] text-slate-400 italic font-medium line-through">Orijinal: {news.originalHeadline}</p>
        </div>
        <button
          onClick={() => copyToClipboard(news)}
          className={`p-2 rounded-xl transition-all border shrink-0 ${
            copiedId === news.id 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
              : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
        >
          {copiedId === news.id ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>

      <div className={`p-4 ${isIndigo ? 'bg-indigo-50/50 border-indigo-100/50' : 'bg-emerald-50/50 border-emerald-100/50'} border rounded-xl space-y-1`}>
        <span className={`text-[10px] font-black ${isIndigo ? 'text-indigo-400' : 'text-emerald-400'} uppercase tracking-widest`}>SPOT METNİ</span>
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
          className={`text-[10px] font-bold ${isIndigo ? 'text-indigo-600 hover:text-indigo-700' : 'text-emerald-600 hover:text-emerald-700'} flex items-center gap-1 uppercase tracking-widest transition-all`}
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

function EmptyState({ icon, title, desc, showLogin }: { icon: ReactNode, title: string, desc: string, showLogin?: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-12">
       <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 text-slate-300">
         {icon}
       </div>
       <h3 className="text-slate-400 font-semibold mb-2">{title}</h3>
       <p className="text-slate-300 text-xs max-w-[240px] leading-relaxed mb-6">{desc}</p>
       {showLogin && (
         <button 
           onClick={signInWithGoogle}
           className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
         >
           <LogIn size={14} />
           Google ile Giriş Yaparak Verileri Sakla
         </button>
       )}
    </div>
  );
}

function HistoryView({ data, copyToClipboard, isGuest, onDelete, onClearAll }: { 
  data: {date: string, news: ProcessedNews[]}[], 
  copyToClipboard: (n: ProcessedNews) => void, 
  isGuest?: boolean,
  onDelete: (id: string) => void,
  onClearAll: () => void
}) {
  return (
    <div className="h-full overflow-y-auto custom-scroll pr-4">
       {data.length > 0 && !isGuest && (
         <div className="flex justify-end mb-8">
           <button 
             onClick={onClearAll}
             className="flex items-center gap-2 px-6 py-2.5 border border-red-100 bg-red-50 text-red-600 text-[10px] font-black rounded-xl hover:bg-red-200 transition-all uppercase tracking-widest shadow-sm"
           >
             <Trash2 size={12} />
             Tüm Geçmişi Temizle
           </button>
         </div>
       )}
       <div className="space-y-16">
          {data.length > 0 ? (
            data.map((day, dIdx) => (
              <div key={dIdx} className="space-y-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                    {day.date}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200/60"></div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-8">
                  {day.news.map((news, nIdx) => (
                    <motion.div 
                      key={nIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 hover:border-indigo-200 hover:shadow-md transition-all group"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HABER BAŞLIĞI</span>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">ID: {news.id.split('_')[1] || '000'}</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                          {news.formattedHeadline}
                        </h4>
                        <p className="text-[10px] text-slate-400 italic font-medium line-through">Eski: {news.originalHeadline?.substring(0, 60)}...</p>
                      </div>

                      <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 italic">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">SPOT</span>
                        <p className="text-[13px] text-slate-600 line-clamp-3 leading-relaxed">
                          {news.spot}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50">
                        <button 
                          onClick={() => onDelete(news.id)}
                          className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors px-3 py-1 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={12} /> Sil
                        </button>
                        <button 
                          onClick={() => copyToClipboard(news)}
                          className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1.5 transition-colors px-3 py-1 rounded-lg hover:bg-indigo-50"
                        >
                          <Copy size={12} /> Kopyala
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <EmptyState 
              icon={<History />} 
              title="Geçmiş Verisi Bulunamadı" 
              desc={isGuest ? "Giriş yapmadığınız için geçmiş verileriniz bulut üzerinde saklanmıyor." : "İşlenen haberler burada arşivlenecektir."}
              showLogin={isGuest}
            />
          )}
       </div>
    </div>
  );
}
