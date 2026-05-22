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
      setLoading(false);
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen pb-24">
      
      {/* ヘッダー部分 */}
      <div className="flex items-center justify-between border-b border-gray-200/60 pb-4 mb-6">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-3xs hover:bg-gray-50 transition-all">
          <ChevronLeft size={18} /> 戻る
        </button>
        <h1 className="text-lg font-black text-slate-900">参考書ルート作成</h1>
        <div className="w-16"></div>
      </div>

      <form onSubmit={handleSaveRoute} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* 左カラム：ルート設定 */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div>
            <label className="text-xs font-black text-slate-400 mb-2 block uppercase tracking-wider">ルートの題名（必須）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 早稲田大 英単語徹底ルート"
              className="w-full bg-slate-50/60 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:bg-white text-sm font-bold text-slate-800 shadow-3xs transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 mb-2 block uppercase tracking-wider">対象の教科</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50/60 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:bg-white text-sm font-bold text-slate-800 shadow-3xs cursor-pointer transition-all"
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
              <label className="text-xs font-black text-slate-400 mb-2 block uppercase tracking-wider">公開設定</label>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black border transition-all active:scale-[0.98] shadow-3xs ${
                  isPublic 
                    ? 'bg-green-50 border-green-200 text-green-700 font-extrabold' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {isPublic ? <Globe size={16} strokeWidth={2.5} /> : <Lock size={16} strokeWidth={2.5} />}
                {isPublic ? '全体に公開する' : '非公開にする'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 mb-2 block uppercase tracking-wider">説明・備考</label>
            {/* 💡 修正点：onChange={(e) => setDescription(e.target.value)} を追加して入力可能にしました */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このルートの特徴、おすすめの進め方やアドバイス等"
              rows={5}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-slate-50/60 focus:outline-none focus:border-blue-500 focus:bg-white font-medium text-slate-800 min-h-[140px] shadow-3xs transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* 右カラム：参考書ルート構築 */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <label className="text-xs font-black text-slate-400 block uppercase tracking-wider border-b border-slate-100 pb-1.5">参考書を順番に繋げる</label>

          {/* 検索窓 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              <Search size={16} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="参考書の名前で検索して追加..."
              className="w-full bg-slate-50/60 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-black text-slate-800 shadow-3xs transition-all"
            />

            {/* 検索ドロップダウン */}
            {searchQuery && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                {isSearching ? (
                  <li className="p-3 text-xs text-slate-400 text-center font-bold animate-pulse">参考書を検索中...</li>
                ) : searchResults.length === 0 ? (
                  <li className="p-3 text-xs text-slate-400 text-center font-black">見つかりませんでした</li>
                ) : (
                  searchResults.map((book) => (
                    <li key={book.id}>
                      <button
                        type="button"
                        onClick={() => handleAddBook(book)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 text-left transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-black text-xs text-slate-800 truncate">{book.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 truncate">{book.author} / {book.publisher}</p>
                        </div>
                        <Plus size={16} className="text-blue-600 shrink-0 stroke-[2.5]" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* 追加された本の一覧リスト */}
          <div className="space-y-2 pt-1 max-h-[340px] overflow-y-auto pr-1 content-start scrollbar-none">
            {selectedBooks.length === 0 ? (
              <p className="text-center py-16 text-xs text-slate-400 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl font-bold leading-relaxed">
                上の検索窓から、ルートに入れる参考書を<br />順番に追加していきましょう！
              </p>
            ) : (
              selectedBooks.map((book, index) => (
                <div key={book.id} className="flex flex-col items-center">
                  <div className="w-full bg-slate-50/60 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3 shadow-3xs group hover:bg-white hover:border-blue-100/70 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">{book.title}</p>
                        <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{book.publisher}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 bg-white border border-gray-100 p-0.5 rounded-lg shadow-3xs">
                      <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="px-1.5 py-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 text-[10px] font-black transition-colors">▲</button>
                      <button type="button" onClick={() => moveDown(index)} disabled={index === selectedBooks.length - 1} className="px-1.5 py-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 text-[10px] font-black transition-colors">▼</button>
                      <button type="button" onClick={() => handleRemoveBook(index)} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors ml-0.5"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {index < selectedBooks.length - 1 && (
                    <div className="my-0.5 text-blue-500/70 animate-pulse">
                      <ArrowDown size={14} className="stroke-[2.5]" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="md:col-span-2 pt-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 rounded-2xl hover:from-blue-700 hover:to-indigo-700 shadow-md disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none transition-all active:scale-[0.99] text-base"
          >
            <Save size={18} className="stroke-[2.5]" />
            {loading ? 'ルートを保存中...' : '参考書ルートを保存する'}
          </button>
        </div>

      </form>
    </div>
  );
}