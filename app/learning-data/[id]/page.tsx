"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Edit2, BookOpen, Globe, Lock, ArrowDown, Calendar, User, Heart, MessageCircle, Send, Trash2, CameraOff } from 'lucide-react';

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

  // スクショ専用全画面モードのON/OFF
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

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

        // 1. ルートの情報を取得（💡 profiles から avatar_color も一緒に取得します）
        const { data: routeData } = await supabase
          .from('study_routes')
          .select('*, profiles(username, avatar_color)')
          .eq('id', routeId)
          .single();
        
        if (routeData) {
          setRoute(routeData);
          setLikesCount(routeData.likes_count || 0);
        }

        // 2. 新旧データ両対応フォールバックロジック ＆ custom_title完全結合
        if (routeData && routeData.flow_structure && Array.isArray(routeData.flow_structure)) {
          const allBookIds: string[] = [];
          routeData.flow_structure.forEach((node: any) => {
            if ((!node.type || node.type === 'single') && node.book_id) allBookIds.push(node.book_id);
            if (node.route_A) node.route_A.forEach((b: any) => b.book_id && allBookIds.push(b.book_id));
            if (node.route_B) node.route_B.forEach((b: any) => b.book_id && allBookIds.push(b.book_id));
          });

          if (allBookIds.length > 0) {
            const { data: booksMaster } = await supabase
              .from('books')
              .select('*')
              .in('id', allBookIds);

            if (booksMaster) {
              const booksMap = new Map(booksMaster.map(b => [b.id, b]));

              const hydraStructure = routeData.flow_structure.map((node: any) => {
                if (!node.type || node.type === 'single') {
                  if (node.book_id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
                    return { ...node, custom_title: node.custom_title || 'カスタム参考書', book: { id: node.book_id, title: node.custom_title || "カスタム参考書", publisher: "※タイトルを変更できます" } };
                  }
                  return { ...node, book: booksMap.get(node.book_id) };
                } else {
                  return {
                    ...node,
                    route_A: (node.route_A || []).map((b: any) => {
                      if (b.book_id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
                        return { ...b, custom_title: b.custom_title || 'カスタム参考書', book: { id: b.book_id, title: b.custom_title || "カスタム参考書", publisher: "※タイトルを変更できます" } };
                      }
                      return { ...b, book: booksMap.get(b.book_id) };
                    }),
                    route_B: (node.route_B || []).map((b: any) => {
                      if (b.book_id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
                        return { ...b, custom_title: b.custom_title || 'カスタム参考書', book: { id: b.book_id, title: b.custom_title || "カスタム参考書", publisher: "※タイトルを変更できます" } };
                      }
                      return { ...b, book: booksMap.get(b.book_id) };
                    })
                  };
                }
              });
              setBooks(hydraStructure);
            }
          } else {
            setBooks([]);
          }
        } else {
          // 過去の古いルートのフォールバック
          const { data: booksData } = await supabase
            .from('route_books')
            .select('*, books(*)')
            .eq('route_id', routeId)
            .order('sort_order', { ascending: true });

          if (booksData) {
            const orderedBooks = booksData.map(rb => {
              if (rb.books && rb.books.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
                return {
                  type: 'single',
                  custom_title: 'カスタム参考書',
                  book: { id: rb.books.id, title: "カスタム参考書", publisher: "※タイトルを変更できます" }
                };
              }
              if (rb.books) return { type: 'single', book: rb.books };
              return null;
            }).filter(Boolean);

            setBooks(orderedBooks);
          } else {
            setBooks([]);
          }
        }

        // 💡 修正：一覧画面と同様に、各コメント投稿者の profiles(username, avatar_color) を取得します
        const { data: commentsData } = await supabase
          .from('route_comments')
          .select('*, profiles(username, avatar_color)')
          .eq('route_id', routeId)
          .order('created_at', { ascending: true });
        
        if (commentsData) setComments(commentsData);

        if (currentUser) {
          const { data: likeData } = await supabase
            .from('route_likes')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('route_id', routeId)
            .maybeSingle();
          
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
        await supabase.from('route_likes').insert({
          user_id: user.id,
          route_id: routeId
        });
      } else {
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
      await supabase.from('study_routes').update({ likes_count: nextCommentCount }).eq('id', routeId);
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
    <>
      <div className={`p-4 md:p-6 mx-auto min-h-screen pb-24 transition-all ${isScreenshotMode ? 'max-w-4xl bg-white pt-2' : 'max-w-2xl bg-gray-50 pt-6'}`}>
        
        {/* ナビヘッダー */}
        {!isScreenshotMode && (
          <div className="flex items-center justify-between pb-4 mb-4 relative z-10">
            <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-black">
              <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
            </button>
            {isMyRoute && (
              <button onClick={() => router.push(`/learning-data/${route.id}/edit`)} className="text-sm text-blue-600 flex items-center gap-1.5 font-black bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl transition-colors hover:bg-blue-100">
                <Edit2 size={15} strokeWidth={2.5} /> このルートを編集
              </button>
            )}
          </div>
        )}

        {/* 親ルート解説カード */}
        <div className={`rounded-3xl p-5 border transition-all mb-5 relative ${isScreenshotMode ? 'bg-slate-50/50 border-none p-3 mb-4 text-center' : 'bg-white border-gray-100 shadow-xs'}`}>

          {!isScreenshotMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-3 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                {/* 💡 作成者のカラーグラデーションアバター */}
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 border border-black/5 shadow-3xs overflow-hidden ${
                    route.profiles?.avatar_color === 'red' ? 'bg-red-500' :
                    route.profiles?.avatar_color === 'orange' ? 'bg-orange-500' :
                    route.profiles?.avatar_color === 'amber' ? 'bg-amber-500' :
                    route.profiles?.avatar_color === 'emerald' ? 'bg-emerald-500' :
                    route.profiles?.avatar_color === 'sky' ? 'bg-sky-500' :
                    route.profiles?.avatar_color === 'blue' ? 'bg-blue-500' :
                    route.profiles?.avatar_color === 'indigo' ? 'bg-indigo-500' :
                    route.profiles?.avatar_color === 'purple' ? 'bg-purple-500' :
                    route.profiles?.avatar_color === 'pink' ? 'bg-pink-500' :
                    'bg-gray-500'
                  }`}
                >
                  <User size={15} />
                </div>
                <span className="text-gray-400 font-bold">作成者: {route.profiles?.username || '名無しユーザー'}</span>
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
          )}

          <div className={isScreenshotMode ? "text-center" : ""}>
            {/* 題名 */}
            <h1 className={`font-black text-slate-900 leading-snug transition-all ${isScreenshotMode ? 'text-lg' : 'text-xl md:text-2xl mb-2'}`}>
              {route.title}
            </h1>
            
            {/* 💡 検索画面と同じ、シンプルで綺麗な「戻る」のテキストリンク形式 */}
            {isScreenshotMode && (
              <div className="mt-1 flex justify-center">
                <button 
                  type="button" 
                  onClick={() => setIsScreenshotMode(false)}
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} /> 通常表示に戻す
                </button>
              </div>
            )}

            {!isScreenshotMode && (
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-gray-100/60 shadow-inner mt-4">
                <ExpandableCommentText text={route.description} />
              </div>
            )}
          </div>

          {!isScreenshotMode && (
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
          )}
        </div>

        {/* 🗺️ ロードマップエリア */}
        <div className={`rounded-3xl border border-gray-100 p-5 md:p-6 space-y-4 mb-5 transition-all relative ${isScreenshotMode ? 'bg-transparent border-none p-0 md:p-0 shadow-none' : 'bg-white shadow-xs'}`}>
          {!isScreenshotMode && (
            <div className="flex justify-between items-center border-b border-gray-50 pb-2 relative z-10">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={15} strokeWidth={2.5} /> 参考書ルート（全 {books.length} 冊）
              </h2>
              <button
                type="button"
                onClick={() => setIsScreenshotMode(true)}
                className="text-[11px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-1.5 rounded-xl shadow-3xs active:scale-95 transition-all cursor-pointer"
              >
                 一覧で表示
              </button>
            </div>
          )}

          {books.length === 0 ? (
            <p className="p-8 text-center text-sm font-bold text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-gray-100">参考書が登録されていません。</p>
          ) : (
            <div className="w-full transition-all space-y-4">
              {books.map((item, index) => (
                <div key={index} className={`flex flex-col items-center w-full animate-fade-in ${isScreenshotMode ? 'break-inside-avoid mb-2' : ''}`}>
                  
                  {/* 🟢 パターンA：通常の一本道参考書 */}
                  {(!item.type || item.type === 'single') ? (
                    item.book && (
                      <div 
                        onClick={() => {
                          if (item.book.id !== "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
                            router.push(`/books/${item.book.id}`);
                          }
                        }} 
                        className={`w-full bg-slate-50/60 rounded-2xl border border-gray-100 shadow-3xs flex items-center transition-all group ${
                          item.book.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? "cursor-default" : "cursor-pointer"
                        } ${isScreenshotMode ? 'p-1.5 gap-2.5 bg-slate-50/40 hover:bg-slate-50/80 border-transparent hover:border-gray-100/60' : 'p-3 gap-4 hover:bg-white hover:border-blue-100 shadow-xs'}`}
                      >
                        <div className={`rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 shadow-sm transition-all ${isScreenshotMode ? 'w-4 h-4 text-[9px]' : 'w-7 h-7 text-xs'}`}>{index + 1}</div>
                        <div className={`bg-white rounded-lg overflow-hidden border border-gray-200/80 flex-shrink-0 flex items-center justify-center text-gray-400 text-[9px] shadow-3xs transition-all ${isScreenshotMode ? 'w-8 h-11' : 'w-11 h-16'}`}>
                          {item.book.cover_url ? <img src={item.book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[8px] font-bold text-slate-400 mb-0.5 truncate">{item.book.publisher}</p>
                          <h3 className={`font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors ${isScreenshotMode ? 'text-xs' : 'text-sm'}`}>
                            {item.book.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? (item.custom_title || item.book.title) : item.book.title}
                          </h3>
                        </div>
                      </div>
                    )
                  ) : (
                    /* 🟡 パターンB：特殊ブロック（分岐/並行ブロック） */
                    <div className={`w-full bg-slate-100/60 border border-slate-200/40 rounded-3xl shadow-3xs relative transition-all ${isScreenshotMode ? 'p-2 space-y-1.5' : 'p-3.5 space-y-3'}`}>
                      
                      <div className="flex items-center gap-2 border-b border-slate-200/50 pb-1">
                        <span className={`rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 transition-all ${isScreenshotMode ? 'w-4 h-4 text-[9px]' : 'w-7 h-7 text-xs'}`}>
                          {index + 1}
                        </span>
                        <h3 className="font-black text-[10px] md:text-xs text-slate-800 tracking-tight truncate">{item.title}</h3>
                      </div>

                     {/* 💡 修正：詳細画面は閲覧専用なので、input要素を排除し、正しい表示専用テキストに戻します */}
                    <div className="grid grid-cols-2 gap-2 items-start">
                      
                      {/* 左側の箱 (A) */}
                      <div className="bg-white p-2 rounded-xl border border-slate-200/40 space-y-1.5 min-h-[70px] shadow-3xs shadow-slate-100/50">
                        <span className="text-[8px] font-black tracking-wider text-blue-600 uppercase text-center block border-b border-slate-50 pb-0.5">
                          {item.label_A || (item.type === 'branch' ? '選択 A' : '並行 A')}
                        </span>
                        <div className="space-y-1 py-0.5">
                          {(item.route_A || []).map((sub: any, subIdx: number) => sub.book && (
                            <div 
                              key={subIdx} 
                              onClick={() => {
                                if (sub.book.id !== "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
                                  router.push(`/books/${sub.book.id}`);
                                }
                              }} 
                              className={`flex items-center bg-slate-50 border border-gray-100 rounded-lg hover:bg-white hover:border-blue-100 shadow-3xs transition-all group/sub ${
                                sub.book.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? "cursor-default" : "cursor-pointer"
                              } ${isScreenshotMode ? 'p-1 gap-1.5' : 'p-1.5 gap-2'}`}
                            >
                              <div className={`bg-white rounded-md overflow-hidden border border-gray-200/60 flex-shrink-0 flex items-center justify-center text-gray-400 text-[6px] shadow-3xs transition-all ${isScreenshotMode ? 'w-8 h-11' : 'w-11 h-16'}`}>
                                {sub.book.cover_url ? <img src={sub.book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-black text-[10px] text-slate-800 line-clamp-2 leading-tight group-hover/sub:text-blue-600 transition-colors">
                                  {sub.book.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? (sub.custom_title || sub.book.title) : sub.book.title}
                                </h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 右側の箱 (B) */}
                      <div className="bg-white p-2 rounded-xl border border-slate-200/40 space-y-1.5 min-h-[70px] shadow-3xs shadow-slate-100/50">
                      <span className="text-[8px] font-black tracking-wider text-blue-600 uppercase text-center block border-b border-slate-50 pb-0.5">
                        {item.label_B || (item.type === 'branch' ? '選択 B' : '並行 B')}
                      </span>
                        <div className="space-y-1 py-0.5">
                          {(item.route_B || []).map((sub: any, subIdx: number) => sub.book && (
                            <div 
                              key={subIdx} 
                              onClick={() => {
                                if (sub.book.id !== "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
                                  router.push(`/books/${sub.book.id}`);
                                }
                              }} 
                              className={`flex items-center bg-slate-50 border border-gray-100 rounded-lg hover:bg-white hover:border-blue-100 shadow-3xs transition-all group/sub ${
                                sub.book.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? "cursor-default" : "cursor-pointer"
                              } ${isScreenshotMode ? 'p-1 gap-1.5' : 'p-1.5 gap-2'}`}
                            >
                              <div className={`bg-white rounded-md overflow-hidden border border-gray-200/60 flex-shrink-0 flex items-center justify-center text-gray-400 text-[6px] shadow-3xs transition-all ${isScreenshotMode ? 'w-8 h-11' : 'w-11 h-16'}`}>
                                {sub.book.cover_url ? <img src={sub.book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-black text-[10px] text-slate-800 line-clamp-2 leading-tight group-hover/sub:text-blue-600 transition-colors">
                                  {sub.book.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? (sub.custom_title || sub.book.title) : sub.book.title}
                                </h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                    </div>
                  )}

                  {index < books.length - 1 && !isScreenshotMode && (
                    <div className="text-blue-500/60 p-0.5 bg-blue-50 rounded-full border border-blue-100 my-1.5 relative z-0 animate-pulse">
                      <ArrowDown size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* コメントブロック */}
        {!isScreenshotMode && (
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-xs space-y-4">
            <h3 className="font-black text-slate-800 text-sm tracking-wide border-b border-gray-50 pb-2.5 flex items-center gap-2">
              <MessageCircle size={16} className="text-gray-400" />
              コメント欄（{comments.length}）
            </h3>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 content-start scrollbar-thin scrollbar-thumb-slate-100 scrollbar-track-white hover:scrollbar-thumb-blue-50">
              {comments.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-gray-100">
                  <CameraOff size={28} className="text-gray-300 mx-auto mb-2.5" />
                  <p className="text-xs text-slate-400 font-bold">まだコメントはありません。</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const isMyComment = user && user.id === comment.user_id;
                  return (
                    <div key={comment.id} className="bg-slate-50/70 p-3 rounded-2xl border border-gray-100/60 flex gap-2.5 items-start text-xs relative group/comment">
                      
                      {/* 💡 修正：コメント欄に並ぶ全員のアバターにも、検索画面と同一のカラーテーマを動的適用 */}
                      <div 
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 border border-black/5 shadow-3xs overflow-hidden ${
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
                        <User size={12} />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-700">{comment.profiles?.username || '名無しユーザー'}</span>
                          <span className="text-[9px] text-slate-400 font-bold">{new Date(comment.created_at).toLocaleDateString('ja-JP')}</span>
                        </div>
                        <ExpandableCommentText text={comment.content} />
                      </div>
                      {isMyComment && (
                        <button onClick={() => handleCommentDelete(comment.id)} className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors shrink-0 -mt-0.5 -mr-0.5 opacity-0 group-hover/comment:opacity-100">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="flex flex-col gap-2 pt-2 border-t border-gray-50 mt-1 relative z-10 w-full">
              <textarea
                placeholder={user ? "このルートへの感想や質問を入力..." : "ログインするとコメントできます"}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!user || isSubmitting}
                rows={2}
                className="w-full bg-slate-50 border border-gray-200/60 shadow-inner rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-100 disabled:opacity-50 transition-all placeholder:text-slate-400 placeholder:font-bold resize-none min-h-[50px]"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={!user || !newComment.trim() || isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:bg-slate-200 shrink-0 cursor-pointer transition-colors active:scale-95 shadow-3xs shadow-blue-200 flex items-center justify-center">
                  <Send size={14} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </>
  );
}

function ExpandableCommentText({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text) return null;

  return (
    <div className="mt-1">
      {/* 💡 style属性（インライン・スタイル）で直接指定。これならTailwindのバグに関係なく100%絶対に4行で止まります */}
      <p 
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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs font-black text-blue-600 mt-1.5 hover:text-blue-700 cursor-pointer block"
      >
        {isOpen ? '▲ 折りたたむ' : 'もっと見る'}
      </button>
    </div>
  );
}