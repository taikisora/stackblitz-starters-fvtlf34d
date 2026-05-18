"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Pencil, Bookmark, School, Crown, ChevronRight, Search, ChevronLeft, Check, Route, Globe, BookOpen, ArrowDown } from 'lucide-react';

// 📊 通常の教科検索用のデータ（スクショ1枚目の通りに完全維持）
const SUBJECT_DATA = { 
  '英語': ['英単語', '英熟語', '英文法', '長文', 'リスニング', 'その他（英語）'], 
  '数学': ['数IA', '数IIB', '数IIIC', 'その他（数学）'], 
  '国語': ['現代文', '古文', '漢文', 'その他（国語）'], 
  '理科': ['物理', '化学', '生物', '地学', 'その他（理科）'], 
  '社会': ['歴史総合', '日本史', '世界史', '地理', '公共', '倫理', '政治・経済', 'その他（社会）'] 
};

const EXAM_SUBJECT_GROUPS = [
  { name: '英語', items: ['リーディング', 'リスニング', '英単語・熟語', '英文法'] },
  { name: '国語', items: ['現代文', '古文', '漢文'] },
  { name: '数学', items: ['数IA', '数IIBC', '数III'] },
  { name: '理科', items: ['物理', '化学', '生物', '地学', '理科基礎'] },
  { name: '社会', items: ['歴史総合', '日本史', '世界史', '地理', '公共', '政治・経済', '倫理'] },
  { name: '総合', items: ['文系総合', '理系総合', '全教科パック'] }
];

const EXAM_TYPES = [
  { id: '参考書', label: '対策参考書' },
  { id: '予想問題', label: '予想問題・模試' },
  { id: '過去問', label: '過去問題集' }
];

type SubjectFilter = { subject: string, category: string };

export default function SearchPage() {
  const router = useRouter();
  const [searchStep, setSearchStep] = useState('menu');
  const [publishers, setPublishers] = useState<string[]>([]);
  const [keywordSearchText, setKeywordSearchText] = useState('');
  
  // 元のアコーディオン用の状態
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [expandedTextbookSubjects, setExpandedTextbookSubjects] = useState<string[]>([]);
  const [expandedExamSubjects, setExpandedExamSubjects] = useState<string[]>([]);

  const [currentExamSubject, setCurrentExamSubject] = useState(''); 
  const [selectedExamTypes, setSelectedExamTypes] = useState<string[]>([]);     
  const [selectedExamSubjects, setSelectedExamSubjects] = useState<string[]>([]); 

  const [selectedTextbooks, setSelectedTextbooks] = useState<SubjectFilter[]>([]);
  const [selectedRegulars, setSelectedRegulars] = useState<SubjectFilter[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);

  // 🔍 ルート検索用の状態
  const [publicRoutes, setPublicRoutes] = useState<any[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [selectedRouteSubject, setSelectedRouteSubject] = useState('すべて');

  // 🗺️ ★ 追加：ルート検索画面で「いま選んでいる大教科タブ」を管理する状態
  const [activeRouteTab, setActiveRouteTab] = useState('すべて');

  useEffect(() => {
    const fetchPublishers = async () => {
      const { data } = await supabase.from('books').select('publisher');
      if (data) {
        const allPublishers = data.map(book => book.publisher);
        const uniquePublishers = Array.from(new Set(allPublishers)).filter(Boolean);
        uniquePublishers.sort((a, b) => a.localeCompare(b, 'ja'));
        setPublishers(uniquePublishers as string[]);
      }
    };
    fetchPublishers();
  }, []);

  const openRouteSearch = async () => {
    setSearchStep('route_search');
    setRoutesLoading(true);
    setRouteSearchQuery('');
    setActiveRouteTab('すべて'); // 初期化
    setSelectedRouteSubject('すべて'); // 初期化

    const { data, error } = await supabase
      .from('study_routes')
      .select(`
        *,
        profiles ( username ),
        route_books (
          sort_order,
          books ( title, publisher )
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPublicRoutes(data);
    }
    setRoutesLoading(false);
  };

  // 🔥 変更：普通の検索と同じ教科データ(SUBJECT_DATA)で判定するロジック
  const filteredRoutes = publicRoutes.filter(route => {
    // 1. 教科による絞り込み
    if (selectedRouteSubject !== 'すべて') {
      if (selectedRouteSubject === '未選択') {
        // 大教科（数学など）だけが選ばれている時：そのグループの科目のどれかに一致すればOK
        const allowedCategories = SUBJECT_DATA[activeRouteTab as keyof typeof SUBJECT_DATA] || [];
        if (!allowedCategories.includes(route.subject) && route.subject !== activeRouteTab) {
          return false;
        }
      } else {
        // 小科目（公共、数IAなど）がピンポイントで選ばれている時
        if (route.subject !== selectedRouteSubject) return false;
      }
    }

    // 2. キーワード検索（題名、教科、説明、中身の本）の串刺し
    if (routeSearchQuery.trim() !== '') {
      const query = routeSearchQuery.toLowerCase();
      const titleMatch = route.title?.toLowerCase().includes(query);
      const subjectMatch = route.subject?.toLowerCase().includes(query);
      const descMatch = route.description?.toLowerCase().includes(query);
      const booksMatch = route.route_books?.some((rb: any) => rb.books?.title?.toLowerCase().includes(query));
      return titleMatch || subjectMatch || descMatch || booksMatch;
    }
    return true;
  });

  const handleKeywordSearch = () => {
    if (keywordSearchText.trim() !== '') {
      router.push(`/books?q=${encodeURIComponent(keywordSearchText.trim())}`);
    }
  };

  const executeExamSearch = () => {
    const params = new URLSearchParams();
    params.append('target', 'exam');
    params.append('subject', currentExamSubject);
    if (selectedExamTypes.length > 0) params.append('types', selectedExamTypes.join(','));
    if (selectedExamSubjects.length > 0) params.append('exam_subjects', selectedExamSubjects.join(','));
    router.push(`/books?${params.toString()}`);
  };

  const executeRegularSearch = () => {
    const params = new URLSearchParams();
    params.append('target', 'regular');
    const filtersStr = selectedRegulars.map(f => `${f.subject}:${f.category}`).join(',');
    if (filtersStr) params.append('filters', filtersStr);
    router.push(`/books?${params.toString()}`);
  };

  const executeTextbookSearch = () => {
    const params = new URLSearchParams();
    params.append('target', 'textbook');
    const filtersStr = selectedTextbooks.map(f => `${f.subject}:${f.category}`).join(',');
    if (filtersStr) params.append('filters', filtersStr);
    router.push(`/books?${params.toString()}`);
  };

  const executePublisherSearch = () => {
    const params = new URLSearchParams();
    params.append('target', 'publisher');
    if (selectedPublishers.length > 0) params.append('publishers', selectedPublishers.join(','));
    router.push(`/books?${params.toString()}`);
  };

  const openExamFilter = (subjectName: string) => {
    setCurrentExamSubject(subjectName);
    setSelectedExamTypes([]);         
    setSelectedExamSubjects([]);  
    setExpandedExamSubjects([]); 
    setSearchStep('exam_filter'); 
  };

  const openTextbookFilter = () => {
    setSelectedTextbooks([]);
    setExpandedTextbookSubjects([]);
    setSearchStep('textbook_subject');
  };

  const openRegularSubjectFilter = () => {
    setSelectedRegulars([]);
    setExpandedSubjects([]);
    setSearchStep('subject');
  };

  const openPublisherFilter = () => {
    setSelectedPublishers([]);
    setSearchStep('publisher');
  };

  const toggleSubjectFilter = (sub: string, cat: string, setState: React.Dispatch<React.SetStateAction<SubjectFilter[]>>) => {
    setState(prev => {
      const exists = prev.find(p => p.subject === sub && p.category === cat);
      if (exists) {
        return prev.filter(p => !(p.subject === sub && p.category === cat));
      } else {
        return [...prev, { subject: sub, category: cat }];
      }
    });
  };

  const handleSelectAllExamSubjects = (items: string[]) => {
    const searchQueries = items.map(item => item === '数IIBC' ? '数IIB' : item);
    const isAllSelected = searchQueries.every(q => selectedExamSubjects.includes(q));
    setSelectedExamSubjects(prev => {
      const next = prev.filter(s => !searchQueries.includes(s));
      return isAllSelected ? next : [...next, ...searchQueries];
    });
  };

  const handleSelectAllRegulars = (subject: string, categories: string[]) => {
    const isAllSelected = categories.every(cat => selectedRegulars.some(p => p.subject === subject && p.category === cat));
    setSelectedRegulars(prev => {
      const next = prev.filter(p => p.subject !== subject);
      return isAllSelected ? next : [...next, ...categories.map(cat => ({ subject, category: cat }))];
    });
  };

  const handleSelectAllTextbooks = (subject: string, categories: string[]) => {
    const allTargetCats = categories.map(cat => `${cat},教科書`);
    const isAllSelected = allTargetCats.every(cat => selectedTextbooks.some(p => p.subject === subject && p.category === cat));
    setSelectedTextbooks(prev => {
      const next = prev.filter(p => p.subject !== subject);
      return isAllSelected ? next : [...next, ...allTargetCats.map(cat => ({ subject, category: cat }))];
    });
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-24">
      
      {/* ─── STEP 1: 検索メニュー画面 ─── */}
      {searchStep === 'menu' && (
        <div className="space-y-6">
          <div className="relative flex items-center">
            <input 
              type="text" 
              placeholder="参考書名やキーワードで検索" 
              value={keywordSearchText}
              onChange={(e) => setKeywordSearchText(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:border-blue-500 shadow-sm"
            />
            <Search className="absolute left-4 text-gray-400" size={20} />
            <button onClick={handleKeywordSearch} className="absolute right-3 bg-gray-100 p-2 rounded-xl text-gray-600 hover:bg-gray-200">
              <Search size={18} />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-400 pl-1">学習ルートから探す</p>
            <button 
              onClick={openRouteSearch}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-2xl shadow-md text-white flex items-center justify-between active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Route size={22} className="text-white" />
                </div>
                <div className="text-left">
                  <span className="font-extrabold text-base block leading-tight">参考書ルート検索</span>
                  <span className="text-[10px] text-blue-100 font-medium">みんなが作った合格ルートを検索</span>
                </div>
              </div>
              <ChevronRight className="text-white/70 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MenuCard icon={<Pencil className="text-orange-500" />} title="教科" onClick={openRegularSubjectFilter} />
            <MenuCard icon={<Bookmark className="text-green-500" />} title="出版社" onClick={openPublisherFilter} />
            <MenuCard icon={<School className="text-blue-500" />} title="大学別" onClick={() => router.push('/search/university')} />
            <MenuCard icon={<Crown className="text-yellow-500" />} title="ランキング" onClick={() => alert('ランキングは準備中です')} />
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-sm font-bold text-gray-400 pl-1">教科書から探す</p>
            <button 
              onClick={openTextbookFilter}
              className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📖</span>
                <span className="font-bold text-gray-800">教科書</span>
              </div>
              <ChevronRight className="text-gray-400" />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-bold text-gray-400 pl-1">試験対策から探す</p>
            <button 
              onClick={() => openExamFilter('共通テスト')}
              className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📝</span>
                <span className="font-bold text-gray-800">共通テスト対策</span>
              </div>
              <ChevronRight className="text-gray-400" />
            </button>
            <button 
              onClick={() => openExamFilter('私大・2次')}
              className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📕</span>
                <span className="font-bold text-gray-800">私大・2次試験対策</span>
              </div>
              <ChevronRight className="text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* ─── 🗺️ ★ 大改造：参考書ルート検索・結果画面 ─── */}
      {searchStep === 'route_search' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <button onClick={() => setSearchStep('menu')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
              <ChevronLeft size={18} /> 戻る
            </button>
            <h2 className="text-base font-extrabold text-gray-800">参考書ルートを探す</h2>
            <div className="w-16"></div>
          </div>

          <div className="relative flex items-center">
            <input 
              type="text" 
              placeholder="題名、説明、本で検索" 
              value={routeSearchQuery}
              onChange={(e) => setRouteSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-blue-500 shadow-xs text-sm font-medium"
            />
            <Search className="absolute left-4 text-gray-400" size={16} />
          </div>

          {/* 🟢 変更：普通の検索と完全に同じ教科で切り替える大教科タブ */}
          <div className="overflow-x-auto -mx-4 px-4 scrollbar-none flex gap-1.5 border-b border-gray-100 pb-2">
            {['すべて', ...Object.keys(SUBJECT_DATA)].map((mainSub) => {
              const isSelected = activeRouteTab === mainSub;
              return (
                <button
                  key={mainSub}
                  type="button"
                  onClick={() => {
                    setActiveRouteTab(mainSub);
                    // 「すべて」なら検索リセット、教科なら「未選択(その教科のどれでもヒット)」にする
                    setSelectedRouteSubject(mainSub === 'すべて' ? 'すべて' : '未選択');
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors border ${
                    isSelected ? 'bg-gray-800 text-white border-gray-800 shadow-2xs' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {mainSub}
                </button>
              );
            })}
          </div>

          {/* 🟢 変更：選んだ大教科の中身（公共、倫理、数IIICなど）が100%同じ構成で出現 */}
          {activeRouteTab !== 'すべて' && (
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs flex flex-wrap gap-1.5 animate-fade-in">
              {/* 「すべて選択」の役割として、大教科全体のボタンを用意 */}
              <button
                type="button"
                onClick={() => setSelectedRouteSubject('未選択')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                  selectedRouteSubject === '未選択' ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200/60'
                }`}
              >
                {activeRouteTab}すべて
              </button>

              {/* SUBJECT_DATAの配列から小科目のボタンを動的に全件生成 */}
              {(SUBJECT_DATA[activeRouteTab as keyof typeof SUBJECT_DATA] || []).map((sub) => {
                const isSelected = selectedRouteSubject === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedRouteSubject(sub)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                      isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100'
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          )}

          {/* ルート検索結果リスト */}
          <div className="space-y-4 pt-1">
            {routesLoading ? (
              <div className="text-center py-20 text-gray-400 font-bold animate-pulse text-xs">ルートを読み込み中...</div>
            ) : filteredRoutes.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                <p className="text-gray-400 font-bold text-xs">条件に合う参考書ルートが見つかりませんでした。</p>
              </div>
            ) : (
              filteredRoutes.map((route) => {
                const sortedBooks = [...(route.route_books || [])].sort((a, b) => a.sort_order - b.sort_order);
                return (
                  <div 
                    key={route.id}
                    className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.99] space-y-3"
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-400 font-bold">作成者: {route.profiles?.username || '名無し'}</span>
                      <span className="font-extrabold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100/50">
                        {route.subject}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-base leading-snug mb-1">{route.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{route.description || '説明はありません。'}</p>
                    </div>
                    <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100/50 space-y-1.5">
                      <p className="text-[9px] font-extrabold text-gray-400 tracking-wide mb-1 flex items-center gap-1">
                        <BookOpen size={10} /> ルートの構成（全 {sortedBooks.length} 冊）
                      </p>
                      {sortedBooks.slice(0, 3).map((rb: any, idx) => (
                        <div key={rb.id} className="flex flex-col items-center">
                          <div className="w-full flex items-center gap-2 text-xs text-gray-700 min-w-0">
                            <span className="w-4 h-4 bg-gray-400 text-white font-black text-[9px] rounded-full flex items-center justify-center shrink-0">
                              {rb.sort_order}
                            </span>
                            <span className="font-bold truncate flex-1">{rb.books?.title}</span>
                          </div>
                          {idx < sortedBooks.slice(0, 3).length - 1 && <ArrowDown size={10} className="text-gray-300 my-0.5" />}
                        </div>
                      ))}
                      {sortedBooks.length > 3 && (
                        <p className="text-[10px] text-gray-400 font-bold pl-6 pt-0.5">他 {sortedBooks.length - 3} 冊の参考書...</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── 通常の試験フィルター画面（アコーディオン形式を100%元通りに復元） ─── */}
      {searchStep === 'exam_filter' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setSearchStep('menu')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
              <ChevronLeft size={18} /> 戻る
            </button>
            <h2 className="text-lg font-bold text-gray-800">{currentExamSubject}対策を検索</h2>
            <div className="w-16"></div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 pl-1">1. 本の種類（複数選択可）</h3>
            <div className="grid grid-cols-3 gap-2">
              {EXAM_TYPES.map((type) => {
                const isSelected = selectedExamTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedExamTypes(prev => isSelected ? prev.filter(t => t !== type.id) : [...prev, type.id])} 
                    className={`py-3 px-1 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 active:scale-95 transition-colors
                      ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 pl-1">2. 教科・科目（複数選択可）</h3>
            <div className="space-y-3">
              {EXAM_SUBJECT_GROUPS.map((group) => {
                const searchQueries = group.items.map(item => item === '数IIBC' ? '数IIB' : item);
                const isAllSelected = searchQueries.every(q => selectedExamSubjects.includes(q));

                return (
                  <div key={group.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedExamSubjects(prev => prev.includes(group.name) ? prev.filter(s => s !== group.name) : [...prev, group.name])}
                      className="w-full p-4 flex justify-between items-center font-bold text-gray-700"
                    >
                      <span>{group.name}</span>
                      <ChevronRight className={`transform transition-transform ${expandedExamSubjects.includes(group.name) ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedExamSubjects.includes(group.name) && (
                      <div className="p-4 pt-0 border-t border-gray-50 flex flex-wrap gap-2">
                        <button 
                          type="button"
                          onClick={() => handleSelectAllExamSubjects(group.items)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors active:scale-95 flex items-center gap-1
                            ${isAllSelected ? 'bg-gray-800 text-white border-gray-800 shadow-sm' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                        >
                          <Check size={16} className={isAllSelected ? "opacity-100" : "opacity-30"} />
                          すべて選択
                        </button>
                        
                        {group.items.map((item) => {
                          const searchQuery = item === '数IIBC' ? '数IIB' : item;
                          const isSelected = selectedExamSubjects.includes(searchQuery);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setSelectedExamSubjects(prev => isSelected ? prev.filter(s => s !== searchQuery) : [...prev, searchQuery])} 
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors active:scale-95
                                ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-blue-700 border-blue-100 hover:bg-blue-50'}`}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={executeExamSearch}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Search size={20} />
            {selectedExamTypes.length > 0 || selectedExamSubjects.length > 0 ? 'この条件で検索する' : '条件を指定せずにすべて検索'}
          </button>
        </div>
      )}

      {/* ─── 教科書検索画面（元のアコーディオン形式に100%復元） ─── */}
      {searchStep === 'textbook_subject' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setSearchStep('menu')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
              <ChevronLeft size={18} /> 戻る
            </button>
            <h2 className="text-lg font-bold text-gray-800">教科書を検索</h2>
            <div className="w-16"></div>
          </div>
          <p className="text-xs text-gray-500 pl-1 font-bold">教科・科目は複数選択できます</p>
          <div className="space-y-3">
            {Object.entries(SUBJECT_DATA).map(([subject, categories]) => {
              const allTargetCats = categories.map(cat => `${cat},教科書`);
              const isAllSelected = allTargetCats.every(cat => selectedTextbooks.some(p => p.subject === subject && p.category === cat));

              return (
                <div key={subject} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedTextbookSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject])}
                    className="w-full p-4 flex justify-between items-center font-bold text-gray-700"
                  >
                    <span>{subject}</span>
                    <ChevronRight className={`transform transition-transform ${expandedTextbookSubjects.includes(subject) ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedTextbookSubjects.includes(subject) && (
                    <div className="p-4 pt-0 border-t border-gray-50 flex flex-wrap gap-2">
                      <button 
                        type="button"
                        onClick={() => handleSelectAllTextbooks(subject, categories)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors active:scale-95 flex items-center gap-1
                          ${isAllSelected ? 'bg-gray-800 text-white border-gray-800 shadow-sm' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                      >
                        <Check size={16} className={isAllSelected ? "opacity-100" : "opacity-30"} />
                        すべて選択
                      </button>

                      {categories.map(cat => {
                        const targetCategory = `${cat},教科書`;
                        const isSelected = selectedTextbooks.some(p => p.subject === subject && p.category === targetCategory);
                        return (
                          <button 
                            key={cat} 
                            type="button"
                            onClick={() => toggleSubjectFilter(subject, targetCategory, setSelectedTextbooks)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors active:scale-95
                              ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-blue-700 border-blue-100 hover:bg-blue-50'}`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={executeTextbookSearch}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Search size={20} />
            {selectedTextbooks.length > 0 ? 'この条件で検索する' : 'すべての教科書を検索'}
          </button>
        </div>
      )}

      {/* ─── 通常の教科検索画面（元のアコーディオン形式に100%復元） ─── */}
      {searchStep === 'subject' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setSearchStep('menu')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
              <ChevronLeft size={18} /> 戻る
            </button>
            <h2 className="text-lg font-bold text-gray-800">教科から探す</h2>
            <div className="w-16"></div>
          </div>
          <p className="text-xs text-gray-500 pl-1 font-bold">複数の教科・科目をまとめて検索できます</p>
          <div className="space-y-3">
            {Object.entries(SUBJECT_DATA).map(([subject, categories]) => {
              const isAllSelected = categories.every(cat => selectedRegulars.some(p => p.subject === subject && p.category === cat));

              return (
                <div key={subject} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject])}
                    className="w-full p-4 flex justify-between items-center font-bold text-gray-700"
                  >
                    <span>{subject}</span>
                    <ChevronRight className={`transform transition-transform ${expandedSubjects.includes(subject) ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSubjects.includes(subject) && (
                    <div className="p-4 pt-0 border-t border-gray-50 flex flex-wrap gap-2">
                      <button 
                        type="button"
                        onClick={() => handleSelectAllRegulars(subject, categories)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors active:scale-95 flex items-center gap-1
                          ${isAllSelected ? 'bg-gray-800 text-white border-gray-800 shadow-sm' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                      >
                        <Check size={16} className={isAllSelected ? "opacity-100" : "opacity-30"} />
                        すべて選択
                      </button>

                      {categories.map(cat => {
                        const isSelected = selectedRegulars.some(p => p.subject === subject && p.category === cat);
                        return (
                          <button 
                            key={cat} 
                            type="button"
                            onClick={() => toggleSubjectFilter(subject, cat, setSelectedRegulars)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors active:scale-95
                              ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-blue-700 border-blue-100 hover:bg-blue-50'}`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={executeRegularSearch}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Search size={20} />
            {selectedRegulars.length > 0 ? 'この条件で検索する' : 'すべての参考書を検索'}
          </button>
        </div>
      )}

      {/* ─── 出版社検索画面 ─── */}
      {searchStep === 'publisher' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setSearchStep('menu')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
              <ChevronLeft size={18} /> 戻る
            </button>
            <h2 className="text-lg font-bold text-gray-800">出版社から探す</h2>
            <div className="w-16"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {publishers.map(pub => {
              const isSelected = selectedPublishers.includes(pub);
              return (
                <button 
                  key={pub} 
                  type="button"
                  onClick={() => setSelectedPublishers(prev => isSelected ? prev.filter(p => p !== pub) : [...prev, pub])} 
                  className={`p-4 rounded-xl shadow-sm border font-bold text-sm text-center transition-colors active:scale-95
                    ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'}`}
                >
                  {pub}
                </button>
              );
            })}
          </div>

          <button
            onClick={executePublisherSearch}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Search size={20} />
            {selectedPublishers.length > 0 ? 'この条件で键索する' : 'すべての出版社を検索'}
          </button>
        </div>
      )}

    </div>
  );
}

function MenuCard({ icon, title, onClick }: { icon: React.ReactNode, title: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform w-full hover:bg-gray-50">
      <div className="p-3 bg-gray-50 rounded-2xl text-xl">{icon}</div>
      <span className="font-bold text-gray-700 text-sm">{title}</span>
    </button>
  );
}