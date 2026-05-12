"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Pencil, Bookmark, School, Crown, Filter, ChevronRight, Search } from 'lucide-react';

const SUBJECT_DATA = {
  '英語': ['英単語', '英熟語', '英文法', '長文', 'その他（英語）'],
  '数学': ['数IA', '数IIB', '数IIIC', 'その他（数学）'],
  '国語': ['現代文', '古文', '漢文', 'その他（国語）'],
  '理科': ['物理', '化学', '生物', '地学', 'その他（理科）'],
  '社会': ['歴史総合', '日本史', '世界史', '地理', '政治経済', 'その他（社会）']
};

export default function SearchPage() {
  const router = useRouter(); // Next.jsのページ遷移機能
  const [searchStep, setSearchStep] = useState('menu');
  const [publishers, setPublishers] = useState<string[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [publisherSearchText, setPublisherSearchText] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<{ type: string, value: string } | null>(null);

  // 出版社リストの取得
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

  // 検索実行処理（URLパラメータをつけて /books に遷移する！）
  const executeSearch = (filters: { subject?: string; category?: string; publisher?: string }) => {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.category) params.append('category', filters.category);
    if (filters.publisher) params.append('publisher', filters.publisher);
    
    // /books?subject=英語 のようなURLで検索結果ページへ移動
    router.push(`/books?${params.toString()}`);
  };

  return (
    <div>
      {/* 検索メニュー画面 */}
      {searchStep === 'menu' && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <MenuCard icon={<Pencil className="text-orange-500" />} title="教科" onClick={() => setSearchStep('subject-select')} />
          <MenuCard icon={<Bookmark className="text-green-500" />} title="出版社" onClick={() => setSearchStep('publisher-select')} />
          <MenuCard icon={<School className="text-blue-500" />} title="志望校" onClick={() => {}} />
          <MenuCard icon={<Crown className="text-yellow-500" />} title="ランキング" onClick={() => {}} />
        </div>
      )}

      {/* 教科選択画面 */}
      {searchStep === 'subject-select' && (
        <div className="space-y-4 pb-24">
          <button onClick={() => setSearchStep('menu')} className="text-sm text-blue-600 mb-2">← 戻る</button>
          <h3 className="font-bold text-lg mb-4">教科・分野を選択（1つだけ）</h3>

          {Object.entries(SUBJECT_DATA).map(([subject, categories]) => {
            const isExpanded = expandedSubjects.includes(subject);
            const isSubjectSelected = selectedTarget?.type === 'subject' && selectedTarget?.value === subject;

            return (
              <div key={subject} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <label className="flex items-center cursor-pointer flex-1">
                    <input
                      type="radio"
                      name="search-target"
                      checked={isSubjectSelected}
                      onChange={() => setSelectedTarget({ type: 'subject', value: subject })}
                      className="w-5 h-5 border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className={`font-bold ${isSubjectSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                      {subject}
                    </span>
                  </label>
                  <button
                    onClick={() => setExpandedSubjects(prev => isExpanded ? prev.filter(s => s !== subject) : [...prev, subject])}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${isExpanded ? 'bg-gray-200 text-gray-700' : 'bg-blue-50 text-blue-600 font-medium'}`}
                  >
                    <Filter size={12} /> {isExpanded ? '閉じる' : 'さらに絞り込む'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="bg-gray-50 p-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                    {categories.map(category => {
                      const isCategorySelected = selectedTarget?.type === 'category' && selectedTarget?.value === category;
                      return (
                        <label key={category} className="flex items-center cursor-pointer group p-2 rounded-lg hover:bg-white transition-colors">
                          <input
                            type="radio"
                            name="search-target"
                            checked={isCategorySelected}
                            onChange={() => setSelectedTarget({ type: 'category', value: category })}
                            className="w-4 h-4 border-gray-300 text-blue-500 mr-2"
                          />
                          <span className={`text-sm ${isCategorySelected ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                            {category}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 検索実行ボタン */}
          <div className="fixed bottom-20 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-30 md:left-20 md:bottom-0">
            <button
              onClick={() => {
                if (selectedTarget) {
                  executeSearch({
                    subject: selectedTarget.type === 'subject' ? selectedTarget.value : undefined,
                    category: selectedTarget.type === 'category' ? selectedTarget.value : undefined,
                  });
                }
              }}
              disabled={!selectedTarget}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${selectedTarget ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-gray-300 cursor-not-allowed shadow-none'}`}
            >
              {selectedTarget ? `${selectedTarget.value} で検索する` : '検索対象を選んでください'}
            </button>
          </div>
        </div>
      )}

      {/* 出版社選択画面 */}
      {searchStep === 'publisher-select' && (
        <div className="space-y-4 pb-24 h-[calc(100vh-100px)] flex flex-col bg-gray-50 -mx-4 -mt-4 p-4">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSearchStep('menu')} className="text-gray-500 p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ChevronRight size={24} className="rotate-180" />
            </button>
            <h3 className="font-bold text-lg">出版社から探す</h3>
          </div>
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="出版社名を入力"
              value={publisherSearchText}
              onChange={(e) => setPublisherSearchText(e.target.value)}
              className="w-full bg-white py-3 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-2 flex-1 overflow-y-auto">
            {publishers.filter(p => p.includes(publisherSearchText)).map((publisher, index, array) => (
              <button
                key={publisher}
                onClick={() => executeSearch({ publisher })}
                className={`w-full text-left p-4 flex justify-between items-center hover:bg-gray-50 active:bg-gray-100 transition-colors ${index !== array.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="font-medium text-gray-800">{publisher}</span>
                <ChevronRight size={20} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// サブコンポーネント：メニューカード
function MenuCard({ icon, title, onClick }: { icon: React.ReactNode, title: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
    >
      <div className="p-3 bg-gray-50 rounded-2xl">{icon}</div>
      <span className="font-bold text-gray-700">{title}</span>
    </button>
  );
}