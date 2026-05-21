"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, Trophy, GraduationCap, X } from 'lucide-react'; 
import { UNIVERSITY_LIST } from '../../../lib/universities'; 

const QUICK_UNIVERSITIES: { [key: string]: string[] } = {
  "東京一科/旧帝": ["東京大学", "京都大学", "大阪大学", "一橋大学", "東京科学大学", "東北大学", "名古屋大学", "九州大学", "北海道大学", "筑波大学", "神戸大学"],
  "早慶上理": ["早稲田大学", "慶應義塾大学", "上智大学", "東京理科大学"],
  "GMARCH": ["明治大学", "青山学院大学", "立教大学", "中央大学", "法政大学", "学習院大学"],
  "関関同立": ["関西大学", "関西学院大学", "同志社大学", "立命館大学"],
  "その他": []
};

export default function UniversitySearchPage() {
  const router = useRouter();
  
  const [stream, setStream] = useState<string>('all'); 
  const [university, setUniversity] = useState<string>(''); 
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]); 
  const [activeTab, setActiveTab] = useState<string>('東京一科/旧帝'); 

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleUniversityChange = (value: string) => {
    setUniversity(value);
    if (value.trim() === '') {
      setSuggestions([]);
      return;
    }
    const filtered = UNIVERSITY_LIST.filter(uni => uni.includes(value)).slice(0, 50);
    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  const toggleUniversity = (uni: string) => {
    if (selectedUniversities.includes(uni)) {
      setSelectedUniversities(selectedUniversities.filter(item => item !== uni));
    } else {
      setSelectedUniversities([...selectedUniversities, uni]);
    }
  };

  const handleSelectGroupAll = (tabName: string) => {
    const groupUnis = QUICK_UNIVERSITIES[tabName];
    const isAllSelected = groupUnis.every(uni => selectedUniversities.includes(uni));
    
    if (isAllSelected) {
      setSelectedUniversities([]); 
    } else {
      setSelectedUniversities([...groupUnis]); 
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedUniversities([]); 
    setUniversity(''); 
    setSuggestions([]);
  };

  const handleGoToRanking = () => {
    if (selectedUniversities.length === 0) return;

    const params = new URLSearchParams();
    params.append('universities', selectedUniversities.join(',')); 
    params.append('stream', stream);

    router.push(`/books/ranking?${params.toString()}`);
  };

  return (
    // 💡 max-w-md から max-w-3xl に広げ、PCでの余白を最適化しました
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 space-y-6">
      
      {/* ── ヘッダー部 ── */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <button onClick={() => router.back()} className="flex items-center text-blue-600 font-bold text-sm bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-2xs hover:bg-gray-50 transition-all">
          <ChevronLeft size={18} /> 戻る
        </button>
        <h1 className="text-xl font-black text-gray-800">大学別参考書ランキング</h1>
        <div className="w-20"></div>
      </div>

      {/* 💡 PC時は左右2カラムにレイアウトを分けて、大画面を有効活用します */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* 左側：文理選択セクション (PC時は1カラム分) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3 h-full">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <GraduationCap size={16} className="text-gray-400" />
            1. 文系・理系を選択
          </h2>
          {/* 💡 PC時は縦に並べてリッチなボタンに見えるようにレイアウト可変 */}
          <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setStream('humanities')}
              className={`py-3 px-4 rounded-xl font-bold border text-sm text-center transition-all active:scale-[0.97]
                ${stream === 'humanities' ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-4 ring-blue-500/10' : 'bg-gray-50 text-gray-700 border-gray-200/60 hover:bg-gray-100'}`}
            >
              文系
            </button>
            <button
              type="button"
              onClick={() => setStream('sciences')}
              className={`py-3 px-4 rounded-xl font-bold border text-sm text-center transition-all active:scale-[0.97]
                ${stream === 'sciences' ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-4 ring-blue-500/10' : 'bg-gray-50 text-gray-700 border-gray-200/60 hover:bg-gray-100'}`}
            >
              理系
            </button>
            <button
              type="button"
              onClick={() => setStream('all')}
              className={`py-3 px-4 rounded-xl font-bold border text-sm text-center transition-all active:scale-[0.97]
                ${stream === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-4 ring-blue-500/10' : 'bg-gray-50 text-gray-700 border-gray-200/60 hover:bg-gray-100'}`}
            >
              指定なし
            </button>
          </div>
        </div>

        {/* 右側：大学名選択セクション (PC時は広々と2カラム分使う) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 md:col-span-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Search size={16} className="text-gray-400" />
            2. 大学名を選択
          </h2>
          
          <div className="relative">
            <input
              type="text"
              placeholder="大学名を入力（例: 早稲田）"
              value={university}
              onChange={(e) => handleUniversityChange(e.target.value)}
              onFocus={() => {
                if(activeTab !== 'その他' && selectedUniversities.length === 0) setActiveTab('その他');
                setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500 text-gray-800 shadow-2xs"
            />

            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-gray-100">
                {suggestions.map((uni) => (
                  <li key={uni}>
                    <button
                      type="button"
                      onMouseDown={() => {
                        if (!selectedUniversities.includes(uni)) {
                          setSelectedUniversities([...selectedUniversities, uni]);
                        }
                        setUniversity(''); 
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-5 py-3.5 hover:bg-blue-50 text-gray-700 font-bold transition-colors text-sm"
                    >
                      {uni}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 選択中の大学バッジ */}
          {selectedUniversities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50/50 rounded-xl border border-gray-100/50">
              {selectedUniversities.map((uni) => (
                <span key={uni} className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[11px] font-black pl-3 pr-1.5 py-1 rounded-full border border-blue-100 shadow-2xs">
                  {uni}
                  <button 
                    type="button" 
                    onClick={() => setSelectedUniversities(selectedUniversities.filter(item => item !== uni))}
                    className="p-0.5 hover:bg-blue-200 rounded-full text-blue-400 hover:text-blue-700 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 主要大学のクイック選択用タブ＆ボタン */}
          <div className="pt-2 space-y-4">
            <div className="flex border-b border-gray-100 text-xs font-bold text-gray-400 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
              {Object.keys(QUICK_UNIVERSITIES).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)} 
                  className={`pb-2.5 px-3 border-b-2 transition-all ${activeTab === tab ? 'border-blue-600 text-blue-600 font-black text-sm' : 'border-transparent hover:text-gray-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 💡 大学ボタンエリア：PC大画面でも窮屈にならないゆったり配置 */}
            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pt-1 w-full content-start">
              {activeTab === 'その他' ? (
                  <p className="text-xs text-gray-400 py-6 px-4 font-bold rounded-2xl w-full text-center border border-dashed border-gray-200 bg-gray-50/50">
                      上の検索欄に大学名を入力して追加してください。
                  </p>
              ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSelectGroupAll(activeTab)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all active:scale-95 shadow-2xs
                      ${QUICK_UNIVERSITIES[activeTab].every(uni => selectedUniversities.includes(uni))
                        ? 'bg-gray-800 border-gray-800 text-white shadow-sm' 
                        : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                    >
                       {activeTab}すべて
                    </button>

                    {QUICK_UNIVERSITIES[activeTab].map((uni) => {
                      const isSelected = selectedUniversities.includes(uni);
                      return (
                        <button
                          key={uni}
                          type="button"
                          onClick={() => toggleUniversity(uni)} 
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-2xs
                          ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-4 ring-blue-500/10' : 'bg-white border-gray-100/80 text-gray-600 hover:bg-gray-50 hover:border-gray-200'}`}
                        >
                          {uni}
                        </button>
                      );
                    })}
                  </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. ランキング表示ボタン ── */}
      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={handleGoToRanking}
          disabled={selectedUniversities.length === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl font-extrabold shadow-lg hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:pointer-events-none"
        >
          <Trophy size={18} className="stroke-[2.5]" />
          {selectedUniversities.length > 0 
            ? `選択した ${selectedUniversities.length} つの大学でランキングを見る` 
            : '大学を選択してください'}
        </button>
      </div>

    </div>
  );
}