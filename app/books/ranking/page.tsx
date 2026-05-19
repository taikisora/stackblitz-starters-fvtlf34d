"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Trophy, Medal, BookOpen, Users } from 'lucide-react';

function RankingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ★ 変更：単一の'university'ではなく、複数対応の'universities'を取得する
  const universitiesStr = searchParams.get('universities') || '';
  const stream = searchParams.get('stream') || 'all';

  // カンマ区切りの大学名を配列に変える（例: ["早稲田大学", "慶應義塾大学"])
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

      // ── ① 条件に合うユーザーのIDを動的クエリで一括取得 ──
      let userQuery = supabase.from('profiles').select('id');

      // ★ 改善：文理が 'all'（指定なし）以外の時だけ、文理を条件に加える（allなら全件対象！）
      if (stream !== 'all') {
        userQuery = userQuery.eq('stream', stream);
      }

      // ★ 改善：選択されたすべての大学を「第一〜第三志望のいずれか」にひっかける巨大なOR文を動的に生成
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

      // ── ② そのユーザーたちの参考書ステータスを取得 ──
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

      // ── ③ 集計（カウント）と並び替え ──
      const bookCounts: { [key: string]: { book: any; count: number } } = {};

      statuses.forEach((item: any) => {
        if (!item.books) return; 
        
        const bookId = item.book_id;
        if (!bookCounts[bookId]) {
          bookCounts[bookId] = {
            book: item.books,
            count: 0
          };
        }
        bookCounts[bookId].count += 1; 
      });

      const sortedRanking = Object.values(bookCounts).sort((a, b) => b.count - a.count);

      setRankingList(sortedRanking);
      setLoading(false);
    };

    fetchRankingData();
    }, [universitiesStr, stream, uniArray]);

  // ★ 変更：'all' のときは「指定なし」と表示する
  const getStreamLabel = (s: string) => {
    if (s === 'humanities') return '文系';
    if (s === 'sciences') return '理系';
    return '指定なし';
  };

  const renderRankBadge = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-black shadow-sm text-sm"><Trophy size={14} /></div>;
    if (rank === 2) return <div className="bg-gradient-to-r from-gray-300 to-gray-400 text-white w-7 h-7 rounded-full flex items-center justify-center font-black shadow-sm text-sm"><Medal size={14} /></div>;
    if (rank === 3) return <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white w-7 h-7 rounded-full flex items-center justify-center font-black shadow-sm text-sm"><Medal size={14} /></div>;
    return <div className="bg-gray-100 text-gray-500 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">{rank}</div>;
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium animate-pulse">ランキングを集計中...</div>;

  return (
    <div className="max-w-md mx-auto my-6 px-4 space-y-5 pb-20">
      
      {/* 戻るボタン */}
      <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold">
        <ChevronLeft size={16} /> 条件を変更する
      </button>

      {/* ── タイトルカード ── */}
      <div className="bg-gradient-to-br from-gray-800 to-slate-900 text-white p-6 rounded-3xl shadow-md space-y-2">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border inline-block ${
          stream === 'all' ? 'bg-gray-500/30 text-gray-300 border-gray-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        }`}>
          {getStreamLabel(stream)}
        </span>
        
        {/* ★ 変更：選択された大学群が複数あっても綺麗に並べて表示 */}
        <h1 className="text-base font-black tracking-tight leading-snug text-slate-100">
          {uniArray.join(' / ')}
        </h1>

        <p className="text-sm text-slate-300 font-bold flex items-center gap-1.5 pt-1">
          <Users size={16} className="text-blue-400" />
          データ元: 志望者・受験生 計 <span className="text-blue-400 font-extrabold text-base">{targetUserCount}</span> 名
        </p>
      </div>

      {/* ── ランキング一覧 ── */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        {rankingList.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-2xl">👀</p>
            <p className="text-sm text-gray-500 font-bold">まだこの大学のデータが集まっていません。</p>
            <p className="text-xs text-gray-400">参考書を登録して最初のデータを作ろう！</p>
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-gray-50">
            {rankingList.map((item, index) => {
              const book = item.book;
              return (
                <Link 
                  href={`/books/${book.id}`} 
                  key={book.id} 
                  className="flex gap-4 pt-4 first:pt-0 items-center group transition-colors"
                >
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {renderRankBadge(index)}
                  </div>

                  <div className="w-14 h-18 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center text-[8px] text-gray-400 overflow-hidden shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                     {book.cover_url ? (
                       <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" />
                     ) : (
                       'NO IMAGE'
                     )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs text-gray-400 font-bold truncate">{book.publisher}</p>
                    <p className="text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {book.title}
                    </p>
                    <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1 pt-0.5">
                      <BookOpen size={12} className="text-gray-400" />
                      使用者: <span className="text-blue-600 font-extrabold">{item.count}</span>名
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
    <Suspense fallback={<div className="p-10 text-center text-gray-500 font-medium">読み込み中...</div>}>
      <RankingContent />
    </Suspense>
  );
}