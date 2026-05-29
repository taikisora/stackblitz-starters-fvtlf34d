"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Megaphone, Heart, Star, BookOpen, Crown, Route, MessageSquare } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  
  // 各種ステータスの管理
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [savedRanking, setSavedRanking] = useState<any[]>([]);
  const [ratingRanking, setRatingRanking] = useState<any[]>([]);
  const [usedRanking, setUsedRanking] = useState<any[]>([]);
  const [newRoutes, setNewRoutes] = useState<any[]>([]);
  const [newComments, setNewComments] = useState<any[]>([]);
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

        // 5. 新着参考書ルート（直近3件）
        const fetchNewRoutes = supabase
          .from('study_routes')
          .select('id, title, subject, created_at, profiles(username)')
          .order('created_at', { ascending: false })
          .limit(3);

        // 💡 修正：星評価レビューを完全に排除し、「質問・議論（type: question）」のコメントだけを直近3件狙い撃ち
        const fetchNewComments = supabase
          .from('book_comments')
          .select(`
            id, 
            book_id, 
            content, 
            created_at, 
            books(title), 
            profiles(username)
          `)
          .eq('type', 'question') // 💡 これでレビューを排除して質問・議論だけに絞り込みます
          .order('created_at', { ascending: false })
          .limit(3);

        // すべてのクエリを同時に並列実行
        const [announceRes, savedRes, ratingRes, usedRes, routesRes, commentsRes] = await Promise.all([
          fetchAnnounce, fetchSaved, fetchRating, fetchUsed, fetchNewRoutes, fetchNewComments
        ]);

        if (announceRes.data) setAnnouncements(announceRes.data);
        if (savedRes.data) setSavedRanking(savedRes.data);
        if (ratingRes.data) setRatingRanking(ratingRes.data);
        if (usedRes.data) setUsedRanking(usedRes.data);
        if (routesRes.data) setNewRoutes(routesRes.data);
        
        // 💡 修正：もし!inner結合で1件も引けない特殊なバグが出た場合のフォールバック付き
        if (commentsRes.data && commentsRes.data.length > 0) {
          setNewComments(commentsRes.data);
        } else if (commentsRes.error) {
          // 結合なしのプレーンなクエリで再挑戦して、確実にコメントテキストだけは出す
          const { data: fallbackComments } = await supabase
            .from('book_comments')
            .select('id, book_id, content, created_at')
            .order('created_at', { ascending: false })
            .limit(3);
          if (fallbackComments) setNewComments(fallbackComments);
        }

      } catch (err) {
        console.error("データ読み込みエラー:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const renderRankBadge = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center font-black text-[10px] shadow-xs">1</span>;
    if (rank === 2) return <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-slate-300 text-white flex items-center justify-center font-black text-[10px] shadow-xs">2</span>;
    if (rank === 3) return <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-black text-[10px] shadow-xs">3</span>;
    return <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-[9px] backdrop-blur-2xs">{rank}</span>;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen pb-16 rounded-3xl shadow-sm border border-gray-100 mt-4 space-y-3.5 md:space-y-4">
      
      {/* 🔮 ヒーローセクション */}
      <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-gray-100/80 relative overflow-hidden flex flex-col items-center text-center">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 w-full max-w-3xl space-y-1.5">
          <p className="text-[9px] md:text-xs font-bold text-blue-600 tracking-widest uppercase">参考書検索・管理アプリ</p>
          <h2 className="text-lg md:text-2xl font-black tracking-tight text-slate-900 leading-tight max-w-3xl mx-auto break-keep">
            志望校合格への最短ルートを、<br className="md:hidden" />みんなで見つけよう。
          </h2>
          <p className="text-[11px] md:text-xs text-slate-400 md:text-slate-50 font-medium max-w-md md:max-w-none mx-auto leading-normal">
            1,000冊以上の参考書データと、先輩たちのデータから、最適な1冊が見つかります。
          </p>
        </div>
      </div>

      {/* 📢 お知らせセクション */}
      {/* 💡 修正：スマホ縦長画面での縦伸びを防ぐため、p-5→p-3.5へ、余白を mb-4→mb-2 へ超圧縮 */}
      <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2 border-b border-gray-50 pb-2">
          <div className="flex items-center gap-1.5">
            <div className="bg-amber-100 p-1.5 rounded-lg shadow-2xs">
              <Megaphone size={14} className="text-amber-600" />
            </div>
            <h3 className="font-extrabold text-gray-800 text-xs md:text-sm">運営からのお知らせ</h3>
          </div>
          <button 
            onClick={() => router.push('/announcements')}
            className="text-[10px] md:text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-0.5 active:scale-95"
          >
            すべて見る ➔
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-1">
            <div className="h-8 bg-gray-100 rounded-lg"></div>
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-2 font-bold">現在、お知らせはありません。</p>
        ) : (
          <div>
            {/* 💡 修正：縦に間延びしないよう、gap-1に詰め、各お知らせのパディングをp-3→p-1.5にして高さを極限までスリム化 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
              {announcements.map((announcement) => (
                <button 
                  onClick={() => router.push(`/announcements/${announcement.id}`)}
                  key={announcement.id} 
                  className="w-full flex justify-between items-center bg-gray-50/40 p-1.5 rounded-lg border border-gray-100/40 hover:border-blue-300 hover:bg-white transition-all group text-left"
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="text-[8px] text-gray-400 font-bold">
                      {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
                    </p>
                    <h4 className="font-bold text-xs text-gray-700 leading-tight truncate group-hover:text-blue-600 transition-colors">
                      {announcement.title}
                    </h4>
                  </div>
                  <span className="text-gray-300 group-hover:text-blue-500 transition-colors font-bold shrink-0 text-[10px]">➔</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── 📊 3大ランキング（全体の余白をぎゅっとスリム化） ─── */}
      {/* 💡 修正：塊ごとの隙間を space-y-6 から space-y-2.5 に詰めて無駄なスクロールを削減 */}
      <div className="space-y-2.5">
        
        {/* ① いいね（保存）数順ランキング */}
        {/* 💡 修正：カード内パディングを p-5 ➔ p-3.5 にカット、下部スクロール余白を pb-2 ➔ pb-0.5 に完全緊縮 */}
        <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 border-b border-gray-50 pb-1.5 mb-2">
            <Heart size={14} className="text-rose-500 fill-current" />
            <h3 className="font-black text-gray-800 text-xs md:text-sm tracking-wide">受験生が注目！いいね数ランキング</h3>
          </div>
          
          <div className="flex gap-3.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
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
                {/* 💡 修正：画像サイズやフォントサイズは変えず、テキストブロックの上余白 mt-1.5 ➔ mt-1 に詰め、行間を極限までタイト化 */}
                <div className="mt-1 px-0.5">
                  <p className="text-[8px] text-gray-400 font-bold truncate leading-none">{book.publisher}</p>
                  <p className="font-extrabold text-[11px] text-gray-800 line-clamp-2 leading-tight mt-0.5 h-7 group-hover:text-blue-600 transition-colors">{book.title}</p>
                  <p className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5 mt-0.5 leading-none">
                    <Heart size={10} fill="currentColor" /> {book.saved_count || 0}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ② 評価（星）順ランキング */}
        <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 border-b border-gray-50 pb-1.5 mb-2">
            <Crown size={14} className="text-amber-500 fill-current" />
            <h3 className="font-black text-gray-800 text-xs md:text-sm tracking-wide">受験生が絶賛！高評価ランキング</h3>
          </div>
          
          <div className="flex gap-3.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
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
                <div className="mt-1 px-0.5">
                  <p className="text-[8px] text-gray-400 font-bold truncate leading-none">{book.publisher}</p>
                  <p className="font-extrabold text-[11px] text-gray-800 line-clamp-2 leading-tight mt-0.5 h-7 group-hover:text-blue-600 transition-colors">{book.title}</p>
                  <div className="flex items-center gap-0.5 mt-0.5 leading-none">
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
        <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 border-b border-gray-50 pb-1.5 mb-2">
            <BookOpen size={14} className="text-emerald-500" />
            <h3 className="font-black text-gray-800 text-xs md:text-sm tracking-wide">受験生が愛用！使用者数ランキング</h3>
          </div>
          
          <div className="flex gap-3.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
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
                <div className="mt-1 px-0.5">
                  <p className="text-[8px] text-gray-400 font-bold truncate leading-none">{book.publisher}</p>
                  <p className="font-extrabold text-[11px] text-gray-800 line-clamp-2 leading-tight mt-0.5 h-7 group-hover:text-blue-600 transition-colors">{book.title}</p>
                  <p className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5 leading-none">
                    <BookOpen size={10} className="fill-current" /> {book.used_count || 0}人
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ─── 💡 新着ルート＆新着コメントセクション（コンパクト最適化仕様） ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        
        {/* 左側：新着参考書ルート */}
        <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2 border-b border-gray-50 pb-1.5">
              <Route size={14} className="text-blue-600" />
              <h3 className="font-black text-gray-800 text-xs md:text-sm tracking-wide">新着の参考書ルート</h3>
            </div>

            {loading ? (
              <div className="space-y-1 py-1">
                {[...Array(3)].map((_, i) => <div key={i} className="h-9 bg-gray-50 rounded-lg animate-pulse" />)}
              </div>
            ) : newRoutes.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-4 font-bold">新着ルートはありません。</p>
            ) : (
              <div className="space-y-1">
                {newRoutes.map((routeItem) => (
                  <button
                    key={routeItem.id}
                    onClick={() => router.push(`/learning-data/${routeItem.id}`)}
                    className="w-full flex justify-between items-center bg-gray-50/60 hover:bg-blue-50/40 p-1.5 rounded-xl border border-transparent hover:border-blue-100 transition-all text-left group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1 py-0.5 rounded scale-90 origin-left">
                          {routeItem.subject}
                        </span>
                        <span className="text-[9px] text-gray-400 font-semibold truncate">
                          by {routeItem.profiles?.username || '名無し'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-700 leading-tight truncate group-hover:text-blue-600 transition-colors mt-0.5">
                        {routeItem.title}
                      </h4>
                    </div>
                    <span className="text-gray-300 group-hover:text-blue-500 transition-colors font-bold shrink-0 text-[10px]">➔</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右側：新着の参考書コメント */}
        <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2 border-b border-gray-50 pb-1.5">
              <MessageSquare size={14} className="text-indigo-600" />
              <h3 className="font-black text-gray-800 text-xs md:text-sm tracking-wide">最新のレビュー・コメント</h3>
            </div>

            {loading ? (
              <div className="space-y-1 py-1">
                {[...Array(3)].map((_, i) => <div key={i} className="h-9 bg-gray-50 rounded-lg animate-pulse" />)}
              </div>
            ) : newComments.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-4 font-bold">新着コメントはありません。</p>
            ) : (
              <div className="space-y-1">
                {newComments.map((com) => (
                  <button
                    key={com.id}
                    onClick={() => router.push(`/books/${com.book_id}`)}
                    className="w-full flex justify-between items-center bg-gray-50/60 hover:bg-indigo-50/40 p-1.5 rounded-xl border border-transparent hover:border-indigo-100 transition-all text-left group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded scale-90 origin-left max-w-[120px] truncate">
                          {com.books?.title || '参考書詳細'}
                        </span>
                        <span className="text-[9px] text-gray-400 font-semibold truncate">
                          by {com.profiles?.username || '名無し'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-600 leading-tight truncate group-hover:text-indigo-600 transition-colors mt-0.5">
                        {com.content && com.content.trim() ? `「${com.content}」` : "（本文なしの評価）"}
                      </h4>
                    </div>
                    <span className="text-gray-300 group-hover:text-indigo-500 transition-colors font-bold shrink-0 text-[10px]">➔</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── 📺 ＆ 🐦 クリエイター「あるた」公式SNS告知セクション ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        
        {/* 左側：YouTubeチャンネルプロモーション */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-3xl p-4 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-center gap-3 text-left">
            {/* 💡 修正：親枠のサイズ（w-10 h-10）を絶対厳守させ、画像がはみ出さないよう shrink-0 を追加 */}
            <div className="bg-white p-2 w-10 h-10 rounded-xl shadow-inner shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/960px-YouTube_full-color_icon_%282017%29.svg.png" 
                alt="YouTube" 
                className="w-full h-full max-w-full max-h-full object-contain shrink-0" 
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-xs tracking-wide truncate">管理人のYouTubeチャンネルをチェック</h4>
              <p className="text-[10px] text-slate-300 font-medium truncate">受験対策や参考書比較動画を配信中！</p>
              <p className="text-[9px] text-red-400 font-bold">@Aruta_study</p>
            </div>
          </div>
          <a href="https://www.youtube.com/@Aruta_study" target="_blank" rel="noopener noreferrer" className="w-full text-center bg-red-600 text-white font-black text-xs py-2.5 rounded-xl shadow-md hover:bg-red-700 transition-all active:scale-98">YouTubeをチェック</a>
        </div>

        {/* 右側：公式Xアカウントプロモーション */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-3xl p-4 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-center gap-3 text-left">
            {/* 💡 修正：こちらも同様に shrink-0 と画像サイズ上限を設定 */}
            <div className="bg-white p-2 w-10 h-10 rounded-xl shadow-inner shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
              <img 
                src="https://img.icons8.com/ios_filled/1200/twitterx.jpg" 
                alt="X" 
                className="w-full h-full max-w-full max-h-full object-contain shrink-0" 
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-xs tracking-wide truncate">管理人のXアカウントをフォロー</h4>
              <p className="text-[10px] text-slate-300 font-medium truncate">アプリの裏側や、更新情報を発信中！</p>
              <p className="text-[9px] text-sky-400 font-bold">@Aruta_study</p>
            </div>
          </div>
          <a href="https://x.com/Aruta_study" target="_blank" rel="noopener noreferrer" className="w-full text-center bg-white text-slate-900 font-black text-xs py-2.5 rounded-xl shadow-md hover:bg-slate-100 transition-all active:scale-98">Xアカウントをチェック</a>
        </div>

      </div>

    </div>
  );
}