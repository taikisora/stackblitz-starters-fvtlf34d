"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link'; 
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Heart, BookOpen, Star, Trash2, ThumbsUp, MessageCircle, User, Layers } from 'lucide-react'; // ★ Layersアイコンを追加

// 👑 ★あなたのSupabaseのユーザーID（UUID）をここに貼り付けてください！
const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID;

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState({ is_saved: false, is_used: false });

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'question'>('review');
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyingToId, setReplyingToId] = useState<string | null>(null); 
  const [newReply, setNewReply] = useState(''); 

  // 📚 ★ 追加：同じシリーズの参考書を保管する状態
  const [seriesBooks, setSeriesBooks] = useState<any[]>([]);

  useEffect(() => {
    const fetchBookAndUser = async () => {
      setLoading(true);

      const { data: bookData } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();
      
      if (bookData) {
        setBook(bookData);

        // 📚 ★ 追加：もしこの本にシリーズ名が設定されていたら、同じシリーズの他の本を最大10件引っ張ってくる
        if (bookData.series_name) {
          const { data: relatedData } = await supabase
            .from('books')
            .select('*')
            .eq('series_name', bookData.series_name)
            .not('id', 'eq', bookId) // 自分自身はリストから除外する
            .limit(10);
          
          if (relatedData) setSeriesBooks(relatedData);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const { data: statusData, error: statusError } = await supabase
          .from('user_book_status')
          .select('book_id, is_saved, is_used')
          .eq('user_id', session.user.id)
          .eq('book_id', bookId)
          .maybeSingle();

        if (statusError) console.error("ステータス取得エラー:", statusError);
        if (statusData) {
          setStatus({
            is_saved: statusData.is_saved || false,
            is_used: statusData.is_used || false,
          });
        }
      }

      const { data: commentsData, error: commentsError } = await supabase
        .from('book_comments')
        .select('*, profiles(username), comment_likes(user_id)') 
        .eq('book_id', bookId) 
        .order('created_at', { ascending: false }); 

      if (commentsError) console.error("コメント取得エラー:", commentsError);
      
      if (commentsData) {
        setComments(commentsData);

        if (session?.user) {
          const myReview = commentsData.find(c => c.type === 'review' && c.user_id === session.user.id);
          if (myReview) {
            setNewRating(myReview.rating || 0);
            setNewComment(myReview.content || '');
          }
        }

        const reviews = commentsData.filter(c => c.type === 'review' && c.rating);
        setReviewCount(reviews.length);
        if (reviews.length > 0) {
          const total = reviews.reduce((sum, r) => sum + r.rating, 0);
          setAverageRating(total / reviews.length);
        } else {
          setAverageRating(0);
        }
      }

      setLoading(false);
    };

    fetchBookAndUser();
  }, [bookId]);

  const toggleStatus = async (type: 'saved' | 'used') => {
    if (!user) {
      alert('この機能を使うにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }

    const currentStatus = type === 'saved' ? status.is_saved : status.is_used;
    const nextStatus = !currentStatus;

    await supabase.from('user_book_status').upsert({
      user_id: user.id,
      book_id: bookId,
      [type === 'saved' ? 'is_saved' : 'is_used']: nextStatus
    }, { onConflict: 'user_id,book_id' });

    const countColumn = type === 'saved' ? 'saved_count' : 'used_count';
    const currentCount = book[countColumn] || 0;
    const nextCount = nextStatus ? currentCount + 1 : Math.max(0, currentCount - 1);

    const { error: bookError } = await supabase
      .from('books')
      .update({ [countColumn]: nextCount })
      .eq('id', bookId);

    if (bookError) {
      console.error("カウント更新エラー:", bookError);
      return;
    }

    setStatus(prev => ({
      ...prev,
      [type === 'saved' ? 'is_saved' : 'is_used']: nextStatus
    }));

    setBook((prev: any) => ({
      ...prev,
      [countColumn]: nextCount
    }));
  };

  const handleSubmitComment = async () => {
    if (!user) {
      alert('書き込みをするにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }
    
    if (activeTab === 'review' && newRating === 0) {
      alert('レビューを投稿するには、星（1〜5）を選択してください。');
      return;
    }
    if (activeTab === 'question' && !newComment.trim()) {
      alert('質問・議論の本文を入力してください。');
      return;
    }

    setIsSubmitting(true);

    const existingReview = comments.find(c => c.type === 'review' && c.user_id === user.id);
    let resultError = null;

    if (activeTab === 'review' && existingReview) {
      const { error } = await supabase
        .from('book_comments')
        .update({
          rating: newRating,
          content: newComment.trim(),
          created_at: new Date().toISOString()
        })
        .eq('id', existingReview.id);
      resultError = error;
    } else {
      const { error } = await supabase
        .from('book_comments')
        .insert({
          book_id: bookId,
          user_id: user.id,
          type: activeTab, 
          rating: activeTab === 'review' ? newRating : null,
          content: newComment.trim()
        });
      resultError = error;
    }

    if (resultError) {
      console.error("投稿エラー:", resultError);
      alert(`投稿に失敗しました。\n理由: ${resultError.message}\nコード: ${resultError.code}`);
    } else {
      if (activeTab === 'question') {
        setNewComment('');
      }
      
      const { data: updatedComments } = await supabase
        .from('book_comments')
        .select('*, profiles(username), comment_likes(user_id)')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });
        
      if (updatedComments) {
        setComments(updatedComments);
        const reviews = updatedComments.filter(c => c.type === 'review' && c.rating);
        const newCount = reviews.length;
        const newAverage = newCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / newCount : 0;
        
        setReviewCount(newCount);
        setAverageRating(newAverage);

        await supabase.from('books').update({
          average_rating: newAverage,
          review_count: newCount
        }).eq('id', bookId);
      }
      
      alert(activeTab === 'review' && existingReview ? 'レビューを更新しました！' : '投稿しました！');
    }
    setIsSubmitting(false);
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user) {
      alert('返信をするにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }
    if (!newReply.trim()) {
      alert('返信メッセージを入力してください。');
      return;
    }

    const { error } = await supabase
      .from('book_comments')
      .insert({
        book_id: bookId,
        user_id: user.id,
        type: 'reply', 
        parent_id: parentId, 
        content: newReply.trim()
      });

    if (error) {
      console.error("返信エラー:", error);
      alert('返信の送信に失敗しました。');
    } else {
      setNewReply('');
      setReplyingToId(null); 

      const { data: updatedComments } = await supabase
        .from('book_comments')
        .select('*, profiles(username), comment_likes(user_id)')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });
      if (updatedComments) setComments(updatedComments);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('この書き込みを削除してもよろしいですか？')) return;

    const { error } = await supabase
      .from('book_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error("削除エラー:", error);
      alert('削除に失敗しました。');
    } else {
      const { data: updatedComments } = await supabase
        .from('book_comments')
        .select('*, profiles(username), comment_likes(user_id)')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });
        
      if (updatedComments) {
        setComments(updatedComments);
        const reviews = updatedComments.filter(c => c.type === 'review' && c.rating);
        const newCount = reviews.length;
        const newAverage = newCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / newCount : 0;

        setReviewCount(newCount);
        setAverageRating(newAverage);

        await supabase.from('books').update({
          average_rating: newAverage,
          review_count: newCount
        }).eq('id', bookId);
      }
    }
  };

  const toggleLike = async (commentId: string) => {
    if (!user) {
      alert('いいねを押すにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }

    const targetComment = comments.find(c => c.id === commentId);
    const isLiked = targetComment?.comment_likes?.some((like: any) => like.user_id === user.id);

    if (isLiked) {
      await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: user.id });
    }

    const { data: updatedComments } = await supabase
      .from('book_comments')
      .select('*, profiles(username), comment_likes(user_id)') 
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });

    if (updatedComments) setComments(updatedComments);
  };

  if (loading) return <p className="text-center py-20 text-gray-500 font-bold animate-pulse">読み込み中...</p>;
  if (!book) return <p className="text-center py-20 text-gray-500 font-bold">参考書が見つかりませんでした。</p>;

  const shortDescription = book.description && book.description.length > 100 
    ? book.description.slice(0, 100) + "..." 
    : book.description;

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen pb-24">
      <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center mb-4 font-bold">
        <ChevronLeft size={16} /> 戻る
      </button>

      <div className="flex gap-4 mb-6">
        <div className="w-28 h-40 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm flex items-center justify-center text-gray-400 text-xs">
          {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
        </div>
        <div className="flex flex-col justify-between py-1">
          <div>
            <p className="text-xs text-gray-500 font-bold mb-1">{book.publisher}</p>
            <h1 className="font-bold text-lg text-gray-900 leading-tight mb-2">{book.title}</h1>
            <p className="text-sm text-gray-600 mb-2">{book.author}</p>
          </div>
          
          <div className="text-xs text-gray-400 flex flex-col gap-1">
            <p>発売日: {book.published_date || '不明'}</p>
            <div className="flex gap-3 font-bold mt-1">
              <span className="flex items-center gap-1 text-pink-500">
                <Heart size={14} fill="currentColor" /> {book.saved_count || 0}
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <BookOpen size={14} fill="currentColor" /> {book.used_count || 0}
              </span>
            </div>

            <div className="flex items-center gap-1 mt-1">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className={i < Math.round(averageRating) ? 'fill-current' : 'text-gray-300'} />
                ))}
              </div>
              <span className="text-xs font-bold text-gray-700 ml-1">{averageRating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({reviewCount})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => toggleStatus('saved')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border transition-colors ${
            status.is_saved
              ? 'bg-blue-50 border-blue-200 text-pink-500'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Heart size={18} fill={status.is_saved ? "currentColor" : "none"} />
          {status.is_saved ? 'いいね済み' : 'いいね'}
        </button>

        <button
          onClick={() => toggleStatus('used')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border transition-colors ${
            status.is_used
              ? 'bg-green-50 border-green-200 text-green-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <BookOpen size={18} fill={status.is_used ? "currentColor" : "none"} />
          {status.is_used ? '使用中/使用済み' : 'この本を使用'}
        </button>
      </div>

      <div className="border-t border-gray-100 pt-4 mb-6">
        <h2 className="font-bold text-sm text-gray-800 mb-2">参考書の説明</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {isDescExpanded ? (book.description || 'この参考書の説明はまだ登録されていません。') : (shortDescription || 'この参考書の説明はまだ登録されていません。')}
        </p>
        {book.description && book.description.length > 100 && (
          <button 
            onClick={() => setIsDescExpanded(!isDescExpanded)} 
            className="text-blue-600 font-bold text-sm mt-2 hover:underline block"
          >
            {isDescExpanded ? "閉じる" : "もっと見る"}
          </button>
        )}
      </div>

      {/* 🔮 ★ 新規追加：同じシリーズの参考書横スクロールUI */}
      {seriesBooks.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mb-6">
          <div className="flex items-center gap-1.5 mb-3 text-gray-800">
            <Layers size={16} className="text-blue-500" />
            <h2 className="font-bold text-sm">シリーズの他の参考書</h2>
          </div>
          
          {/* 横スクロール対応のコンテナ */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {seriesBooks.map((sb) => (
              <Link 
                key={sb.id} 
                href={`/books/${sb.id}`}
                className="w-24 shrink-0 block group bg-gray-50/50 border border-gray-100 p-2 rounded-xl active:scale-95 transition-all"
              >
                {/* ミニカバー画像 */}
                <div className="w-full h-28 bg-gray-100 rounded-lg overflow-hidden border border-gray-200/60 mb-1.5 flex items-center justify-center text-gray-400 text-[10px] text-center font-bold">
                  {sb.cover_url ? <img src={sb.cover_url} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : 'NO IMAGE'}
                </div>
                {/* 本のタイトル（2行で切り捨ててスッキリさせる） */}
                <p className="text-[10px] font-bold text-gray-700 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                  {sb.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 pt-2">
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('review')}
            className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition-colors ${
              activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            }`}
          >
            レビュー
          </button>
          <button
            onClick={() => setActiveTab('question')}
            className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition-colors ${
              activeTab === 'question' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            }`}
          >
            質問・議論
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          
          <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">
              {activeTab === 'review' ? 'レビューを投稿する' : '質問・議論を投稿する'}
            </h3>
            
            {activeTab === 'review' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500 font-bold">評価 <span className="text-red-500">*</span></span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setNewRating(star)} type="button" className="focus:outline-none">
                      <Star size={20} className={star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-200'} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={activeTab === 'review' ? 'この参考書の感想・おすすめの使い方は？' : 'この参考書について質問や議論したいことを書き込みましょう。'}
              className="w-full text-sm border border-gray-200 rounded-lg p-3 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors min-h-[80px] mb-2"
            />
            <button 
              onClick={handleSubmitComment}
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-bold text-sm py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              {isSubmitting ? '送信中...' : (
                activeTab === 'review' && comments.some(c => c.type === 'review' && c.user_id === user?.id)
                  ? 'レビューを更新する'
                  : '投稿する'
              )}
            </button>
          </div>

          <div className="space-y-3">
            {comments.filter(c => c.type === activeTab).length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-6">
                まだ{activeTab === 'review' ? 'レビュー' : '質問'}はありません。<br/>最初の投稿をしてみましょう！
              </p>
            ) : (
              comments.filter(c => c.type === activeTab).map(comment => {
                const isMyPost = user && user.id === comment.user_id;
                const isManager = user && user.id === ADMIN_USER_ID;

                return (
                  <div 
                    key={comment.id} 
                    className={`p-4 rounded-xl border transition-all ${
                      isMyPost 
                        ? 'bg-blue-50/40 border-blue-100 shadow-xs ring-1 ring-blue-50/50' 
                        : 'bg-white border-gray-100 shadow-sm' 
                    }`}
                  >
                    <div className="mb-2 w-fit">
                      <Link 
                        href={`/users/${comment.user_id}`} 
                        className="flex items-center gap-1.5 hover:underline group cursor-pointer"
                      >
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 shrink-0 border border-gray-200">
                          <User size={12} />
                        </div>
                        <span className={`font-bold text-xs ${isMyPost ? 'text-blue-900 group-hover:text-blue-600' : 'text-gray-800 group-hover:text-blue-600'}`}>
                          {comment.profiles?.username || '名無しユーザー'}
                        </span>
                        {isMyPost && (
                          <span className="bg-blue-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-md tracking-wider shadow-2xs">
                            あなた
                          </span>
                        )}
                      </Link>
                    </div>

                    {comment.type === 'review' && comment.rating && (
                      <div className="flex text-amber-400 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < comment.rating! ? 'fill-current' : 'text-gray-200'} />
                        ))}
                      </div>
                    )}
                    {comment.content && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-1">
                        {comment.content}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center mt-2 border-b border-gray-100/50 pb-2 mb-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleLike(comment.id)}
                          className={`text-xs flex items-center gap-1.5 font-bold transition-colors ${
                            comment.comment_likes?.some((l: any) => l.user_id === user?.id)
                              ? 'text-blue-600'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          <ThumbsUp 
                            size={14} 
                            fill={comment.comment_likes?.some((l: any) => l.user_id === user?.id) ? "currentColor" : "none"} 
                          />
                          <span>{comment.comment_likes?.length || 0}</span>
                        </button>

                        {comment.type === 'question' && (
                          <button
                            onClick={() => {
                              if (replyingToId === comment.id) {
                                setReplyingToId(null);
                              } else {
                                setReplyingToId(comment.id);
                                setNewReply('');
                              }
                            }}
                            className={`text-xs flex items-center gap-1 font-bold transition-colors border-l border-gray-200 pl-3 ${
                              replyingToId === comment.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <MessageCircle size={13} />
                            返信
                          </button>
                        )}

                        {(isMyPost || isManager) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-bold transition-colors border-l border-gray-200 pl-3"
                          >
                            <Trash2 size={12} />
                            {isManager && !isMyPost ? '【管理者】削除' : '削除'}
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {new Date(comment.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>

                    {comment.type === 'question' && (
                      <div className="space-y-2 bg-gray-50/70 p-2 rounded-lg mt-2">
                        {comments
                          .filter(r => r.type === 'reply' && r.parent_id === comment.id)
                          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                          .map(reply => {
                            const isMyReply = user && user.id === reply.user_id;
                            const isReplyManager = user && user.id === ADMIN_USER_ID;
                            
                            return (
                              <div 
                                key={reply.id} 
                                className={`p-2.5 rounded-lg border ${
                                  isMyReply 
                                    ? 'bg-blue-50/50 border-blue-100 shadow-2xs' 
                                    : 'bg-white border-gray-100 shadow-3xs' 
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <Link 
                                    href={`/users/${reply.user_id}`} 
                                    className="flex items-center gap-1.5 hover:underline group cursor-pointer"
                                  >
                                    <div className="w-3.5 h-3.5 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 shrink-0 border border-gray-200">
                                      <User size={9} />
                                    </div>
                                    <span className={`font-bold text-[11px] ${isMyReply ? 'text-blue-800' : 'text-gray-600'}`}>
                                      {reply.profiles?.username || '名無しユーザー'}
                                    </span>
                                    {isMyReply && (
                                      <span className="text-blue-600 font-extrabold text-[8px] bg-blue-100/70 px-1 rounded">
                                        あなた
                                      </span>
                                    )}
                                  </Link>
                                  
                                  {(isMyReply || isReplyManager) && (
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-red-400 hover:text-red-600 text-[10px] font-bold"
                                    >
                                      {isReplyManager && !isMyReply ? '【管理者】消去' : '削除'}
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                                <p className="text-[8px] text-gray-400 text-right mt-1">
                                  {new Date(reply.created_at).toLocaleString('ja-JP')}
                                </p>
                              </div>
                            );
                          })}

                        {replyingToId === comment.id && (
                          <div className="flex gap-2 pt-1">
                            <input
                              type="text"
                              value={newReply}
                              onChange={(e) => setNewReply(e.target.value)}
                              placeholder="返信を入力..."
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-400 transition-colors"
                            />
                            <button
                              onClick={() => handleSubmitReply(comment.id)}
                              className="bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                            >
                              送信
                            </button>
                          </div>
                        )}
                      </div>
                    )}

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