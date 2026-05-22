"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Edit2, BookOpen, Globe, Lock, ArrowDown, Calendar, User } from 'lucide-react';

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRouteDetail = async () => {
      setLoading(true);

      // 1. ログインユーザー取得
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);

      // 2. ルートの基本情報を取得
      const { data: routeData } = await supabase
        .from('study_routes')
        .select('*, profiles(username)')
        .eq('id', routeId)
        .single();

      if (!routeData) {
        setLoading(false);
        return;
      }
      setRoute(routeData);

      // 3. ルートに紐づく参考書を順番通りに取得
      const { data: booksData } = await supabase
        .from('route_books')
        .select('*, books(*)')
        .eq('route_id', routeId)
        .order('sort_order', { ascending: true });

      if (booksData) {
        // 参考書マスターがちゃんと存在するデータだけ抽出
        const orderedBooks = booksData.map(rb => rb.books).filter(Boolean);
        setBooks(orderedBooks);
      }

      setLoading(false);
    };

    if (routeId) fetchRouteDetail();
  }, [routeId]);

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">ルートを読み込み中...</div>;
  if (!route) return <div className="p-10 text-center text-gray-500 font-bold">参考書ルートが見つかりませんでした。</div>;

  const isMyRoute = user && user.id === route.user_id;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen pb-24">
      
      {/* 上部ヘッダー（戻る ＆ 編集ボタン） */}
      <div className="flex items-center justify-between border-b border-gray-200/60 pb-4 mb-6">
      <button onClick={() => typeof window !== 'undefined' && window.history.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-3xs hover:bg-gray-50 transition-all">
        <ChevronLeft size={18} /> 検索結果に戻る
        </button>
        
        {/* 💡 自分のルートなら、ここから直接編集画面へ飛べる親切設計 */}
        {isMyRoute && (
          <button 
            onClick={() => router.push(`/learning-data/${route.id}/edit`)}
            className="text-sm text-blue-600 flex items-center gap-1.5 font-black bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shadow-3xs hover:bg-blue-100 transition-all active:scale-95"
          >
            <Edit2 size={15} strokeWidth={2.5} /> このルートを編集
          </button>
        )}
      </div>

      {/* 🟢 メイン：ルートの基本情報情報カード */}
      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100/80 mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {route.is_public ? (
            <span className="flex items-center gap-1 text-xs font-black bg-green-50 text-green-700 px-2.5 py-1 rounded-md border border-green-200/40">
              <Globe size={12} strokeWidth={2.5} /> 公開中
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md">
              <Lock size={12} strokeWidth={2.5} /> 非公開
            </span>
          )}
          <span className="text-xs font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-200/40">
            {route.subject}
          </span>
        </div>

        <div>
          <h1 className="font-black text-xl md:text-2xl text-slate-900 leading-snug mb-2">{route.title}</h1>
          
          {/* 作成者・作成日のメタ情報 */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 pt-1">
            <span className="flex items-center gap-1"><User size={13} /> {route.profiles?.username || '名無しユーザー'}</span>
            <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(route.created_at).toLocaleDateString('ja-JP')}</span>
            <span className="flex items-center gap-1"><BookOpen size={13} /> 合計 {books.length} 冊</span>
          </div>
        </div>

        {/* ルートの説明 */}
        <div className="pt-4 border-t border-slate-50">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">ルートの解説・アドバイス</h2>
          <p className="text-sm md:text-base text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
            {route.description || 'このルートに詳細な解説はまだ登録されていません。'}
          </p>
        </div>
      </div>

      {/* 🟢 メイン：参考書のフロータイムライン */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider pl-1">参考書の順番</h2>
        
        {books.length === 0 ? (
          <p className="p-8 text-center text-sm font-bold text-slate-400 bg-white rounded-2xl border border-dashed border-gray-100">参考書が登録されていません。</p>
        ) : (
          books.map((book, index) => (
            <div key={book.id} className="flex flex-col items-center">
              
              {/* 各参考書の横長スリムカード（クリックで参考書本体の詳細へ飛べる！） */}
              <div 
                onClick={() => router.push(`/books/${book.id}`)}
                className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
              >
                {/* 順番ナンバー円 */}
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-600 text-white font-black text-sm md:text-base flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10">
                  {index + 1}
                </div>

                {/* ミニ表紙画像 */}
                <div className="w-14 h-20 bg-slate-50 rounded-lg overflow-hidden border border-gray-200/80 flex-shrink-0 shadow-3xs">
                  {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="text-[9px] text-slate-400 font-bold h-full flex items-center justify-center">NO IMAGE</div>}
                </div>

                {/* 書籍情報 */}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 mb-0.5">{book.publisher}</p>
                  <h3 className="font-black text-sm md:text-base text-slate-800 truncate group-hover:text-blue-600 transition-colors">{book.title}</h3>
                  <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{book.author}</p>
                </div>
              </div>

              {/* 💡 次の本がある場合は、太い下向きの矢印をアニメーション付きで配置 */}
              {index < books.length - 1 && (
                <div className="my-2 text-blue-500/80 p-1 bg-blue-50 rounded-full border border-blue-100 shadow-3xs animate-pulse">
                  <ArrowDown size={18} strokeWidth={3} />
                </div>
              )}
              
            </div>
          ))
        )}
      </div>

    </div>
  );
}