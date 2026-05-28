"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Heart, ChevronRight, User } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export default function SavedRoutesPage() {
  const router = useRouter();
  const [favoriteRoutes, setFavoriteRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 💡 ページネーション用の状態を追加
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fetchSavedRoutes = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. まず全体の総件数（カウント）を取得します
      const { count, error: countError } = await supabase
        .from('route_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (!countError && count !== null) {
        setTotalItems(count);
      }

      // 2. ページネーションの範囲（range）を計算してデータを取得します
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('route_likes')
        .select(`
          route_id,
          study_routes (
            id,
            title,
            subject,
            profiles (
              username,
              avatar_color
            )
          )
        `)
        .eq('user_id', session.user.id)
        .range(from, to);

      if (error) {
        console.error("いいねルート取得エラー:", error);
      } else if (data) {
        const extractedRoutes = data.map((item: any) => item.study_routes).filter(Boolean);
        setFavoriteRoutes(extractedRoutes);
      }
      setLoading(false);
    };

    fetchSavedRoutes();
  }, [router, currentPage]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  if (loading && favoriteRoutes.length === 0) return <div className="p-10 text-center text-gray-500 font-medium animate-pulse">読み込み中...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 flex flex-col justify-between">
      <div className="space-y-6">
        
        {/* 戻るボタンヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-2xs hover:bg-gray-50 transition-all">
            <ChevronLeft size={16} /> 戻る
          </button>
          <h1 className="text-base font-black text-gray-800">コレクション</h1>
          
          {/* ミニページインジケーター（ヘッダー右側） */}
          {!loading && totalPages > 1 ? (
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md bg-white border border-gray-200/40 text-slate-700 disabled:opacity-40 disabled:bg-transparent disabled:border-transparent active:scale-90 transition-transform cursor-pointer"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
              <span className="text-[10px] font-black text-slate-700 px-1.5 min-w-[36px] text-center">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md bg-white border border-gray-200/40 text-slate-700 disabled:opacity-40 disabled:bg-transparent disabled:border-transparent active:scale-90 transition-transform cursor-pointer"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <div className="w-16"></div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6 border-b border-gray-50 pb-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-50 p-2 rounded-xl shadow-3xs">
                <Heart className="text-amber-500 fill-current" size={22} />
              </div>
              <h2 className="font-black text-xl text-gray-800">いいねしたルート</h2>
            </div>
            {!loading && <span className="text-xs text-gray-400 font-bold">全 {totalItems} 件</span>}
          </div>

          {favoriteRoutes.length === 0 ? (
            <p className="text-sm text-gray-400 font-bold text-center py-16">いいねした参考書ルートはまだありません。</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteRoutes.map(route => (
                <Link 
                  href={`/learning-data/${route?.id}`} 
                  key={route?.id} 
                  className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-white hover:border-blue-300 hover:shadow-2xs transition-all group"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-black border border-blue-100 shadow-3xs">
                        {route?.subject}
                      </span>
                      <span className="text-gray-400 font-bold text-[10px] truncate max-w-[120px]">
                        by {route?.profiles?.username || '名無し'}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-800 line-clamp-1 leading-snug group-hover:text-blue-600 transition-colors">
                      {route?.title}
                    </h3>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 下部の大枠ページ遷移ナビゲーション（2ページ以上あるときだけ表示） */}
      {!loading && favoriteRoutes.length > 0 && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-6 bg-white py-4 border-t border-gray-200 shadow-2xs w-full max-w-3xl mx-auto px-4 rounded-b-2xl">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 text-xs font-black rounded-xl border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 disabled:bg-gray-50 cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2.5} /> 前へ
          </button>
          
          <span className="text-sm font-black text-slate-800 tracking-wider">
            {currentPage} / {totalPages} ページ
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-4 py-2 text-xs font-black rounded-xl border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 disabled:bg-gray-50 cursor-pointer"
          >
            次へ <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}