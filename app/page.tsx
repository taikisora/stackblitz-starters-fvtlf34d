"use client";

import { useState, useEffect } from 'react';

import { createClient } from '@supabase/supabase-js';

import {

Home, Search, BarChart2, User,

Pencil, Bookmark, School, Crown,

Filter, ChevronRight, ExternalLink

} from 'lucide-react';



// Supabase設定（以前のものを流用してください）

const SUPABASE_URL = 'https://gftwcfexduvwgvffigbg.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdHdjZmV4ZHV2d2d2ZmZpZ2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTUzNTYsImV4cCI6MjA5Mzk3MTM1Nn0.SIUtKv-tvLqBbP0VLHf0QIV3tZBZSPtKzXjR2Tyad8c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



export default function App() {

// --- 状態管理 ---

const [activeTab, setActiveTab] = useState('home'); // 現在のタブ

const [searchStep, setSearchStep] = useState('menu'); // 検索モード内の画面管理

const [books, setBooks] = useState<any[]>([]);

const [loading, setLoading] = useState(false);

// 出版社のリストをSupabaseから取得して保存する箱
const [publishers, setPublishers] = useState<string[]>([]);

// 教科と小カテゴリーのデータ定義
const SUBJECT_DATA = {
  '英語': ['英単語', '英熟語', '英文法', '長文', 'その他（英語）'],
  '数学': ['数IA', '数IIB', '数IIIC', 'その他（数学）'],
  '国語': ['現代文', '古文', '漢文', 'その他（国語）'],
  '理科': ['物理', '化学', '生物', '地学', 'その他（理科）'],
  '社会': ['歴史総合', '日本史', '世界史', '地理', '政治経済', 'その他（社会）']
};

const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]); // 「詳細＞」が開いている教科のリスト

// --- 統合検索用の状態管理 ---
const [filters, setFilters] = useState({
  subject: null as string | null,
  category: null as string | null,
  publisher: null as string | null,
});

const [publisherSearchText, setPublisherSearchText] = useState('');

const [selectedTarget, setSelectedTarget] = useState<{ type: string, value: string } | null>(null);

const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

// --- 初期データの取得 ---
useEffect(() => {
  const fetchPublishers = async () => {
    const { data } = await supabase.from('books').select('publisher');
    if (data) {
      const allPublishers = data.map(book => book.publisher);
      const uniquePublishers = Array.from(new Set(allPublishers)).filter(Boolean);
      uniquePublishers.sort((a, b) => a.localeCompare(b, 'ja'));
      setPublishers(uniquePublishers);
    }
  };
  fetchPublishers();
}, []); 


// --- データ取得（統合検索対応！） ---
const fetchBooks = async (currentFilters: any) => {
  setLoading(true);
  let query = supabase.from('books').select('*');

  // フィルターの条件を全部掛け合わせる
  if (currentFilters.subject) query = query.eq('subject', currentFilters.subject);
  if (currentFilters.category) query = query.eq('category', currentFilters.category);
  if (currentFilters.publisher) query = query.eq('publisher', currentFilters.publisher);

  const { data } = await query;
  setBooks(data || []);
  setLoading(false);
  setSearchStep('results');
  setIsFilterModalOpen(false); // 検索完了したらモーダルを自動で閉じる
};

// --- UI部品：ナビゲーション ---
// --- UI部品：ナビゲーション ---
const TabBar = () => (
  <nav className="fixed z-[110] bg-white border-gray-200 transition-all duration-300
    /* スマホ用（下部固定） */
    bottom-0 left-0 right-0 border-t flex justify-around py-3 pb-6
    /* 横長画面用（左側固定） md: は横幅768px以上 */
    md:top-0 md:bottom-0 md:right-auto md:w-20 md:h-screen md:border-t-0 md:border-r md:flex-col md:justify-center md:gap-8 md:pb-0
  ">
    <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center w-full py-2 transition-colors ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400 hover:text-blue-400'}`}>
      <Home size={24} /><span className="text-[10px] mt-1 font-bold">ホーム</span>
    </button>
    <button onClick={() => {setActiveTab('search'); setSearchStep('menu');}} className={`flex flex-col items-center w-full py-2 transition-colors ${activeTab === 'search' ? 'text-blue-600' : 'text-gray-400 hover:text-blue-400'}`}>
      <Search size={24} /><span className="text-[10px] mt-1 font-bold">検索</span>
    </button>
    <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center w-full py-2 transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400 hover:text-blue-400'}`}>
      <BarChart2 size={24} /><span className="text-[10px] mt-1 font-bold">データ</span>
    </button>
    <button onClick={() => setActiveTab('mypage')} className={`flex flex-col items-center w-full py-2 transition-colors ${activeTab === 'mypage' ? 'text-blue-600' : 'text-gray-400 hover:text-blue-400'}`}>
      <User size={24} /><span className="text-[10px] mt-1 font-bold">マイページ</span>
    </button>
  </nav>
);



return (

<div className="min-h-screen bg-gray-50 text-gray-800 transition-all pb-24 md:pb-0 md:pl-20">

{/* ヘッダー */}

<header className="bg-white p-4 sticky top-0 z-40 border-b border-gray-100">

<h1 className="text-xl font-bold text-center text-blue-800">参考書.com</h1>

</header>



<main className="p-4">

{activeTab === 'home' && (

<div className="text-center py-20">

<h2 className="text-2xl font-bold mb-2">Welcome!</h2>

<p className="text-gray-500">あなたにぴったりの参考書を見つけよう</p>

</div>

)}



{activeTab === 'search' && (

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
      // この教科自体（全体）が選ばれているか
      const isSubjectSelected = selectedTarget?.type === 'subject' && selectedTarget?.value === subject;

      return (
        <div key={subject} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* 親（教科全体）の行 */}
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
              onClick={() => {
                if (isExpanded) {
                  setExpandedSubjects(expandedSubjects.filter(s => s !== subject));
                } else {
                  setExpandedSubjects([...expandedSubjects, subject]);
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                isExpanded ? 'bg-gray-200 text-gray-700' : 'bg-blue-50 text-blue-600 font-medium'
              }`}
            >
              <Filter size={12} />
              {isExpanded ? '閉じる' : 'さらに絞り込む'}
            </button>
          </div>

          {/* 子（小カテゴリー）の行 */}
          {isExpanded && (
            <div className="bg-gray-50 p-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
              {categories.map(category => {
                // この小カテゴリーが選ばれているか
                const isCategorySelected = selectedTarget?.type === 'category' && selectedTarget?.value === category;
                
                return (
                  <label key={category} className="flex items-center cursor-pointer group p-2 rounded-lg hover:bg-white transition-colors">
                    <input
                      type="radio"
                      name="search-target"
                      checked={isCategorySelected}
                      onChange={() => setSelectedTarget({ type: 'category', value: category })}
                      className="w-4 h-4 border-gray-300 text-blue-500 mr-2 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${isCategorySelected ? 'text-blue-700 font-bold' : 'text-gray-600 group-hover:text-gray-900'}`}>
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

 {/* 検索ボタン（教科選択用） */}
 <div className="fixed bottom-20 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-30 md:left-20 md:bottom-0">
      <button
        onClick={() => {
          if (selectedTarget) {
            // 選んだ教科をフィルターにセットして検索！
            const newFilters = { 
              ...filters, 
              subject: selectedTarget.type === 'subject' ? selectedTarget.value : null,
              category: selectedTarget.type === 'category' ? selectedTarget.value : null,
              publisher: null // 最初から検索し直す時は出版社をリセット
            };
            setFilters(newFilters);
            fetchBooks(newFilters);
          }
        }}
        disabled={!selectedTarget}
        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
          selectedTarget 
            ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' 
            : 'bg-gray-300 cursor-not-allowed shadow-none'
        }`}
      >
        {selectedTarget ? `${selectedTarget.value} で検索する` : '検索対象を選んでください'}
      </button>
    </div>
  </div>
)}

{/* 出版社選択画面 */}
{searchStep === 'publisher-select' && (
  <div className="space-y-4 pb-24 h-screen flex flex-col bg-gray-50 -mx-4 -mt-4 p-4">
    <div className="flex items-center gap-2 mb-2">
      <button onClick={() => setSearchStep('menu')} className="text-gray-500 p-2 -ml-2 rounded-full hover:bg-gray-100">
        <ChevronRight size={24} className="rotate-180" />
      </button>
      <h3 className="font-bold text-lg">出版社から探す</h3>
    </div>

    {/* 検索窓 */}
    <div className="relative">
      <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="出版社名を入力"
        value={publisherSearchText}
        onChange={(e) => setPublisherSearchText(e.target.value)}
        className="w-full bg-white py-3 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
      />
    </div>

    <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
      <Filter size={16} /> あいうえお順
    </div>

    {/* 出版社リスト */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-2 flex-1 overflow-y-auto">
      {publishers // ← ここに publishers が必要でした！
        .filter(publisher => publisher.includes(publisherSearchText))
        .map((publisher, index, array) => (
          <button
            key={publisher}
            onClick={() => {
              // 出版社をフィルターにセットして検索！
              const newFilters = { 
                ...filters, 
                publisher: publisher,
                subject: null, // 最初から検索し直す時は教科をリセット
                category: null 
              };
              setFilters(newFilters);
              fetchBooks(newFilters);
            }}
            className={`w-full text-left p-4 flex justify-between items-center hover:bg-gray-50 active:bg-gray-100 transition-colors ${
              index !== array.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <span className="font-medium text-gray-800">{publisher}</span>
            <ChevronRight size={20} className="text-gray-300" />
          </button>
        ))
      }
      {publishers.filter(p => p.includes(publisherSearchText)).length === 0 && (
        <div className="p-8 text-center text-gray-400 text-sm">
          見つかりませんでした
        </div>
      )}
    </div>
  </div>
)}


{/* 検索結果画面 */}
{searchStep === 'results' && (
  <div className="space-y-4 pb-24">
    <div className="flex justify-between items-center mb-4">
      <button onClick={() => setSearchStep('menu')} className="text-sm text-blue-600">← 再検索</button>
      
      {/* さらに絞り込むボタン */}
      <button 
        onClick={() => setIsFilterModalOpen(true)}
        className="flex items-center gap-1 text-sm bg-white border border-gray-200 px-4 py-1.5 rounded-full shadow-sm hover:bg-gray-50 font-bold text-gray-700"
      >
        <Filter size={14} /> さらに絞り込む
      </button>
    </div>

    {!loading && (
      <div className="fixed bottom-24 right-4 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm z-40 opacity-90 md:bottom-6">
        {books.length}件 該当
      </div>
    )}

    {loading ? <p className="text-center py-20 text-gray-500">読み込み中...</p> :
      books.map(book => (
        <div key={book.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow">
          <div className="w-24 h-32 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">画像</div>
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-bold mb-1">{book.publisher}</p>
              <h3 className="font-bold text-base leading-tight mb-2 text-gray-800">{book.title}</h3>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-600 mb-2">¥{book.price || '---'}</p>
              <a href="https://amazon.co.jp" target="_blank" className="w-full bg-orange-400 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-orange-500 transition-colors">
                Amazonで見る <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      ))
    }

    {/* 👇👇👇 ZOZOTOWN風 さらに絞り込むモーダル 👇👇👇 */}
    {isFilterModalOpen && (
  <div className="fixed inset-0 z-[100] h-[100dvh] flex flex-col justify-end pb-20 md:pb-0 md:pl-20 bg-black/50 backdrop-blur-sm md:items-center md:justify-center">
       {/* モーダル本体（高さが画面外にはみ出さないように max-h-[85%] に修正！） */}
       <div className="w-full max-h-[85%] bg-white rounded-t-3xl md:rounded-2xl md:w-[400px] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
          
          {/* ヘッダー（スクロールしても上に固定） */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white flex-shrink-0">
            <div className="w-8"></div>
            <h3 className="font-bold text-lg text-gray-800">さらに絞り込む</h3>
            <button onClick={() => setIsFilterModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 font-bold hover:bg-gray-200">
              ✕
            </button>
          </div>

          {/* フィルター項目エリア */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50">
            
            {/* 教科セレクト */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-3">教科</label>
              <select 
                value={filters.subject || ''} 
                onChange={(e) => setFilters({ ...filters, subject: e.target.value || null, category: null })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-medium focus:ring-2 focus:ring-[#1eb1e6] outline-none"
              >
                <option value="">すべて</option>
                {Object.keys(SUBJECT_DATA).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* 分野セレクト（教科が選ばれている時だけ表示） */}
            {filters.subject && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-3">カテゴリー</label>
                <select 
                  value={filters.category || ''} 
                  onChange={(e) => setFilters({ ...filters, category: e.target.value || null })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-medium focus:ring-2 focus:ring-[#1eb1e6] outline-none"
                >
                  <option value="">すべて</option>
                  {SUBJECT_DATA[filters.subject as keyof typeof SUBJECT_DATA].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 出版社セレクト */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-3">出版社</label>
              <select 
                value={filters.publisher || ''} 
                onChange={(e) => setFilters({ ...filters, publisher: e.target.value || null })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-medium focus:ring-2 focus:ring-[#1eb1e6] outline-none"
              >
                <option value="">すべて</option>
                {publishers.map(pub => (
                  <option key={pub} value={pub}>{pub}</option>
                ))}
              </select>
            </div>

          </div>

          {/* ZOZOTOWN風の水色検索ボタン（iPhoneなどの下部バーに被らないように pb-8 を追加して底上げ） */}
          <div className="p-4 pb-8 md:pb-4 bg-white border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => fetchBooks(filters)}
              className="w-full bg-[#1eb1e6] hover:bg-[#189dc0] text-white font-bold text-lg py-4 rounded-xl transition-all shadow-md active:scale-95"
            >
              検索する
            </button>
          </div>

        </div>
      </div>
    )}
  </div>
)}

</div>

)}

</main>



<TabBar />

</div>

);

}



// サブコンポーネント：メニューカード

function MenuCard({ icon, title, onClick }: any) {

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

