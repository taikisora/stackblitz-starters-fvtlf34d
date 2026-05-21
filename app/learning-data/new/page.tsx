"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'; 
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

  // ルートに入れる参考書のリスト
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
      loading && setLoading(false);
    };
    checkUser();
  }, [router]);

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
      .limit(20); 

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
      if (routeError.code === '23505') {
        alert('既に同じ題名のルートが存在します。別の題名を付けてください。');
      } else {
        alert('ルートの保存に失敗しました。');
      }
      return;
    }

    const newRouteId = routeData.id;

    const routeBooksData = selectedBooks.map((book, index) => ({
      route_id: newRouteId,
      book_id: book.id,
      sort_order: index + 1 
    }));

    const { error: booksError } = await supabase
      .from('route_books')
      .insert(routeBooksData);

    if (booksError) {
      setLoading(false);
      alert('ルートの中身の保存に失敗しました。');
      return;
    }

    const userBookStatusData = selectedBooks.map(book => ({
      user_id: user.id,
      book_id: book.id,
      is_used: true
    }));

    await supabase.from('user_book_status').upsert(userBookStatusData, { onConflict: 'user_id,book_id' });

    alert('参考書ルートを保存しました！');
    router.push('/learning-data');
  };

  if (loading && !user) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">読み込み中...</div>;

  return (
    // 💡 max-w-md から max-w-3xl に拡張し、他のリッチ化した画面と幅・丸みを完全統一！
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 space-y-6">
      
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-2xs hover:bg-gray-50 transition-all">
          <ChevronLeft size={16} /> 戻る
        </button>
        <h1 className="text-base font-black text-gray-800">ルート作成</h1>
        <div className="w-16"></div>
      </div>

      {/* 💡 PC大画面の時は「フォーム入力」と「参考書の追加エリア」が左右綺麗な2カラムに分かれます */}
      <form onSubmit={handleSaveRoute} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* 左カラム：ルートのタイトルや説明などの設定項目 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 h-full">
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">ルートの題名（必須）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 早稲田大 英単語徹底ルート"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm font-bold text-gray-700 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">対象の教科</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm font-bold text-gray-700 shadow-2xs cursor-pointer"
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
              <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">公開設定</label>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-black border transition-all active:scale-95 shadow-2xs ${
                  isPublic 
                    ? 'bg-green-50 border-green-200 text-green-700 ring-4 ring-green-500/5' 
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                {isPublic ? '世界に公開する' : '非公開にする'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">説明・備考</label>
            <textarea
              value={description}
              placeholder="詳細な説明や注意点、アドバイス等"
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-blue-500 font-medium text-gray-700 min-h-[110px] shadow-2xs"
            />
          </div>
        </div>

        {/* 右カラム：参考書を検索して順番に繋げるルート構築エリア */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider border-b border-gray-50 pb-1">参考書を順番に繋げる</label>

          {/* 🔎 参考書検索窓 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="参考書の名前で検索して追加..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 text-xs font-bold text-gray-700 shadow-2xs"
            />

            {/* 検索サジェストのドロップダウン */}
            {searchQuery && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                {isSearching ? (
                  <li className="p-3 text-xs text-gray-400 text-center font-medium animate-pulse">参考書を検索中...</li>
                ) : searchResults.length === 0 ? (
                  <li className="p-3 text-xs text-gray-400 text-center font-bold">見つかりませんでした</li>
                ) : (
                  searchResults.map((book) => (
                    <li key={book.id}>
                      <button
                        type="button"
                        onClick={() => handleAddBook(book)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 text-left transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-extrabold text-xs text-gray-800 truncate">{book.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{book.author} / {book.publisher}</p>
                        </div>
                        <Plus size={16} className="text-blue-500 shrink-0 stroke-[2.5]" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* 📍 追加された参考書の一覧（フローUI） */}
          <div className="space-y-2 pt-1 max-h-[300px] overflow-y-auto pr-1 content-start">
            {selectedBooks.length === 0 ? (
              <p className="text-center py-12 text-xs text-gray-400 border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl font-bold leading-relaxed">
                上の検索窓から、ルートに入れる参考書を<br />順番に追加していきましょう！
              </p>
            ) : (
              selectedBooks.map((book, index) => (
                <div key={book.id} className="flex flex-col items-center">
                  <div className="w-full bg-gray-50/70 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3 shadow-2xs group hover:bg-white hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-gray-800 truncate leading-tight">{book.title}</p>
                        <p className="text-[9px] text-gray-400 truncate mt-0.5">{book.publisher}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 bg-white border border-gray-100/60 p-0.5 rounded-lg shadow-2xs">
                      <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="px-1.5 py-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-20 text-[10px] font-black transition-colors">▲</button>
                      <button type="button" onClick={() => moveDown(index)} disabled={index === selectedBooks.length - 1} className="px-1.5 py-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-20 text-[10px] font-black transition-colors">▼</button>
                      <button type="button" onClick={() => handleRemoveBook(index)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors ml-0.5"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {index < selectedBooks.length - 1 && (
                    <div className="my-0.5 text-blue-400/70 animate-pulse">
                      <ArrowDown size={14} className="stroke-[2.5]" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 保存ボタン：最下部に全幅（2カラムぶち抜き）で配置 */}
        <div className="md:col-span-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold py-4 rounded-2xl hover:from-blue-700 hover:to-indigo-700 shadow-lg disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none transition-all active:scale-[0.99] text-base"
          >
            <Save size={18} className="stroke-[2.5]" />
            {loading ? 'ルートを保存中...' : 'この参考書を新規保存する'}
          </button>
        </div>

      </form>
    </div>
  );
}