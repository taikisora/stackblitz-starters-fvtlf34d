"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Search, User, Heart, MessageCircle, Route, BookOpen, ArrowDown, ChevronRight } from 'lucide-react';

// 📊 教科データ
const SUBJECT_DATA = { 
  '英語': ['英単語', '英熟語', '英文法', '長文', 'リスニング', 'その他（英語）'], 
  '数学': ['数IA', '数IIB', '数IIIC', 'その他（数学）'], 
  '国語': ['現代文', '古文', '漢文', 'その他（国語）'], 
  '理科': ['物理', '化学', '生物', '地学', 'その他（理科）'], 
  '社会': ['歴史総合', '日本史', '世界史', '地理', '公共', '倫理', '政治・経済', '社会のその他'] 
};

// 💡 修正：関数名を『RouteSearchPage』に完全統一しました
export default function RouteSearchPage() {
  const router = useRouter();
  const [publicRoutes, setPublicRoutes] = useState<any[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [selectedRouteSubject, setSelectedRouteSubject] = useState('すべて');
  const [activeRouteTab, setActiveRouteTab] = useState('all');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchRoutesAndUser = async () => {
      setRoutesLoading(true);
      
      // 1. ログインユーザーの取得
      const { data: { session } } = await supabase.auth.getSession();
      let currentUser = null;
      if (session) {
        setUser(session.user);
        currentUser = session.user;
      }

      // 2. 参考書ルートの安全な取得（リレーションエラーになる route_likes は select から除外します）
      const { data: routesData, error } = await supabase
        .from('study_routes')
        .select(`
          *,
          profiles ( username, avatar_color ),
          route_books (
            sort_order,
            books ( title, publisher )
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (!error && routesData) {
        if (currentUser) {
          // 3. ログイン中なら、自分がどのルートにいいねしているかを route_likes から別途取得
          const routeIds = routesData.map(r => r.id);
          const { data: userLikes } = await supabase
            .from('route_likes')
            .select('route_id')
            .eq('user_id', currentUser.id)
            .in('route_id', routeIds);

          // いいねしているルートのIDをセット化
          const likedRouteIds = new Set(userLikes?.map(l => l.route_id));

          // 各ルートに user_liked 属性を合体させる
          const routesWithStatus = routesData.map(r => ({
            ...r,
            user_liked: likedRouteIds.has(r.id)
          }));
          setPublicRoutes(routesWithStatus);
        } else {
          // 未ログインならすべて「いいね無し」
          setPublicRoutes(routesData.map(r => ({ ...r, user_liked: false })));
        }
      }
      setRoutesLoading(false);
    };
    fetchRoutesAndUser();
  }, []);

  const filteredRoutes = publicRoutes.filter(route => {
    if (activeRouteTab !== 'all') {
      if (selectedRouteSubject === '未選択') {
        const allowedCategories = SUBJECT_DATA[activeRouteTab as keyof typeof SUBJECT_DATA] || [];
        if (!allowedCategories.includes(route.subject) && route.subject !== activeRouteTab) {
          return false;
        }
      } else {
        if (route.subject !== selectedRouteSubject) return false;
      }
    }

    if (routeSearchQuery.trim() !== '') {
      const query = routeSearchQuery.toLowerCase();
      const titleMatch = route.title?.toLowerCase().includes(query);
      const subjectMatch = route.subject?.toLowerCase().includes(query);
      const descMatch = route.description?.toLowerCase().includes(query);
      const booksMatch = route.route_books?.some((rb: any) => rb.books?.title?.toLowerCase().includes(query));
      return titleMatch || subjectMatch || descMatch || booksMatch;
    }
    return true;
  });

  const handleRouteLike = async (routeId: string) => {
    if (!user) {
      alert('この機能を使うにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }

    const routeIndex = publicRoutes.findIndex(r => r.id === routeId);
    if (routeIndex === -1) return;

    const targetRoute = publicRoutes[routeIndex];
    const currentStatus = targetRoute.user_liked;
    const nextStatus = !currentStatus; // 反転

    if (currentStatus) {
      // すでにいいね済みの場合は削除
      await supabase.from('route_likes').delete().eq('user_id', user.id).eq('route_id', routeId);
    } else {
      // 未いいねの場合は追加
      await supabase.from('route_likes').insert({ user_id: user.id, route_id: routeId });
    }

    // study_routes テーブル自体のカウント数も参考書と同じように update して保存する
    const currentCount = targetRoute.likes_count || 0; // 💡 カラム名が saved_count の場合はここを saved_count に
    const nextCount = nextStatus ? currentCount + 1 : Math.max(0, currentCount - 1);
    
    await supabase.from('study_routes').update({ likes_count: nextCount }).eq('id', routeId); // 💡 ここも同様

    // 画面の見た目を即座に更新
    const newRoutes = [...publicRoutes];
    newRoutes[routeIndex] = {
      ...targetRoute,
      likes_count: nextCount,
      user_liked: nextStatus
    };
    setPublicRoutes(newRoutes);
  };
  
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4">
      <div className="space-y-4 animate-fade-in">
        
        {/* ヘッダー部分 */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/search')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
            <ChevronLeft size={18} /> 検索メニューへ
          </button>
          <h2 className="text-base font-extrabold text-gray-800">参考書ルートを探す</h2>
          <div className="w-16"></div>
        </div>

        {/* 検索窓 */}
        <div className="relative flex items-center">
          <input 
            type="text" 
            placeholder="題名、説明、本で検索" 
            value={routeSearchQuery}
            onChange={(e) => setRouteSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-blue-500 shadow-xs text-sm font-medium"
          />
          <Search className="absolute left-4 text-gray-400" size={16} />
        </div>

        {/* 大教科タブ */}
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

        {/* 小教科エリア */}
        {activeRouteTab !== 'all' && (
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs flex flex-wrap gap-1.5 animate-fade-in">
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

        {/* ルート検索結果リスト */}
        <div className="space-y-4 md:space-y-5 pt-1">
          {routesLoading ? (
            <div className="text-center py-20 text-gray-400 font-bold animate-pulse text-sm">ルートを読み込み中...</div>
          ) : filteredRoutes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-2xs">
              <p className="text-gray-400 font-bold text-sm">条件に合う参考書ルートが見つかりませんでした。</p>
            </div>
          ) : (
            filteredRoutes.map((route) => {
                const sortedBooks = [...(route.route_books || [])].sort((a, b) => a.sort_order - b.sort_order);
                
                // 💡 修正：上で合体させた user_liked をそのまま使うので確実で超シンプルです！
                const isLiked = route.user_liked;

              return (
                <div 
                  key={route.id}
                  onClick={() => router.push(`/learning-data/${route.id}`)}
                  className="group bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100/70 transition-all cursor-pointer space-y-4"
                >
                  {/* 作成者アイコン */}
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 border border-black/5 shadow-3xs overflow-hidden ${
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
                        <User size={16} />
                      </div>
                      <span className="text-gray-400 font-bold">作成者: {route.profiles?.username || '名無し'}</span>
                    </div>

                    <span className="font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-200/40">
                      {route.subject}
                    </span>
                  </div>

                  {/* タイトル・説明 */}
                  <div>
                    <h3 className="font-black text-slate-900 text-lg md:text-xl leading-snug mb-2 group-hover:text-blue-600 transition-colors flex items-center justify-between gap-2">
                      <span>{route.title}</span>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                    </h3>
                    <p className="text-sm md:text-base text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {route.description || '説明はありません。'}
                    </p>
                  </div>

                  {/* ルートの構成中身 */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-gray-100 space-y-2">
                    <p className="text-xs font-black text-slate-400 tracking-wide mb-2 flex items-center gap-1.5 border-b border-slate-200/40 pb-1.5">
                      <BookOpen size={14} strokeWidth={2.5} /> ルートの構成（全 {sortedBooks.length} 冊）
                    </p>
                    {sortedBooks.slice(0, 3).map((rb: any, idx) => (
                      <div key={rb.id} className="flex flex-col items-center">
                        <div className="w-full flex items-center gap-2.5 text-sm text-slate-700 min-w-0">
                          <span className="w-4.5 h-4.5 bg-slate-400 text-white font-black text-[10px] rounded-full flex items-center justify-center shrink-0 shadow-3xs">
                            {rb.sort_order}
                          </span>
                          <span className="font-bold truncate flex-1">{rb.books?.title}</span>
                        </div>
                        {idx < sortedBooks.slice(0, 3).length - 1 && <ArrowDown size={12} className="text-slate-300 my-1" strokeWidth={2.5} />}
                      </div>
                    ))}
                    {sortedBooks.length > 3 && (
                      <p className="text-xs text-slate-400 font-bold pl-7 pt-1">他 {sortedBooks.length - 3} 冊の参考書...</p>
                    )}
                  </div>

                  {/* 下部アクションエリア */}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRouteLike(route.id); 
                      }}
                      className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                        isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'
                      }`}
                    >
                      <Heart size={18} fill={isLiked ? "currentColor" : "none"} strokeWidth={2.5} />
                      <span className="text-sm">{route.likes_count || 0}</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                      <MessageCircle size={18} strokeWidth={2.5} />
                      <span className="text-sm">{route.comments_count || 0}</span>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}