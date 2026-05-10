"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// あなたの情報をここに入れる
const SUPABASE_URL = 'https://gftwcfexduvwgvffigbg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MbxXHpGc62c9GY8pZWWmcQ_L1OkZhkf';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function BookSearch() {
  const [books, setBooks] = useState<any[]>([]);
  const [filterApp, setFilterApp] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      let query = supabase.from('books').select('*');
      
      if (filterApp) {
        query = query.eq('has_app', true);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error("エラーだよ:", error);
      } else {
        setBooks(data || []);
      }
      setLoading(false);
    }
    fetchBooks();
  }, [filterApp]);

  return (
    <div className="p-8 bg-gray-50 min-h-screen text-gray-800">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900">大学受験 参考書サーチ</h1>
        <p className="text-gray-600 mt-2">あなたにぴったりの一冊を見つけよう</p>
      </header>
      
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 bg-white p-6 rounded-2xl shadow-md h-fit border border-gray-100">
          <h2 className="font-bold text-lg mb-4 border-b pb-2">絞り込み</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={filterApp} 
                onChange={(e) => setFilterApp(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="group-hover:text-blue-600 transition">📱 アプリあり限定</span>
            </label>
          </div>
        </aside>

        <main className="flex-1">
          {loading ? (
            <div className="text-center py-20 text-gray-500 text-lg">データを読み込み中...</div>
          ) : books.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-lg bg-white rounded-2xl shadow-inner">該当する参考書が見つかりませんでした。</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <div key={book.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                        book.level_tag === '難関' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {book.level_tag}
                      </span>
                    </div>
                    <h3 className="font-bold text-xl mb-1 text-gray-900">{book.title}</h3>
                    <p className="text-gray-400 text-sm mb-4 italic">{book.publisher}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-50">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Vocabulary</span>
                        <span className="font-mono font-bold text-gray-700">{book.vocabulary_count} <small className="font-normal text-xs text-gray-400">語</small></span>
                      </div>
                      {book.has_app && (
                        <div className="bg-blue-50 p-2 rounded-lg" title="アプリ対応">
                          <span className="text-xl">📱</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}