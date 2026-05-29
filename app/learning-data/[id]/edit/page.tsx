"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { ChevronLeft, ArrowDown, Trash2, Search, Plus, Save, Globe, Lock, Heart, BookOpen } from 'lucide-react';

export default function EditRoutePage() {
  const router = useRouter();
  const params = useParams();
  const routeId = params.id as string;

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

  const [activeTarget, setActiveTarget] = useState<{ index: number; slot: 'main' | 'A' | 'B' } | null>(null);

  useEffect(() => {
    const fetchRouteData = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      const { data: routeData } = await supabase
        .from('study_routes')
        .select('*')
        .eq('id', routeId)
        .single();

      if (routeData) {
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

      // 💡 新旧データのフォールバックロード ＆ custom_titleの復元ロード
      if (routeData && routeData.flow_structure && Array.isArray(routeData.flow_structure)) {
        const allBookIds: string[] = [];
        routeData.flow_structure.forEach((node: any) => {
          if ((!node.type || node.type === 'single') && node.book_id) allBookIds.push(node.book_id);
          if (node.route_A) node.route_A.forEach((b: any) => b.book_id && allBookIds.push(b.book_id));
          if (node.route_B) node.route_B.forEach((b: any) => b.book_id && allBookIds.push(b.book_id));
        });

        if (allBookIds.length > 0) {
          const { data: booksMaster } = await supabase
            .from('books')
            .select('*')
            .in('id', allBookIds);
          if (booksMaster) {
            const booksMap = new Map(booksMaster.map(b => [b.id, b]));
            const hydraStructure = routeData.flow_structure.map((node: any) => {
              if (!node.type || node.type === 'single') {
                if (node.book_id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
                  return { id: node.book_id, title: "カスタム参考書", custom_title: node.custom_title || 'カスタム参考書', publisher: "※タイトルを変更できます", type: 'single' };
                }
                const baseBook = booksMap.get(node.book_id);
                return { ...baseBook, type: 'single' };
              } else {
                return {
                  ...node,
                  route_A: (node.route_A || []).map((b: any) => {
                    if (b.book_id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") return { id: b.book_id, title: "カスタム参考書", custom_title: b.custom_title || 'カスタム参考書', publisher: "※タイトルを変更できます", type: 'single' };
                    return { ...booksMap.get(b.book_id), type: 'single' };
                  }),
                  route_B: (node.route_B || []).map((b: any) => {
                    if (b.book_id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") return { id: b.book_id, title: "カスタム参考書", custom_title: b.custom_title || 'カスタム参考書', publisher: "※タイトルを変更できます", type: 'single' };
                    return { ...booksMap.get(b.book_id), type: 'single' };
                  })
                };
              }
            });
            setSelectedBooks(hydraStructure);
          }
        }
      } else {
        // 旧データ互換
        const { data: booksData } = await supabase
          .from('route_books')
          .select('*, books(*)')
          .eq('route_id', routeId)
          .order('sort_order', { ascending: true });

        if (booksData) {
          const orderedBooks = booksData.map(rb => {
            if (rb.books && rb.books.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81") {
              return { ...rb.books, title: "カスタム参考書", custom_title: 'カスタム参考書', publisher: "※タイトルを変更できます", type: 'single' };
            }
            if (rb.books) return { ...rb.books, type: 'single' };
            return null;
          }).filter(Boolean);
          setSelectedBooks(orderedBooks);
        }
      }

      setLoading(false);
    };

    if (routeId) fetchRouteData();
  }, [routeId, router]);

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
    const { data, error = null } = await supabase
      .from('books')
      .select('*')
      .ilike('title', `%${query}%`)
      .limit(20);

    if (!error && data) {
      setSearchResults(data);
    }
    setIsSearching(false);
  };

  // 💡 書籍追加ロジック ＆ custom_titleの初期パッキング
  const handleAddBook = (book: any) => {
    if (selectedBooks.length >= 30) {
      alert('ルートに追加できる参考書は最大30冊までです。');
      return;
    }

    if (!activeTarget || activeTarget.slot === 'main') {
      if (book.id !== "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" && selectedBooks.some(b => b.id === book.id)) {
        alert('この参考書は既にルートに追加されています。');
        return;
      }
      setSelectedBooks((prev) => [...prev, { ...book, type: 'single', custom_title: book.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? 'カスタム参考書' : undefined }]);
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

  // 💡 カスタム参考書のタイトル打ち替え関数
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

  const handleUpdateBlockTitle = (index: number, field: 'title' | 'label_A' | 'label_B', newTitle: string) => {
    setSelectedBooks((prev) => prev.map((item, idx) => idx === index ? { ...item, [field]: newTitle } : item));
  };

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
    if (selectedBooks.length > 30) {
      alert('参考書の登録数が上限（30冊）を超えています。');
      return;
    }

    setLoading(true);

    // custom_titleも一緒に圧縮パッキング
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

    const { error: routeError } = await supabase
      .from('study_routes')
      .update({
        title: title.trim(),
        subject,
        description: description.trim(),
        is_public: isPublic,
        flow_structure: cleanStructure
      })
      .eq('id', routeId);

    if (routeError) {
      setLoading(false);
      alert('ルートの更新に失敗しました。');
      return;
    }

    await supabase.from('route_books').delete().eq('route_id', routeId);

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
      const userBookStatusData = uniqueBookIds.map((bId) => ({
        user_id: user.id,
        book_id: bId,
        is_used: true
      }));
      await supabase.from('user_book_status').upsert(userBookStatusData, { onConflict: 'user_id,book_id' });
    }

    alert('参考書ルートを更新しました！');
    router.push('/learning-data');
  };

  if (loading && !user) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">読み込み中...</div>;

  return (
    /* 💡 修正：本番環境でのカラー消滅を防ぐため、インラインスタイルで背景を薄灰色に100%絶対固定します */
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-screen pb-24" style={{ backgroundColor: '#f1f5f9' }}>
      
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
        <button onClick={() => router.back()} className="text-sm text-blue-600 flex items-center font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-3xs hover:bg-gray-50 transition-all">
          <ChevronLeft size={18} /> 戻る
        </button>
        <h1 className="text-lg font-black text-slate-900">参考書ルート編集</h1>
        <div className="w-16"></div>
      </div>

      <form onSubmit={handleUpdateRoute} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* 左カラム */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div>
            <label className="text-xs font-black text-slate-500 mb-2 block uppercase tracking-wider">ルートの題名（必須）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black border transition-all active:scale-[0.98] shadow-3xs ${
                  isPublic 
                    ? 'bg-green-50 border-green-300 text-green-700 font-extrabold' 
                    : 'bg-white border-gray-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {isPublic ? <Globe size={16} strokeWidth={2.5} /> : <Lock size={16} strokeWidth={2.5} />}
                {isPublic ? '全体に公開する' : '非公開にする'}
              </button>
            </div>
          </div>

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
        </div>

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
            
            {/* 💡 修正：使用中から追加ボタンの背景・枠線緑色をインラインで絶対防御 */}
            <button
              type="button"
              onClick={() => openBooksModal('status')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 border text-emerald-800 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-3xs"
              style={{ backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }}
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
                        {/* 💡 修正：インラインスタイルで王道の青背景（#2563eb）サークルを絶対保護 */}
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
                   /* 🟡 パターンB：特殊コマンドブロック */
                   <div className="w-full bg-slate-100 border border-gray-200 p-3.5 rounded-2xl space-y-3 shadow-3xs relative group/block" style={{ backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }}>
                      
                   <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 gap-2" style={{ borderColor: '#e2e8f0' }}>
                     <div className="flex items-center gap-1 flex-1 min-w-0">
                       {/* 💡 修正：サークルの色を一本道と完全に同じ王道の青背景（#2563eb）に統一してバグを回避 */}
                       <span className="w-5 h-5 rounded-md text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs relative z-10" style={{ backgroundColor: '#2563eb' }}>
                         {index + 1}
                       </span>
                       <input
                         type="text"
                         value={item.title}
                         onChange={(e) => handleUpdateBlockTitle(index, 'title', e.target.value)}
                         className="bg-transparent font-black text-xs border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full py-0.5 truncate"
                         style={{ color: '#1e293b' }}
                       />
                     </div>
                     <div className="flex items-center gap-0.5 shrink-0 bg-white border border-gray-200 p-0.5 rounded-lg shadow-3xs" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                       <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="px-1.5 py-0.5 text-slate-500 hover:text-blue-600 disabled:opacity-20 text-[10px] font-black">▲</button>
                       <button type="button" onClick={() => moveDown(index)} disabled={index === selectedBooks.length - 1} className="px-1.5 py-0.5 text-slate-500 hover:text-blue-600 disabled:opacity-20 text-[10px] font-black">▼</button>
                       <button type="button" onClick={() => handleRemoveBook(index, undefined, 'main')} className="p-1 text-slate-400 hover:text-red-500 rounded ml-0.5"><Trash2 size={13} /></button>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-2.5 items-start">
                     
                     {/* 左側の箱 (A) */}
                     <div className="bg-white p-2 rounded-xl border border-gray-200 space-y-2 min-h-[90px] flex flex-col justify-between shadow-3xs" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                       <input
                         type="text"
                         value={item.label_A === undefined ? (item.type === 'branch' ? '選択 A' : '並行 A') : item.label_A}
                         onChange={(e) => handleUpdateBlockTitle(index, 'label_A', e.target.value)}
                         onBlur={() => {
                           if (!item.label_A || !item.label_A.trim()) {
                             handleUpdateBlockTitle(index, 'label_A', item.type === 'branch' ? '選択 A' : '並行 A');
                           }
                         }}
                         className="text-[9px] font-black tracking-wider uppercase text-center block border-b border-gray-100 pb-0.5 bg-transparent focus:outline-none focus:text-blue-600 focus:border-blue-300 w-full"
                         style={{ color: '#2563eb', borderBottomColor: '#f1f5f9' }}
                       />
                       <div className="space-y-1 flex-1 py-1">
                         {(item.route_A || []).map((subBook: any, subIdx: number) => (
                           <div key={subIdx} className="flex items-center gap-1 p-1.5 bg-slate-50 border border-gray-200 rounded-lg relative group/sub w-full" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
                             {subBook.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? (
                               <input
                                 type="text"
                                 value={subBook.custom_title === undefined ? 'カスタム参考書' : subBook.custom_title}
                                 onChange={(e) => handleUpdateCustomBookTitle(index, 'A', e.target.value, subIdx)}
                                 className="bg-transparent font-extrabold text-[10px] text-blue-600 border-b border-dashed border-blue-400 focus:border-blue-500 focus:outline-none flex-1 py-0 px-0.5"
                               />
                             ) : (
                               <span className="text-[10px] font-extrabold truncate flex-1 pl-0.5" style={{ color: '#1e293b' }}>{subBook.title}</span>
                             )}
                             <button type="button" onClick={() => handleRemoveBook(index, subIdx, 'A')} className="text-slate-400 hover:text-red-500 p-0.5 shrink-0"><Trash2 size={11} /></button>
                           </div>
                         ))}
                       </div>
                       
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
                     <div className="bg-white p-2 rounded-xl border border-gray-200 space-y-2 min-h-[90px] flex flex-col justify-between shadow-3xs" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                       <input
                         type="text"
                         value={item.label_B === undefined ? (item.type === 'branch' ? '選択 B' : '並行 B') : item.label_B}
                         onChange={(e) => handleUpdateBlockTitle(index, 'label_B', e.target.value)}
                         onBlur={() => {
                           if (!item.label_B || !item.label_B.trim()) {
                             handleUpdateBlockTitle(index, 'label_B', item.type === 'branch' ? '選択 B' : '並行 B');
                           }
                         }}
                         /* 💡 修正：B側の文字色も、正常に見えるA側と「完全に同じ色（#2563eb）」に統一指定 */
                         className="text-[9px] font-black tracking-wider uppercase text-center block border-b border-gray-100 pb-0.5 bg-transparent focus:outline-none focus:text-blue-600 focus:border-blue-300 w-full"
                         style={{ color: '#2563eb', borderBottomColor: '#f1f5f9' }}
                       />
                       <div className="space-y-1 flex-1 py-1">
                       {(item.route_B || []).map((subBook: any, subIdx: number) => (
                           <div key={subIdx} className="flex items-center gap-1 p-1.5 bg-slate-50 border border-gray-200 rounded-lg relative group/sub w-full" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
                             {subBook.id === "b2531a01-d6ea-47ad-ae84-3fac68cf3c81" ? (
                               <input
                                 type="text"
                                 value={subBook.custom_title === undefined ? 'カスタム参考書' : subBook.custom_title}
                                 onChange={(e) => handleUpdateCustomBookTitle(index, 'B', e.target.value, subIdx)}
                                 className="bg-transparent font-extrabold text-[10px] text-blue-600 border-b border-dashed border-blue-400 focus:border-blue-500 focus:outline-none flex-1 py-0 px-0.5"
                               />
                             ) : (
                               <span className="text-[10px] font-extrabold truncate flex-1 pl-0.5" style={{ color: '#1e293b' }}>{subBook.title}</span>
                             )}
                             <button type="button" onClick={() => handleRemoveBook(index, subIdx, 'B')} className="text-slate-400 hover:text-red-500 p-0.5 shrink-0"><Trash2 size={11} /></button>
                           </div>
                         ))}
                       </div>
                       
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

                  {/* 矢印 */}
                  {index < selectedBooks.length - 1 && (
                    <div className="my-1.5 text-blue-500/80 animate-pulse">
                      <ArrowDown size={14} className="stroke-[2.5]" />
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

          {/* 💡 修正：背景色と枠線色を確実なカラーコード（黄・緑）で直書き指定 */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleAddSpecialBlock('branch')}
              className="flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-black text-amber-800 border transition-all active:scale-95 cursor-pointer shadow-3xs"
              style={{ backgroundColor: '#fef3c7', borderColor: '#fde68a' }}
            >
              <Plus size={12} strokeWidth={2.5} /> 分岐ルートを挿入
            </button>
            <button
              type="button"
              onClick={() => handleAddSpecialBlock('parallel')}
              className="flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-black text-emerald-800 border transition-all active:scale-95 cursor-pointer shadow-3xs"
              style={{ backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }}
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