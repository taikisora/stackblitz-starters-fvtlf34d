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

// 教科と小カテゴリーのデータ定義
const SUBJECT_DATA = {
  '英語': ['英単語', '英文法', '長文', 'その他（英語）'],
  '数学': ['数IA', '数IIB', '数IIIC', 'その他（数学）'],
  '国語': ['現代文', '古文', '漢文', 'その他（国語）'],
  '理科': ['物理', '化学', '生物', '地学', 'その他（理科）'],
  '社会': ['歴史総合', '日本史', '世界史', '地理', '政治経済', 'その他（社会）']
};

const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]); // 「詳細＞」が開いている教科のリスト

// { type: 'subject', value: '英語' } または { type: 'category', value: '英単語' } のように保存します
const [selectedTarget, setSelectedTarget] = useState<{ type: string, value: string } | null>(null);



// --- データ取得 ---
const fetchBooks = async (target: { type: string, value: string }) => {
  setLoading(true);
  let query = supabase.from('books').select('*');

  // typeによって、検索する列を変える
  if (target.type === 'subject') {
    query = query.eq('subject', target.value);
  } else if (target.type === 'category') {
    query = query.eq('category', target.value);
  }

  const { data } = await query;
  setBooks(data || []);
  setLoading(false);
  setSearchStep('results');
};



// --- UI部品：ナビゲーション ---

const TabBar = () => (

<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 pb-6 z-50">

<button onClick={() => setActiveTab('home')} className={`flex flex-col items-center ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'}`}>

<Home size={24} /><span className="text-xs mt-1">ホーム</span>

</button>

<button onClick={() => {setActiveTab('search'); setSearchStep('menu');}} className={`flex flex-col items-center ${activeTab === 'search' ? 'text-blue-600' : 'text-gray-400'}`}>

<Search size={24} /><span className="text-xs mt-1">検索</span>

</button>

<button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400'}`}>

<BarChart2 size={24} /><span className="text-xs mt-1">学習データ</span>

</button>

<button onClick={() => setActiveTab('mypage')} className={`flex flex-col items-center ${activeTab === 'mypage' ? 'text-blue-600' : 'text-gray-400'}`}>

<User size={24} /><span className="text-xs mt-1">マイページ</span>

</button>

</div>

);



return (

<div className="min-h-screen bg-gray-50 pb-24 text-gray-800">

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

<MenuCard icon={<Bookmark className="text-green-500" />} title="出版社" onClick={() => {}} />

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

    {/* 検索ボタン */}
    <div className="fixed bottom-20 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-30">
      <button
        onClick={() => {
          if (selectedTarget) fetchBooks(selectedTarget);
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



{/* 検索結果画面 */}

{searchStep === 'results' && (

<div className="space-y-4">

<div className="flex justify-between items-center mb-4">

<button onClick={() => setSearchStep('subject-select')} className="text-sm text-blue-600">← 再検索</button>

<button className="flex items-center gap-1 text-sm bg-white border px-3 py-1 rounded-full shadow-sm">

<Filter size={16} /> 絞り込み

</button>

</div>

{!loading && (
    <div className="fixed bottom-24 right-4 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm z-40 opacity-90">
      {books.length}件 該当
    </div>
  )}

{loading ? <p className="text-center">読み込み中...</p> :

books.map(book => (

<div key={book.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4">

<div className="w-24 h-32 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400">画像</div>

<div className="flex-1">

<p className="text-xs text-gray-500">{book.publisher}</p>

<h3 className="font-bold text-base leading-tight mb-1">{book.title}</h3>

<p className="text-lg font-bold text-orange-600">¥{book.price || '---'}</p>

<div className="mt-2 flex gap-2">

<a

href="https://amazon.co.jp" // 本来はbook.amazon_url

target="_blank"

className="flex-1 bg-orange-400 text-white text-xs font-bold py-2 rounded-full flex items-center justify-center gap-1"

>

Amazon <ExternalLink size={12} />

</a>

</div>

</div>

</div>

))

}

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

