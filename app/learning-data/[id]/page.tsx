"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Bookmark, BookOpen, Trash2, MessageCircle, User, ArrowDown, Share2, ThumbsUp } from 'lucide-react';

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID;

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const [route, setRoute] = useState<any>(null);
  const [sortedBooks, setSortedBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // ルート自体のいいね（保存）ステータス
  const [isLikedRoute, setIsLikedRoute] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // コメント掲示板用の状態（本側から星評価を排除してスッキリ化）
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null); 
  const [newReply, setNewReply] = useState(''); 

  useEffect(() => {
    const fetchRouteDetail = async () => {
      setLoading(true);

      // 1. ルート情報と紐づく書籍リストの取得
      const { data: routeData } = await supabase
        .from('study_routes')
        .select(`
          *,
          profiles ( username ),
          route_books (
            sort_order,
            books ( id, title, publisher, cover_url, author )
          )
        `)
        .eq('id', routeId)
        .single();

      if (routeData) {
        setRoute(routeData);
        if (routeData.route_books) {
          const ordered = [...routeData.route_books].sort((a, b) => a.sort_order - b.sort_order);
          setSortedBooks(ordered);
        }
      }

      // 2. セッションと各種ステータス（自分が作ったものか、コピー済みか、いいね済みか）
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        if (routeData && routeData.user_id === session.user.id) {
          setIsSaved(true);
        } else {
          const { data: myCopy } = await supabase
            .from('study_routes')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('title', routeData?.title)
            .maybeSingle();
          if (myCopy) setIsSaved(true);
        }

        // ルート自体へのいいね状態を取得
        const { data: likeData } = await supabase
          .from('route_likes')
          .select('*')
          .eq('route_id', routeId)
          .eq('user_id', session.user.id)
          .maybeSingle();
        setIsLikedRoute(!!likeData);
      }

      // 3. ルートに対するコメント一覧（古い順にひたすら並ぶ掲示板形式）
      const { data: commentsData } = await supabase
        .from('route_comments')
        .select('*, profiles(username)')
        .eq('route_id', routeId)
        .order('created_at', { ascending: true }); // 💡スレッド掲示板と同じく古い順（ascending: true）に並べる

      if (commentsData) {
        setComments(commentsData);
      }

      setLoading(false);
    };

    if (routeId) fetchRouteDetail();
  }, [routeId]);

  // 💡 ルート自体に対する「いいね！」処理
  const toggleRouteLike = async () => {
    if (!user) {
      alert('いいねを押すにはログインが必要です。');
      return;
    }

    if (isLikedRoute) {
      await supabase.from('route_likes').delete().eq('route_id', routeId).eq('user_id', user.id);
      setIsLikedRoute(false);
    } else {
      await supabase.from('route_likes').insert({ route_id: routeId, user_id: user.id });
      setIsLikedRoute(true);
    }
  };

  // 💡 【他人のルートを保存】 自分の学習データに丸ごとコピーするロジック
  const handleSaveRouteCopy = async () => {
    if (!user) {
      alert('ルートを保存するにはログインが必要です。');
      router.push('/login');
      return;
    }

    if (isSaved) {
      alert('このルートはすでにマイフローに保存されているか、あなたが作成したルートです。');
      return;
    }

    if (!confirm(`「${route.title}」を自分の学習データにコピー保存しますか？\n保存後はあなた専用のルートとして自由に本を編集できるようになります！`)) return;

    setActionLoading(true);

    const { data: newRoute, error: routeError } = await supabase
      .from('study_routes')
      .insert({
        user_id: user.id,
        title: `${route.title} (コピー)`, 
        subject: route.subject,
        description: route.description,
        is_public: false 
      })
      .select()
      .single();

    if (routeError) {
      alert('ルートの複製に失敗しました: ' + routeError.message);
      setActionLoading(false);
      return;
    }

    const newRouteBooks = sortedBooks.map((rb) => ({
      route_id: newRoute.id,
      book_id: rb.books.id,
      sort_order: rb.sort_order
    }));

    await supabase.from('route_books').insert(newRouteBooks);

    await supabase
      .from('study_routes')
      .update({ saved_count: (route.saved_count || 0) + 1 })
      .eq('id', route.id);

    alert('マイフローへのコピー保存が完了しました！学習データ画面へ移動します。');
    router.push('/learning-data');
  };

  // ─── コメント・返信投稿ロジック（本側から不要な星評価・コメントいいねを完全に撤廃） ───
  const handleSubmitComment = async () => {
    if (!user) {
      alert('書き込みをするにはログインが必要です！');
      return;
    }
    if (!newComment.trim()) {
      alert('コメント本文を入力してください。');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('route_comments')
      .insert({
        route_id: routeId,
        user_id: user.id,
        type: 'review', // 通常のメイン書き込み
        content: newComment.trim()
      });

    if (error) {
      alert('投稿に失敗しました。');
    } else {
      setNewComment('');
      const { data: updated } = await supabase.from('route_comments').select('*, profiles(username)').eq('route_id', routeId).order('created_at', { ascending: true });
      if (updated) setComments(updated);
      alert('コメントを投稿しました！');
    }
    setIsSubmitting(false);
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !newReply.trim()) return;
    const { error } = await supabase
      .from('route_comments')
      .insert({
        route_id: routeId,
        user_id: user.id,
        type: 'reply', 
        parent_id: parentId, 
        content: newReply.trim()
      });

    if (!error) {
      setNewReply('');
      setReplyingToId(null);
      const { data: updated } = await supabase.from('route_comments').select('*, profiles(username)').eq('route_id', routeId).order('created_at', { ascending: true });
      if (updated) setComments(updated);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('削除してもよろしいですか？')) return;
    const { error } = await supabase.from('route_comments').delete().eq('id', commentId);
    if (!error) {
      const { data: updated } = await supabase.from('route_comments').select('*, profiles(username)').eq('route_id', routeId).order('created_at', { ascending: true });
      if (updated) setComments(updated);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 space-y-6">
      
      {/* 上部ヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-2xs hover:bg-gray-50 transition-all">
          <ChevronLeft size={16} /> 戻る
        </button>
        <h1 className="text-base font-black text-gray-800">ルート詳細ビュー</h1>
        <div className="w-16"></div>
      </div>

      {/* メタ情報要約カード */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-md uppercase inline-block">
              {route.subject}
            </span>
            <h2 className="text-xl font-black text-gray-900 pt-1">{route.title}</h2>
            <p className="text-xs text-gray-400 font-bold flex items-center gap-1">
              <User size={12} /> 作成者: {route.profiles?.username || '名無し'}
            </p>
          </div>

          {/* 💡 ルート自体に対するいいね！ボタン */}
          <button 
            onClick={toggleRouteLike}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
              isLikedRoute ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <ThumbsUp size={14} fill={isLikedRoute ? "currentColor" : "none"} />
            <span>いいね！</span>
          </button>
        </div>

        {route.description && (
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100/70 whitespace-pre-wrap font-medium">
            {route.description}
          </p>
        )}

        {/* 保存（マイフローへのコピー）動線 */}
        <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-bold flex items-center gap-1">
            <Share2 size={13} /> コピー保存された数: <span className="text-gray-700">{route.saved_count || 0}人</span>
          </p>
          
          <button
            type="button"
            disabled={actionLoading || isSaved}
            onClick={handleSaveRouteCopy}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 border flex items-center gap-1.5 shadow-2xs
              ${isSaved 
                ? 'bg-blue-50 border-blue-200 text-blue-600 cursor-default' 
                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-md'}`}
          >
            <Bookmark size={14} className={isSaved ? "fill-current" : ""} />
            {isSaved ? 'マイデータ保存済み' : 'このルートを保存して編集する'}
          </button>
        </div>
      </div>

      {/* フローチャートタイムライン */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider pl-1">参考書ルート接続フロー</h3>
        <div className="space-y-3">
          {sortedBooks.map((rb, index) => {
            const book = rb.books;
            if(!book) return null;
            return (
              <div key={rb.sort_order} className="flex flex-col items-center w-full">
                <div 
                  onClick={() => router.push(`/books/${book.id}`)}
                  className="w-full bg-gray-50/60 p-4 rounded-xl border border-gray-100/70 flex items-center justify-between gap-4 cursor-pointer hover:bg-white hover:border-gray-300 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-gray-800 text-white font-black text-[11px] flex items-center justify-center shadow-sm shrink-0">
                      {rb.sort_order}
                    </span>
                    <div className="w-10 h-14 bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-[6px] text-gray-400 shadow-3xs">
                      {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-gray-800 truncate group-hover:text-blue-600 transition-colors">{book.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{book.author}  /  {book.publisher}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
                {index < sortedBooks.length - 1 && (
                  <div className="my-1 text-blue-500/60 animate-pulse">
                    <ArrowDown size={16} className="stroke-[2.5]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── コメント掲示板セクション（ツリー構造なし・時系列フラットスレッド） ─── */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-gray-800 border-b border-gray-50 pb-2">ルートへのコメント掲示板</h3>
        
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
          {/* 新規書き込みフォーム */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <textarea 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)} 
              placeholder="このルートへの感想や質問、アドバイスなどを自由に書き込みましょう。" 
              className="w-full text-sm border border-gray-200 rounded-lg p-3 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors min-h-[80px] mb-2" 
            />
            <button onClick={handleSubmitComment} disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold text-sm py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
              {isSubmitting ? '送信中...' : 'コメントを投稿する'}
            </button>
          </div>

          {/* コメント・返信が古い順にひたすら並ぶタイムライン */}
          <div className="space-y-3">
            {comments.filter(c => c.type === 'review').length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-6">まだコメントはありません。最初の投稿をしてみましょう！</p>
            ) : (
              comments.filter(c => c.type === 'review').map(comment => {
                const isMyPost = user && user.id === comment.user_id;
                const isManager = user && user.id === ADMIN_USER_ID;

                return (
                  <div key={comment.id} className={`p-4 rounded-xl border bg-white border-gray-100 shadow-sm ${isMyPost ? 'ring-1 ring-blue-100 bg-blue-50/10' : ''}`}>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border border-gray-200"><User size={12} /></div>
                      <span className="font-bold text-xs text-gray-700">{comment.profiles?.username || '名無しユーザー'}</span>
                      {isMyPost && <span className="bg-blue-600 text-white text-[8px] font-bold px-1 rounded">あなた</span>}
                    </div>

                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    
                    <div className="flex justify-between items-center mt-2 border-b border-gray-50 pb-2 mb-2">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)} className="text-xs flex items-center gap-1 font-bold text-gray-400 hover:text-blue-600 transition-colors">
                          <MessageCircle size={13} />返信を貼る
                        </button>
                        {(isMyPost || isManager) && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-red-500 text-xs font-bold pl-2 border-l border-gray-200"><Trash2 size={12} />削除</button>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400">{new Date(comment.created_at).toLocaleString('ja-JP')}</p>
                    </div>

                    {/* このコメントに対する返信スレッド（古い順にひたすら並ぶ） */}
                    <div className="space-y-2 bg-gray-50 p-2 rounded-lg mt-2">
                      {comments.filter(r => r.type === 'reply' && r.parent_id === comment.id).map(reply => (
                        <div key={reply.id} className="p-2.5 rounded bg-white border border-gray-100 shadow-3xs text-xs">
                          <div className="flex justify-between items-center mb-1 font-bold text-gray-500 text-[10px]">
                            <span className="text-gray-700">{reply.profiles?.username || '名無し'}</span>
                            {(user && user.id === reply.user_id || isManager) && (
                              <button onClick={() => handleDeleteComment(reply.id)} className="text-red-400">削除</button>
                            )}
                          </div>
                          <p className="text-gray-600 font-medium">{reply.content}</p>
                          <p className="text-[8px] text-gray-300 text-right mt-1">{new Date(reply.created_at).toLocaleString('ja-JP')}</p>
                        </div>
                      ))}

                      {replyingToId === comment.id && (
                        <div className="flex gap-2 pt-1">
                          <input type="text" value={newReply} onChange={(e) => setNewReply(e.target.value)} placeholder="返信メッセージを入力..." className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500" />
                          <button onClick={() => handleSubmitReply(comment.id)} className="bg-blue-600 text-white font-bold text-xs px-3 rounded-lg shrink-0">送信</button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}