"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, School, X } from 'lucide-react';
// 💡 大学別検索と同じデータソース
import { UNIVERSITY_LIST } from '../../../lib/universities'; 

const EXAM_TYPES = [
  { id: '参考書', label: '対策参考書' },
  { id: '過去問', label: '過去問題集' }
];

// 💡 大学別検索と同じ主要大学リスト
const QUICK_UNIVERSITIES: { [key: string]: string[] } = {
  "東京一科/旧帝": ["東京大学", "京都大学", "大阪大学", "一橋大学", "東京科学大学", "東北大学", "名古屋大学", "九州大学", "北海道大学", "筑波大学", "神戸大学"],
  "早慶上理": ["早稲田大学", "慶應義塾大学", "上智大学", "東京理科大学"],
  "GMARCH": ["明治大学", "青山学院大学", "立教大学", "中央大学", "法政大学", "学習院大学"],
  "関関同立": ["関西大学", "関西学院大学", "同志社大学", "立命館大学"],
  "その他": []
};

export default function SecondarySearchPage() {
  const router = useRouter();

  // 状態管理
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [universityInput, setUniversityInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('東京一科/旧帝'); 

  // サジェスト処理
  const handleUniversityChange = (value: string) => {
    setUniversityInput(value);
    if (value.trim() === '') {
      setSuggestions([]);
      return;
    }
    const filtered = UNIVERSITY_LIST.filter(uni => uni.includes(value)).slice(0, 15);
    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  // タブ切り替え時のリセット
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setUniversityInput(''); 
    setSuggestions([]);
  };

  // 検索実行
  const executeSearch = () => {
    const params = new URLSearchParams();
    params.append('target', 'exam');
    params.append('subject', '私大・2次');
    
    if (selectedTypes.length > 0) {
      params.append('types', selectedTypes.join(','));
    }
    if (selectedUniversity) {
      params.append('university', selectedUniversity);
    }

    router.push(`/books?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4">
      <div className="space-y-6">
        
        {/* ヘッダーエリア */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/search')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm cursor-pointer">
            <ChevronLeft size={18} /> 検索メニューへ
          </button>
          <h2 className="text-lg font-black text-gray-800">私大・2次対策を検索</h2>
          <div className="w-16"></div>
        </div>

        {/* 1. 本の種類（2種類に限定） */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 pl-1">1. 本の種類（複数選択可）</h3>
          <div className="grid grid-cols-2 gap-3">
            {EXAM_TYPES.map((type) => {
              const isSelected = selectedTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedTypes(prev => isSelected ? prev.filter(t => t !== type.id) : [...prev, type.id])} 
                  className={`py-3.5 px-2 rounded-xl text-sm font-black border flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer
                    ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 大学名選択セクション（検索 ＆ クイック配置ボタンの統合） */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 pl-1">2. 志望大学を指定</h3>
          
          {/* 検索窓 */}
          <div className="relative flex items-center">
            <input 
              type="text" 
              placeholder="大学名を検索（例: 早稲田、東京）" 
              value={selectedUniversity ? selectedUniversity : universityInput}
              disabled={!!selectedUniversity}
              onChange={(e) => handleUniversityChange(e.target.value)}
              onFocus={() => {
                if (activeTab !== 'その他' && !selectedUniversity) setActiveTab('その他');
                setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className={`w-full bg-gray-50 border rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:border-blue-500 shadow-3xs text-sm font-bold text-slate-800 transition-all ${
                selectedUniversity ? 'border-blue-200 bg-blue-50/10 font-black' : 'border-gray-200'
              }`}
            />
            <School className={`absolute left-4 ${selectedUniversity ? 'text-blue-500' : 'text-gray-400'}`} size={18} />
            
            {/* 大学選択済みの解除ボタン */}
            {selectedUniversity && (
              <button 
                type="button"
                onClick={() => {
                  setSelectedUniversity(null);
                  setUniversityInput('');
                }}
                className="absolute right-3 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <X size={12} />
                <span>解除</span>
              </button>
            )}
          </div>

          {/* 予測候補プルダウン */}
          {showSuggestions && suggestions.length > 0 && !selectedUniversity && (
            <div className="absolute z-50 left-6 right-6 top-[285px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-gray-100 animate-in fade-in slide-in-from-top-2 duration-100">
              {suggestions.map((uni) => (
                <button
                  key={uni}
                  type="button"
                  onMouseDown={() => {
                    setSelectedUniversity(uni);
                    setUniversityInput('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-5 py-3.5 text-sm font-bold text-gray-700 hover:bg-blue-50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span>{uni}</span>
                  <span className="text-[11px] text-blue-500 font-black opacity-0 group-hover:opacity-100 transition-opacity">選択する ➔</span>
                </button>
              ))}
            </div>
          )}

          {/* 主要大学のクイック選択用タブ */}
          <div className="pt-2 space-y-4">
            <div className="flex border-b border-gray-100 text-xs font-bold text-gray-400 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
              {Object.keys(QUICK_UNIVERSITIES).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)} 
                  className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                    activeTab === tab ? 'border-blue-600 text-blue-600 font-black text-sm' : 'border-transparent hover:text-gray-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 大学選択ボタンエリア */}
            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pt-1 w-full content-start">
              {activeTab === 'その他' ? (
                <p className="text-xs text-gray-400 py-6 px-4 font-bold rounded-2xl w-full text-center border border-dashed border-gray-200 bg-gray-50/50">
                  上の検索欄に大学名を入力して選択してください。
                </p>
              ) : (
                QUICK_UNIVERSITIES[activeTab].map((uni) => {
                  const isSelected = selectedUniversity === uni;
                  return (
                    <button
                      key={uni}
                      type="button"
                      onClick={() => {
                        // すでに選ばれている場合は解除、そうでない場合は上書き選択
                        if (isSelected) {
                          setSelectedUniversity(null);
                        } else {
                          setSelectedUniversity(uni);
                        }
                      }} 
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-2xs cursor-pointer
                      ${isSelected 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-4 ring-blue-500/10 font-black' 
                        : 'bg-white border-gray-100/80 text-gray-600 hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      {uni}
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* 検索実行ボタン */}
        <div className="pt-2">
          <button
            onClick={executeSearch}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black shadow-md hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search size={18} />
            {selectedTypes.length > 0 || selectedUniversity ? 'この条件で検索する' : '条件を指定せずにすべて検索'}
          </button>
        </div>

      </div>
    </div>
  );
}