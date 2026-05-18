"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'; // ※環境に合わせて適宜調整してください
import { ChevronLeft, ArrowDown, Trash2, Search, Plus, Save, Globe, Lock } from 'lucide-react';

export default function NewRoutePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ルートのメタ情報
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('英単語');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // ルートに入れる参考書のリスト（順番が命）
  const [selectedBooks, setSelectedBooks] = useState<any[]>([]);

  // 参考書検索用の状態
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkUser();
  }, [router]);

  // 🔎 参考書のリアルタイム検索
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
      .limit(20); // サジェスト風に最大5件表示

    if (!error && data) {
      setSearchResults(data);
    }
    setIsSearching(false);
  };

  // ➕ ルートに参考書を追加する
  const handleAddBook = (book: any) => {
    // 既にリストに入っている本は重複して追加しない（お好みで外してもOK）
    if (selectedBooks.some(b => b.id === book.id)) {
      alert('この参考書は既にルートに追加されています。');
      return;
    }
    setSelectedBooks([...selectedBooks, book]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // 🗑️ ルートから参考書を外す
  const handleRemoveBook = (index: number) => {
    const nextList = [...selectedBooks];
    nextList.splice(index, 1);
    setSelectedBooks(nextList);
  };

  // 🔼 順番を上に入れ替える
  const moveUp = (index: number) => {
    if (index === 0) return;
    const nextList = [...selectedBooks];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    setSelectedBooks(nextList);
  };

  // 🔽 順番を下に入れ替える
  const moveDown = (index: number) => {
    if (index === selectedBooks.length - 1) return;
    const nextList = [...selectedBooks];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    setSelectedBooks(nextList);
  };

  // 💾 ルートの保存処理（超重要ロジック）
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('ルートの題名を入力してください。');
      return;
    }
    if (selectedBooks.length === 0) {
      alert('参考書を最低1冊はルートに追加してください。');
      return;
    }

    setLoading(true);

    // 1. まずは「study_routes」テーブルに基本情報をインサート
    const { data: routeData, error: routeError } = await supabase
      .from('study_routes')
      .insert({
        user_id: user.id,
        title: title.trim(),
        subject,
        description: description.trim(),
        is_public: isPublic
      })
      .select()
      .single();

    if (routeError) {
      setLoading(false);
      // Supabaseの一意性制約（タイトル重複）で弾かれた場合のハンドリング
      if (routeError.code === '23505') {
        alert('既に同じ題名のルートが存在します。別の題名を付けてください。');
      } else {
        alert('ルートの保存に失敗しました。');
        console.error(routeError);
      }
      return;
    }

    const newRouteId = routeData.id;

    // 2. 「route_books」テーブルに、並び順（sort_order）付きで参考書をインサート
    const routeBooksData = selectedBooks.map((book, index) => ({
      route_id: newRouteId,
      book_id: book.id,
      sort_order: index + 1 // 1番目、2番目...
    }));

    const { error: booksError } = await supabase
      .from('route_books')
      .insert(routeBooksData);

    if (booksError) {
      setLoading(false);
      alert('ルートの中身の保存に失敗しました。');
      console.error(booksError);
      return;
    }

    // 3. 仕様：追加した参考書を自動的にユーザーの「使用中」に一括upsert
    const userBookStatusData = selectedBooks.map(book => ({
      user_id: user.id,
      book_id: book.id,
      is_used: true
    }));

    const { error: statusError } = await supabase
      .from('user_book_status')
      .upsert(userBookStatusData, { onConflict: 'user_id,book_id' });

    if (statusError) {
      console.error("使用中への自動登録エラー（処理は続行されます）:", statusError);
    }

    alert('参考書ルートを保存しました！');
    router.push('/learning-data');
  };

  if (loading && !user) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">読み込み中...</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* ヘッダー */}
      <div className="bg-white px-4 py-4 border-b border-gray-200 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold">
          <ChevronLeft size={16} /> 戻る
        </button>
        <h1 className="text-sm font-extrabold text-gray-800">ルート作成</h1>
        <div className="w-10"></div> {/* 真ん中に寄せるためのダミー */}
      </div>

      <form onSubmit={handleSaveRoute} className="max-w-md mx-auto px-4 mt-6 space-y-5">
        
        {/* 📝 メタ情報入力ブロック */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">ルートの題名（必須）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 早稲田大 英語逆転合格ルート"
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
              placeholder="このルートを進める上でのアドバイスや注意点を書いてみよう！"
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all min-h-[80px]"
            />
          </div>
        </div>

        {/* 🗺️ ルート構築（本の並び）ブロック */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <label className="text-xs font-bold text-gray-600 block">参考書を順番に繋げる</label>

          {/* 🔍 参考書検索窓 */}
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

            {/* 検索サジェストのドロップダウン */}
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

          {/* 📍 追加された参考書の一覧（矢印で繋ぐUI） */}
          {selectedBooks.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-100 bg-gray-50/50 rounded-2xl">
              上の検索窓から、ルートに入れる参考書を<br />順番に追加していきましょう！
            </p>
          ) : (
            <div className="space-y-2 pt-2">
              {selectedBooks.map((book, index) => (
                <div key={book.id} className="flex flex-col items-center">
                  {/* 本のカード本体 */}
                  <div className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* 順番番号 */}
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-gray-800 truncate">{book.title}</p>
                        <p className="text-[9px] text-gray-400 truncate">{book.publisher}</p>
                      </div>
                    </div>

                    {/* 並び替え ＆ 削除アクション */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] font-bold">▲</button>
                      <button type="button" onClick={() => moveDown(index)} disabled={index === selectedBooks.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] font-bold">▼</button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBook(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors ml-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* 次の本がある場合のみ下矢印(➔の代わりの縦UI)を表示 */}
                  {index < selectedBooks.length - 1 && (
                    <div className="my-1 text-blue-400 animate-pulse">
                      <ArrowDown size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 💾 保存ボタン */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-300"
        >
          <Save size={18} />
          {loading ? '保存中...' : 'この学習ルートを保存する'}
        </button>

      </form>
    </div>
  );
}