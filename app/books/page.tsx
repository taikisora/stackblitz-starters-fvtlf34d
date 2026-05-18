"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
// ★ 変更: SaveアイコンをBookmarkに変更
import { ChevronLeft, Bookmark, BookOpen, Star } from 'lucide-react';

export default function BooksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('published_date_desc');
  
  // ★ 追加: ログインユーザー情報を保持
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

      if (sortBy === 'published_date_desc') query = query.order('published_date', { ascending: false });
      else if (sortBy === 'saved_count_desc') query = query.order('saved_count', { ascending: false });
      else if (sortBy === 'used_count_desc') query = query.order('used_count', { ascending: false });
      else if (sortBy === 'title_asc') query = query.order('title', { ascending: true });

      const { data, error } = await query;
      
      if (error) {
        console.error("検索エラー:", error);
      } else if (data) {
        // ★ 追加: 本のリストを取得した後、ログインユーザーのステータスを取得して合体させる
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

          // 本のデータに user_status を追加
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
      
      // 💡 修正：科目名だけでなく「英単語」などのカテゴリー名もドッキングさせる
      const formattedFilters = filters.split(',').map(f => {
        const [sub, cat] = f.split(':');
        return cat && cat !== 'all' ? `${sub} ${cat}` : sub; // 例: 「英語 英単語」
      });
      
      return `「${formattedFilters.join('・')}${isTextbook ? 'の教科書' : 'の参考書'}」`;
    }
    if (target === 'publisher') {
      const pubs = searchParams.get('publishers')?.replace(/,/g, '・');
      return pubs ? `「${pubs}」の検索結果` : '「すべての出版社」の検索結果';
    }
    return '検索結果';
  };

  // ★ 追加: 検索画面から保存・使用を切り替える関数
  const handleToggle = async (e: React.MouseEvent, bookId: string, type: 'saved' | 'used') => {
    e.stopPropagation(); // 親要素のクリック（ページ遷移）を防ぐ
    
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

    // DB更新 (状態)
    await supabase.from('user_book_status').upsert({
      user_id: user.id,
      book_id: bookId,
      [type === 'saved' ? 'is_saved' : 'is_used']: nextStatus
    }, { onConflict: 'user_id,book_id' });

    // DB更新 (カウント)
    const countColumn = type === 'saved' ? 'saved_count' : 'used_count';
    const currentCount = book[countColumn] || 0;
    const nextCount = nextStatus ? currentCount + 1 : Math.max(0, currentCount - 1);
    await supabase.from('books').update({ [countColumn]: nextCount }).eq('id', bookId);

    // 画面の見た目を即座に更新
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
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* ★ 上部固定ヘッダー（再検索・検索条件・ソートを集約） */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 shadow-sm flex flex-col gap-2 mb-4">
        <button 
          onClick={() => router.back()} // 💡 push('/search') から back() に変更して直前の状態に戻す
          className="text-sm text-blue-600 flex items-center font-bold w-fit hover:opacity-70 transition-opacity"
        >
          <ChevronLeft size={18} /> 再検索
        </button>
        
        <div className="flex justify-between items-center gap-2">
          {/* 💡 何を検索しているかを左上に明示 */}
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
              <option value="published_date_desc">新着順</option>
              <option value="saved_count_desc">保存数が多い順</option>
              <option value="used_count_desc">使用者が多い順</option>
              <option value="title_asc">五十音順</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-20 text-gray-500 font-bold">読み込み中...</p>
      ) : (
        <div className="space-y-4 px-4">
          {/* 💡 元の並び替えエリア（pl-1 mb-2）は上のヘッダーへ移動したため削除 */}
          
          {books.map(book => (
            // ★ Linkをやめて、divにonClickを持たせる形に変更（ボタンと押し分けるため）
            <div key={book.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow">
              
              {/* 画像とタイトルのエリア（クリックで詳細へ） */}
              <div 
                className="flex-1 flex gap-4 cursor-pointer" 
                onClick={() => router.push(`/books/${book.id}`)}
              >
                <div className="w-20 h-28 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 text-xs overflow-hidden border border-gray-200">
                  {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                </div>
                <div className="flex-1 flex flex-col justify-start">
                  <p className="text-[10px] text-gray-500 font-bold mb-1">{book.publisher}</p>
                  <h3 className="font-bold text-sm leading-tight mb-2 text-gray-800 line-clamp-2">{book.title}</h3>
                  <div className="flex items-center gap-1 mt-auto">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < Math.round(book.average_rating || 0) ? 'fill-current' : 'text-gray-200'} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-gray-700 ml-0.5">
                      {Number(book.average_rating || 0).toFixed(1)}
                    </span>
                    <span className="text-[10px] text-gray-400">({book.review_count || 0})</span>
                  </div>
                </div>
              </div>

              {/* ★ 追加: 検索画面用の保存・使用ボタン（右下に配置） */}
              <div className="flex flex-col gap-3 justify-end items-end pb-1 border-l border-gray-100 pl-3">
                <button 
                  onClick={(e) => handleToggle(e, book.id, 'saved')}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    book.user_status?.is_saved ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500'
                  }`}
                >
                  <Bookmark size={18} fill={book.user_status?.is_saved ? "currentColor" : "none"} />
                  {book.saved_count || 0}
                </button>
                
                <button 
                  onClick={(e) => handleToggle(e, book.id, 'used')}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    book.user_status?.is_used ? 'text-green-600' : 'text-gray-400 hover:text-green-500'
                  }`}
                >
                  <BookOpen size={18} fill={book.user_status?.is_used ? "currentColor" : "none"} />
                  {book.used_count || 0}
                </button>
              </div>

            </div>
          ))}

          {books.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 font-bold mb-2">条件に合う参考書がありません</p>
              <button 
                onClick={() => router.push(`/search?${searchParams.toString()}`)} // 💡 条件を引き継いで戻る
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