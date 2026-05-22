"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Route, Plus, Lock, Globe, BookOpen, Trash2, Edit2, AlertCircle, ChevronRight } from 'lucide-react';
import TabBar from '@/components/TabBar';

export default function LearningDataPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const MAX_ROUTES = 15;

  useEffect(() => {
    const fetchRoutes = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      const { data, error } = await supabase
        .from('study_routes')
        .select(`
          *,
          route_books ( id )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("ルート取得エラー:", error);
      } else if (data) {
        setRoutes(data);
      }
      setLoading(false);
    };

    fetchRoutes();
  }, [router]);

  const handleDelete = async (e: React.MouseEvent, routeId: string, routeTitle: string) => {
    e.stopPropagation(); // 💡 枠全体のクリック（詳細への遷移）を発動させないガード
    if (!confirm(`「${routeTitle}」を削除してもよろしいですか？\n※この操作は取り消せません。`)) return;

    const { error } = await supabase
      .from('study_routes')
      .delete()
      .eq('id', routeId);

    if (error) {
      alert('削除に失敗しました。');
      console.error(error);
    } else {
      setRoutes(routes.filter(r => r.id !== routeId));
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">読み込み中...</div>;

  const isLimitReached = routes.length >= MAX_ROUTES;

  return (
    // 💡 max-w-3xl から max-w-5xl に広げ、他のリッチ化画面と統一
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen pb-24">
      
      {/* ヘッダーセクション */}
      <div className="flex items-center justify-between border-b border-gray-200/60 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-sm">
            <Route size={22} />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">マイ参考書ルート</h1>
        </div>
        
        <div className={`text-xs md:text-sm font-black px-3 py-1.5 rounded-full border ${isLimitReached ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200 shadow-3xs'}`}>
          保存枠: {routes.length} / {MAX_ROUTES}
        </div>
      </div>

      <div className="space-y-6">
        {/* 新規作成ボタン */}
        {!isLimitReached ? (
          <Link
            href="/learning-data/new"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 rounded-2xl shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base shadow-blue-500/10"
          >
            <Plus size={20} className="stroke-[2.5]" />
            新しい参考書ルートを作成する
          </Link>
        ) : (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-100 shadow-3xs">
            <AlertCircle size={18} />
            保存枠が上限に達しています。新しいルートを作るには不要なものを削除してください。
          </div>
        )}

        {/* ルート一覧 */}
        {routes.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 border-dashed shadow-sm">
            <Route size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-black text-base mb-1">まだ参考書ルートがありません</p>
            <p className="text-slate-400 text-sm font-bold">上のボタンから最初のルートを作ってみましょう！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {routes.map((route) => (
              // 💡 変更点：外枠全体をクリックすると、編集ではなく「詳細画面」に飛ぶように onClick をセット！
              <div 
                key={route.id} 
                onClick={() => router.push(`/learning-data/${route.id}`)}
                className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100/70 transition-all flex flex-col justify-between group cursor-pointer relative"
              >
                <div>
                  {/* バッジを大きく綺麗に調整 */}
                  <div className="flex items-center gap-2 mb-3.5">
                    {route.is_public ? (
                      <span className="flex items-center gap-1 text-[11px] font-black bg-green-50 text-green-700 px-2.5 py-1 rounded-md border border-green-200/40">
                        <Globe size={12} strokeWidth={2.5} /> 公開中
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md">
                        <Lock size={12} strokeWidth={2.5} /> 非公開
                      </span>
                    )}
                    <span className="text-[11px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-200/40">
                      {route.subject}
                    </span>
                  </div>

                  {/* タイトルと説明文を一回り大きく、フォントを太く！ */}
                  <h2 className="font-black text-slate-900 text-lg md:text-xl leading-snug mb-2 group-hover:text-blue-600 transition-colors flex items-center justify-between gap-2">
                    <span className="truncate">{route.title}</span>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                  </h2>
                  <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed mb-5">
                    {route.description || '詳細な説明は設定されていません。'}
                  </p>
                </div>

                {/* 下部アクションエリア */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                  {/* 💡 テキストとアイコンを一回り大きく（text-sm / size={18}） */}
                  <div className="flex items-center gap-2 text-slate-700 font-black text-sm">
                    <BookOpen size={18} className="text-slate-400" strokeWidth={2.5} />
                    <span>参考書 {route.route_books?.length || 0} 冊</span>
                  </div>
                  
                  {/* 💡 編集・削除ボタンの当たり判定（p-2.5）とアイコンサイズ（size={20}）を拡大して超押しやすく */}
                  <div className="flex items-center gap-2 relative z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/learning-data/${route.id}/edit`);
                      }}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90 border border-transparent hover:border-blue-100 bg-slate-50 sm:bg-transparent"
                    >
                      <Edit2 size={20} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, route.id, route.title)}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90 border border-transparent hover:border-red-100 bg-slate-50 sm:bg-transparent"
                    >
                      <Trash2 size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}