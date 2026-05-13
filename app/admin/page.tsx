"use client";

import { useState } from 'react';

export default function AdminPage() {
  const [keyword, setKeyword] = useState('');
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rawJson, setRawJson] = useState<string>(''); // デバッグ用の生データ表示用

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setRawJson('');
    
    try {
      const res = await fetch(`/api/search-rakuten?keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      
      // 取得したJSONをそのまま文字列にして保存（これで何が返ったか100%わかります）
      setRawJson(JSON.stringify(data, null, 2));

      if (data.Items && data.Items.length > 0) {
        setBooks(data.Items);
      } else {
        setBooks([]);
      }
    } catch (e) {
      setRawJson('通信エラーが発生しました');
    }
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto bg-white min-h-screen text-black">
      <h1 className="text-xl font-bold mb-4">書籍検索（最終テスト）</h1>
      <div className="flex gap-2 mb-4 p-4 border border-black rounded-lg">
        <input 
          type="text" value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="ターゲット" className="flex-1 outline-none text-black bg-white"
        />
        <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded font-bold">検索</button>
      </div>

      {/* 1. APIからの生データを表示（ここを見れば原因が即座にわかります） */}
      <div className="mb-8 p-4 bg-gray-100 rounded text-[10px] overflow-auto max-h-40">
        <p className="font-bold mb-1 border-b">API応答ログ（デバッグ用）:</p>
        <pre>{rawJson || 'まだデータはありません'}</pre>
      </div>

      {/* 2. 検索結果リスト */}
      <div className="flex flex-col gap-4">
        {books.map((item, index) => (
          <div key={index} className="flex gap-4 p-4 border-b">
            <img src={item.Item.largeImageUrl} className="w-24 h-auto" />
            <div>
              <p className="font-bold text-black">{item.Item.title}</p>
              <p className="text-sm text-gray-700">著者: {item.Item.author}<br/>出版社: {item.Item.publisherName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}