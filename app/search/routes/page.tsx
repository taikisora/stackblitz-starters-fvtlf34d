"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Search, User, Heart, MessageCircle, BookOpen, ArrowDown, ChevronRight, LogIn } from 'lucide-react';

const SUBJECT_DATA = { 
  '英語': ['英語（総合）', '英単語', '英熟語', '英文法', '長文', 'リスニング', '英作文', 'その他（英語）'], 
  '数学': ['数学（総合）', '数IA', '数IIB', '数IIIC', 'その他（数学）'], 
  '国語': ['国語（総合）', '現代文', '古文', '漢文', 'その他（国語）'], 
  '理科': ['理科（総合）', '物理', '化学', '生物', '地学', 'その他（理科）'], 
  '社会': ['社会（総合）', '歴史総合', '日本史', '世界史', '地理', '公共', '倫理', '政治・経済', '社会のその他'] 
};

const ITEMS_PER_PAGE = 20;

export default function RouteSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [publicRoutes, setPublicRoutes] = useState<any[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [selectedRouteSubject, setSelectedRouteSubject] = useState('すべて');
  const [activeRouteTab, setActiveRouteTab] = useState('all');
  const [user, setUser] = useState<any>(null);

  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchParams, activeRouteTab, selectedRouteSubject, routeSearchQuery]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  // データをロードする関数
  const fetchRoutesData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRoutesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let currentUser = null;
      if (session) {
        setUser(session.user);
        currentUser = session.user;
      } else {
        setUser(null);
      }

      // 1. ベースクエリを構築
      let query = supabase
        .from('study_routes')
        .select('*, profiles ( username, avatar_color )', { count: 'exact' })
        .eq('is_public', true);

      // タブと教科による絞り込みの適用
      if (activeRouteTab !== 'all') {
        if (selectedRouteSubject === '未選択') {
          const allowedCategories = SUBJECT_DATA[activeRouteTab as keyof typeof SUBJECT_DATA] || [];
          query = query.or(`subject.eq.${activeRouteTab},subject.in.(${allowedCategories.map(c => `"${c}"`).join(',')})`);
        } else {
          query = query.eq('subject', selectedRouteSubject);
        }
      }

      // 文字列検索の適用
      if (routeSearchQuery.trim() !== '') {
        const q = routeSearchQuery.toLowerCase();
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,subject.ilike.%${q}%`);
      }

      query = query.order('created_at', { ascending: false });

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: routesData, error, count } = await query;

      if (!error && routesData) {
        if (count !== null) setTotalItems(count);

        const routesWithBooksHydrated = await Promise.all(routesData.map(async (route) => {
          let displayBooks: { sort_order: number; title: string }[] = [];
          let totalCount = 0;

          if (route.flow_structure && Array.isArray(route.flow_structure)) {
            const bookIds: string[] = [];
            const customTitlesMap = new Map<string, string>();

            route.flow_structure.forEach((node: any) => {
              if (!node.type || node.type === 'single') {
                totalCount += 1;
                if (node.book_id) {
                  bookIds.push(node.book_id);
                  if (node.custom_title) customTitlesMap.set(node.book_id, node.custom_title);
                }
              } else {
                if (node.route_A) {
                  totalCount += node.route_A.length;
                  node.route_A.forEach((b: any) => {
                    if (b.book_id) {
                      bookIds.push(b.book_id);
                      if (b.custom_title) customTitlesMap.set(b.book_id, b.custom_title);
                    }
                  });
                }
                if (node.route_B) {
                  totalCount += node.route_B.length;
                  node.route_B.forEach((b: any) => {
                    if (b.book_id) {
                      bookIds.push(b.book_id);
                      if (b.custom_title) customTitlesMap.set(b.book_id, b.custom_title);
                    }
                  });
                }
              }
            });

            if (bookIds.length > 0) {
              const { data: fetchedBooks } = await supabase
                .from('books')
                .select('id, title')
                .in('id', bookIds.slice(0, 3)); // プレビュー上限用に少し多めに取得
              
              if (fetchedBooks) {
                displayBooks = fetchedBooks.map((b, idx) => {
                  let t = b.title;
                  if (b.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
                    t = customTitlesMap.get(b.id) || "カスタム参考書";
                  }
                  return { sort_order: idx + 1, title: t };
                });
              }
            }
          } else {
            const { data: oldBooks } = await supabase
              .from('route_books')
              .select('sort_order, books(id, title)')
              .eq('route_id', route.id)
              .order('sort_order', { ascending: true });
            
            if (oldBooks) {
              totalCount = oldBooks.length;
              displayBooks = oldBooks.map(ob => {
                // 💡 修正：TypeScriptの配列誤認による型エラーを回避するため、安全にキャストを挟みます
                const bookData = ob.books as any;
                return {
                  sort_order: ob.sort_order,
                  title: bookData?.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? "カスタム参考書" : (bookData?.title || '')
                };
              });
            }
          }

          // 💡 修正：詳細画面と完全に同じ方法！route_commentsテーブルから直接、このルートのコメント実数を数えて取得します
          const { count: realCommentCount } = await supabase
            .from('route_comments')
            .select('*', { count: 'exact', head: true })
            .eq('route_id', route.id);

          return {
            ...route,
            computed_total_books: totalCount,
            computed_display_books: displayBooks,
            // 💡 取得した実数をそのまま流し込みます。JSX側（spanの中）は {route.comments_count} のままでOKです！
            comments_count: realCommentCount || 0
          };
        }));

        if (currentUser) {
          const routeIds = routesWithBooksHydrated.map(r => r.id);
          const { data: userLikes } = await supabase
            .from('route_likes')
            .select('route_id')
            .eq('user_id', currentUser.id)
            .in('route_id', routeIds);

          const savedRouteIds = new Set(userLikes?.map(l => l.route_id));

          const finalRoutes = routesWithBooksHydrated.map(r => ({
            ...r,
            user_liked: savedRouteIds.has(r.id)
          }));
          setPublicRoutes(finalRoutes);
        } else {
          setPublicRoutes(routesWithBooksHydrated.map(r => ({ ...r, user_liked: false })));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isSilent) setRoutesLoading(false);
    }
  }, [currentPage, activeRouteTab, selectedRouteSubject, routeSearchQuery]);

  useEffect(() => {
    fetchRoutesData();

    const handleFocus = () => {
      fetchRoutesData(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchRoutesData]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  const handleRouteLike = async (routeId: string) => {
    if (!user) {
      alert('この機能を使うにはログインが必要です。ログイン画面へ移動します。');
      router.push('/login');
      return;
    }

    const routeIndex = publicRoutes.findIndex(r => r.id === routeId);
    if (routeIndex === -1) return;

    const targetRoute = publicRoutes[routeIndex];
    const currentStatus = targetRoute.user_liked;
    const nextStatus = !currentStatus;

    const currentCount = targetRoute.likes_count || 0;
    const nextCount = nextStatus ? currentCount + 1 : Math.max(0, currentCount - 1);

    const newRoutes = [...publicRoutes];
    newRoutes[routeIndex] = {
      ...targetRoute,
      likes_count: nextCount,
      user_liked: nextStatus
    };
    setPublicRoutes(newRoutes);

    try {
      if (currentStatus) {
        await supabase.from('route_likes').delete().eq('user_id', user.id).eq('route_id', routeId);
      } else {
        await supabase.from('route_likes').insert({ user_id: user.id, route_id: routeId });
      }
      await supabase.from('study_routes').update({ likes_count: nextCount }).eq('id', routeId);
    } catch (err) {
      console.error("いいね同期エラー:", err);
    }
  };
  
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 flex flex-col justify-between">
      <div className="space-y-4 animate-fade-in">
        
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/search')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
            <ChevronLeft size={18} /> 検索メニューへ
          </button>
          
          {!routesLoading && user && totalPages > 1 && (
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
          )}

          <div className="flex items-center gap-2">
            {!routesLoading && user && <span className="text-xs text-gray-400 font-bold">全 {totalItems} 件</span>}
          </div>
        </div>

        {/* 検索窓 */}
        <div className="relative flex items-center">
          <input 
            type="text" 
            placeholder="題名、説明、本で検索" 
            value={routeSearchQuery}
            onChange={(e) => setRouteSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:border-blue-500 shadow-xs text-sm text-slate-800 font-bold"
          />
          <Search className="absolute left-4 text-gray-400" size={16} />
        </div>

        <div className="overflow-x-auto -mx-4 px-4 scrollbar-none flex gap-1.5 border-b border-gray-100 pb-2">
          {[{ id: 'all', name: 'すべて' }, ...Object.keys(SUBJECT_DATA).map(k => ({ id: k, name: k }))].map((tab) => {
            const isSelected = activeRouteTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveRouteTab(tab.id);
                  setSelectedRouteSubject(tab.id === 'all' ? 'すべて' : '未選択');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors border ${
                  isSelected ? 'bg-gray-800 text-white border-gray-800 shadow-2xs' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </div>

        {activeRouteTab !== 'all' && (
          <div className="bg-white p-2.5 rounded-2xl border border-gray-100 shadow-2xs flex flex-wrap gap-1.5 animate-fade-in">
            <button
              type="button"
              onClick={() => setSelectedRouteSubject('未選択')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                selectedRouteSubject === '未選択' ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200/60'
              }`}
            >
              {activeRouteTab}すべて
            </button>

            {(SUBJECT_DATA[activeRouteTab as keyof typeof SUBJECT_DATA] || []).map((sub) => {
              const isSelected = selectedRouteSubject === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedRouteSubject(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                    isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-3.5 pt-0.5">
          {routesLoading ? (
            <div className="text-center py-20 text-gray-400 font-bold animate-pulse text-sm">ルートを読み込み中...</div>
          ) : !user ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-2xs p-6 flex flex-col items-center justify-center space-y-5">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm">
                <User size={24} className="stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 text-sm md:text-base">参考書ルートを閲覧するにはログインが必要です</h4>
                <p className="text-gray-400 font-bold text-xs">アカウントを作成またはログインすると、先輩たちのルートがすべて見放題になります。</p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs md:text-sm px-6 py-3 rounded-xl shadow-3xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn size={15} strokeWidth={3} />
                ログイン・アカウント作成画面へ
              </button>
            </div>
          ) : publicRoutes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-2xs">
              <p className="text-gray-400 font-bold text-sm">条件に合う参考書ルートが見つかりませんでした。</p>
            </div>
          ) : (
            publicRoutes.map((route) => {
              const sortedBooks = route.computed_display_books || [];
              const totalCount = route.computed_total_books || 0;
              const isLiked = route.user_liked;

              return (
                <div 
                  key={route.id}
                  onClick={() => router.push(`/learning-data/${route.id}`)}
                  className="group bg-white rounded-2xl p-4 border border-gray-100 shadow-3xs hover:shadow-2xs hover:border-blue-100/70 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 border border-black/5 shadow-3xs overflow-hidden ${
                          route.profiles?.avatar_color === 'red' ? 'bg-red-500' :
                          route.profiles?.avatar_color === 'orange' ? 'bg-orange-500' :
                          route.profiles?.avatar_color === 'amber' ? 'bg-amber-500' :
                          route.profiles?.avatar_color === 'emerald' ? 'bg-emerald-500' :
                          route.profiles?.avatar_color === 'sky' ? 'bg-sky-500' :
                          route.profiles?.avatar_color === 'blue' ? 'bg-blue-500' :
                          route.profiles?.avatar_color === 'indigo' ? 'bg-indigo-500' :
                          route.profiles?.avatar_color === 'purple' ? 'bg-purple-500' :
                          route.profiles?.avatar_color === 'pink' ? 'bg-pink-500' :
                          'bg-gray-500'
                        }`}
                      >
                        <User size={13} />
                      </div>
                      <span className="text-gray-400 font-bold text-[11px]">作成者: {route.profiles?.username || '名無し'}</span>
                    </div>

                    <span className="font-black bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded border border-blue-200/30">
                      {route.subject}
                    </span>
                  </div>

                  <div>
                    {/* 💡 変更：タイトルと解説欄の行間・マージンを小さく引き締め */}
                    <h3 className="font-black text-slate-900 text-base leading-snug mb-1 group-hover:text-blue-600 transition-colors flex items-center justify-between gap-2">
                      <span>{route.title}</span>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                    </h3>
                    {route.description && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-1 leading-normal">
                        {route.description}
                      </p>
                    )}
                  </div>

                  {/* 🗺️ 参考書プレビュー箱エリア */}
                  {/* 💡 変更：内側の余白を圧縮（p-4 ➔ p-2.5）、下部の余白も（space-y-2 ➔ space-y-1）へギチギチに引き締め */}
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-gray-100/70 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 tracking-wide mb-1.5 flex items-center gap-1.5 border-b border-slate-200/40 pb-1">
                      <BookOpen size={12} strokeWidth={2.5} /> ルートの構成（全 {totalCount} 冊）
                    </p>
                    
                    {/* 💡 変更：表示上限を「最初の2冊（slice(0, 2)）」に変更！これで縦幅が一気に激減します */}
                    {sortedBooks.slice(0, 2).map((rb: any, idx) => (
                      <div key={idx} className="flex flex-col items-center w-full">
                        <div className="w-full flex items-center gap-2 text-xs text-slate-700 min-w-0 py-0.5">
                          <span className="w-4 h-4 bg-slate-400/90 text-white font-black text-[9px] rounded-full flex items-center justify-center shrink-0 shadow-3xs">
                            {rb.sort_order}
                          </span>
                          <span className="font-bold truncate flex-1 text-slate-800">{rb.title}</span>
                        </div>
                        {/* 💡 変更：2冊を繋ぐミニ矢印の上下マージンを限界までゼロに接近 */}
                        {idx < sortedBooks.slice(0, 2).length - 1 && <ArrowDown size={10} className="text-slate-300 my-0.5" strokeWidth={3} />}
                      </div>
                    ))}
                    
                    {/* 💡 変更：他に見切れている冊数案内もプレビュー数変更（3冊 ➔ 2冊）に合わせて正確に補正 */}
                    {totalCount > 2 && (
                      <p className="text-[10px] text-slate-400 font-bold pl-6 pt-0.5">他 {totalCount - 2} 冊の参考書...</p>
                    )}
                  </div>

                  {/* いいね・コメントエリア */}
                  {/* 💡 変更：上部の区切り線のマージンを削り、アイコンまわりのパディングをタイト化 */}
                  <div className="flex items-center gap-4 pt-1.5 border-t border-gray-100/50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRouteLike(route.id); 
                      }}
                      className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                        isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'
                      }`}
                    >
                      <Heart size={15} fill={isLiked ? "currentColor" : "none"} strokeWidth={2.5} />
                      <span className="text-xs">{route.likes_count || 0}</span>
                    </button>

                    <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                      <MessageCircle size={15} strokeWidth={2.5} />
                      <span className="text-xs">{route.comments_count}</span>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ページ遷移ナビゲーション */}
      {!routesLoading && user && publicRoutes.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-6 bg-white py-4 border-t border-gray-200 shadow-2xs w-full max-w-3xl mx-auto px-4 rounded-b-2xl">
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