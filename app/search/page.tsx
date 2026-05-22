"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Pencil, Bookmark, School, Crown, Search, ChevronRight, Route } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const [keywordSearchText, setKeywordSearchText] = useState('');

  const handleKeywordSearch = () => {
    if (keywordSearchText.trim() !== '') {
      router.push(`/books?q=${encodeURIComponent(keywordSearchText.trim())}`);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4">
      
      <div className="space-y-6">
        {/* キーワード検索窓 */}
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

        {/* ルート検索への導線 */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-gray-400 pl-1">参考書から探す</p>
          <button 
            onClick={() => router.push('/search/routes')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-2xl shadow-md text-white flex items-center justify-between active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Route size={22} className="text-white" />
              </div>
              <div className="text-left">
                <span className="font-extrabold text-base block leading-tight">参考書ルート検索</span>
                <span className="text-[10px] text-blue-100 font-medium">みんなが作った合格ルートを検索</span>
              </div>
            </div>
            <ChevronRight className="text-white/70 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* カテゴリ別検索カード群 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 💡 修正：アラートを消して、それぞれの独立したフォルダへrouter.pushするようにリンクを繋ぎました！ */}
          <MenuCard icon={<Pencil className="text-orange-500" />} title="教科" bgColor="bg-orange-50/60 hover:bg-orange-100/70" onClick={() => router.push('/search/subject')} />
          <MenuCard icon={<Bookmark className="text-green-500" />} title="出版社" bgColor="bg-green-50/60 hover:bg-green-100/70" onClick={() => router.push('/search/publisher')} />
          <MenuCard icon={<School className="text-blue-500" />} title="大学別" bgColor="bg-blue-50/60 hover:bg-blue-100/70" onClick={() => router.push('/search/university')} />
          <MenuCard icon={<Crown className="text-yellow-600" />} title="ランキング" bgColor="bg-yellow-50/60 hover:bg-yellow-100/70" onClick={() => alert('ランキングは準備中です')} />
        </div>

        {/* 特設対策カード形式 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* 教科書カード */}
          <div className="bg-gradient-to-br from-white to-gray-50/50 p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">📖</div>
              <h3 className="font-bold text-lg text-gray-800">教科書から探す</h3>
              <p className="text-xs text-gray-400 leading-relaxed">学校の教科書や、定期テスト対策用のガイド本を検索します。</p>
            </div>
            <button onClick={() => router.push('/search/textbook')} className="mt-6 w-full bg-indigo-50 text-indigo-700 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
              教科書を開く <ChevronRight size={16} />
            </button>
          </div>

          {/* 共通テストカード */}
          <div className="bg-gradient-to-br from-white to-gray-50/50 p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">📝</div>
              <h3 className="font-bold text-lg text-gray-800">共通テスト対策</h3>
              <p className="text-xs text-gray-400 leading-relaxed">黒本・赤本などの過去問から、各社の模試・予想パックまで網羅。</p>
            </div>
            {/* 💡 クエリを使って共通テスト（exam）画面へリンク */}
            <button onClick={() => router.push('/search/exam?type=center')} className="mt-6 w-full bg-sky-50 text-sky-700 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-sky-100 transition-colors">
              共テ対策を開く <ChevronRight size={16} />
            </button>
          </div>

          {/* 私大・2次カード */}
          <div className="bg-gradient-to-br from-white to-gray-50/50 p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">📕</div>
              <h3 className="font-bold text-lg text-gray-800">私大・2次試験対策</h3>
              <p className="text-xs text-gray-400 leading-relaxed">大学別過去問（赤本）や、二次試験レベルの記述対策問題集。</p>
            </div>
            {/* 💡 クエリを使って私大2次（exam）画面へリンク */}
            <button onClick={() => router.push('/search/exam?type=secondary')} className="mt-6 w-full bg-rose-50 text-rose-700 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
              2次対策を開く <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

function MenuCard({ icon, title, bgColor, onClick }: { icon: React.ReactNode, title: string, bgColor: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4 active:scale-95 transition-all w-full h-32 ${bgColor}`}
    >
      <div className="p-3 bg-white rounded-xl text-2xl shadow-sm">{icon}</div>
      <span className="font-bold text-gray-700 text-sm">{title}</span>
    </button>
  );
}