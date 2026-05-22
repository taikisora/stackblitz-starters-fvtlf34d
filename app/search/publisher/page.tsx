"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Search } from 'lucide-react';

export default function PublisherSearchPage() {
  const router = useRouter();
  const [publishers, setPublishers] = useState<string[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublishers = async () => {
      const { data } = await supabase.from('books').select('publisher');
      if (data) {
        const allPublishers = data.map(book => book.publisher);
        const uniquePublishers = Array.from(new Set(allPublishers)).filter(Boolean);
        uniquePublishers.sort((a, b) => a.localeCompare(b, 'ja'));
        setPublishers(uniquePublishers as string[]);
      }
      setLoading(false);
    };
    fetchPublishers();
  }, []);

  const executePublisherSearch = () => {
    const params = new URLSearchParams();
    params.append('target', 'publisher');
    if (selectedPublishers.length > 0) params.append('publishers', selectedPublishers.join(','));
    router.push(`/books?${params.toString()}`);
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">出版社を読み込み中...</div>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/search')} className="flex items-center text-blue-600 font-bold active:scale-95 transition-transform text-sm">
            <ChevronLeft size={18} /> 検索メニューへ
          </button>
          <h2 className="text-lg font-bold text-gray-800">出版社から探す</h2>
          <div className="w-16"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {publishers.map(pub => {
            const isSelected = selectedPublishers.includes(pub);
            return (
              <button 
                key={pub} 
                type="button"
                onClick={() => setSelectedPublishers(prev => isSelected ? prev.filter(p => p !== pub) : [...prev, pub])} 
                className={`p-4 rounded-xl shadow-sm border font-bold text-sm text-center transition-colors active:scale-95
                  ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'}`}
              >
                {pub}
              </button>
            );
          })}
        </div>

        <button
          onClick={executePublisherSearch}
          className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Search size={20} />
          {selectedPublishers.length > 0 ? 'この条件で検索する' : 'すべての出版社を検索'}
        </button>
      </div>
    </div>
  );
}