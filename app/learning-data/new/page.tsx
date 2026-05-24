"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'; 
import { ChevronLeft, ArrowDown, Trash2, Search, Plus, Save, Globe, Lock, Heart, BookOpen } from 'lucide-react';

export default function NewRoutePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('英単語');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const [selectedBooks, setSelectedBooks] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [modalType, setModalType] = useState<'likes' | 'status' | null>(null);
  const [modalBooks, setModalBooks] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

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

  const openBooksModal = async (type: 'likes' | 'status') => {
    setModalType(type);
    setModalLoading(true);
    setModalBooks([]);
    
    try {
      let query = supabase
        .from('user_book_status')
        .select('books(*)')
        .eq('user_id', user.id);

      if (type === 'likes') {
        query = query.eq('is_saved', true);
      } else {
        query = query.eq('is_used', true);
      }

      const { data, error } = await query;

      if (!error && data) {
        const extractedBooks = data.map((item: any) => item.books).filter(Boolean);
        setModalBooks(extractedBooks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

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

  // 💡 修正：全体の合計数が30冊に達している場合は、追加をブロックするストッパーを配置
  const handleAddBook = (book: any) => {
    if (selectedBooks.length >= 30) {
      alert('ルートに追加できる参考書は最大30冊までです。');
      return;
    }

    if (book.id !== "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" && selectedBooks.some(b => b.id === book.id)) {
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
    if (selectedBooks.length > 30) {
      alert('参考書の登録数が上限（30冊）を超えています。');
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

    const routeBooksData = selectedBooks.map((book: any, index: number) => ({
      route_id: newRouteId,
      book_id: book.id,
      sort_order: index + 1 
    }));

    if (routeBooksData.length > 0) {
      const { error: booksError } = await supabase
        .from('route_books')
        .insert(routeBooksData);

      if (booksError) {
        setLoading(false);
        alert('ルートの中身の保存に失敗しました。');
        return;
      }
    }

   const realBooksForStatus = selectedBooks.filter((book: any) => book.id !== "b2531a01-d6ea-47ad-ae84-3fac68cf3c81");

   if (realBooksForStatus.length > 0) {
     const userBookStatusData = realBooksForStatus.map((book: any) => ({
       user_id: user.id,
       book_id: book.id,
       is_used: true
     }));
     await supabase.from('user_book_status').upsert(userBookStatusData, { onConflict: 'user_id,book_id' });
   }

    alert('参考書ルートを保存しました！');
    router.push('/learning-data');
  };

  if (loading && !user) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">読み込み中...</div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen pb-24">
      
      <div className="flex items-center justify-between border-b border-gray-200/60 pb-4 mb-6">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-3xs hover:bg-gray-50 transition-all">
          <ChevronLeft size={18} /> 戻る
        </button>
        <h1 className="text-lg font-black text-slate-900">参考書ルート作成</h1>
        <div className="w-16"></div>
      </div>

      <form onSubmit={handleSaveRoute} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
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
                  <option value="英語（総合）">英語（総合）</option>
                  <option value="英単語">英単語</option>
                  <option value="英熟語">英熟語</option>
                  <option value="英文法">英文法</option>
                  <option value="長文">長文</option>
                  <option value="リスニング">リスニング</option>
                  <option value="英作文">英作文</option>
                  <option value="その他（英語）">その他（英語）</option>
                </optgroup>
                <optgroup label="数学">
                  <option value="数学（総合）">数学（総合）</option>
                  <option value="数IA">数IA</option>
                  <option value="数IIB">数IIB</option>
                  <option value="数IIIC">数IIIC</option>
                  <option value="その他（数学）">その他（数学）</option>
                </optgroup>
                <optgroup label="国語">
                  <option value="国語（総合）">国語（総合）</option>
                  <option value="現代文">現代文</option>
                  <option value="古文">古文</option>
                  <option value="漢文">漢文</option>
                  <option value="その他（国語）">その他（国語）</option>
                </optgroup>
                <optgroup label="理科">
                  <option value="理科（総合）">理科（総合）</option>
                  <option value="物理">物理</option>
                  <option value="化学">化学</option>
                  <option value="生物">生物</option>
                  <option value="地学">地学</option>
                  <option value="その他（理科）">その他（理科）</option>
                </optgroup>
                <optgroup label="社会">
                  <option value="社会（総合）">社会（総合）</option>
                  <option value="歴史総合">歴史総合</option>
                  <option value="日本史">日本史</option>
                  <option value="世界史">世界史</option>
                  <option value="地理">地理</option>
                  <option value="公共">公共</option>
                  <option value="倫理">倫理</option>
                  <option value="政治・経済">政治・経済</option>
                  <option value="その他（社会）">社会（社会）</option>
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
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このルートの特徴、おすすめの進め方やアドバイス等"
              rows={5}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-slate-50/60 focus:outline-none focus:border-blue-500 focus:bg-white font-bold text-slate-800 min-h-[140px] shadow-3xs transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* 右カラム */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 relative">
          <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
            <label className="text-xs font-black text-slate-400 block uppercase tracking-wider">参考書ルートを組み立てる</label>
            {/* 現在の登録状況をインジケーターとして表示 */}
            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${selectedBooks.length >= 30 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
              {selectedBooks.length} / 30 冊
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => openBooksModal('likes')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50/60 hover:bg-rose-100/70 border border-rose-100 text-rose-700 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer"
            >
              <Heart size={14} className="fill-current" /> いいねから追加
            </button>
            <button
              type="button"
              onClick={() => openBooksModal('status')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer"
            >
              <BookOpen size={14} /> 使用中から追加
            </button>
            
            <button
              type="button"
              onClick={() => {
                handleAddBook({
                  id: "b2531a01-d6ea-47ad-ae84-3fac68cf3c81",
                  title: "カスタム参考書",
                  publisher: "※詳細は説明・備考欄に記入してください"
                });
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} /> （参考書が見つからない場合）
            </button>
          </div>

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

          <div className="space-y-2 pt-1 max-h-[340px] overflow-y-auto pr-1 content-start scroll-none">
            {selectedBooks.length === 0 ? (
              <p className="text-center py-16 text-xs text-slate-400 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl font-bold leading-relaxed">
                上の検索窓やショートカットボタンから、<br />参考書を順番に追加していきましょう！
              </p>
            ) : (
              selectedBooks.map((book, index) => (
                <div key={index} className="flex flex-col items-center">
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

          {modalType && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl border border-slate-100 w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
                  <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                    {modalType === 'likes' ? <Heart size={15} className="text-rose-500 fill-current" /> : <BookOpen size={15} className="text-emerald-500" />}
                    {modalType === 'likes' ? 'いいねした参考書' : '使用した参考書'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors text-xs font-bold cursor-pointer"
                  >
                    閉じる
                  </button>
                </div>
                
                <div className="p-2 overflow-y-auto divide-y divide-slate-50 flex-1 min-h-[200px]">
                  {modalLoading ? (
                    <div className="text-center py-12 text-xs font-bold text-slate-400 animate-pulse">参考書を読み込み中...</div>
                  ) : modalBooks.length === 0 ? (
                    <div className="text-center py-16 text-xs font-black text-slate-400 leading-relaxed">
                      該当する参考書がありません。
                    </div>
                  ) : (
                    modalBooks.map((book) => {
                      const isAdded = selectedBooks.some(b => b.id === book.id);
                      return (
                        <div key={book.id} className="p-2 flex items-center justify-between gap-3 group">
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-xs text-slate-800 truncate leading-snug group-hover:text-blue-600 transition-colors">{book.title}</p>
                            <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{book.publisher}</p>
                          </div>
                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => {
                              handleAddBook(book);
                              setModalType(null); 
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide border transition-all shrink-0 active:scale-95 cursor-pointer ${
                              isAdded 
                                ? 'bg-slate-50 border-slate-200 text-slate-400 font-bold' 
                                : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'
                            }`}
                          >
                            {isAdded ? '追加済み' : 'ルートへ追加'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

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