"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Megaphone, Heart, Star, BookOpen, Crown } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  
  // 各種ステータスの管理
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [savedRanking, setSavedRanking] = useState<any[]>([]);
  const [ratingRanking, setRatingRanking] = useState<any[]>([]);
  const [usedRanking, setUsedRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        // 1. 運営お知らせ（最大3件）
        const fetchAnnounce = supabase
          .from('announcements')
          .select('id, title, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        // 2. いいね（保存）数順ランキング（最大10件）
        const fetchSaved = supabase
          .from('books')
          .select('id, title, publisher, cover_url, saved_count')
          .order('saved_count', { ascending: false })
          .limit(10);

        // 3. 評価（星の平均点）順ランキング（最大10件）
        const fetchRating = supabase
          .from('books')
          .select('id, title, publisher, cover_url, average_rating, review_count')
          .order('average_rating', { ascending: false })
          .limit(10);

        // 4. 使用本棚に登録されている順ランキング（最大10件）
        const fetchUsed = supabase
          .from('books')
          .select('id, title, publisher, cover_url, used_count')
          .order('used_count', { ascending: false })
          .limit(10);

        // すべてのクエリを同時に並列実行
        const [announceRes, savedRes, ratingRes, usedRes] = await Promise.all([
          fetchAnnounce, fetchSaved, fetchRating, fetchUsed
        ]);

        if (announceRes.data) setAnnouncements(announceRes.data);
        if (savedRes.data) setSavedRanking(savedRes.data);
        if (ratingRes.data) setRatingRanking(ratingRes.data);
        if (usedRes.data) setUsedRanking(usedRes.data);

      } catch (err) {
        console.error("データ読み込みエラー:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // 🥇🥈🥉 ランキングの順位バッジを描画する補助関数
  const renderRankBadge = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center font-black text-[10px] shadow-xs">1</span>;
    if (rank === 2) return <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-slate-300 text-white flex items-center justify-center font-black text-[10px] shadow-xs">2</span>;
    if (rank === 3) return <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-black text-[10px] shadow-xs">3</span>;
    return <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-[9px] backdrop-blur-2xs">{rank}</span>;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 space-y-4 md:space-y-6">
      
      {/* 🔮 ヒーローセクション */}
      <div className="bg-white rounded-3xl p-6 md:p-12 shadow-sm border border-gray-100/80 mb-4 md:mb-8 relative overflow-hidden flex flex-col items-center text-center">
        {/* 背景のさりげない装飾 */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-3xl space-y-3 md:space-y-4">
          <p className="text-[9px] md:text-xs font-bold text-blue-600 tracking-widest uppercase">
            参考書検索・管理アプリ
          </p>
          
          <h2 className="text-lg md:text-3xl font-black tracking-tight text-slate-900 leading-snug max-w-3xl mx-auto break-keep">
            志望校合格への最短ルートを、<br className="md:hidden" />みんなで見つけよう。
          </h2>
          
          {/* 💡 ボタンを無くした代わりに下部の余白（pb-1 md:pb-2）を少し持たせてスッキリ着地 */}
          <p className="text-[11px] md:text-sm text-slate-400 md:text-slate-500 font-medium max-w-md md:max-w-none mx-auto leading-normal pb-1 md:pb-2">
            1,000冊以上の参考書データと、先輩たちのデータから、最適な1冊が見つかります。
          </p>
        </div>
      </div>

      {/* 📢 お知らせセクション */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-2 rounded-xl shadow-2xs">
              <Megaphone size={16} className="text-amber-600" />
            </div>
            <h3 className="font-extrabold text-gray-800 text-sm">運営からのお知らせ</h3>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-gray-100 rounded-xl"></div>
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4 font-bold">現在、お知らせはありません。</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {announcements.map((announcement) => (
                <button 
                  onClick={() => router.push(`/announcements/${announcement.id}`)}
                  key={announcement.id} 
                  className="w-full flex justify-between items-center bg-gray-50/60 p-3 rounded-xl border border-gray-100/70 hover:border-blue-300 hover:bg-white transition-all group text-left"
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="text-[9px] text-gray-400 font-bold mb-0.5">
                      {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
                    </p>
                    <h4 className="font-bold text-xs text-gray-700 leading-tight truncate group-hover:text-blue-600 transition-colors">
                      {announcement.title}
                    </h4>
                  </div>
                  <span className="text-gray-300 group-hover:text-blue-500 transition-colors font-bold shrink-0 text-xs">➔</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── 📊 3大ランキング ─── */}
      <div className="space-y-6">
        
        {/* ① いいね（保存）数順ランキング */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Heart size={16} className="text-rose-500 fill-current" />
            <h3 className="font-black text-gray-800 text-sm tracking-wide">受験生が注目！いいね数ランキング</h3>
          </div>
          
          <div className="flex gap-3.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none snap-x snap-mandatory">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="w-24 h-36 bg-gray-100 rounded-2xl animate-pulse shrink-0" />)
            ) : savedRanking.map((book, index) => (
              <button
                key={book.id}
                onClick={() => router.push(`/books/${book.id}`)}
                className="w-24 shrink-0 block group text-left relative snap-start active:scale-98 transition-all"
              >
                {renderRankBadge(index)}
                <div className="w-full h-32 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-3xs flex items-center justify-center text-gray-400 text-[9px] font-bold">
                  {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200" /> : 'NO IMAGE'}
                </div>
                <div className="mt-1.5 px-0.5 space-y-0.5">
                  <p className="text-[8px] text-gray-400 font-bold truncate">{book.publisher}</p>
                  <p className="font-extrabold text-[11px] text-gray-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{book.title}</p>
                  <p className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5 pt-0.5">
                    <Heart size={10} fill="currentColor" /> {book.saved_count || 0}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ② 評価（星）順ランキング */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Crown size={16} className="text-amber-500 fill-current" />
            <h3 className="font-black text-gray-800 text-sm tracking-wide">受験生が絶賛！高評価ランキング</h3>
          </div>
          
          <div className="flex gap-3.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none snap-x snap-mandatory">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="w-24 h-36 bg-gray-100 rounded-2xl animate-pulse shrink-0" />)
            ) : ratingRanking.map((book, index) => (
              <button
                key={book.id}
                onClick={() => router.push(`/books/${book.id}`)}
                className="w-24 shrink-0 block group text-left relative snap-start active:scale-98 transition-all"
              >
                {renderRankBadge(index)}
                <div className="w-full h-32 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-3xs flex items-center justify-center text-gray-400 text-[9px] font-bold">
                  {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200" /> : 'NO IMAGE'}
                </div>
                <div className="mt-1.5 px-0.5 space-y-0.5">
                  <p className="text-[8px] text-gray-400 font-bold truncate">{book.publisher}</p>
                  <p className="font-extrabold text-[11px] text-gray-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{book.title}</p>
                  <div className="flex items-center gap-0.5 pt-0.5">
                    <Star size={10} className="text-amber-400 fill-current" />
                    <span className="text-[10px] font-bold text-gray-700">{(book.average_rating || 0).toFixed(1)}</span>
                    <span className="text-[8px] text-gray-400">({book.review_count || 0})</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ③ 使用中（本棚登録）順ランキング */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <BookOpen size={16} className="text-emerald-500" />
            <h3 className="font-black text-gray-800 text-sm tracking-wide">受験生が愛用！使用者数ランキング</h3>
          </div>
          
          <div className="flex gap-3.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none snap-x snap-mandatory">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="w-24 h-36 bg-gray-100 rounded-2xl animate-pulse shrink-0" />)
            ) : usedRanking.map((book, index) => (
              <button
                key={book.id}
                onClick={() => router.push(`/books/${book.id}`)}
                className="w-24 shrink-0 block group text-left relative snap-start active:scale-98 transition-all"
              >
                {renderRankBadge(index)}
                <div className="w-full h-32 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-3xs flex items-center justify-center text-gray-400 text-[9px] font-bold">
                  {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200" /> : 'NO IMAGE'}
                </div>
                <div className="mt-1.5 px-0.5 space-y-0.5">
                  <p className="text-[8px] text-gray-400 font-bold truncate">{book.publisher}</p>
                  <p className="font-extrabold text-[11px] text-gray-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{book.title}</p>
                  <p className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 pt-0.5">
                    <BookOpen size={10} className="fill-current" /> {book.used_count || 0}人
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ─── 📺 ＆ 🐦 クリエイター「あるた」公式SNS告知セクション ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        
        {/* 左側：YouTubeチャンネルプロモーション */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-3xl p-5 border border-slate-800 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <div className="bg-white p-2.5 w-11 h-11 rounded-xl shadow-inner shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/960px-YouTube_full-color_icon_%282017%29.svg.png" 
                alt="YouTube Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-black text-sm tracking-wide">管理人のYouTubeチャンネルをチェック</h4>
              <p className="text-[11px] text-slate-300 font-medium">受験対策や参考書比較動画を配信中！</p>
              <p className="text-[10px] text-red-400 font-bold">@Aruta_study</p>
            </div>
          </div>
          <a 
            href="https://www.youtube.com/@Aruta_study" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full text-center bg-red-600 text-white font-black text-xs py-3 rounded-xl shadow-md hover:bg-red-700 transition-all shrink-0 active:scale-98"
          >
            YouTubeをチェック
          </a>
        </div>

        {/* 右側：公式Xアカウントプロモーション */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-3xl p-5 border border-slate-800 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <div className="bg-white p-2 w-11 h-11 rounded-xl shadow-inner shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
              <img 
                src="https://img.icons8.com/ios_filled/1200/twitterx.jpg" 
                alt="X Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-black text-sm tracking-wide">管理人のXアカウントをフォロー</h4>
              <p className="text-[11px] text-slate-300 font-medium">アプリの裏側や、更新情報を発信中！</p>
              <p className="text-[10px] text-sky-400 font-bold">@Aruta_study</p>
            </div>
          </div>
          <a 
            href="https://x.com/Aruta_study" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full text-center bg-white text-slate-900 font-black text-xs py-3 rounded-xl shadow-md hover:bg-slate-100 transition-all shrink-0 active:scale-98"
          >
            Xアカウントをチェック
          </a>
        </div>

      </div>

    </div>
  );
}