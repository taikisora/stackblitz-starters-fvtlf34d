"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link'; 
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Heart, BookOpen, Star, Trash2, ThumbsUp, MessageCircle, User, Layers } from 'lucide-react';

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

        if (bookData.series_name) {
          const { data: relatedData } = await supabase
            .from('books')
            .select('*')
            .eq('series_name', bookData.series_name)
            .not('id', 'eq', bookId)
            .limit(40);
          
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
      alert(`投稿に失敗しました。\n理由: ${resultError.message}`);
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen pb-24">
      
      {/* 戻るボタン */}
      <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center mb-5 font-bold hover:opacity-75 transition-opacity">
        <ChevronLeft size={18} /> 戻る
      </button>

      {/* メインセクション：スマホ横並び、PC2カラム */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100/80 mb-6 flex flex-row md:flex-row gap-4 md:gap-6 items-start">
        
        {/* 左側：カバー画像 */}
        <div className="w-24 h-32 md:w-36 md:h-52 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm flex items-center justify-center text-gray-400 text-xs md:text-sm">
          {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
        </div>
        
        {/* 右側：コンテンツエリア */}
        <div className="flex-1 flex flex-col justify-between self-stretch py-0.5">
          <div>
            {/* 出版社バッジ */}
            <div className="mb-1.5">
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] md:text-xs font-bold rounded-md tracking-wide">
                {book.publisher}
              </span>
            </div>
            {/* タイトルと著者 */}
            <h1 className="font-black text-base md:text-2xl text-slate-900 leading-snug mb-1 line-clamp-2 md:line-clamp-none">{book.title}</h1>
            <p className="text-xs md:text-base text-slate-600 font-medium mb-2 md:mb-4">{book.author}</p>
          </div>
          
          {/* 下部：評価とアクションボタン */}
          <div className="mt-auto space-y-3 md:space-y-4">
            {/* 星評価 */}
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className={i < Math.round(averageRating) ? 'fill-current' : 'text-gray-200'} />
                ))}
              </div>
              <span className="text-sm md:text-xl font-black text-slate-800 ml-0.5">{averageRating.toFixed(1)}</span>
              <span className="text-xs md:text-base font-bold text-gray-400">({reviewCount})</span>
            </div>

            {/* ボタン：2列横並び・スマホ最適化版 */}
            <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-gray-100">
              
              <button
                onClick={() => toggleStatus('saved')}
                className={`flex items-center justify-center gap-1 w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                  status.is_saved
                    ? 'bg-pink-50 border-pink-200 text-pink-600 shadow-3xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Heart size={14} fill={status.is_saved ? "currentColor" : "none"} strokeWidth={2.5} />
                <span className="truncate">{status.is_saved ? 'いいね済' : 'いいね'}</span>
                <span className="px-1 py-0.2 text-[9px] rounded bg-black/5 shrink-0">{book.saved_count || 0}</span>
              </button>

              <button
                onClick={() => toggleStatus('used')}
                className={`flex items-center justify-center gap-1 w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                  status.is_used
                    ? 'bg-green-50 border-green-200 text-green-700 shadow-3xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <BookOpen size={14} fill={status.is_used ? "currentColor" : "none"} strokeWidth={2.5} />
                <span className="truncate">{status.is_used ? '使用中' : '使用する'}</span>
                <span className="px-1 py-0.2 text-[9px] rounded bg-black/5 shrink-0">{book.used_count || 0}</span>
              </button>
              
            </div>
          </div>

        </div>
      </div>

      {/* 参考書の説明セクション */}
      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100/80 mb-6">
        <h2 className="font-black text-sm md:text-base text-slate-800 mb-2.5">参考書の説明</h2>
        
        {/* 💡 著作権リスク回避のため、紹介文を一旦非表示にし、案内メッセージに差し替え */}
        <p className="text-sm md:text-base text-gray-400 italic leading-relaxed">
          ※現在、参考書の紹介文は一時的に非表示にしております。恐れ入りますが、詳細な内容は各公式サイトやECサイト等をご確認ください。
        </p>

        {/* 💡 元の表示処理は安全のために一旦コメントアウト（非表示化）しておきます
        <p className="text-sm md:text-base text-slate-600 leading-relaxed whitespace-pre-wrap">
          {isDescExpanded ? (book.description || 'この参考書の説明はまだ登録されていません。') : (shortDescription || 'この参考書の説明はまだ登録されていません。')}
        </p>
        {book.description && book.description.length > 100 && (
          <button 
            onClick={() => setIsDescExpanded(!isDescExpanded)} 
            className="text-blue-600 font-bold text-sm mt-3 hover:underline block"
          >
            {isDescExpanded ? "閉じる" : "もっと見る"}
          </button>
        )}
        */}
      </div>

      {/* 同じシリーズの参考書横スクロールUI */}
      {seriesBooks.length > 0 && (
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100/80 mb-6">
          <div className="flex items-center gap-1.5 mb-3.5 text-slate-800">
            <Layers size={18} className="text-blue-500" />
            <h2 className="font-black text-sm md:text-base">シリーズの他の参考書</h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
            {seriesBooks.map((sb) => (
              <Link 
                key={sb.id} 
                href={`/books/${sb.id}`}
                className="w-28 shrink-0 block group bg-slate-50/60 border border-gray-100 p-2.5 rounded-xl active:scale-95 transition-all hover:border-blue-100 hover:bg-white"
              >
                <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200/60 mb-2 flex items-center justify-center text-gray-400 text-xs text-center font-bold">
                  {sb.cover_url ? <img src={sb.cover_url} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : 'NO IMAGE'}
                </div>
                <p className="text-xs font-black text-slate-700 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                  {sb.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* タブ ＆ 投稿・コメントフィードセクション */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100/80">
        
        {/* タブ切り替え */}
        <div className="flex border-b border-gray-100 mb-5">
          <button
            onClick={() => setActiveTab('review')}
            // 💡 flex items-center justify-center gap-1.5 にして、文字と数字を綺麗に横並びにしました
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-center font-black text-sm md:text-base border-b-2 transition-colors cursor-pointer ${
              activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
            }`}
          >
            <span>レビュー</span>
            {/* 💡 レビューの総数を丸バッジで表示 */}
            <span className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded-full font-black tracking-tighter shadow-3xs ${
              activeTab === 'review' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {comments.filter(c => c.type === 'review').length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('question')}
            // 💡 flex items-center justify-center gap-1.5 にして、文字と数字を綺麗に横並びにしました
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-center font-black text-sm md:text-base border-b-2 transition-colors cursor-pointer ${
              activeTab === 'question' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
            }`}
          >
            <span>質問・議論</span>
            {/* 💡 質問の総数を丸バッジで表示 */}
            <span className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded-full font-black tracking-tighter shadow-3xs ${
              activeTab === 'question' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {comments.filter(c => c.type === 'question').length}
            </span>
          </button>
        </div>

        {/* 投稿フォームエリア */}
        <div className="mb-6 bg-slate-50/70 p-4 rounded-xl border border-gray-200/60 shadow-inner">
          <h3 className="text-sm font-black text-slate-800 mb-3">
            {activeTab === 'review' ? 'レビューを投稿する' : '質問・議論を投稿する'}
          </h3>
          
          {activeTab === 'review' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500 font-bold">評価 <span className="text-red-500">*</span></span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setNewRating(star)} type="button" className="focus:outline-none transition-transform active:scale-90">
                    <Star size={24} className={star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-200'} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={activeTab === 'review' ? 'この参考書の感想・おすすめの使い方は？' : 'この参考書について質問や議論したいことを書き込みましょう。'}
            className="w-full text-sm md:text-base border border-gray-200 rounded-lg p-3 bg-white focus:outline-none focus:border-blue-400 transition-colors min-h-[90px] mb-2.5 shadow-3xs text-slate-800 font-bold"
          />
          <button 
            onClick={handleSubmitComment}
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white font-black text-sm md:text-base py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300 shadow-sm cursor-pointer"
          >
            {isSubmitting ? '送信中...' : (
              activeTab === 'review' && comments.some(c => c.type === 'review' && c.user_id === user?.id)
                ? 'レビューを更新する'
                : '投稿する'
            )}
          </button>
        </div>

        {/* コメント一覧フィード */}
        <div className="space-y-4">
          {comments.filter(c => c.type === activeTab).length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10 font-bold">
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
                      ? 'bg-blue-50/30 border-blue-100 shadow-3xs' 
                      : 'bg-white border-gray-100 shadow-sm' 
                  }`}
                >
                  <div className="mb-2.5 flex justify-between items-start">
                    <Link 
                      href={`/users/${comment.user_id}`} 
                      className="flex items-center gap-2 hover:underline group cursor-pointer"
                    >
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                        <User size={14} />
                      </div>
                      <span className={`font-black text-sm ${isMyPost ? 'text-blue-950' : 'text-slate-800'}`}>
                        {comment.profiles?.username || '名無しユーザー'}
                      </span>
                      {isMyPost && (
                        <span className="bg-blue-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-md tracking-wider shadow-3xs">
                          あなた
                        </span>
                      )}
                    </Link>
                  </div>

                  {comment.type === 'review' && comment.rating && (
                    <div className="flex text-amber-400 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} className={i < comment.rating! ? 'fill-current' : 'text-gray-200'} />
                      ))}
                    </div>
                  )}
                  {comment.content && (
                    <ExpandableCommentText text={comment.content} />
                  )}
                  
                  <div className="flex justify-between items-center mt-3 border-b border-gray-100/60 pb-2 mb-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLike(comment.id)}
                        className={`text-xs flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                          comment.comment_likes?.some((l: any) => l.user_id === user?.id)
                            ? 'text-blue-600'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <ThumbsUp 
                          size={15} 
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
                          className={`text-xs flex items-center gap-1 font-bold transition-colors border-l border-gray-200 pl-3 cursor-pointer ${
                            replyingToId === comment.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          <MessageCircle size={14} />
                          返信
                        </button>
                      )}

                      {(isMyPost || isManager) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-bold transition-colors border-l border-gray-200 pl-3 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          {isManager && !isMyPost ? '【管理者】削除' : '削除'}
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {new Date(comment.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>

                  {comment.type === 'question' && (
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl mt-2">
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
                                  ? 'bg-blue-50/40 border-blue-100 shadow-3xs' 
                                  : 'bg-white border-gray-100 shadow-3xs' 
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <Link 
                                  href={`/users/${reply.user_id}`} 
                                  className="flex items-center gap-1.5 hover:underline group cursor-pointer"
                                >
                                  <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 shrink-0 border border-gray-200">
                                    <User size={10} />
                                  </div>
                                  <span className={`font-black text-xs ${isMyReply ? 'text-blue-900' : 'text-slate-700'}`}>
                                    {reply.profiles?.username || '名無しユーザー'}
                                  </span>
                                  {isMyReply && (
                                    <span className="text-blue-600 font-black text-[8px] bg-blue-100/70 px-1 rounded">
                                      あなた
                                    </span>
                                  )}
                                </Link>
                                
                                {(isMyReply || isReplyManager) && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="text-red-400 hover:text-red-600 text-[10px] font-bold"
                                  >
                                    削除
                                  </button>
                                )}
                              </div>
                              <ExpandableCommentText text={reply.content} />
                              <p className="text-[8px] text-gray-400 text-right mt-1 font-medium">
                                {new Date(reply.created_at).toLocaleString('ja-JP')}
                              </p>
                            </div>
                          );
                        })}

                      {replyingToId === comment.id && (
                        <div className="flex flex-col gap-2 pt-1 w-full">
                          <textarea
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                            placeholder="返信を入力..."
                            rows={2}
                            className="w-full text-xs md:text-sm border border-gray-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-blue-400 transition-colors shadow-3xs text-slate-800 font-bold resize-none min-h-[44px]"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSubmitReply(comment.id)}
                              className="bg-blue-600 text-white font-black text-xs md:text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer active:scale-95"
                            >
                              送信
                            </button>
                          </div>
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
  );
}

function ExpandableCommentText({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLongText, setIsLongText] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      // 実際の全体の高さが、表示されている高さ（4行分）より大きければ5行目突入と判定
      const hasMore = textRef.current.scrollHeight > textRef.current.clientHeight;
      setIsLongText(hasMore);
    }
  }, [text]);

  if (!text) return null;

  return (
    <div className="mt-1">
      <p 
        ref={textRef}
        className="text-sm md:text-base text-slate-800 whitespace-pre-wrap leading-relaxed font-bold"
        style={
          isOpen 
            ? {} 
            : {
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
        }
      >
        {text}
      </p>

      {/* 💡 5行目に突入している場合のみ「もっと見る」を表示 */}
      {isLongText && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-black text-blue-600 mt-1.5 hover:text-blue-700 cursor-pointer block"
        >
          {isOpen ? '▲ 折りたたむ' : 'もっと見る'}
        </button>
      )}
    </div>
  );
}