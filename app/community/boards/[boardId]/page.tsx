"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  ChevronLeft, MessageSquare, Plus, Clock, User, 
  ArrowRight, AlertCircle, X, Trash2
} from 'lucide-react';

// 表示用の日本語板名マッピング
const BOARD_NAMES: { [key: string]: string } = {
  waseda_keio: '早慶上理',
  imperial: '旧帝大・国公立',
  gmarch: 'GMARCH',
  kankan_douritsu: '関関同立',
  other_univ: 'その他大学',
  target_general: '志望校総合・悩み',
  english: '英語参考書',
  math: '数学参考書',
  japanese: '国語参考書',
  science: '理科参考書',
  social: '社会参考書',
  study_method: '勉強方法',
  exam_info: '入試情報',
  free_talk: 'フリートーク',
  study_log: '今日の勉強報告',
};

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  const boardName = BOARD_NAMES[boardId] || '掲示板';

  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // スレッド作成用モーダルの開閉と入力状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [issubmitting, setIsSubmitting] = useState(false);

  // 大元の親トピック（main_topic）をboardIdから自動判定
  const getMainTopic = (id: string) => {
    if (['waseda_keio', 'imperial', 'gmarch', 'kankan_douritsu', 'other_univ', 'target_general'].includes(id)) return 'university';
    if (['english', 'math', 'japanese', 'science', 'social'].includes(id)) return 'book';
    if (['study_method', 'exam_info'].includes(id)) return 'qa';
    return 'chat';
  };

  // スレッド一覧の取得関数（削除後にも再利用するため外に出しました）
  const fetchThreads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_threads')
      .select(`
        id, title, created_at, user_id,
        profiles(username, avatar_color)
      `)
      .eq('category', boardId)
      .order('created_at', { ascending: false });

    if (!error && data) setThreads(data);
    setLoading(false);
  };

  useEffect(() => {
    // ログイン状況の取得
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };
    checkUser();

    if (boardId) fetchThreads();
  }, [boardId]);

  // ─── 🚀 スレッド新規作成処理 ───
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('スレッドを作成するにはログインが必要です。');
      return;
    }
    if (!newTitle.trim()) {
      alert('スレッドのタイトルを入力してください。');
      return;
    }
    if (!firstComment.trim()) {
      alert('最初の投稿内容（本文）を入力してください。');
      return;
    }

    setIsSubmitting(true);

    // 1. スレッド本体をインサート
    const { data: threadData, error: threadError } = await supabase
      .from('community_threads')
      .insert({
        user_id: user.id,
        main_topic: getMainTopic(boardId),
        category: boardId,
        title: newTitle.trim(),
      })
      .select()
      .single();

    if (threadError || !threadData) {
      alert('スレッドの作成に失敗しました。');
      setIsSubmitting(false);
      return;
    }

    // 2. スレッドの最初のコメント（>>1）をインサート
    const { error: commentError } = await supabase
      .from('community_comments')
      .insert({
        thread_id: threadData.id,
        user_id: user.id,
        content: firstComment.trim(),
      });

    if (commentError) {
      alert('最初のコメントの投稿に失敗しました。');
      setIsSubmitting(false);
      return;
    }

    setNewTitle('');
    setFirstComment('');
    setIsModalOpen(false);
    setIsSubmitting(false);

    router.push(`/community/threads/${threadData.id}`);
  };

  // ─── 🗑️ スレッド削除処理 ───
  const handleDeleteThread = async (threadId: string, threadTitle: string, e: React.MouseEvent) => {
    // 💡 重要：ボタンのクリックイベントが親のカードに伝わって画面遷移するのを防ぐ
    e.stopPropagation();

    if (!window.confirm(`「${threadTitle}」\nこのスレッドと中のコメントをすべて削除してもよろしいですか？`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('community_threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;

      // リロードして一覧を更新
      await fetchThreads();
    } catch (err: any) {
      console.error('スレッド削除エラー:', err.message);
      alert('スレッドの削除に失敗しました。');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24">
      
      {/* ヘッダーリンク */}
      <div className="mb-6">
        <button 
          onClick={() => router.push('/community')} 
          className="text-xs font-black text-blue-600 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-3xs hover:bg-gray-50 transition-all flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft size={14} /> 掲示板トップに戻る
        </button>
      </div>

      {/* 板タイトル */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          {boardName} 板
        </h1>
      </div>

      {/* 画面上部に完全固定された「スレッド作成ボタン」 */}
      <div className="mb-6">
        {user ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-blue-600 text-white font-black py-3.5 px-4 rounded-2xl shadow-sm hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Plus size={16} strokeWidth={3} />
            このカテゴリにスレッドを作成する
          </button>
        ) : (
          <div className="bg-slate-100 border border-slate-200 text-slate-500 font-bold p-3.5 rounded-2xl text-center text-xs">
            スレッドを作成するにはログインが必要です。
          </div>
        )}
      </div>

      {/* ── スレッド一覧エリア ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-slate-400 animate-pulse">
            スレッドを読み込み中...
          </div>
        ) : threads.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-200 bg-white rounded-2xl p-6">
            <p className="text-xs md:text-sm font-bold text-slate-400 leading-relaxed">
              まだスレッドがありません。<br />
              最初のスレッドを立てて、仲間と会話を始めてみましょう。
            </p>
          </div>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => router.push(`/community/threads/${thread.id}`)}
              className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-3xs hover:border-blue-200 transition-all text-left flex items-center justify-between gap-4 group cursor-pointer active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="font-extrabold text-sm md:text-base text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                  {thread.title}
                </h2>
                
                {/* 投稿者と日時のメタ情報 */}
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                  <div className="flex items-center gap-1">
                    {/* 💡 修正：未設定・該当なしの場合は、見本通り完全に bg-gray-500 にします */}
                    <div 
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 border border-black/5 shadow-3xs overflow-hidden ${
                        thread.profiles?.avatar_color === 'red' ? 'bg-red-500' :
                        thread.profiles?.avatar_color === 'orange' ? 'bg-orange-500' :
                        thread.profiles?.avatar_color === 'amber' ? 'bg-amber-500' :
                        thread.profiles?.avatar_color === 'emerald' ? 'bg-emerald-500' :
                        thread.profiles?.avatar_color === 'sky' ? 'bg-sky-500' :
                        thread.profiles?.avatar_color === 'blue' ? 'bg-blue-500' :
                        thread.profiles?.avatar_color === 'indigo' ? 'bg-indigo-500' :
                        thread.profiles?.avatar_color === 'purple' ? 'bg-purple-500' :
                        thread.profiles?.avatar_color === 'pink' ? 'bg-pink-500' :
                        'bg-gray-500' /* 👈 ここを元の仕様通り bg-gray-500 に修正しました */
                      }`}
                    >
                      <User size={11} className="stroke-[3]" />
                    </div>
                    <span className="text-slate-500 truncate max-w-[120px]">
                      {thread.profiles?.username || '名無し受験生'}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Clock size={11} />
                    {new Date(thread.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </div>

              {/* 💡 右端のアクションエリア（自分のスレならゴミ箱、それ以外なら通常矢印） */}
              <div className="flex items-center shrink-0">
                {user && thread.user_id === user.id ? (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteThread(thread.id, thread.title, e)}
                    className="p-2 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                    title="スレッドを削除"
                  >
                    <Trash2 size={15} className="stroke-[2.5]" />
                  </button>
                ) : (
                  <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-blue-50 transition-colors">
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500" />
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* ── 📝 スレッド新規作成ポップアップモーダル ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-slate-100 flex flex-col max-h-[90vh] animate-fade-in">
            
            {/* モーダルヘッダー */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                <MessageSquare size={16} className="text-blue-600" />
                新スレッドの作成（{boardName}）
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* モーダルフォーム */}
            <form onSubmit={handleCreateThread} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  スレッドのタイトル
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例：【英語】ターゲット？シス単？LEAP？最強の単語帳はどれか語ろう"
                  maxLength={70}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:bg-white text-xs md:text-sm font-bold text-slate-800 shadow-3xs transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  最初の投稿（本文）
                </label>
                <textarea
                  value={firstComment}
                  onChange={(e) => setFirstComment(e.target.value)}
                  placeholder="質問や、みんなで議論したい内容を詳しく書きましょう。"
                  rows={6}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:bg-white text-xs md:text-sm font-bold text-slate-800 shadow-3xs transition-all leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={issubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md disabled:opacity-50 transition-all active:scale-[0.98] text-xs md:text-sm cursor-pointer"
                >
                  {issubmitting ? 'スレッドを作成中...' : 'この内容でスレッドを立てる'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}