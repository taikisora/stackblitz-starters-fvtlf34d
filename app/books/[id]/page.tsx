"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ExternalLink, ChevronLeft, Heart, BookOpen } from 'lucide-react';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState({ is_favorite: false, is_used: false });

  useEffect(() => {
    const fetchBookAndUser = async () => {
      // ① 本のデータを取得
      const { data: bookData } = await supabase.from('books').select('*').eq('id', bookId).single();
      setBook(bookData);

      // ② ログインしているか確認
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // ③ ログインしていれば、この本のお気に入り状態などを取得
        const { data: statusData } = await supabase
          .from('user_book_status')
          .select('is_favorite, is_used')
          .eq('user_id', session.user.id)
          .eq('book_id', bookId)
          .single();

        if (statusData) {
          setStatus({ is_favorite: statusData.is_favorite, is_used: statusData.is_used });
        }
      }
      setLoading(false);
    };
    fetchBookAndUser();
  }, [bookId]);

  // お気に入り・使用中ボタンを押した時の処理
  const toggleStatus = async (type: 'favorite' | 'used') => {
    if (!user) {
      alert('この機能を使うにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }

    // 更新後の状態を計算
    const newStatus = {
      ...status,
      [type === 'favorite' ? 'is_favorite' : 'is_used']: type === 'favorite' ? !status.is_favorite : !status.is_used
    };

    // 画面の見た目を先に変える（サクサク動いているように見せるテクニック）
    setStatus(newStatus);

    // データベースに保存（upsert: なければ新規作成、あれば上書き更新）
    await supabase.from('user_book_status').upsert({
      user_id: user.id,
      book_id: bookId,
      is_favorite: newStatus.is_favorite,
      is_used: newStatus.is_used
    });
  };

  if (loading) return <p className="text-center py-20 font-bold text-gray-500">読み込み中...</p>;
  if (!book) return <p className="text-center py-20 font-bold text-gray-500">参考書が見つかりませんでした。</p>;

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center mb-4 font-bold">
        <ChevronLeft size={18} /> 戻る
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 表紙画像エリア */}
        <div className="bg-gray-50 p-8 flex justify-center border-b border-gray-100">
          <div className="w-32 h-44 bg-white rounded shadow-sm border border-gray-200 overflow-hidden flex items-center justify-center text-gray-400 text-sm">
            {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-gray-500 font-bold mb-2">{book.publisher} • {book.subject}</p>
          <h1 className="text-xl font-bold text-gray-900 leading-tight mb-6">{book.title}</h1>

          {/* 状態トグルボタン */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => toggleStatus('favorite')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl border-2 font-bold transition-all ${status.is_favorite ? 'border-pink-500 text-pink-500 bg-pink-50' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}
            >
              <Heart size={24} className={status.is_favorite ? "fill-current mb-1" : "mb-1"} />
              <span className="text-xs">お気に入り</span>
            </button>
            <button
              onClick={() => toggleStatus('used')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl border-2 font-bold transition-all ${status.is_used ? 'border-blue-500 text-blue-500 bg-blue-50' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}
            >
              <BookOpen size={24} className={status.is_used ? "fill-current mb-1" : "mb-1"} />
              <span className="text-xs">使用中</span>
            </button>
          </div>

          {/* 詳細情報 */}
          <div className="space-y-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl mb-6">
            {book.author && <p className="flex justify-between"><span className="text-gray-500">著者</span> <span className="font-bold">{book.author}</span></p>}
            {book.published_date && <p className="flex justify-between"><span className="text-gray-500">出版日</span> <span className="font-bold">{book.published_date}</span></p>}
            
          </div>
          {book.description && (
            <div className="mb-6">
              <h3 className="font-bold mb-2 text-gray-800">商品説明</h3>
              <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{book.description}</p>
            </div>
          )}

          {/* Amazonリンク（リンクが存在する場合のみ表示） */}
          {book.amazon_url && (
            <div className="mt-4">
              <a href={book.amazon_url} target="_blank" rel="noopener noreferrer" className="w-full bg-[#FF9900] hover:bg-[#FF9900]/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95">
                Amazonで詳細を見る <ExternalLink size={18} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}