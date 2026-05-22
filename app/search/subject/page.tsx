"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, Search } from 'lucide-react';

// 📊 教科データ
const SUBJECT_DATA = { 
  '英語': ['英単語', '英熟語', '英文法', '長文', 'リスニング', 'その他（英語）'], 
  '数学': ['数IA', '数IIB', '数IIIC', 'その他（数学）'], 
  '国語': ['現代文', '古文', '漢文', 'その他（国語）'], 
  '理科': ['物理', '化学', '生物', '地学', 'その他（理科）'], 
  '社会': ['歴史総合', '日本史', '世界史', '地理', '公共', '倫理', '政治・経済', 'その他（社会）'] 
};

type SubjectFilter = { subject: string, category: string };

export default function SubjectSearchPage() {
  const router = useRouter();
  const [selectedRegulars, setSelectedRegulars] = useState<SubjectFilter[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);

  const toggleSubjectFilter = (sub: string, cat: string) => {
    setSelectedRegulars(prev => {
      const exists = prev.find(p => p.subject === sub && p.category === cat);
      if (exists) {
        return prev.filter(p => !(p.subject === sub && p.category === cat));
      } else {
        return [...prev, { subject: sub, category: cat }];
      }
    });
  };

  const handleSelectAllRegulars = (subject: string, categories: string[]) => {
    const isAllSelected = categories.every(cat => selectedRegulars.some(p => p.subject === subject && p.category === cat));
    setSelectedRegulars(prev => {
      const next = prev.filter(p => p.subject !== subject);
      return isAllSelected ? next : [...next, ...categories.map(cat => ({ subject, category: cat }))];
    });
  };

  const executeRegularSearch = () => {
    const params = new URLSearchParams();
    params.append('target', 'regular');
    const filtersStr = selectedRegulars.map(f => `${f.subject}:${f.category}`).join(',');
    if (filtersStr) params.append('filters', filtersStr);
    router.push(`/books?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/search')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
            <ChevronLeft size={18} /> 検索メニューへ
          </button>
          <h2 className="text-lg font-bold text-gray-800">教科から探す</h2>
          <div className="w-16"></div>
        </div>
        <p className="text-xs text-gray-500 pl-1 font-bold">複数の教科・科目をまとめて検索できます</p>
        
        <div className="space-y-3">
          {Object.entries(SUBJECT_DATA).map(([subject, categories]) => {
            const isAllSelected = categories.every(cat => selectedRegulars.some(p => p.subject === subject && p.category === cat));
            const isExpanded = expandedSubjects.includes(subject);

            return (
              <div key={subject} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSubjects(prev => isExpanded ? prev.filter(s => s !== subject) : [...prev, subject])}
                  className="w-full p-4 flex justify-between items-center font-bold text-gray-700"
                >
                  <span>{subject}</span>
                  <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>➔</span>
                </button>
                {isExpanded && (
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
                          onClick={() => toggleSubjectFilter(subject, cat)}
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
    </div>
  );
}