"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { LogOut, Edit2, Check, X, Heart, BookOpen } from 'lucide-react';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('ユーザー');
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  
  const [favoriteBooks, setFavoriteBooks] = useState<any[]>([]);
  const [usedBooks, setUsedBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      // ① ログインセッションの確認
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // ログインしていなければログイン画面へ強制移動！
        router.push('/login');
        return;
      }
      
      setUser(session.user);

      // ② プロフィール（ユーザー名）の取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
        
      if (profile?.username) {
        setUsername(profile.username);
        setNewUsername(profile.username);
      }

      // ③ お気に入り・使用中の参考書を取得（booksテーブルと結合して取得）
      const { data: userBooks } = await supabase
        .from('user_book_status')
        .select('is_favorite, is_used, books(*)')
        .eq('user_id', session.user.id);

      if (userBooks) {
        // booksデータが正しく取得できているものだけをフィルター
        const validBooks = userBooks.filter(item => item.books);
        setFavoriteBooks(validBooks.filter(item => item.is_favorite).map(item => item.books));
        setUsedBooks(validBooks.filter(item => item.is_used).map(item => item.books));
      }
      
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  // ユーザー名の更新処理
  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || !user) return;
    
    await supabase
      .from('profiles')
      .update({ username: newUsername })
      .eq('id', user.id);
      
    setUsername(newUsername);
    setIsEditing(false);
  };

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <p className="text-center py-20 font-bold text-gray-500">読み込み中...</p>;

  return (
    <div className="pb-24 max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 px-2">マイページ</h2>

      {/* プロフィールセクション */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-bold mb-1">ユーザー名</p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="border border-blue-300 rounded px-2 py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[200px]"
              />
              <button onClick={handleUpdateUsername} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><Check size={18} /></button>
              <button onClick={() => setIsEditing(false)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X size={18} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900">{username}</h3>
              <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">{user?.email}</p>
        </div>
      </div>

      {/* お気に入り一覧セクション */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="text-pink-500 fill-current" size={20} />
          <h3 className="font-bold text-lg text-gray-800">お気に入りした参考書</h3>
        </div>
        {favoriteBooks.length === 0 ? (
          <p className="text-sm text-gray-500">お気に入りに登録された参考書はありません。</p>
        ) : (
          <div className="space-y-3">
            {favoriteBooks.map(book => (
              <Link href={`/books/${book?.id}`} key={book?.id} className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                <div className="w-12 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-[8px] text-gray-400 overflow-hidden">
                   {book?.cover_url ? <img src={book?.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 line-clamp-2">{book?.title}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{book?.publisher}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 使用中一覧セクション */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="text-blue-500 fill-current" size={20} />
          <h3 className="font-bold text-lg text-gray-800">使用中の参考書</h3>
        </div>
        {usedBooks.length === 0 ? (
          <p className="text-sm text-gray-500">使用中に登録された参考書はありません。</p>
        ) : (
          <div className="space-y-3">
            {usedBooks.map(book => (
              <Link href={`/books/${book?.id}`} key={book?.id} className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                 <div className="w-12 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-[8px] text-gray-400 overflow-hidden">
                   {book?.cover_url ? <img src={book?.cover_url} alt="cover" className="w-full h-full object-cover" /> : 'NO IMAGE'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 line-clamp-2">{book?.title}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{book?.publisher}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ログアウトボタン */}
      <button 
        onClick={handleLogout}
        className="w-full mt-8 py-4 flex items-center justify-center gap-2 text-red-500 font-bold bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-red-50 transition-colors"
      >
        <LogOut size={18} /> ログアウト
      </button>
    </div>
  );
}