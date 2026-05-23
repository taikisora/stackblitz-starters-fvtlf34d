"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Heart, BookOpen, Star, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 20; // 💡 1ページに表示する件数

export default function BooksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('saved_count_desc');  
  const [user, setUser] = useState<any>(null);

  // 💡 ページネーション用のState
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    // 💡 検索条件や並び替えが変わったら、ページ数を1ページ目に戻す
    setCurrentPage(1);
  }, [searchParams, sortBy]);

  useEffect(() => {
    // 💡 ページ数が変わった瞬間に、画面のスクロール位置を一番上に強制移動させる
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      
      // 💡 クエリを2つ（本データ取得用、合計件数カウント用）作ります
      let query = supabase.from('books').select('*', { count: 'exact' }); // count: 'exact' で条件に合う総件数を取得

      const q = searchParams.get('q');
      const target = searchParams.get('target');

      if (q) query = query.ilike('title', `%${q}%`);

      if (target === 'exam') {
        const subject = searchParams.get('subject');
        const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
        const examSubjects = searchParams.get('exam_subjects')?.split(',').filter(Boolean) || [];

        if (subject) query = query.eq('subject', subject); 

        if (types.length > 0) query = query.or(types.map(t => `category.ilike.%${t}%`).join(','));
        if (examSubjects.length > 0) query = query.or(examSubjects.map(s => `category.ilike.%${s}%`).join(','));
      } 
      else if (target === 'regular' || target === 'textbook') {
        const filters = searchParams.get('filters')?.split(',').filter(Boolean) || [];
        if (filters.length > 0) {
          const orConditions = filters.map(f => {
            const [sub, cat] = f.split(':');
            return cat === 'all' ? `subject.eq.${sub}` : `and(subject.eq.${sub},category.ilike.%${cat}%)`;
          });
          query = query.or(orConditions.join(','));
        }
        if (target === 'textbook') query = query.ilike('category', '%教科書%');
      } 
      else if (target === 'publisher') {
        const publishers = searchParams.get('publishers')?.split(',').filter(Boolean) || [];
        if (publishers.length > 0) query = query.in('publisher', publishers);
      }

      // 並び替えの適用
      if (sortBy === 'saved_count_desc') query = query.order('saved_count', { ascending: false });
      else if (sortBy === 'published_date_desc') query = query.order('published_date', { ascending: false });
      else if (sortBy === 'used_count_desc') query = query.order('used_count', { ascending: false });
      else if (sortBy === 'title_asc') query = query.order('title', { ascending: true });

      // 💡 【超重要】ページ数に応じて、取得する範囲を20件に制限（これであのバグが消滅します！）
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) {
        console.error("検索エラー:", error);
      } else if (data) {
        if (count !== null) setTotalItems(count); // 全体の合計件数をStateに保存

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const bookIds = data.map(b => b.id);
          
          // 💡 bookIdsは最大でも絶対に20個しか入らないので、絶対にパンクしません！
          const { data: userStatus } = await supabase
            .from('user_book_status')
            .select('book_id, is_saved, is_used')
            .eq('user_id', session.user.id)
            .in('book_id', bookIds);
          
          const statusMap: Record<string, { is_saved: boolean, is_used: boolean }> = {};
          userStatus?.forEach(s => {
            statusMap[s.book_id] = { is_saved: s.is_saved, is_used: s.is_used };
          });

          const booksWithStatus = data.map(b => ({
            ...b,
            user_status: statusMap[b.id] || { is_saved: false, is_used: false }
          }));
          setBooks(booksWithStatus);
        } else {
          setBooks(data.map(b => ({ ...b, user_status: { is_saved: false, is_used: false } })));
        }
      }
      setLoading(false);
    };

    fetchBooks();
  }, [searchParams, sortBy, currentPage]); // 💡 currentPage が変わるたびに再ロード

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  const getSearchTitle = () => {
    const q = searchParams.get('q');
    if (q) return `「${q}」の検索結果`;
    const target = searchParams.get('target');

    if (target === 'exam') {
      const subject = searchParams.get('subject') || '';
      const types = searchParams.get('types')?.replace(/,/g, '・') || '';
      const examSubjects = searchParams.get('exam_subjects')?.replace(/,/g, '・') || '';
      const parts = [types, examSubjects].filter(Boolean).join(' ➔ ');
      return `「${subject}${parts ? ` ${parts}` : ''}」の検索結果`;
    }
    if (target === 'regular' || target === 'textbook') {
      const isTextbook = target === 'textbook';
      const filters = searchParams.get('filters');
      if (!filters) return isTextbook ? '「すべての教科書」の検索結果' : '「すべての参考書」の検索結果';
      
      const formattedFilters = filters.split(',').map(f => {
        const [sub, cat] = f.split(':');
        return cat && cat !== 'all' ? `${sub} ${cat}` : sub;
      });
      
      return `「${formattedFilters.join('・')}${isTextbook ? 'の教科書' : 'の参考書'}」`;
    }
    if (target === 'publisher') {
      const pubs = searchParams.get('publishers')?.replace(/,/g, '・');
      return pubs ? `「${pubs}」の検索結果` : '「すべての出版社」の検索結果';
    }
    return '検索結果';
  };

  const handleToggle = async (e: React.MouseEvent, bookId: string, type: 'saved' | 'used') => {
    e.stopPropagation();
    
    if (!user) {
      alert('この機能を使うにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }

    const bookIndex = books.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;

    const book = books[bookIndex];
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

    const newBooks = [...books];
    newBooks[bookIndex] = {
      ...book,
      [countColumn]: nextCount,
      user_status: {
        ...book.user_status,
        [type === 'saved' ? 'is_saved' : 'is_used']: nextStatus
      }
    };
    setBooks(newBooks);
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen max-w-7xl mx-auto flex flex-col justify-between">
      <div>
        {/* 上部固定ヘッダー */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 shadow-sm flex flex-col gap-2 mb-4">
          <button 
            onClick={() => {
              const target = searchParams.get('target');
              if (target === 'regular') {
                router.push(`/search?step=subject&${searchParams.toString()}`);
              } else if (target === 'publisher') {
                router.push(`/search?step=publisher&${searchParams.toString()}`);
              } else if (target === 'textbook') {
                router.push(`/search?step=textbook_subject&${searchParams.toString()}`);
              } else if (target === 'exam') {
                router.push(`/search?step=exam_filter&${searchParams.toString()}`);
              } else {
                router.push('/search');
              }
            }} 
            className="text-sm text-blue-600 flex items-center font-bold w-fit hover:opacity-70 transition-opacity"
          >
            <ChevronLeft size={18} /> 条件を変更して再検索
          </button>
          
          <div className="flex justify-between items-center gap-2">
            <h1 className="text-xs text-gray-600 font-bold truncate max-w-[60%]">
              {getSearchTitle()}
            </h1>
            <div className="flex items-center gap-3 flex-shrink-0">
            {!loading && <span className="text-xs text-gray-400 font-bold">{books.length}件 / 全 {totalItems} 件</span>}
            
            {/* 💡 上部用のミニページ遷移ボタン（1行でスッキリ収まります） */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-md bg-white border border-gray-200/40 text-slate-700 disabled:opacity-40 disabled:bg-transparent disabled:border-transparent active:scale-90 transition-transform"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
                <span className="text-[10px] font-black text-slate-700 px-1.5 min-w-[36px] text-center">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-md bg-white border border-gray-200/40 text-slate-700 disabled:opacity-40 disabled:bg-transparent disabled:border-transparent active:scale-90 transition-transform"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
              >
                <option value="saved_count_desc">いいね数が多い順</option>
                <option value="used_count_desc">使用者が多い順</option>
                <option value="published_date_desc">新着順</option>
                <option value="title_asc">五十音順</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-20 text-gray-500 font-bold animate-pulse">読み込み中...</p>
        ) : (
          <div className="space-y-4 px-4 w-full">
            {books.map(book => (
              <div 
                key={book.id} 
                onClick={() => router.push(`/books/${book.id}`)}
                className="group bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100/80 flex flex-row gap-4 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer items-center"
              >
                {/* 表紙画像 */}
                <div className="w-24 h-32 md:w-24 md:h-32 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center text-gray-400 text-sm overflow-hidden border border-gray-200 shadow-sm relative">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt="cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    'NO IMAGE'
                  )}
                </div>
                
                {/* コンテンツ全体 */}
                <div className="flex-1 flex flex-col justify-between h-32 py-0.5">
                  <div>
                    <div className="mb-1.5">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-500 text-[11px] md:text-xs font-bold rounded-md tracking-wide">
                        {book.publisher}
                      </span>
                    </div>
                    <h3 className="font-black text-base md:text-lg leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-blue-600">
                      {book.title}
                    </h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-2 mt-auto">
                    {/* 星評価 */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={18} className={i < Math.round(book.average_rating || 0) ? 'fill-current' : 'text-gray-200'} />
                        ))}
                      </div>
                      <span className="text-base font-extrabold text-slate-800 ml-0.5">
                        {Number(book.average_rating || 0).toFixed(1)}
                      </span>
                      <span className="text-xs font-bold text-gray-400">({book.review_count || 0})</span>
                    </div>

                    {/* ボタンエリア */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={(e) => handleToggle(e, book.id, 'saved')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                          book.user_status?.is_saved 
                            ? 'bg-pink-50 text-pink-600 border-pink-200 shadow-3xs' 
                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Heart size={16} fill={book.user_status?.is_saved ? "currentColor" : "none"} strokeWidth={2.5} />
                        <span className="text-xs">{book.saved_count || 0}</span>
                      </button>
                      
                      <button 
                        onClick={(e) => handleToggle(e, book.id, 'used')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                          book.user_status?.is_used 
                            ? 'bg-green-50 text-green-700 border border-green-200 shadow-3xs' 
                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <BookOpen size={16} fill={book.user_status?.is_used ? "currentColor" : "none"} strokeWidth={2.5} />
                        <span className="text-xs">{book.used_count || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {books.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500 font-bold mb-2">条件に合う参考書がありません</p>
                <button 
                  onClick={() => router.push(`/search?${searchParams.toString()}`)} 
                  className="text-sm text-blue-600 flex items-center font-bold"
                >
                  <ChevronLeft size={18} /> 再検索
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 💡 修正：fixedを解除して、一番下までスクロールした時だけ自然に現れるようにスタイルをスッキリさせました */}
      {!loading && books.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-6 bg-white py-5 border-t border-gray-200 shadow-2xs w-full max-w-7xl mx-auto px-4 rounded-b-2xl">
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