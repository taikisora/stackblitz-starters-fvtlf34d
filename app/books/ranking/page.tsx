"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, ChevronRight, Trophy, Medal, BookOpen, Users } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

function RankingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const universitiesStr = searchParams.get('universities') || '';
  const stream = searchParams.get('stream') || 'all';
  const uniArray = universitiesStr ? universitiesStr.split(',') : [];

  const [allSortedRanking, setAllSortedRanking] = useState<any[]>([]); // 全集計データ
  const [displayedRanking, setDisplayedRanking] = useState<any[]>([]); // 現在のページの20件
  const [targetUserCount, setTargetUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 💡 ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [universitiesStr, stream]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  // 💡 統計データを集計するメイン処理
  const fetchRankingData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      if (uniArray.length === 0) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      let currentUser = null;
      if (session?.user) {
        setUser(session.user);
        currentUser = session.user;
      }

      let userQuery = supabase.from('profiles').select('id');
      if (stream !== 'all') {
        userQuery = userQuery.eq('stream', stream);
      }

      const orConditions = uniArray.map(uni => 
        `university.eq."${uni}",university2.eq."${uni}",university3.eq."${uni}"`
      ).join(',');

      userQuery = userQuery.or(orConditions);
      const { data: users, error: userError } = await userQuery;

      if (userError || !users || users.length === 0) {
        setTargetUserCount(0);
        setAllSortedRanking([]);
        setDisplayedRanking([]);
        setLoading(false);
        return;
      }

      setTargetUserCount(users.length);
      const userIds = users.map(u => u.id);

      // 志望者たちの本を全件取得
      const { data: statuses, error: statusError } = await supabase
        .from('user_book_status')
        .select(`
          book_id,
          books (*)
        `)
        .in('user_id', userIds)
        .or('is_saved.eq.true,is_used.eq.true');

      if (statusError || !statuses) {
        setAllSortedRanking([]);
        setDisplayedRanking([]);
        setLoading(false);
        return;
      }

      const bookCounts: { [key: string]: { book: any; count: number } } = {};
      statuses.forEach((item: any) => {
        if (!item.books) return; 
        const bookId = item.book_id;
        if (!bookCounts[bookId]) {
          bookCounts[bookId] = { book: item.books, count: 0 };
        }
        bookCounts[bookId].count += 1; 
      });

      // スコアの多い順に並び替え（これが全データ）
      const sortedRanking = Object.values(bookCounts).sort((a, b) => b.count - a.count);
      setAllSortedRanking(sortedRanking);

      // 💡 現在のページ数に応じて、表示する20件を切り出す
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE;
      const pageSlice = sortedRanking.slice(from, to);

      // 💡 【1000件エラー根絶の肝】今画面に表示する「最大20冊」のIDだけを抽出し、自分のいいね状態を完璧にガッチャンコする
      if (currentUser && pageSlice.length > 0) {
        const displayedBookIds = pageSlice.map((item: any) => item.book.id);
        
        const { data: userStatus } = await supabase
          .from('user_book_status')
          .select('book_id, is_saved, is_used')
          .eq('user_id', currentUser.id)
          .in('book_id', displayedBookIds);

        const statusMap: Record<string, { is_saved: boolean, is_used: boolean }> = {};
        userStatus?.forEach(s => {
          statusMap[s.book_id] = { is_saved: s.is_saved, is_used: s.is_used };
        });

        const sliceWithStatus = pageSlice.map((item: any) => ({
          ...item,
          book: {
            ...item.book,
            user_status: statusMap[item.book.id] || { is_saved: false, is_used: false }
          }
        }));
        setDisplayedRanking(sliceWithStatus);
      } else {
        const sliceWithNoStatus = pageSlice.map((item: any) => ({
          ...item,
          book: { ...item.book, user_status: { is_saved: false, is_used: false } }
        }));
        setDisplayedRanking(sliceWithNoStatus);
      }

    } catch (e) {
      console.error(e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [universitiesStr, stream, currentPage]);

  // 💡 初回 ＆ 戻り時フォーカス検知で同期を常に維持
  useEffect(() => {
    fetchRankingData();

    const handleFocus = () => {
      fetchRankingData(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchRankingData]);

  const totalPages = Math.ceil(allSortedRanking.length / ITEMS_PER_PAGE) || 1;

  const handleToggle = async (e: React.MouseEvent, bookId: string, type: 'saved' | 'used') => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!user) {
      alert('この機能を使うにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }

    const itemIndex = displayedRanking.findIndex(item => item.book.id === bookId);
    if (itemIndex === -1) return;

    const targetItem = displayedRanking[itemIndex];
    const book = targetItem.book;
    const currentStatus = type === 'saved' ? book.user_status.is_saved : book.user_status.is_used;
    const nextStatus = !currentStatus;

    await supabase.from('user_book_status').upsert({
      user_id: user.id,
      book_id: bookId,
      [type === 'saved' ? 'is_saved' : 'is_used']: nextStatus
    }, { onConflict: 'user_id,book_id' });

    const countColumn = type === 'saved' ? 'saved_count' : 'used_count';
    const currentCount = book[countColumn] || 0;
    const nextCount = nextStatus ? currentCount + 1 : Math.max(0, currentCount - 1);
    await supabase.from('books').update({ [countColumn]: nextCount }).eq('id', bookId);

    const newDisplayed = [...displayedRanking];
    newDisplayed[itemIndex] = {
      ...targetItem,
      book: {
        ...book,
        [countColumn]: nextCount,
        user_status: {
          ...book.user_status,
          [type === 'saved' ? 'is_saved' : 'is_used']: nextStatus
        }
      }
    };
    setDisplayedRanking(newDisplayed);
  };

  const getStreamLabel = (s: string) => {
    if (s === 'humanities') return '文系';
    if (s === 'sciences') return '理系';
    return '全理系・文系対象';
  };

  const renderRankBadge = (index: number) => {
    // 💡 ページをまたいでも正しい順位を表示できるように計算
    const rank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
    if (rank === 1) return <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black shadow-sm text-sm"><Trophy size={15} /></div>;
    if (rank === 2) return <div className="bg-gradient-to-r from-gray-300 to-slate-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-black shadow-sm text-sm"><Medal size={15} /></div>;
    if (rank === 3) return <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-black shadow-sm text-sm"><Medal size={15} /></div>;
    return <div className="bg-gray-100 text-gray-400 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs">{rank}</div>;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 space-y-6 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Backボタン & 上部ミニ遷移ボタン */}
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white border border-gray-100 shadow-2xs px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors w-max">
            <ChevronLeft size={16} /> 条件を変更する
          </button>

          {!loading && totalPages > 1 && (
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md bg-white border border-gray-200/40 text-slate-700 disabled:opacity-40 disabled:bg-transparent disabled:border-transparent active:scale-90 transition-transform cursor-pointer"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
              <span className="text-[10px] font-black text-slate-700 px-1.5 min-w-[36px] text-center">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md bg-white border border-gray-200/40 text-slate-700 disabled:opacity-40 disabled:bg-transparent disabled:border-transparent active:scale-90 transition-transform cursor-pointer"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {/* 大学名表示バナー */}
        <div className="bg-gradient-to-br from-gray-800 via-slate-900 to-slate-950 text-white p-6 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
          <span className="text-[10px] font-black tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-md uppercase inline-block">
            {getStreamLabel(stream)}
          </span>
          <h1 className="text-base md:text-lg font-black tracking-tight leading-relaxed text-slate-100 border-b border-white/5 pb-2 flex flex-wrap gap-x-2 gap-y-1">
            {uniArray.map((uni, idx) => (
              <span key={uni} className="inline-block">
                {uni}{idx < uniArray.length - 1 && <span className="text-gray-600 ml-2">/</span>}
              </span>
            ))}
          </h1>
          <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5 pt-0.5">
            <Users size={15} className="text-blue-400" />
            志望者・受験者データプール: 計 <span className="text-blue-400 font-black text-sm">{targetUserCount}</span> 名の統計
          </p>
        </div>

        {/* ランキング書籍リスト */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="text-center py-10 text-gray-400 font-bold animate-pulse text-sm">ランキングを集計中...</div>
          ) : displayedRanking.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-3xl">📊</p>
              <p className="text-sm text-gray-500 font-bold">まだこの大学データの集計が完了していません。</p>
            </div>
          ) : (
            <div className="space-y-1 divide-y divide-gray-100/70">
              {displayedRanking.map((item, index) => {
                const book = item.book;
                const isBookSaved = book.user_status?.is_saved;
                return (
                  <div 
                    onClick={() => router.push(`/books/${book.id}`)} 
                    key={book.id} 
                    className="flex gap-5 py-4 first:pt-0 items-center group transition-colors cursor-pointer"
                  >
                    <div className="flex-shrink-0 w-8 flex justify-center">{renderRankBadge(index)}</div>
                    <div className="w-14 h-20 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center text-[8px] text-gray-400 overflow-hidden shadow-2xs border border-gray-200 group-hover:scale-105 transition-transform duration-200">
                       {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-0.5 pr-2">
                      <p className="text-[10px] text-gray-400 font-bold truncate">{book.publisher}</p>
                      <h3 className="font-extrabold text-gray-800 text-sm md:text-base leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-xs font-bold text-gray-500 flex items-center gap-1 pt-1">
                        <BookOpen size={12} className="text-gray-400" />
                        登録者内使用者: <span className="text-blue-600 font-black text-sm">{item.count}</span> 名
                      </p>
                    </div>

                    
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 💡 下部配置用のめくりボタンUI */}
      {!loading && displayedRanking.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-6 bg-white py-5 border-t border-gray-200 shadow-2xs w-full max-w-3xl mx-auto px-4 rounded-b-2xl">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 text-xs font-black rounded-xl border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 disabled:bg-gray-50 cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2.5} /> 前へ
          </button>
          
          <span className="text-sm font-black text-slate-800 tracking-wider">
            {currentPage} / {totalPages} ページ
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-4 py-2 text-xs font-black rounded-xl border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 disabled:bg-gray-50 cursor-pointer"
          >
            次へ <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function RankingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500 font-medium">ランキング集計中...</div>}>
      <RankingContent />
    </Suspense>
  );
}