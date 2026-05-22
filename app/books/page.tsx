"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Heart, BookOpen, Star } from 'lucide-react';

export default function BooksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('saved_count_desc');  
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      let query = supabase.from('books').select('*');

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

      if (sortBy === 'saved_count_desc') query = query.order('saved_count', { ascending: false });
      else if (sortBy === 'published_date_desc') query = query.order('published_date', { ascending: false });
      else if (sortBy === 'used_count_desc') query = query.order('used_count', { ascending: false });
      else if (sortBy === 'title_asc') query = query.order('title', { ascending: true });

      const { data, error } = await query;
      
      if (error) {
        console.error("検索エラー:", error);
      } else if (data) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const bookIds = data.map(b => b.id);
          
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
  }, [searchParams, sortBy]);

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
    <div className="pb-24 bg-gray-50 min-h-screen max-w-7xl mx-auto">
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {!loading && <span className="text-xs text-gray-400 font-bold">{books.length}件</span>}
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
        <p className="text-center py-20 text-gray-500 font-bold">読み込み中...</p>
      ) : (
        <div className="space-y-4 px-4 w-full">
          {books.map(book => (
            <div 
              key={book.id} 
              onClick={() => router.push(`/books/${book.id}`)}
              className="group bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100/80 flex flex-row gap-4 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer items-center"
            >
              
              {/* 左側：表紙画像（サイズ・比率はそのまま維持） */}
              <div className="w-24 h-32 md:w-24 md:h-32 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center text-gray-400 text-sm overflow-hidden border border-gray-200 shadow-sm relative">
                {book.cover_url ? (
                  <img src={book.cover_url} alt="cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  'NO IMAGE'
                )}
              </div>
              
              {/* 右側：コンテンツ全体（画像の高さ h-32 にきれいに追従させます） */}
              <div className="flex-1 flex flex-col justify-between h-32 py-0.5">
                
                {/* 上部：出版社とタイトル */}
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
                
                {/* 💡 justify-start に変えて左側に寄せ、gap-6 で星のすぐ右隣に綺麗に並べました */}
                  <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-2 mt-auto">
                  
                  {/* 左側：星評価エリア */}
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

                  {/* 右側：アクションボタンエリア（星の真横に綺麗に並びます。サイズは元の使いやすさをキープ） */}
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
  );
}