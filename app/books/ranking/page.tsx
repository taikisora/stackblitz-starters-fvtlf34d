"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Trophy, Medal, BookOpen, Users } from 'lucide-react';

function RankingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const universitiesStr = searchParams.get('universities') || '';
  const stream = searchParams.get('stream') || 'all';
  const uniArray = universitiesStr ? universitiesStr.split(',') : [];

  const [rankingList, setRankingList] = useState<any[]>([]);
  const [targetUserCount, setTargetUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankingData = async () => {
      if (uniArray.length === 0) {
        setLoading(false);
        return;
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
        setRankingList([]);
        setLoading(false);
        return;
      }

      setTargetUserCount(users.length);
      const userIds = users.map(u => u.id);

      const { data: statuses, error: statusError } = await supabase
        .from('user_book_status')
        .select(`
          book_id,
          books (*)
        `)
        .in('user_id', userIds)
        .or('is_saved.eq.true,is_used.eq.true');

      if (statusError || !statuses) {
        setRankingList([]);
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

      const sortedRanking = Object.values(bookCounts).sort((a, b) => b.count - a.count);
      setRankingList(sortedRanking);
      setLoading(false);
    };

    fetchRankingData();
  }, [universitiesStr, stream]);

  const getStreamLabel = (s: string) => {
    if (s === 'humanities') return '文系';
    if (s === 'sciences') return '理系';
    return '全理系・文系対象';
  };

  const renderRankBadge = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black shadow-sm text-sm"><Trophy size={15} /></div>;
    if (rank === 2) return <div className="bg-gradient-to-r from-gray-300 to-slate-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-black shadow-sm text-sm"><Medal size={15} /></div>;
    if (rank === 3) return <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-black shadow-sm text-sm"><Medal size={15} /></div>;
    return <div className="bg-gray-100 text-gray-400 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs">{rank}</div>;
  };

  return (
    // 💡 変更点：max-w-md から max-w-3xl に広げ、他の画面と横幅・カードの角丸デザインを完全に統一
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 space-y-6">
      
      {/* Backボタン */}
      <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white border border-gray-100 shadow-2xs px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors w-max">
        <ChevronLeft size={16} /> 条件を変更する
      </button>

      {/* ── 大学名表示バナー（幅を広げてフォントサイズを微調整） ── */}
      <div className="bg-gradient-to-br from-gray-800 via-slate-900 to-slate-950 text-white p-6 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
        <span className="text-[10px] font-black tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-md uppercase inline-block">
          {getStreamLabel(stream)}
        </span>
        {/* 大画面の時は大学名同士がぶつからないよう、flexかつgapを持たせて並べます */}
        <h1 className="text-base md:text-lg font-black tracking-tight leading-relaxed text-slate-100 border-b border-white/5 pb-2 flex flex-wrap gap-x-2 gap-y-1">
          {uniArray.map((uni, idx) => (
            <span key={uni} className="inline-block">
              {uni}{idx < uniArray.length - 1 && <span className="text-gray-600 ml-2">/</span>}
            </span>
          ))}
        </h1>
        <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5 pt-0.5">
          <Users size={15} className="text-blue-400" />
          志望者・使用者データプール: 計 <span className="text-blue-400 font-black text-sm">{targetUserCount}</span> 名の統計
        </p>
      </div>

      {/* ── ランキング書籍リスト（PC表示時に左右にゆとりを持たせて洗練） ── */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {rankingList.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-3xl">📊</p>
            <p className="text-sm text-gray-500 font-bold">まだこの大学データの集計が完了していません。</p>
            <p className="text-xs text-gray-400">あなたが最初の参考書をマイページに登録してみましょう！</p>
          </div>
        ) : (
          <div className="space-y-1 divide-y divide-gray-100/70">
            {rankingList.map((item, index) => {
              const book = item.book;
              return (
                <Link 
                  href={`/books/${book.id}`} 
                  key={book.id} 
                  className="flex gap-5 py-4 first:pt-0 items-center group transition-colors"
                >
                  <div className="flex-shrink-0 w-8 flex justify-center">{renderRankBadge(index)}</div>
                  {/* 本の画像：細長さを防ぐため横幅固定、PC向けに縦横比を微調整 */}
                  <div className="w-14 h-20 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center text-[8px] text-gray-400 overflow-hidden shadow-2xs border border-gray-200 group-hover:scale-105 transition-transform duration-200">
                     {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-[10px] text-gray-400 font-bold truncate">{book.publisher}</p>
                    <h3 className="font-extrabold text-gray-800 text-sm md:text-base leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs font-bold text-gray-500 flex items-center gap-1 pt-1">
                      <BookOpen size={12} className="text-gray-400" />
                      登録者内使用者: <span className="text-blue-600 font-black text-sm">{item.count}</span> 名
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
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