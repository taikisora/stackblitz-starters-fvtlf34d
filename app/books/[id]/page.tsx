"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Bookmark, BookOpen } from 'lucide-react';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState({ is_saved: false, is_used: false });

  useEffect(() => {
    const fetchBookAndUser = async () => {
      setLoading(true);

      const { data: bookData } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();
      
      if (bookData) setBook(bookData);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const { data: statusData, error: statusError } = await supabase
          .from('user_book_status')
          .select('is_saved, is_used')
          .eq('user_id', session.user.id)
          .eq('book_id', bookId)
          .maybeSingle();

        if (statusError) console.error("ステータス取得エラー:", statusError);
        if (statusData) {
          setStatus({
            is_saved: statusData.is_saved || false,
            is_used: statusData.is_used || false,
          });
        }
      }
      setLoading(false);
    };

    fetchBookAndUser();
  }, [bookId]);

  const toggleStatus = async (type: 'saved' | 'used') => {
    if (!user) {
      alert('この機能を使うにはログインが必要です！\nマイページからログインしてください。');
      router.push('/login');
      return;
    }

    const currentStatus = type === 'saved' ? status.is_saved : status.is_used;
    const nextStatus = !currentStatus;

    const { error: statusError } = await supabase
      .from('user_book_status')
      .upsert({
        user_id: user.id,
        book_id: bookId,
        [type === 'saved' ? 'is_saved' : 'is_used']: nextStatus
      }, { onConflict: 'user_id,book_id' });

    if (statusError) {
      console.error("ステータス更新エラー:", statusError);
      return;
    }

    const countColumn = type === 'saved' ? 'saved_count' : 'used_count';
    const currentCount = book[countColumn] || 0;
    const nextCount = nextStatus ? currentCount + 1 : Math.max(0, currentCount - 1);

    const { error: bookError } = await supabase
      .from('books')
      .update({ [countColumn]: nextCount })
      .eq('id', bookId);

    if (bookError) {
      console.error("カウント更新エラー:", bookError);
      return;
    }

    setStatus(prev => ({
      ...prev,
      [type === 'saved' ? 'is_saved' : 'is_used']: nextStatus
    }));

    setBook(prev => ({
      ...prev,
      [countColumn]: nextCount
    }));
  };

  if (loading) return <p className="text-center py-20 text-gray-500 font-bold">読み込み中...</p>;
  if (!book) return <p className="text-center py-20 text-gray-500 font-bold">参考書が見つかりませんでした。</p>;

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen pb-24">
      <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center mb-4 font-bold">
        <ChevronLeft size={16} /> 戻る
      </button>

      <div className="flex gap-4 mb-6">
        <div className="w-28 h-40 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm flex items-center justify-center text-gray-400 text-xs">
          {book.cover_url ? <img src={book.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
        </div>
        <div className="flex flex-col justify-between py-1">
          <div>
            <p className="text-xs text-gray-500 font-bold mb-1">{book.publisher}</p>
            <h1 className="font-bold text-lg text-gray-900 leading-tight mb-2">{book.title}</h1>
            <p className="text-sm text-gray-600 mb-2">{book.author}</p>
          </div>
          
          {/* ★ 追加：発売日と一緒にカウントも表示 */}
          <div className="text-xs text-gray-400 flex flex-col gap-1">
            <p>発売日: {book.published_date || '不明'}</p>
            <div className="flex gap-3 font-bold mt-1">
              <span className="flex items-center gap-1 text-blue-600">
                <Bookmark size={14} fill="currentColor" /> {book.saved_count || 0}
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <BookOpen size={14} fill="currentColor" /> {book.used_count || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => toggleStatus('saved')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border transition-colors ${
            status.is_saved
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Bookmark size={18} fill={status.is_saved ? "currentColor" : "none"} />
          {/* ★ 変更：「本棚に保存」→「保存」 */}
          {status.is_saved ? '保存済み' : '保存'}
        </button>

        <button
          onClick={() => toggleStatus('used')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border transition-colors ${
            status.is_used
              ? 'bg-green-50 border-green-200 text-green-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <BookOpen size={18} fill={status.is_used ? "currentColor" : "none"} />
          {status.is_used ? '使用中ルート' : 'この本を使用'}
        </button>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h2 className="font-bold text-sm text-gray-800 mb-2">参考書の説明</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {book.description || 'この参考書の説明はまだ登録されていません。'}
        </p>
      </div>
    </div>
  );
}