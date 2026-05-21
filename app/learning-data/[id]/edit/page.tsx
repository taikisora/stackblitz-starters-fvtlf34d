"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { ChevronLeft, ArrowDown, Trash2, Search, Plus, Save, Globe, Lock } from 'lucide-react';

export default function EditRoutePage() {
  const router = useRouter();
  const params = useParams();
  const routeId = params.id as string; // URLからルートのIDを取得

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ルートのメタ情報
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('英単語');  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // ルートに入れる参考書のリスト
  const [selectedBooks, setSelectedBooks] = useState<any[]>([]);

  // 参考書検索用の状態
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchRouteData = async () => {
      setLoading(true);
      
      // ログインチェック
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 1. ルートの基本情報を取得
      const { data: routeData } = await supabase
        .from('study_routes')
        .select('*')
        .eq('id', routeId)
        .single();

      if (routeData) {
        // 他人のルートを勝手に編集できないようにガード
        if (routeData.user_id !== session.user.id) {
          alert('他人のルートは編集できません。');
          router.push('/learning-data');
          return;
        }
        setTitle(routeData.title);
        setSubject(routeData.subject);
        setDescription(routeData.description || '');
        setIsPublic(routeData.is_public);
      }

      // 2. ルートに紐づく参考書リストを順番通りに取得
      const { data: booksData } = await supabase
        .from('route_books')
        .select('*, books(*)') // 紐づく参考書のマスター情報も一緒に引く
        .eq('route_id', routeId)
        .order('sort_order', { ascending: true });

      if (booksData) {
        // 扱いやすいようにbooksの中身を取り出してセット
        const orderedBooks = booksData.map(rb => rb.books).filter(Boolean);
        setSelectedBooks(orderedBooks);
      }

      setLoading(false);
    };

    if (routeId) fetchRouteData();
  }, [routeId, router]);

  // 🔎 参考書のリアルタイム検索（※表示数を20件に拡大！）
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .ilike('title', `%${query}%`)
      .limit(20); // ★ 5件から20件に増やして見つけやすく変更

    if (!error && data) {
      setSearchResults(data);
    }
    setIsSearching(false);
  };

  const handleAddBook = (book: any) => {
    if (selectedBooks.some(b => b.id === book.id)) {
      alert('この参考書は既にルートに追加されています。');
      return;
    }
    setSelectedBooks([...selectedBooks, book]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveBook = (index: number) => {
    const nextList = [...selectedBooks];
    nextList.splice(index, 1);
    setSelectedBooks(nextList);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const nextList = [...selectedBooks];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    setSelectedBooks(nextList);
  };

  const moveDown = (index: number) => {
    if (index === selectedBooks.length - 1) return;
    const nextList = [...selectedBooks];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    setSelectedBooks(nextList);
  };

  // 💾 上書き保存処理
  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('ルートの題名を入力してください。');
      return;
    }
    if (selectedBooks.length === 0) {
      alert('参考書を最低1冊は選択してください。');
      return;
    }

    setLoading(true);

    // 1. 基本情報の更新（UPDATE）
    const { error: routeError } = await supabase
      .from('study_routes')
      .update({
        title: title.trim(),
        subject,
        description: description.trim(),
        is_public: isPublic
      })
      .eq('id', routeId);

    if (routeError) {
      setLoading(false);
      if (routeError.code === '23505') {
        alert('既に同じ題名のルートが存在します。別の題名にしてください。');
      } else {
        alert('ルートの更新に失敗しました。');
      }
      return;
    }

    // 2. 中身の参考書の更新（一番バグらない「一旦全削除して、新しい並び順で再登録」作戦）
    await supabase.from('route_books').delete().eq('route_id', routeId);

    const routeBooksData = selectedBooks.map((book, index) => ({
      route_id: routeId,
      book_id: book.id,
      sort_order: index + 1
    }));

    const { error: booksError } = await supabase
      .from('route_books')
      .insert(routeBooksData);

    if (booksError) {
      setLoading(false);
      alert('ルート中身の更新に失敗しました。');
      return;
    }

    // 3. 追加した本を「使用中」に一括登録
    const userBookStatusData = selectedBooks.map(book => ({
      user_id: user.id,
      book_id: book.id,
      is_used: true
    }));
    await supabase.from('user_book_status').upsert(userBookStatusData, { onConflict: 'user_id,book_id' });

    alert('参考書ルートを更新しました！');
    router.push('/learning-data');
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">読み込み中...</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* ヘッダー */}
      <div className="bg-white px-4 py-4 border-b border-gray-200 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold">
          <ChevronLeft size={16} /> 戻る
        </button>
        <h1 className="text-sm font-extrabold text-gray-800">ルート編集</h1>
        <div className="w-10"></div>
      </div>

      <form onSubmit={handleUpdateRoute} className="max-w-md mx-auto px-4 mt-6 space-y-5">
        
        {/* メタ情報入力 */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">ルートの題名（必須）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
          <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">対象の教科</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm font-bold text-gray-700"
              >
                <optgroup label="英語">
                  <option value="英単語">英単語</option>
                  <option value="英熟語">英熟語</option>
                  <option value="英文法">英文法</option>
                  <option value="長文">長文</option>
                  <option value="リスニング">リスニング</option>
                  <option value="その他（英語）">その他（英語）</option>
                </optgroup>
                <optgroup label="数学">
                  <option value="数IA">数IA</option>
                  <option value="数IIB">数IIB</option>
                  <option value="数IIIC">数IIIC</option>
                  <option value="その他（数学）">その他（数学）</option>
                </optgroup>
                <optgroup label="国語">
                  <option value="現代文">現代文</option>
                  <option value="古文">古文</option>
                  <option value="漢文">漢文</option>
                  <option value="その他（国語）">その他（国語）</option>
                </optgroup>
                <optgroup label="理科">
                  <option value="物理">物理</option>
                  <option value="化学">化学</option>
                  <option value="生物">生物</option>
                  <option value="地学">地学</option>
                  <option value="その他（理科）">その他（理科）</option>
                </optgroup>
                <optgroup label="社会">
                  <option value="歴史総合">歴史総合</option>
                  <option value="日本史">日本史</option>
                  <option value="世界史">世界史</option>
                  <option value="地理">地理</option>
                  <option value="公共">公共</option>
                  <option value="倫理">倫理</option>
                  <option value="政治・経済">政治・経済</option>
                  <option value="その他（社会）">その他（社会）</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">公開設定</label>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold border transition-colors ${
                  isPublic 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                {isPublic ? '世界に公開する' : '非公開にする'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">説明・備考</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-blue-500 text-gray-700 min-h-[80px]"
            />
          </div>
        </div>

        {/* ルート構築 */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <label className="text-xs font-bold text-gray-600 block">参考書を順番に繋げる</label>

          {/* 🔎 検索窓 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="参考書の名前で検索して追加..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500 text-xs font-medium"
            />

            {/* サジェスト窓（最大20件表示されるように最大高さをmax-h-64に拡大！） */}
            {searchQuery && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                {isSearching ? (
                  <li className="p-3 text-xs text-gray-400 text-center">検索中...</li>
                ) : searchResults.length === 0 ? (
                  <li className="p-3 text-xs text-gray-400 text-center">見つかりませんでした</li>
                ) : (
                  searchResults.map((book) => (
                    <li key={book.id}>
                      <button
                        type="button"
                        onClick={() => handleAddBook(book)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 text-left transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-xs text-gray-800 truncate">{book.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{book.author} / {book.publisher}</p>
                        </div>
                        <Plus size={14} className="text-blue-500 shrink-0" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* 追加された本のリスト */}
          <div className="space-y-2 pt-2">
            {selectedBooks.map((book, index) => (
              <div key={book.id} className="flex flex-col items-center">
                <div className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-gray-800 truncate">{book.title}</p>
                      <p className="text-[9px] text-gray-400 truncate">{book.publisher}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] font-bold">▲</button>
                    <button type="button" onClick={() => moveDown(index)} disabled={index === selectedBooks.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] font-bold">▼</button>
                    <button type="button" onClick={() => handleRemoveBook(index)} className="p-1.5 text-gray-400 hover:text-red-500 rounded ml-1"><Trash2 size={13} /></button>
                  </div>
                </div>
                {index < selectedBooks.length - 1 && (
                  <div className="my-1 text-blue-400 animate-pulse">
                    <ArrowDown size={14} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-md disabled:bg-blue-300"
        >
          <Save size={18} />
          {loading ? '更新中...' : '変更を保存する'}
        </button>

      </form>
    </div>
  );
}