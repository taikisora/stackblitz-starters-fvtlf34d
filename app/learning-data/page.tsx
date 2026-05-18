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

  // 最大保存可能数
  const MAX_ROUTES = 15;

  useEffect(() => {
    const fetchRoutes = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 自分のルートと、その中に入っている参考書の数（route_booksの数）を一緒に取得する
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

  // ルートの削除処理
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
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* 🟢 ヘッダーセクション */}
      <div className="bg-white px-4 pt-12 pb-6 border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <Route size={20} />
            </div>
            <h1 className="text-xl font-extrabold text-gray-900">学習データ</h1>
          </div>
          
          {/* 保存枠のカウント表示 */}
          <div className={`text-xs font-bold px-3 py-1.5 rounded-full border ${isLimitReached ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            保存枠: {routes.length} / {MAX_ROUTES}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-4">
        
        {/* 🟢 新規作成ボタン */}
        {!isLimitReached ? (
          <Link
            href="/learning-data/new"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-sm hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={20} />
            新しい参考書ルートを作成する
          </Link>
        ) : (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">
            <AlertCircle size={16} />
            保存枠が上限（15個）に達しています。新しいルートを作るには不要なものを削除してください。
          </div>
        )}

        {/* 🟢 ルート一覧 */}
        {routes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 border-dashed shadow-sm mt-4">
            <Route size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-bold text-sm mb-1">まだ学習ルートがありません</p>
            <p className="text-gray-400 text-xs">上のボタンから最初のルートを作ってみましょう！</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {routes.map((route) => (
              <div key={route.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
                
                {/* 状態バッジ（公開/非公開 と 教科） */}
                <div className="flex items-center gap-2 mb-3">
                  {route.is_public ? (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                      <Globe size={10} /> 公開中
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                      <Lock size={10} /> 非公開
                    </span>
                  )}
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">
                    {route.subject}
                  </span>
                </div>

                {/* タイトルと説明 */}
                <h2 className="font-bold text-gray-900 text-lg leading-tight mb-1">{route.title}</h2>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4 min-h-[2.5rem]">
                  {route.description || '説明は設定されていません。'}
                </p>

                {/* フッター（参考書の数 ＆ アクションボタン） */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-1.5 text-gray-500 font-bold text-xs">
                    <BookOpen size={14} />
                    <span>参考書 {route.route_books?.length || 0} 冊</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* 編集ボタン */}
                    <Link 
                      href={`/learning-data/${route.id}/edit`}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </Link>
                    {/* 削除ボタン */}
                    <button 
                      onClick={() => handleDelete(route.id, route.title)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ボトムナビゲーション */}
      <TabBar />
    </div>
  );
}