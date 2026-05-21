"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Heart } from 'lucide-react'; // 💡 Bookmark を廃止し、Heart を導入

export default function SavedBooksPage() {
  const router = useRouter();
  const [favoriteBooks, setFavoriteBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedBooks = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 💡 user_book_status から is_saved（いいね）が true のものを取得
      const { data } = await supabase
        .from('user_book_status')
        .select(`
          book_id,
          books (*)
        `)
        .eq('user_id', session.user.id)
        .eq('is_saved', true);

      if (data) {
        const books = data.map((item: any) => item.books).filter(Boolean);
        setFavoriteBooks(books);
      }
      setLoading(false);
    };

    fetchSavedBooks();
  }, [router]);

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium animate-pulse">読み込み中...</div>;

  return (
    // 💡 変更点：max-w-md から max-w-3xl に拡張し、PCでの引き伸ばしを防止しました
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 space-y-6">
      
      {/* 戻るボタン */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-2xs hover:bg-gray-50 transition-all">
          <ChevronLeft size={16} /> 戻る
        </button>
        <h1 className="text-base font-black text-gray-800">コレクション</h1>
        <div className="w-16"></div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {/* 💡 しおりから、赤色に輝くハートマークのデザインへ一新 */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
          <div className="bg-rose-50 p-2 rounded-xl shadow-3xs">
            <Heart className="text-rose-500 fill-current" size={22} />
          </div>
          <h2 className="font-black text-xl text-gray-800">いいねした参考書</h2>
        </div>

        {favoriteBooks.length === 0 ? (
          <p className="text-sm text-gray-400 font-bold text-center py-16">いいねした参考書はまだありません。</p>
        ) : (
          // 💡 変更点：PC大画面の時は、いいねした本が綺麗に横2列（グリッド）に整列するよう変更！
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favoriteBooks.map(book => (
              <Link 
                href={`/books/${book?.id}`} 
                key={book?.id} 
                className="flex gap-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-white hover:border-blue-300 hover:shadow-2xs transition-all group"
              >
                {/* 縦横比をしっかり固定し、imgのビルド警告が出ないようレイアウト調整 */}
                <div className="w-14 h-20 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] text-gray-400 overflow-hidden shadow-3xs border border-gray-200/60 group-hover:scale-103 transition-transform">
                   {book?.cover_url ? <img src={book?.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0 space-y-0.5">
                  <p className="text-[10px] text-gray-400 font-black truncate">{book?.publisher}</p>
                  <h3 className="text-sm font-extrabold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{book?.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}