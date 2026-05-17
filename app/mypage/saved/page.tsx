"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Bookmark } from 'lucide-react';

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

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium">読み込み中...</div>;

  return (
    <div className="max-w-md mx-auto my-6 px-4 space-y-6 pb-20">
      <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold">
        <ChevronLeft size={16} /> 戻る
      </button>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="text-pink-500 fill-current" size={24} />
          <h1 className="font-bold text-xl text-gray-800">保存した参考書</h1>
        </div>

        {favoriteBooks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">保存した参考書はまだありません。</p>
        ) : (
          <div className="space-y-4">
            {favoriteBooks.map(book => (
              <Link href={`/books/${book?.id}`} key={book?.id} className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                <div className="w-16 h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] text-gray-400 overflow-hidden shadow-sm">
                   {book?.cover_url ? <img src={book?.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-sm font-bold text-gray-800 line-clamp-2">{book?.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{book?.publisher}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}