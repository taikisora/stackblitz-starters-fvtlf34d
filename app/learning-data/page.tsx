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

  // 🎯 修正：作成上限を 15 から 30 に増やしました！（50 などお好きな数字に変えてもOKです）
  const MAX_ROUTES = 30;

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      setUser(session.user);

      // 💡 修正：flow_structure構造から、一本道・分岐内すべての参考書数を正確に合算カウントする最新ロジック
      const { data, error } = await supabase
        .from('study_routes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("ルート取得エラー:", error);
      } else if (data) {
        const routesWithBookCount = data.map((route) => {
          let totalBooks = 0;

          // 新しい flow_structure (JSON) が入っている場合は、その中の全書籍をカウント
          if (route.flow_structure && Array.isArray(route.flow_structure)) {
            route.flow_structure.forEach((node: any) => {
              if (!node.type || node.type === 'single') {
                totalBooks += 1;
              } else {
                if (node.route_A) totalBooks += node.route_A.length;
                if (node.route_B) totalBooks += node.route_B.length;
              }
            });
          }

          return {
            ...route,
            book_count: totalBooks // ➔ これで「参考書 5冊」などと正しい総数がカードに即時反映されます
          };
        });

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
              {/* 💡 案内文の表記も上限に合わせて自動で変わるようにテンプレートリテラル化しました */}
              アカウントを作成またはログインすると、志望校合格に向けた自分だけのオリジナル参考書ルートを最大{MAX_ROUTES}個まで自由に作成・保存できます。
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
            : 'bg-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-blue-500/10 shadow-blue-500/10 cursor-pointer'
        }`}
      >
        <Plus size={18} strokeWidth={3} />
        新しい参考書ルートを作成する
      </button>

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
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-colors shadow-3xs cursor-pointer"
                    title="ルートを編集"
                  >
                    <Edit2 size={14} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, route.id, route.title)}
                    className="p-2 rounded-xl bg-red-50/50 border border-red-100 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 transition-colors shadow-3xs cursor-pointer"
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