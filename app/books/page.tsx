"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { ChevronLeft } from 'lucide-react';

export default function BooksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      let query = supabase.from('books').select('*');

      // URLから検索条件を受け取る
      const subject = searchParams.get('subject');
      const category = searchParams.get('category');
      const publisher = searchParams.get('publisher');

      // 条件があればクエリに追加
      if (subject) query = query.eq('subject', subject);
      if (category) query = query.eq('category', category);
      if (publisher) query = query.eq('publisher', publisher);

      const { data } = await query;
      setBooks(data || []);
      setLoading(false);
    };

    fetchBooks();
  }, [searchParams]);

  return (
    <div className="pb-24">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => router.push('/search')} className="text-sm text-blue-600 flex items-center font-bold">
          <ChevronLeft size={18} /> 再検索
        </button>
      </div>

      {loading ? (
        <p className="text-center py-20 text-gray-500 font-bold">読み込み中...</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 font-bold pl-1">{books.length}件 該当</p>
          
          {books.map(book => (
            <Link href={`/books/${book.id}`} key={book.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow block">
              <div className="w-24 h-32 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 text-xs overflow-hidden border border-gray-200">
                {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold mb-1">{book.publisher}</p>
                  <h3 className="font-bold text-base leading-tight mb-2 text-gray-800 line-clamp-2">{book.title}</h3>
                </div>
                <div>
                  <p className="text-lg font-bold text-orange-600">¥{book.price || '---'}</p>
                </div>
              </div>
            </Link>
          ))}

          {books.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 font-bold mb-2">条件に合う参考書がありません</p>
              <button onClick={() => router.push('/search')} className="text-blue-600 text-sm underline">検索画面に戻る</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}