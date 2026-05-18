"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// ★ 変更：バッジ削除用に X アイコンを追加
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
  
  // 💡 状態管理（★ streamの初期値を'all'に、universityを複数保持できる配列に変更）
  const [stream, setStream] = useState<string>('all'); // 'humanities'(文系) | 'sciences'(理系) | 'all'(指定なし)
  const [university, setUniversity] = useState<string>(''); // 手入力欄の文字
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]); // ★ 追加：選択された大学のリスト
  const [activeTab, setActiveTab] = useState<string>('東京一科/旧帝'); 

  // サジェスト用の状態
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 大学名入力時のリアルタイム絞り込み
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

  // ★ 追加：大学の選択・解除をトグルする処理
  const toggleUniversity = (uni: string) => {
    if (selectedUniversities.includes(uni)) {
      setSelectedUniversities(selectedUniversities.filter(item => item !== uni));
    } else {
      setSelectedUniversities([...selectedUniversities, uni]);
    }
  };

  // ★ 追加：大学群の「すべて選択・解除」を一括処理する
  const handleSelectGroupAll = (tabName: string) => {
    const groupUnis = QUICK_UNIVERSITIES[tabName];
    const isAllSelected = groupUnis.every(uni => selectedUniversities.includes(uni));
    
    if (isAllSelected) {
      setSelectedUniversities([]); // 既に全部選ばれていたら全解除
    } else {
      setSelectedUniversities([...groupUnis]); // そうでなければ全選択に上書き
    }
  };

  // ★ 追加：タブ切り替え時は他の大学群と混ざらないように選択をクリアする
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedUniversities([]); 
    setUniversity(''); 
    setSuggestions([]);
  };

  // 💡 ランキング画面への遷移処理（★ 複数大学をカンマ区切りで送る）
  const handleGoToRanking = () => {
    if (selectedUniversities.length === 0) return;

    const params = new URLSearchParams();
    params.append('universities', selectedUniversities.join(',')); // 配列を「早稲田大学,慶應義塾大学」のように結合
    params.append('stream', stream);

    router.push(`/books/ranking?${params.toString()}`);
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-24 space-y-6">
      
      {/* ── ヘッダー部 ── */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center text-blue-600 font-bold text-sm">
          <ChevronLeft size={18} /> 戻る
        </button>
        <h1 className="text-lg font-bold text-gray-800">大学別参考書ランキング</h1>
        <div className="w-16"></div>
      </div>

      {/* ── 1. 文理の選択セクション ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <GraduationCap size={16} className="text-gray-400" />
          1. 文系・理系を選択
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setStream('humanities')}
            className={`py-3 rounded-xl font-bold border text-xs transition-all active:scale-95
              ${stream === 'humanities' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
          >
            文系
          </button>
          <button
            type="button"
            onClick={() => setStream('sciences')}
            className={`py-3 rounded-xl font-bold border text-xs transition-all active:scale-95
              ${stream === 'sciences' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
          >
            理系
          </button>
          {/* ★ 追加：指定なし（任意）ボタン */}
          <button
            type="button"
            onClick={() => setStream('all')}
            className={`py-3 rounded-xl font-bold border text-xs transition-all active:scale-95
              ${stream === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
          >
            指定なし
          </button>
        </div>
      </div>

      {/* ── 2. 大学名の入力（サジェスト付き） ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
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
              // 検索欄にフォーカスした時は、一応クイック選択を「その他」にしてバグを防ぐ
              if(activeTab !== 'その他' && selectedUniversities.length === 0) setActiveTab('その他');
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:border-blue-500 text-gray-800"
          />

          {/* サジェストリスト */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
              {suggestions.map((uni) => (
                <li key={uni}>
                  <button
                    type="button"
                    onMouseDown={() => {
                      if (!selectedUniversities.includes(uni)) {
                        setSelectedUniversities([...selectedUniversities, uni]);
                      }
                      setUniversity(''); // 追加したら入力欄はクリア
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 font-medium transition-colors text-xs"
                  >
                    {uni}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ★ 追加：現在選択されている大学のバッジ表示エリア */}
        {selectedUniversities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedUniversities.map((uni) => (
              <span key={uni} className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[11px] font-bold pl-2.5 pr-1.5 py-1 rounded-full border border-blue-100 animate-fade-in">
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

        {/* ── 主要大学のクイック選択用タブ＆ボタン ── */}
        <div className="pt-3 border-t border-gray-50 space-y-3">
          {/* タブ切り替えバー */}
          <div className="flex border-b border-gray-100 text-xs font-bold text-gray-400 overflow-x-auto whitespace-nowrap scrollbar-none">
            {Object.keys(QUICK_UNIVERSITIES).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)} // ★ 変更：クリアロジック付きの関数に変える
                className={`pb-2 px-3 border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent hover:text-gray-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 大学ボタンずらり */}
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1 w-full">
            {activeTab === 'その他' ? (
                <p className="text-xs text-gray-500 py-5 px-3 font-medium rounded-xl w-full text-center border border-dashed border-gray-200">
                    上の検索欄に大学名を入力して追加してください。
                </p>
            ) : (
                <>
                  {/* ★ 追加：「〇〇すべて」の一括選択ボタンを先頭に設置 */}
                  <button
                    type="button"
                    onClick={() => handleSelectGroupAll(activeTab)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all active:scale-95
                    ${QUICK_UNIVERSITIES[activeTab].every(uni => selectedUniversities.includes(uni))
                      ? 'bg-gray-800 border-gray-800 text-white' 
                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
                  >
                     {activeTab}すべて
                  </button>

                  {/* 各大学ボタン */}
                  {QUICK_UNIVERSITIES[activeTab].map((uni) => {
                    const isSelected = selectedUniversities.includes(uni);
                    return (
                      <button
                        key={uni}
                        type="button"
                        onClick={() => toggleUniversity(uni)} // ★ 変更：トグル処理に変える
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all active:scale-95
                        ${isSelected ? 'bg-blue-50 border-blue-500 text-blue-600 font-bold shadow-2xs' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
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

      {/* ── 3. ランキング表示ボタン ── */}
      <button
        onClick={handleGoToRanking}
        // ★ 変更：最低1校でも大学が選ばれていれば活性化（文理は指定なしも通る）
        disabled={selectedUniversities.length === 0}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none"
      >
        <Trophy size={18} />
        {selectedUniversities.length > 0 
          ? `選択した ${selectedUniversities.length} つの大学でランキングを見る` 
          : '大学を選択してください'}
      </button>

    </div>
  );
}