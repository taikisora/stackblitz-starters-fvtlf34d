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

const SUPABASE_ANON_KEY = 'sb_publishable_MbxHPGc62c9GY8pZwWmcmQ_L10kZhkf';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



export default function App() {

// --- 状態管理 ---

const [activeTab, setActiveTab] = useState('home'); // 現在のタブ

const [searchStep, setSearchStep] = useState('menu'); // 検索モード内の画面管理

const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

const [books, setBooks] = useState<any[]>([]);

const [loading, setLoading] = useState(false);



// --- データ取得 ---

// () の中に targetSubject を入れるのがポイントです！

// () の中に targetSubject を入れる

const fetchBooks = async (targetSubject: any) => {

setLoading(true);

let query = supabase.from('books').select('*');


// selectedCategory ではなく、この targetSubject を使う！

// if (targetSubject) {
//   query = query.eq('subject', targetSubject);
// }


const { data } = await query;

// ↓このアラートで確認しているはず

alert("届いたデータの数: " + (data ? data.length : 0));


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

<div className="space-y-3">

<button onClick={() => setSearchStep('menu')} className="text-sm text-blue-600 mb-2">← 戻る</button>

<h3 className="font-bold text-lg mb-4">教科を選択</h3>

{['英語', '数学', '国語', '理科', '社会'].map(subject => (

<button

key={subject}

onClick={() => {setSelectedCategory(subject); fetchBooks(subject);}}

className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:bg-blue-50"

>

<span className="font-medium">{subject}</span>

<ChevronRight size={20} className="text-gray-400" />

</button>

))}

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

