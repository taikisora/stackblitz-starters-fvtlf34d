"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  ChevronLeft, ThumbsUp, Lightbulb, Send, Clock, 
  MessageSquare, BookOpen, X, User, CornerUpLeft, Trash2 
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

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 入力欄へ自動フォーカスするための参照
  const inputRef = useRef<HTMLInputElement>(null);
  
  // アンカーポップアップ用の状態
  const [hoveredComment, setHoveredComment] = useState<any>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // アプリ内の主要な参考書ワード（自動リンク用キーワード）
  const BOOK_KEYWORDS = ['LEAP', '青チャート', 'ターゲット', '一対一', 'ポラリス', 'ネクステ', '鉄壁', 'プラチカ', 'システム英単語'];

  useEffect(() => {
    const fetchThreadData = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      let currentUser = null;
      if (session?.user) {
        setUser(session.user);
        currentUser = session.user;
      }

      const { data: threadData } = await supabase
        .from('community_threads')
        .select('*, profiles(username, avatar_color)')
        .eq('id', threadId)
        .single();
      
      if (threadData) setThread(threadData);
      await fetchComments(currentUser);
      setLoading(false);
    };

    if (threadId) fetchThreadData();
  }, [threadId]);

  const fetchComments = async (currentUser = user) => {
    const { data: commentsData } = await supabase
      .from('community_comments')
      .select('*, profiles(username, avatar_color)')
      .eq('thread_id', threadId)
      .order('comment_number', { ascending: true });

    if (commentsData) {
      const enrichedComments = await Promise.all(commentsData.map(async (comment) => {
        const { data: reactions } = await supabase
          .from('comment_reactions')
          .select('*')
          .eq('comment_id', comment.id);

        const likes = reactions?.filter(r => r.reaction_type === 'like') || [];
        const helpfuls = reactions?.filter(r => r.reaction_type === 'helpful') || [];
        
        return {
          ...comment,
          like_count: likes.length,
          helpful_count: helpfuls.length,
          my_like: currentUser ? likes.some(r => r.user_id === currentUser.id) : false,
          my_helpful: currentUser ? helpfuls.some(r => r.user_id === currentUser.id) : false,
        };
      }));
      setComments(enrichedComments);
    }
  };

  // ─── 📝 コメント（返信）投稿処理 ───
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('コメントするにはログインが必要です。');
    if (!newComment.trim()) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from('community_comments')
      .insert({
        thread_id: threadId,
        user_id: user.id,
        content: newComment.trim()
      });

    if (error) {
      alert('投稿に失敗しました。');
    } else {
      setNewComment('');
      await fetchComments();
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    setIsSubmitting(false);
  };

  // ─── 🗑️ コメント削除処理 ───
  const handleDeleteComment = async (commentId: string, commentNumber: number) => {
    // 💡 削除前の最終確認確認
    if (!window.confirm(`>>${commentNumber} のコメントを削除してもよろしいですか？\n※この操作は取り消せません。`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // 削除に成功したらコメント一覧を再読込
      await fetchComments();
    } catch (err: any) {
      console.error('削除エラー:', err.message);
      alert('削除に失敗しました。本人以外の投稿は削除できません。');
    }
  };

  // ─── 🎯 「返信」ボタンを押した時の自動アンカー挿入 ───
  const handleReplyClick = (commentNumber: number) => {
    if (!user) return alert('返信するにはログインが必要です。');
    const anchor = `>>${commentNumber} `;
    setNewComment((prev) => (prev.startsWith(anchor) ? prev : anchor + prev));
    inputRef.current?.focus();
  };

  // ─── 👍💡 リアクション切り替えロジック ───
  const handleToggleReaction = async (commentId: string, type: 'like' | 'helpful', currentStatus: boolean) => {
    if (!user) return alert('リアクションするにはログインが必要です。');

    try {
      if (currentStatus) {
        const { error: deleteError } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('reaction_type', type);

        if (deleteError) throw deleteError;
      } else {
        const { error: upsertError } = await supabase
          .from('comment_reactions')
          .upsert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: type
          }, { onConflict: 'comment_id,user_id,reaction_type' });

        if (upsertError) throw upsertError;
      }

      await fetchComments();

    } catch (err: any) {
      console.error('リアクション処理エラー:', err.message);
      alert('処理に失敗しました。もう一度お試しください。');
    }
  };

  // 本文のテキストを解析して「アンカー」や「参考書リンク」に置換
  const renderFormattedContent = (content: string) => {
    const regex = /(>>\d+)|(LEAP|青チャート|ターゲット|一対一|ポラリス|ネクステ|鉄壁|プラチカ|システム英単語)/g;
    const parts = content.split(regex);
    
    if (parts.length === 1) return content;

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith('>>')) {
        const num = parseInt(part.replace('>>', ''), 10);
        return (
          <span
            key={index}
            onClick={(e) => showAnchorPopup(num, e)}
            className="text-blue-600 font-black cursor-pointer bg-blue-50 px-1 py-0.5 rounded hover:bg-blue-100 transition-colors mx-0.5 text-[11px]"
          >
            {part}
          </span>
        );
      }

      if (BOOK_KEYWORDS.includes(part)) {
        return (
          <button
            key={index}
            type="button"
            onClick={() => router.push(`/search?query=${encodeURIComponent(part)}`)}
            className="inline-flex items-center gap-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-black text-[10px] text-slate-700 px-1.5 py-0.5 rounded-lg border border-slate-200/60 transition-colors mx-0.5 shadow-3xs cursor-pointer"
          >
            <BookOpen size={10} />
            {part}
          </button>
        );
      }

      return part;
    });
  };

  const showAnchorPopup = (num: number, e: React.MouseEvent) => {
    const targetComment = comments.find(c => c.comment_number === num);
    if (targetComment) {
      setHoveredComment(targetComment);
      setPopupPosition({ x: e.clientX, y: e.clientY - 120 });
    } else {
      alert(`>>${num} のコメントは見つかりませんでした。`);
    }
  };

  if (loading && !thread) return <div className="py-20 text-center font-bold text-slate-400 animate-pulse">スレッドを読み込み中...</div>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-32 relative">
      
      {/* 戻るボタン */}
      <div className="mb-4">
        <button 
          onClick={() => router.back()} 
          className="text-xs font-black text-blue-600 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-3xs hover:bg-gray-50 transition-all flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft size={14} /> 戻る
        </button>
      </div>

      {/* 🏆 スレッド大タイトル（パンくずリスト付き） */}
      {thread && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 space-y-3">
          
          {/* 💡 修正：大学受験 ＞ 旧帝大・国公立 板 の階層ナビゲーション */}
          <div className="flex items-center gap-1.5 text-[11px] font-black tracking-tight text-slate-400">
            <span>
              {thread.main_topic === 'university' ? '大学受験' : 
               thread.main_topic === 'book' ? '参考書' : 
               thread.main_topic === 'qa' ? 'Q&A' : '雑談'}
            </span>
            <span className="text-slate-300 font-normal">＞</span>
            <button
              type="button"
              onClick={() => router.push(`/community/boards/${thread.category}`)}
              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
            >
              {BOARD_NAMES[thread.category] || '掲示板'}
            </button>
          </div>

          <h1 className="text-base md:text-xl font-black text-slate-900 leading-snug pt-0.5">
            {thread.title}
          </h1>
        </div>
      )}

      {/* ── 💬 コメント一覧 ── */}
      <div className="space-y-4 mb-8">
        {comments.map((comment) => (
          <div 
            key={comment.id} 
            id={`comment-${comment.comment_number}`}
            className="bg-white rounded-2xl border border-gray-100 shadow-3xs p-4 space-y-3 relative group"
          >
            {/* メタ情報 */}
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                  {comment.comment_number}
                </span>
                <div className="flex items-center justify-center shrink-0">
                    <div className={`w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white`}>
                        <User size={13} className="stroke-[3]" />
                    </div>
                </div>
                <span className="font-extrabold text-xs text-slate-700 truncate max-w-[150px]">
                  {comment.profiles?.username || '名無し受験生'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5">
                  <Clock size={11} />
                  {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                </span>
                
                {/* 💡 自分が書き込んだコメントにだけ、コンパクトなゴミ箱ボタンを表示 */}
                {user && comment.user_id === user.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id, comment.comment_number)}
                    className="p-1 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="コメントを削除"
                  >
                    <Trash2 size={13} className="stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            {/* 本文 */}
            <p className="text-xs md:text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap break-words">
              {renderFormattedContent(comment.content)}
            </p>

            {/* ボタンエリア */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleReaction(comment.id, 'like', comment.my_like)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all active:scale-90 cursor-pointer ${
                    comment.my_like 
                      ? 'bg-rose-50 border-rose-200 text-rose-600' 
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <ThumbsUp size={12} className={comment.my_like ? 'fill-current' : ''} />
                  <span>いいね</span>
                  {comment.like_count > 0 && <span className="ml-0.5 bg-white/80 px-1 rounded-md">{comment.like_count}</span>}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleReaction(comment.id, 'helpful', comment.my_helpful)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all active:scale-90 cursor-pointer ${
                    comment.my_helpful 
                      ? 'bg-amber-50 border-amber-200 text-amber-600' 
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <Lightbulb size={12} className={comment.my_helpful ? 'fill-current text-amber-500' : ''} />
                  <span>参考になる</span>
                  {comment.helpful_count > 0 && <span className="ml-0.5 bg-white/80 px-1 rounded-md">{comment.helpful_count}</span>}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleReplyClick(comment.comment_number)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 text-[10px] font-black transition-all active:scale-90 cursor-pointer shadow-3xs"
              >
                <CornerUpLeft size={12} strokeWidth={3} />
                <span>返信</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── コメント投稿フッター ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 p-3 z-40 shadow-lg">
        <form onSubmit={handlePostComment} className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? "内容を入力、または上の「返信」をタップ..." : "ログインすると書き込みできます"}
            disabled={!user || isSubmitting}
            maxLength={400}
            className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white shadow-3xs transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!user || !newComment.trim() || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:scale-100 shrink-0 cursor-pointer shadow-sm"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* ── 🪟 モダンアンカーポップアップ UI ── */}
      {hoveredComment && (
        <div 
          className="fixed z-50 bg-slate-900/90 text-white p-4 rounded-2xl shadow-xl max-w-xs md:max-w-md border border-slate-700"
          style={{ left: `${popupPosition.x}px`, top: `${popupPosition.y}px`, transform: 'translateX(-20%)' }}
        >
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
            <span className="font-black text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">
              {`>>`}{hoveredComment.comment_number}
            </span>
            <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0">
                    <User size={9} className="stroke-[3]" />
                </div>
                <span className="text-[10px] font-bold text-slate-300">
                    {hoveredComment.profiles?.username || '名無し'}
                </span>
            </div>
            <button type="button" onClick={() => setHoveredComment(null)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X size={12} />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-slate-100 font-medium whitespace-pre-wrap line-clamp-4">
            {hoveredComment.content}
          </p>
        </div>
      )}

    </div>
  );
}