"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  ChevronLeft, ThumbsUp, Lightbulb, Send, Clock, 
  BookOpen, X, User, CornerUpLeft, Trash2 
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
  
  // アンカーポップアップ用の状態（いま読んでいるカードのIDと、表示するターゲットのコメントデータ）
  const [hoveredComment, setHoveredComment] = useState<any>(null);
  const [activePopupCommentId, setActivePopupCommentId] = useState<string | null>(null);

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
        .select('*, profiles ( username, avatar_color )')
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
      .select('*, profiles ( username, avatar_color )')
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
    if (!window.confirm(`>>${commentNumber} のコメントを削除してもよろしいですか？\n※この操作は取り消せません。`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
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
  const renderFormattedContent = (content: string, currentCommentId: string) => {
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
            /* 💡 修正：いま読んでいる枠の一意なID（UUID）を関数に渡してガチッと紐付けます */
            onClick={(e) => showAnchorPopup(num, currentCommentId, e)}
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

  /* 💡 修正：ズレを完全に防ぐため、いま読んでいるカードのIDをセットするクリーンなロジックに変更 */
  const showAnchorPopup = (num: number, currentCommentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetComment = comments.find(c => c.comment_number === num);
    if (targetComment) {
      setHoveredComment(targetComment);
      setActivePopupCommentId(currentCommentId);
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
                
                {/* 💡 修正：作成者カラー。未設定時は bg-gray-500 で一貫して完璧にリンク */}
                <div className="flex items-center justify-center shrink-0">
                    <div 
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white border border-black/5 shadow-3xs overflow-hidden ${
                        comment.profiles?.avatar_color === 'red' ? 'bg-red-500' :
                        comment.profiles?.avatar_color === 'orange' ? 'bg-orange-500' :
                        comment.profiles?.avatar_color === 'amber' ? 'bg-amber-500' :
                        comment.profiles?.avatar_color === 'emerald' ? 'bg-emerald-500' :
                        comment.profiles?.avatar_color === 'sky' ? 'bg-sky-500' :
                        comment.profiles?.avatar_color === 'blue' ? 'bg-blue-500' :
                        comment.profiles?.avatar_color === 'indigo' ? 'bg-indigo-500' :
                        comment.profiles?.avatar_color === 'purple' ? 'bg-purple-500' :
                        comment.profiles?.avatar_color === 'pink' ? 'bg-pink-500' :
                        'bg-gray-500'
                      }`}
                    >
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
              {renderFormattedContent(comment.content, comment.id)}
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

            {/* 💡 修正：厳密なID一致判定。inset-0 を用いて4番目のカード枠へ左右ズレなく寸分違わずフィットさせます */}
            {hoveredComment && activePopupCommentId === comment.id && (
              <div className="absolute inset-0 z-30 bg-white text-slate-800 p-4 rounded-2xl shadow-xl border border-slate-200/80 flex flex-col justify-between animate-fade-in">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100">
                        {`>>`}{hoveredComment.comment_number}
                      </span>
                      <div className="flex items-center gap-1">
                        {/* 💡 ポップアップ内アイコンもカラー条件分岐が美しく連動 */}
                        <div 
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0 border border-black/5 overflow-hidden ${
                            hoveredComment.profiles?.avatar_color === 'red' ? 'bg-red-500' :
                            hoveredComment.profiles?.avatar_color === 'orange' ? 'bg-orange-500' :
                            hoveredComment.profiles?.avatar_color === 'amber' ? 'bg-amber-500' :
                            hoveredComment.profiles?.avatar_color === 'emerald' ? 'bg-emerald-500' :
                            hoveredComment.profiles?.avatar_color === 'sky' ? 'bg-sky-500' :
                            hoveredComment.profiles?.avatar_color === 'blue' ? 'bg-blue-500' :
                            hoveredComment.profiles?.avatar_color === 'indigo' ? 'bg-indigo-500' :
                            hoveredComment.profiles?.avatar_color === 'purple' ? 'bg-purple-500' :
                            hoveredComment.profiles?.avatar_color === 'pink' ? 'bg-pink-500' :
                            'bg-gray-500'
                          }`}
                        >
                          <User size={9} className="stroke-[3]" />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-700">
                          {hoveredComment.profiles?.username || '名無し'}
                        </span>
                      </div>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setHoveredComment(null); setActivePopupCommentId(null); }} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-0.5">
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-800 font-bold whitespace-pre-wrap line-clamp-4 break-words">
                    {hoveredComment.content}
                  </p>
                </div>
              </div>
            )}

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

    </div>
  );
}