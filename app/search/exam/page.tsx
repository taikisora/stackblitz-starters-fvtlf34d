"use client";
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Check, Search } from 'lucide-react';

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

export default function ExamSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const currentExamSubject = typeParam === 'center' ? '共通テスト' : '私大・2次';

  const [selectedExamTypes, setSelectedExamTypes] = useState<string[]>([]);     
  const [selectedExamSubjects, setSelectedExamSubjects] = useState<string[]>([]); 
  const [expandedExamSubjects, setExpandedExamSubjects] = useState<string[]>([]);

  const handleSelectAllExamSubjects = (items: string[]) => {
    const searchQueries = items.map(item => item === '数IIBC' ? '数IIB' : item);
    const isAllSelected = searchQueries.every(q => selectedExamSubjects.includes(q));
    setSelectedExamSubjects(prev => {
      const next = prev.filter(s => !searchQueries.includes(s));
      return isAllSelected ? next : [...next, ...searchQueries];
    });
  };

  const executeExamSearch = () => {
    const params = new URLSearchParams();
    params.append('target', 'exam');
    params.append('subject', currentExamSubject);
    if (selectedExamTypes.length > 0) params.append('types', selectedExamTypes.join(','));
    if (selectedExamSubjects.length > 0) params.append('exam_subjects', selectedExamSubjects.join(','));
    router.push(`/books?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/search')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
            <ChevronLeft size={18} /> 検索メニューへ
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
              const isExpanded = expandedExamSubjects.includes(group.name);

              return (
                <div key={group.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedExamSubjects(prev => isExpanded ? prev.filter(s => s !== group.name) : [...prev, group.name])}
                    className="w-full p-4 flex justify-between items-center font-bold text-gray-700"
                  >
                    <span>{group.name}</span>
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>➔</span>
                  </button>
                  {isExpanded && (
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
    </div>
  );
}