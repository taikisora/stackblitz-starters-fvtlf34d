"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Edit2, BookOpen, Globe, Lock, ArrowDown, Calendar, User, Heart, MessageCircle, Send, Trash2 } from 'lucide-react';

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchRouteDetail = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let currentUser = null;
        if (session?.user) {
          setUser(session.user);
          currentUser = session.user;
        }

        const { data: routeData } = await supabase
          .from('study_routes')
          .select('*, profiles(username)')
          .eq('id', routeId)
          .single();

        if (!routeData) {
          setLoading(false);
          return;
        }
        setRoute(routeData);
        setLikesCount(routeData.likes_count || 0);

        const { data: booksData } = await supabase
          .from('route_books')
          .select('*, books(*)')
          .eq('route_id', routeId)
          .order('sort_order', { ascending: true });

        if (booksData) {
          const orderedBooks = booksData.map(rb => rb.books).filter(Boolean);
          setBooks(orderedBooks);
        }

        const { data: commentsData } = await supabase
          .from('route_comments')
          .select('*, profiles(username, avatar_color)')
          .eq('route_id', routeId)
          .order('created_at', { ascending: true });
        
        if (commentsData) setComments(commentsData);

        if (currentUser) {
          // 正しいテーブル「route_likes」からデータが存在するか確認する
          const { data: likeData } = await supabase
            .from('route_likes')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('route_id', routeId)
            .maybeSingle();
          
          // データが存在すれば「いいね済み(true)」、無ければ「未いいね(false)」
          setIsLiked(!!likeData);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (routeId) fetchRouteDetail();
  }, [routeId]);

  const toggleRouteLike = async () => {
    if (!user) {
      alert('いいね機能を使うにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }

    const nextStatus = !isLiked;
    const nextCount = nextStatus ? likesCount + 1 : Math.max(0, likesCount - 1);

    setIsLiked(nextStatus);
    setLikesCount(nextCount);

    try {
      if (nextStatus) {
        // いいねした時はデータを「追加（insert）」する
        await supabase.from('route_likes').insert({
          user_id: user.id,
          route_id: routeId
        });
      } else {
        // いいねを解除した時はデータを「削除（delete）」する
        await supabase.from('route_likes').delete().eq('user_id', user.id).eq('route_id', routeId);
      }

      await supabase.from('study_routes').update({ likes_count: nextCount }).eq('id', routeId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const { data: insertedComment, error } = await supabase
      .from('route_comments')
      .insert({
        route_id: routeId,
        user_id: user.id,
        content: newComment.trim()
      })
      .select('*, profiles(username, avatar_color)')
      .single();

    if (!error && insertedComment) {
      const updatedComments = [...comments, insertedComment];
      setComments(updatedComments);
      setNewComment('');

      const nextCommentCount = updatedComments.length;
      await supabase.from('study_routes').update({ comments_count: nextCommentCount }).eq('id', routeId);
      setRoute((prev: any) => ({ ...prev, comments_count: nextCommentCount }));
    }
    setIsSubmitting(false);
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!confirm('削除しますか？')) return;
    const { error } = await supabase.from('route_comments').delete().eq('id', commentId);
    if (!error) {
      const updatedComments = comments.filter(c => c.id !== commentId);
      setComments(updatedComments);

      const nextCommentCount = updatedComments.length;
      await supabase.from('study_routes').update({ comments_count: nextCommentCount }).eq('id', routeId);
      setRoute((prev: any) => ({ ...prev, comments_count: nextCommentCount }));
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">ルートを読み込み中...</div>;
  if (!route) return <div className="p-10 text-center text-gray-500 font-bold">参考書ルートが見つかりませんでした。</div>;

  const isMyRoute = user && user.id === route.user_id;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto bg-gray-50 min-h-screen pb-24 pt-6">
      
      <div className="flex items-center justify-between pb-4 mb-4">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-black">
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        {isMyRoute && (
          <button onClick={() => router.push(`/learning-data/${route.id}/edit`)} className="text-sm text-blue-600 flex items-center gap-1.5 font-black bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
            <Edit2 size={15} strokeWidth={2.5} /> このルートを編集
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-xs space-y-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <User size={14} /> <span>作成者: {route.profiles?.username || '名無しユーザー'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {route.is_public ? (
              <span className="flex items-center gap-1 text-[10px] font-black bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200/40">
                <Globe size={11} strokeWidth={2.5} /> 公開中
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                <Lock size={11} strokeWidth={2.5} /> 非公開
              </span>
            )}
            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200/40">
              {route.subject}
            </span>
          </div>
        </div>

        <div>
          <h1 className="font-black text-xl md:text-2xl text-slate-900 leading-snug mb-2">{route.title}</h1>
          <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-gray-100/60">
            {route.description || 'このルートに詳細な解説はまだ登録されていません。'}
          </p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button onClick={toggleRouteLike} className={`flex items-center gap-1.5 text-xs font-black transition-all ${isLiked ? 'text-pink-500' : 'text-gray-400'}`}>
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} strokeWidth={2.5} />
            <span className="text-sm">{likesCount}</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-black text-gray-400">
            <MessageCircle size={20} strokeWidth={2.5} />
            <span className="text-sm">{comments.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-xs space-y-4 mb-5">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
          <BookOpen size={15} strokeWidth={2.5} /> ルートのロードマップ（全 {books.length} 冊）
        </h2>
        {books.length === 0 ? (
          <p className="p-8 text-center text-sm font-bold text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-gray-100">参考書が登録されていません。</p>
        ) : (
          books.map((book, index) => (
            <div key={book.id} className="flex flex-col items-center">
              <div onClick={() => router.push(`/books/${book.id}`)} className="w-full bg-slate-50/60 rounded-2xl p-3 border border-gray-100 shadow-3xs flex items-center gap-4 hover:bg-white transition-all cursor-pointer group">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">{index + 1}</div>
                <div className="w-11 h-16 bg-white rounded-lg overflow-hidden border border-gray-200/80 flex-shrink-0 flex items-center justify-center text-gray-400 text-[9px]">
                  {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-slate-400 mb-0.5">{book.publisher}</p>
                  <h3 className="font-black text-sm text-slate-800 truncate group-hover:text-blue-600">{book.title}</h3>
                </div>
              </div>
              {index < books.length - 1 && (
                <div className="my-1.5 text-blue-500/60 p-0.5 bg-blue-50 rounded-full border border-blue-100">
                  <ArrowDown size={14} strokeWidth={3} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-xs space-y-4">
        <h3 className="font-black text-slate-800 text-sm tracking-wide border-b border-gray-50 pb-2.5">
          コメント欄（{comments.length}）
        </h3>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-400 font-bold text-center py-6">まだコメントはありません。</p>
          ) : (
            comments.map((comment) => {
              const isMyComment = user && user.id === comment.user_id;
              return (
                <div key={comment.id} className="bg-slate-50/70 p-3 rounded-2xl border border-gray-100 flex gap-2.5 items-start text-xs">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-700">{comment.profiles?.username || '名無しユーザー'}</span>
                      <span className="text-[9px] text-gray-400 font-bold">{new Date(comment.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed break-words">{comment.content}</p>
                  </div>
                  {isMyComment && (
                    <button onClick={() => handleCommentDelete(comment.id)} className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-2 border-t border-gray-50">
          <input
            type="text"
            placeholder={user ? "このルートへの感想や質問を入力..." : "ログインするとコメントできます"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!user || isSubmitting}
            className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
          />
          <button type="submit" disabled={!user || !newComment.trim() || isSubmitting} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:bg-slate-200 shrink-0">
            <Send size={14} strokeWidth={2.5} />
          </button>
        </form>
      </div>

    </div>
  );
}