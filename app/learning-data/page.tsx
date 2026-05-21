"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Route, Plus, Lock, Globe, BookOpen, Trash2, Edit2, AlertCircle } from 'lucide-react';
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

  const handleDelete = async (routeId: string, routeTitle: string) => {
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
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4">
      {/* 🟢 ヘッダーセクション */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shadow-2xs">
            <Route size={20} />
          </div>
          <h1 className="text-xl font-black text-gray-900">参考書ルート</h1>
        </div>
        
        <div className={`text-xs font-bold px-3 py-1.5 rounded-full border ${isLimitReached ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-200 shadow-2xs'}`}>
          保存枠: {routes.length} / {MAX_ROUTES}
        </div>
      </div>

      <div className="space-y-6">
        {/* 🟢 新規作成ボタン */}
        {!isLimitReached ? (
          <Link
            href="/learning-data/new"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-extrabold py-4 rounded-2xl shadow-md hover:bg-blue-700 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base"
          >
            <Plus size={20} className="stroke-[2.5]" />
            新しい参考書ルートを作成する
          </Link>
        ) : (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl border border-red-100 shadow-2xs">
            <AlertCircle size={16} />
            保存枠が上限に達しています。新しいルートを作るするには不要なものを削除してください。
          </div>
        )}

        {/* 🟢 ルート一覧（PC表示の時は2列グリッドで綺麗に並べる！） */}
        {routes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed shadow-sm">
            <Route size={54} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-bold text-sm mb-1">まだ学習ルートがありません</p>
            <p className="text-gray-400 text-xs">上のボタンから最初のルートを作ってみましょう！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((route) => (
              <div key={route.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {route.is_public ? (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold bg-green-50 text-green-700 px-2 py-0.5 rounded-md border border-green-100/50">
                        <Globe size={10} /> 公開中
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                        <Lock size={10} /> 非公開
                      </span>
                    )}
                    <span className="text-[10px] font-extrabold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100/50">
                      {route.subject}
                    </span>
                  </div>

                  <h2 className="font-extrabold text-gray-900 text-base leading-snug mb-1 group-hover:text-blue-600 transition-colors">{route.title}</h2>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4">
                    {route.description || '説明は設定されていません。'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-2">
                  <div className="flex items-center gap-1 text-gray-500 font-bold text-xs">
                    <BookOpen size={13} className="text-gray-400" />
                    <span>参考書 {route.route_books?.length || 0} 冊</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Link 
                      href={`/learning-data/${route.id}/edit`}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={15} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(route.id, route.title)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
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