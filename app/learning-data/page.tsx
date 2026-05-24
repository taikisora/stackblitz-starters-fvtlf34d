"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Route as RouteIcon, Plus, Lock, Globe, BookOpen, Trash2, Edit2, AlertCircle, ChevronRight, User, LogIn } from 'lucide-react';

export default function LearningDataPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const MAX_ROUTES = 15;

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 💡 修正：強制リダイレクトをせず、未ログイン状態で読み込みを完了させる
        setUser(null);
        setLoading(false);
        return;
      }
      
      setUser(session.user);

      const { data, error } = await supabase
        .from('study_routes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("ルート取得エラー:", error);
      } else if (data) {
        const routesWithBookCount = await Promise.all(data.map(async (route) => {
          const { count, error: countError } = await supabase
            .from('route_books')
            .select('*', { count: 'exact', head: true })
            .eq('route_id', route.id);
          
          return {
            ...route,
            book_count: countError ? 0 : (count || 0)
          };
        }));
        setRoutes(routesWithBookCount);
      }
      setLoading(false);
    };

    fetchRoutes();
  }, [router]);

  const handleDelete = async (e: React.MouseEvent, routeId: string, routeTitle: string) => {
    e.stopPropagation();
    if (!confirm(`「${routeTitle}」を削除してもよろしいですか？\n※この操作は取り消せません。`)) return;

    const { error } = await supabase
      .from('study_routes')
      .delete()
      .eq('id', routeId);

    if (error) {
      console.error("削除エラー:", error);
      alert('削除に失敗しました。');
    } else {
      setRoutes(routes.filter(r => r.id !== routeId));
    }
  };

  if (loading) return <p className="text-center py-20 text-gray-500 font-bold animate-pulse">ルートを読み込み中...</p>;

  // 💡 未ログイン時の誘導ガード画面（絵文字なし・クリーンUI）
  if (!user) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 pt-16 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-2xs p-8 flex flex-col items-center justify-center space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm">
            <User size={24} className="stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-slate-800 text-sm md:text-base">
              マイ参考書ルートの管理にはログインが必要です
            </h4>
            <p className="text-gray-400 font-bold text-xs max-w-md leading-relaxed">
              アカウントを作成またはログインすると、志望校合格に向けた自分だけのオリジナル参考書ルートを最大15個まで自由に作成・保存できます。
            </p>
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
      </div>
    );
  }

  const isLimitReached = routes.length >= MAX_ROUTES;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen pb-24 pt-6">
      
      {/* ヘッダータイトル・作成枠数表示 */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-2xs border border-gray-100">
        <div className="flex items-center gap-2.5 text-slate-800">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md">
            <RouteIcon size={20} />
          </div>
          <h1 className="text-lg md:text-xl font-black tracking-tight">マイ参考書ルート</h1>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] md:text-xs font-bold text-gray-400 block mb-0.5">保存枠</span>
          <span className={`text-xs md:text-sm font-black px-2.5 py-1 rounded-md ${isLimitReached ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-700'}`}>
            {routes.length} / {MAX_ROUTES}
          </span>
        </div>
      </div>

      {/* 新規作成ボタン */}
      <button
        onClick={() => {
          if (isLimitReached) {
            alert(`作成上限の${MAX_ROUTES}個に達しています。\n不要なルートを削除してから作成してください。`);
            return;
          }
          router.push('/learning-data/new');
        }}
        disabled={isLimitReached}
        className={`w-full mb-6 py-3.5 flex items-center justify-center gap-2 font-black rounded-2xl shadow-sm border transition-all active:scale-[0.99] text-sm md:text-base ${
          isLimitReached
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-blue-500/10 shadow-blue-500/10'
        }`}
      >
        <Plus size={18} strokeWidth={3} />
        新しい参考書ルートを作成する
      </button>

      {/* ルート一覧カードフィード */}
      {routes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-2xs p-6">
          <AlertCircle size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400 leading-relaxed">
            まだ参考書ルートが作成されていません。<br/>
            上のボタンから、あなただけの合格ルートを作ってみましょう！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {routes.map((route) => (
            <div
              key={route.id}
              onClick={() => router.push(`/learning-data/${route.id}`)}
              className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-2xs hover:border-blue-200 hover:shadow-sm transition-all group cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {route.is_public ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100 shadow-3xs">
                        <Globe size={10} /> 公開中
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-black border border-gray-200 shadow-3xs">
                        <Lock size={10} /> 非公開
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-black border border-blue-100 shadow-3xs">
                      {route.subject}
                    </span>
                  </div>

                  <h2 className="font-black text-slate-800 text-base md:text-lg leading-snug group-hover:text-blue-600 transition-colors truncate pr-4">
                    {route.title}
                  </h2>
                  
                  {route.description && (
                    <p className="text-xs text-gray-400 font-medium line-clamp-2 leading-relaxed">
                      {route.description}
                    </p>
                  )}
                </div>
                
                <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-50 mt-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                  <BookOpen size={14} className="text-slate-400" />
                  <span>参考書 <span className="font-black text-slate-700 text-sm">{route.book_count}</span> 冊</span>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/learning-data/${route.id}/edit`);
                    }}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-colors shadow-3xs"
                    title="ルートを編集"
                  >
                    <Edit2 size={14} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, route.id, route.title)}
                    className="p-2 rounded-xl bg-red-50/50 border border-red-100 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 transition-colors shadow-3xs"
                    title="ルートを削除"
                  >
                    <Trash2 size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}