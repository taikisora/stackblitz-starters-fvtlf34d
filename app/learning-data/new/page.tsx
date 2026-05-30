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
  const [subject, setSubject] = useState(''); // デフォルトを未選択に変更！
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true); // デフォルトを公開に変更！

  const [selectedBooks, setSelectedBooks] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [modalType, setModalType] = useState<'likes' | 'status' | null>(null);
  const [modalBooks, setModalBooks] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // 💡 どの分岐ブロックのどのスロット（メイン/Aルート/Bルート）を操作しているかを管理
  const [activeTarget, setActiveTarget] = useState<{ index: number; slot: 'main' | 'A' | 'B' } | null>(null);

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

  // 💡 タイムラインに「分岐」または「並行」の2列の箱を新規挿入する
  const handleAddSpecialBlock = (type: 'branch' | 'parallel') => {
    if (selectedBooks.length >= 30) {
      alert('登録数が上限を超えています。');
      return;
    }
    const defaultTitle = type === 'branch' ? 'どちらか選択' : '同時並行で進める';
    const newBlock = {
      id: crypto.randomUUID(),
      type,
      title: defaultTitle,
      label_A: type === 'branch' ? '選択 A' : '並行 A', 
      label_B: type === 'branch' ? '選択 B' : '並行 B', 
      route_A: [],
      route_B: []
    };
    setSelectedBooks((prev) => [...prev, newBlock]);
  };

  // 💡 ブロック全体のタイトル、または左右の箱のラベルをリアルタイム編集する
  const handleUpdateBlockTitle = (index: number, field: 'title' | 'label_A' | 'label_B', newTitle: string) => {
    setSelectedBooks((prev) => prev.map((item, idx) => idx === index ? { ...item, [field]: newTitle } : item));
  };

  // 💡 カスタム参考書のタイトルを自由に入力・書き換えする関数
  const handleUpdateCustomBookTitle = (index: number, slot: 'main' | 'A' | 'B', newTitle: string, subIndex?: number) => {
    setSelectedBooks((prev) => prev.map((item, idx) => {
      if (idx !== index) return item;
      
      if (slot === 'main') {
        return { ...item, custom_title: newTitle };
      } else {
        const nextBlock = { ...item };
        if (slot === 'A') nextBlock.route_A = nextBlock.route_A.map((b: any, sIdx: number) => sIdx === subIndex ? { ...b, custom_title: newTitle } : b);
        if (slot === 'B') nextBlock.route_B = nextBlock.route_B.map((b: any, sIdx: number) => sIdx === subIndex ? { ...b, custom_title: newTitle } : b);
        return nextBlock;
      }
    }));
  };

  // 💡 メインタイムライン、または分岐ルート内に書籍を充填する
  const handleAddBook = (book: any) => {
    if (selectedBooks.length >= 30) {
      alert('参考書の登録数が上限（30冊）を超えています。');
      return;
    }

    if (!activeTarget || activeTarget.slot === 'main') {
      setSelectedBooks((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].id === book.id) return prev;
        return [...prev, { ...book, type: 'single' }];
      });
    } else {
      setSelectedBooks((prev) => {
        const next = JSON.parse(JSON.stringify(prev)); 
        const targetBlock = next[activeTarget.index];
        if (targetBlock && (targetBlock.type === 'branch' || targetBlock.type === 'parallel')) {
          const newNode = { ...book, type: 'single' };
          
          if (activeTarget.slot === 'A') {
            if (targetBlock.route_A.some((b: any) => b.id === book.id)) return prev;
            const nodeWithCustom = book.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? { ...newNode, custom_title: 'カスタム参考書' } : newNode;
            targetBlock.route_A = [...(targetBlock.route_A || []), nodeWithCustom];
          }
          if (activeTarget.slot === 'B') {
            if (targetBlock.route_B.some((b: any) => b.id === book.id)) return prev;
            const nodeWithCustom = book.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? { ...newNode, custom_title: 'カスタム参考書' } : newNode;
            targetBlock.route_B = [...(targetBlock.route_B || []), nodeWithCustom];
          }
        }
        return next;
      });
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setActiveTarget(null);
  };

  // 💡 メイン、または分岐ルート内から特定の書籍・ブロックを削除する
  const handleRemoveBook = (index: number, subIndex?: number, slot: 'main' | 'A' | 'B' = 'main') => {
    if (slot === 'main') {
      setSelectedBooks((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setSelectedBooks((prev) => {
        const next = [...prev];
        const targetBlock = next[index];
        if (targetBlock) {
          if (slot === 'A') targetBlock.route_A = targetBlock.route_A.filter((_: any, idx: number) => idx !== subIndex);
          if (slot === 'B') targetBlock.route_B = targetBlock.route_B.filter((_: any, idx: number) => idx !== subIndex);
        }
        return next;
      });
    }
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
    
    // 💡 修正：教科が未選択（空文字）のままなら保存をブロックする
    if (!subject) {
      alert('対象の教科を選択してください。');
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

    const cleanStructure = selectedBooks.map(item => {
      if (!item.type || item.type === 'single') {
        return { type: 'single', book_id: item.id, custom_title: item.custom_title || '' };
      } else {
        return {
          type: item.type,
          title: item.title || '',
          label_A: item.label_A || '',
          label_B: item.label_B || '',
          route_A: (item.route_A || []).map((b: any) => ({ type: 'single', book_id: b.id, custom_title: b.custom_title || '' })),
          route_B: (item.route_B || []).map((b: any) => ({ type: 'single', book_id: b.id, custom_title: b.custom_title || '' }))
        };
      }
    });

    const { data: routeData, error: routeError } = await supabase
      .from('study_routes')
      .insert({
        user_id: user.id,
        title: title.trim(),
        subject,
        description: description.trim(),
        is_public: isPublic,
        flow_structure: cleanStructure,
        likes_count: 0,
        comments_count: 0
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

    const allBooks: any[] = [];
    selectedBooks.forEach(item => {
      if (!item.type || item.type === 'single') {
        allBooks.push(item);
      } else {
        if (item.route_A) allBooks.push(...item.route_A);
        if (item.route_B) allBooks.push(...item.route_B);
      }
    });

    const realBooksForStatus = allBooks.filter((book: any) => book.id !== "b2531a01-d6ea-47ad-ae84-3fac68cf3c81");

    if (realBooksForStatus.length > 0) {
      const uniqueBookIds = Array.from(new Set(realBooksForStatus.map(b => b.id)));

      // 💡 修正①：二重カウントを防ぐため、このユーザーが現在「すでに使用中（is_used）」にしている本のIDを事前に取得
      const { data: alreadyUsedData } = await supabase
        .from('user_book_status')
        .select('book_id')
        .eq('user_id', user.id)
        .eq('is_used', true)
        .in('book_id', uniqueBookIds);

      const alreadyUsedSet = new Set(alreadyUsedData?.map(d => d.book_id) || []);

      // 💡 修正②：まだ使用中にしていなかった（今回初めて使用中になる）本だけのIDリストを作成
      const newIncrementBookIds = uniqueBookIds.filter(bId => !alreadyUsedSet.has(bId));

      // ステータスを「使用中」に更新（ここは既存のまま安全にUpsert）
      const userBookStatusData = uniqueBookIds.map((bId) => ({
        user_id: user.id,
        book_id: bId,
        is_used: true
      }));
      await supabase.from('user_book_status').upsert(userBookStatusData, { onConflict: 'user_id,book_id' });

      // 💡 修正③：今回初めて使用中になった本がある場合のみ、booksテーブルの used_count を確実に「+1」する！
      if (newIncrementBookIds.length > 0) {
        // RPC（データベース関数）を使わずに、安全に1つずつカウントアップを実行します
        for (const bId of newIncrementBookIds) {
          // 現在の used_count を取得
          const { data: currentBook } = await supabase
            .from('books')
            .select('used_count')
            .eq('id', bId)
            .single();
          
          if (currentBook) {
            const nextCount = (currentBook.used_count || 0) + 1;
            // カウンターを上書き更新
            await supabase
              .from('books')
              .update({ used_count: nextCount })
              .eq('id', bId);
          }
        }
      }
    }

    alert('参考書ルートを保存しました！');
    router.push('/learning-data');
  };

  if (loading && !user) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">読み込み中...</div>;

  return (
    /* 💡 修正：本番環境でのカラー消滅を防ぐため、インラインスタイルで背景を薄灰色に100%絶対固定します */
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-screen pb-24 text-slate-900 light select-none" style={{ backgroundColor: '#f1f5f9', color: '#1e293b' }}>
      
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-3xs hover:bg-gray-50 transition-all">
          <ChevronLeft size={18} /> 戻る
        </button>
        <h1 className="text-lg font-black text-slate-900">参考書ルート作成</h1>
        <div className="w-16"></div>
      </div>

      <form onSubmit={handleSaveRoute} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* 左カラム */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div>
            <label className="text-xs font-black text-slate-500 mb-2 block uppercase tracking-wider">ルートの題名（必須）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 早稲田大 英単語徹底ルート"
              className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:bg-white text-sm font-bold text-slate-800 shadow-3xs transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-500 mb-2 block uppercase tracking-wider">対象の教科</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:bg-white text-sm font-bold text-slate-800 shadow-3xs cursor-pointer transition-all"
              >
                {/* 💡 他の項目と完全に同じトーンで「選択してください」を配置 */}
                <option value="" hidden>選択してください</option>

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
              <label className="text-xs font-black text-slate-500 mb-2 block uppercase tracking-wider">公開設定</label>
              
              {/* 土台の背景 */}
              <div className="w-full bg-slate-100 p-1 rounded-xl flex border border-gray-200/60 shadow-inner">
                
                {/* 🟢 全体に公開 ボタン */}
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer"
                  // 💡 修正：インラインスタイルで、本番環境の消去バグから緑色を100%絶対死守します
                  style={
                    isPublic 
                      ? { backgroundColor: '#16a34a', color: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' } 
                      : { color: '#64748b' }
                  }
                >
                  <Globe size={14} strokeWidth={isPublic ? 3 : 2} />
                  <span>全体に公開</span>
                </button>

                {/* 🔒 非公開 ボタン */}
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer"
                  // 💡 修正：同じく黒（ダークグレー）の背景をインラインで強制固定します
                  style={
                    !isPublic 
                      ? { backgroundColor: '#334155', color: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' } 
                      : { color: '#64748b' }
                  }
                >
                  <Lock size={14} strokeWidth={!isPublic ? 3 : 2} />
                  <span>非公開にする</span>
                </button>

              </div>
            </div>
          </div> {/* 💡 忘れ去られていた「教科と公開設定」をまとめる閉じタグ */}

          <div>
            <label className="text-xs font-black text-slate-500 mb-2 block uppercase tracking-wider">説明・備考</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このルートの特徴、おすすめの進め方やアドバイス等"
              rows={5}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:border-blue-500 focus:bg-white font-bold text-slate-800 min-h-[140px] shadow-3xs transition-all leading-relaxed"
            />
          </div>
        </div> {/* 💡 左カラム全体を美しく締めくくる最後の閉じタグ */}

        {/* 右カラム */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 relative">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
            <label className="text-xs font-black text-slate-500 block uppercase tracking-wider">参考書ルートを組み立てる</label>
            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${selectedBooks.length >= 30 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-gray-200'}`}>
              {selectedBooks.length} / 30 冊
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => openBooksModal('likes')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-700 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-3xs"
            >
              <Heart size={14} className="fill-current" /> いいねから追加
            </button>
            {/* 💡 修正：使用中から追加ボタンも本番のPurgeから守るため、緑色のスタイルをインラインでガチ固定します */}
            <button
              type="button"
              onClick={() => openBooksModal('status')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 border text-emerald-800 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-3xs"
              style={{ backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }} // bg-emerald-100, border-emerald-200 相当
            >
              <BookOpen size={14} /> 使用中から追加
            </button>
            <button
              type="button"
              onClick={() => {
                handleAddBook({
                  id: "b2531a01-d6ea-47ad-ae84-3fac68cf3c81",
                  title: "カスタム参考書",
                  publisher: "※タイトルを変更できます"
                });
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-3xs"
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
              className="w-full bg-slate-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-black text-slate-800 shadow-3xs transition-all"
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

          <div className="space-y-3 pt-1 max-h-[450px] overflow-y-auto pr-1 content-start scrollbar-none">
            {selectedBooks.length === 0 ? (
              <p className="text-center py-16 text-xs text-slate-400 border border-dashed border-gray-200 bg-slate-50 rounded-2xl font-bold leading-relaxed">
                上の検索窓やショートカットボタンから、<br />参考書を順番に追加していきましょう！
              </p>
            ) : (
              selectedBooks.map((item, index) => (
                <div key={index} className="flex flex-col items-center w-full animate-fade-in">
                  
                  {/* 🟢 パターンA：通常の一本道参考書 */}
                  {(!item.type || item.type === 'single') ? (
                    <div className="w-full bg-slate-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between gap-3 shadow-3xs group hover:bg-white hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* 💡 修正：本番最適化での色消滅を防ぐため、インラインスタイルで青背景（#2563eb）を絶対固定します */}
                        <span className="w-5 h-5 rounded-md text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs relative z-10" style={{ backgroundColor: '#2563eb' }}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          {item.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? (
                            <input
                              type="text"
                              value={item.custom_title === undefined ? 'カスタム参考書' : item.custom_title}
                              onChange={(e) => handleUpdateCustomBookTitle(index, 'main', e.target.value)}
                              placeholder="参考書名を入力してください..."
                              className="bg-transparent font-black text-xs text-blue-600 border-b border-dashed border-blue-400 focus:border-blue-500 focus:outline-none w-full py-0.5"
                            />
                          ) : (
                            <p className="font-black text-xs text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">{item.title}</p>
                          )}
                          <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{item.publisher}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 bg-white border border-gray-200 p-0.5 rounded-lg shadow-3xs">
                        <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="px-1.5 py-0.5 text-slate-500 hover:text-blue-600 disabled:opacity-20 text-[10px] font-black transition-colors">▲</button>
                        <button type="button" onClick={() => moveDown(index)} disabled={index === selectedBooks.length - 1} className="px-1.5 py-0.5 text-slate-500 hover:text-blue-600 disabled:opacity-20 text-[10px] font-black transition-colors">▼</button>
                        <button type="button" onClick={() => handleRemoveBook(index, undefined, 'main')} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors ml-0.5"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ) : (
                    /* 🟡 パターンB：特殊コマンド（分岐 or 並行ブロック）の2列レンダリング */
                    <div className="w-full bg-slate-100 border border-gray-200 p-3.5 rounded-2xl space-y-3 shadow-3xs relative group/block">
                      
                      <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 gap-2" style={{ borderColor: '#e2e8f0' }}>
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {/* 💡 修正：サークル色を一本道と同じ青（#2563eb）に統一し、タイトル色も強制固定 */}
                          <span className="w-5 h-5 rounded-md text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs relative z-10" style={{ backgroundColor: '#2563eb' }}>
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateBlockTitle(index, 'title', e.target.value)}
                            className="bg-transparent font-black text-xs border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full py-0.5 truncate"
                            style={{ color: '#2563eb' }}
                          />
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 bg-white border border-gray-200 p-0.5 rounded-lg shadow-3xs">
                          <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="px-1.5 py-0.5 text-slate-500 hover:text-blue-600 disabled:opacity-20 text-[10px] font-black">▲</button>
                          <button type="button" onClick={() => moveDown(index)} disabled={index === selectedBooks.length - 1} className="px-1.5 py-0.5 text-slate-500 hover:text-blue-600 disabled:opacity-20 text-[10px] font-black">▼</button>
                          <button type="button" onClick={() => handleRemoveBook(index, undefined, 'main')} className="p-1 text-slate-400 hover:text-red-500 rounded ml-0.5"><Trash2 size={13} /></button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 items-start">
                        
                        {/* 左側の箱 (A) */}
                        <div className="bg-white p-2 rounded-xl border border-gray-200 space-y-2 min-h-[90px] flex flex-col justify-between shadow-3xs">
                          <input
                            type="text"
                            value={item.label_A === undefined ? (item.type === 'branch' ? '選択 A' : '並行 A') : item.label_A}
                            onChange={(e) => handleUpdateBlockTitle(index, 'label_A', e.target.value)}
                            onBlur={() => {
                              if (!item.label_A || !item.label_A.trim()) {
                                handleUpdateBlockTitle(index, 'label_A', item.type === 'branch' ? '選択 A' : '並行 A');
                              }
                            }}
                            className="text-[9px] font-black tracking-wider text-slate-500 uppercase text-center block border-b border-gray-100 pb-0.5 bg-transparent focus:outline-none focus:text-blue-600 focus:border-blue-300 w-full"
                          />
                          <div className="space-y-1 flex-1 py-1">
                            {(item.route_A || []).map((subBook: any, subIdx: number) => (
                              <div key={subIdx} className="flex items-center gap-1 p-1.5 bg-slate-50 border border-gray-200 rounded-lg relative group/sub w-full">
                                {subBook.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? (
                                  <input
                                    type="text"
                                    value={subBook.custom_title === undefined ? 'カスタム参考書' : subBook.custom_title}
                                    onChange={(e) => handleUpdateCustomBookTitle(index, 'A', e.target.value, subIdx)}
                                    className="bg-transparent font-extrabold text-[10px] text-blue-600 border-b border-dashed border-blue-400 focus:border-blue-500 focus:outline-none flex-1 py-0 px-0.5"
                                  />
                                ) : (
                                  <span className="text-[10px] font-extrabold text-slate-800 truncate flex-1 pl-0.5">{subBook.title}</span>
                                )}
                                <button type="button" onClick={() => handleRemoveBook(index, subIdx, 'A')} className="text-slate-400 hover:text-red-500 p-0.5 shrink-0"><Trash2 size={11} /></button>
                              </div>
                            ))}
                          </div>
                          
                          {/* 💡 修正：「指定を解除」の赤色（#dc2626）ボタンをインラインスタイルで本番サイト用に絶対保護！ */}
                          <button
                            type="button"
                            onClick={() => {
                              if (activeTarget?.index === index && activeTarget?.slot === 'A') {
                                setActiveTarget(null);
                              } else {
                                setActiveTarget({ index, slot: 'A' });
                              }
                            }}
                            className="w-full border py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-0.5 transition-all cursor-pointer shadow-3xs"
                            style={
                              activeTarget?.index === index && activeTarget?.slot === 'A'
                                ? { backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }
                                : { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }
                            }
                          >
                            <Plus size={10} />
                            <span>{activeTarget?.index === index && activeTarget?.slot === 'A' ? '指定を解除' : '本を指定'}</span>
                          </button>
                        </div>

                        {/* 右側の箱 (B) */}
                        <div className="bg-white p-2 rounded-xl border border-gray-200 space-y-2 min-h-[90px] flex flex-col justify-between shadow-3xs">
                        <input
                            type="text"
                            value={item.label_B === undefined ? (item.type === 'branch' ? '選択 B' : '並行 B') : item.label_B}
                            onChange={(e) => handleUpdateBlockTitle(index, 'label_B', e.target.value)}
                            onBlur={() => {
                              if (!item.label_B || !item.label_B.trim()) {
                                handleUpdateBlockTitle(index, 'label_B', item.type === 'branch' ? '選択 B' : '並行 B');
                              }
                            }}
                            /* 💡 修正：右側のB面入力文字色も、正常に見える左側と同じ青色に強制固定 */
                            className="text-[9px] font-black tracking-wider uppercase text-center block border-b border-gray-100 pb-0.5 bg-transparent focus:outline-none focus:text-blue-600 focus:border-blue-300 w-full"
                            style={{ color: '#2563eb' }}
                          />
                          <div className="space-y-1 flex-1 py-1">
                          {(item.route_B || []).map((subBook: any, subIdx: number) => (
                              <div key={subIdx} className="flex items-center gap-1 p-1.5 bg-slate-50 border border-gray-200 rounded-lg relative group/sub w-full">
                                {subBook.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? (
                                  <input
                                    type="text"
                                    value={subBook.custom_title === undefined ? 'カスタム参考書' : subBook.custom_title}
                                    onChange={(e) => handleUpdateCustomBookTitle(index, 'B', e.target.value, subIdx)}
                                    className="bg-transparent font-extrabold text-[10px] text-blue-600 border-b border-dashed border-blue-400 focus:border-blue-500 focus:outline-none flex-1 py-0 px-0.5"
                                  />
                                ) : (
                                  <span className="text-[10px] font-extrabold text-slate-800 truncate flex-1 pl-0.5">{subBook.title}</span>
                                )}
                                <button type="button" onClick={() => handleRemoveBook(index, subIdx, 'B')} className="text-slate-400 hover:text-red-500 p-0.5 shrink-0"><Trash2 size={11} /></button>
                              </div>
                            ))}
                          </div>
                          
                          {/* 💡 修正：「指定を解除」の赤色（#dc2626）ボタンをインラインスタイルで本番サイト用に絶対保護！ */}
                          <button
                            type="button"
                            onClick={() => {
                              if (activeTarget?.index === index && activeTarget?.slot === 'B') {
                                setActiveTarget(null);
                              } else {
                                setActiveTarget({ index, slot: 'B' });
                              }
                            }}
                            className="w-full border py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-0.5 transition-all cursor-pointer shadow-3xs"
                            style={
                              activeTarget?.index === index && activeTarget?.slot === 'B'
                                ? { backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }
                                : { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }
                            }
                          >
                            <Plus size={10} />
                            <span>{activeTarget?.index === index && activeTarget?.slot === 'B' ? '指定を解除' : '本を指定'}</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* 次の要素へ繋ぐ下矢印 */}
                  {index < selectedBooks.length - 1 && (
                    <div className="my-1.5 text-blue-500/80 animate-pulse">
                      <ArrowDown size={14} className="stroke-[2.5]" />
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

          {/* 💡 修正：本番ビルドで削られないよう、背景色と枠線色を確実なカラーコード（黄・緑）で直書き指定します */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleAddSpecialBlock('branch')}
              className="flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-black text-amber-800 border transition-all active:scale-95 cursor-pointer shadow-3xs"
              style={{ backgroundColor: '#fef3c7', borderColor: '#fde68a' }} // bg-amber-100, border-amber-200
            >
              <Plus size={12} strokeWidth={2.5} /> 分岐ルートを挿入
            </button>
            <button
              type="button"
              onClick={() => handleAddSpecialBlock('parallel')}
              className="flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-black text-emerald-800 border transition-all active:scale-95 cursor-pointer shadow-3xs"
              style={{ backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }} // bg-emerald-100, border-emerald-200
            >
              <Plus size={12} strokeWidth={2.5} /> 並行ルートを挿入
            </button>
          </div>

          {modalType && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl border border-gray-200 w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                  <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                    {modalType === 'likes' ? <Heart size={15} className="text-rose-500 fill-current" /> : <BookOpen size={15} className="text-emerald-500" />}
                    {modalType === 'likes' ? 'いいねした参考書' : '使用した参考書'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="p-1.5 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-xs font-bold cursor-pointer"
                  >
                    閉じる
                  </button>
                </div>
                
                <div className="p-2 overflow-y-auto divide-y divide-slate-100 flex-1 min-h-[200px]">
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
                                : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white'
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