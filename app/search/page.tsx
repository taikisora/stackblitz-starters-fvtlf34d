"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Pencil, Bookmark, School, Crown, ChevronRight, Search, ChevronLeft, Check, CheckSquare } from 'lucide-react';

const SUBJECT_DATA = { 
  '英語': ['英単語', '英熟語', '英文法', '長文', 'リスニング', 'その他（英語）'], 
  '数学': ['数IA', '数IIB', '数IIIC', 'その他（数学）'], 
  '国語': ['現代文', '古文', '漢文', 'その他（国語）'], 
  '理科': ['物理', '化学', '生物', '地学', 'その他（理科）'], 
  '社会': ['歴史総合', '日本史', '世界史', '地理', '公共', '倫理', '政治・経済', 'その他（社会）'] 
};

// 💡 「（すべて）」の項目を削除し、純粋な科目のリストに整理しました
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
  
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [expandedExamSubjects, setExpandedExamSubjects] = useState<string[]>([]);
  const [expandedTextbookSubjects, setExpandedTextbookSubjects] = useState<string[]>([]);

  const [currentExamSubject, setCurrentExamSubject] = useState(''); 
  const [selectedExamTypes, setSelectedExamTypes] = useState<string[]>([]);     
  const [selectedExamSubjects, setSelectedExamSubjects] = useState<string[]>([]); 

  const [selectedTextbooks, setSelectedTextbooks] = useState<SubjectFilter[]>([]);
  const [selectedRegulars, setSelectedRegulars] = useState<SubjectFilter[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);

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

  // 💡 トグル（選択・解除）のシンプル化されたロジック
  const toggleSubjectFilter = (
    sub: string, 
    cat: string, 
    setState: React.Dispatch<React.SetStateAction<SubjectFilter[]>>
  ) => {
    setState(prev => {
      const exists = prev.find(p => p.subject === sub && p.category === cat);
      if (exists) {
        return prev.filter(p => !(p.subject === sub && p.category === cat));
      } else {
        return [...prev, { subject: sub, category: cat }];
      }
    });
  };

  // 💡 「すべて選択」ボタンのロジック群
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

      {/* ─── 統合された試験フィルター画面 ─── */}
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
                // すべて選択されているか判定
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
                        {/* 💡 「すべて選択」専用ボタン */}
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

      {/* ─── 教科書検索画面 ─── */}
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
                      {/* 💡 「すべて選択」専用ボタン */}
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

      {/* ─── 通常の教科検索画面 ─── */}
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
                      {/* 💡 「すべて選択」専用ボタン */}
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
            {selectedPublishers.length > 0 ? 'この条件で検索する' : 'すべての出版社を検索'}
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