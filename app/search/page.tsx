"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Pencil, Bookmark, School, Crown, Filter, ChevronRight, Search } from 'lucide-react';

const SUBJECT_DATA = {
  '英語': ['英単語', '英熟語', '英文法', '長文', 'その他'],
  '数学': ['数IA', '数IIB', '数IIIC', 'その他'],
  '国語': ['現代文', '古文', '漢文', 'その他'],
  '理科': ['物理', '化学', '生物', '地学'],
  '社会': ['日本史', '世界史', '地理', '政経']
};

export default function SearchPage() {
  const router = useRouter();
  const [step, setStep] = useState('menu');
  const [publishers, setPublishers] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [pubSearch, setPubSearch] = useState('');
  const [selected, setSelected] = useState<{ type: string, value: string } | null>(null);

  useEffect(() => {
    const fetchPubs = async () => {
      const { data } = await supabase.from('books').select('publisher');
      if (data) {
        const unique = Array.from(new Set(data.map(b => b.publisher))).filter(Boolean);
        setPublishers(unique.sort() as string[]);
      }
    };
    fetchPubs();
  }, []);

  const onSearch = (filters: any) => {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.category) params.append('category', filters.category);
    if (filters.publisher) params.append('publisher', filters.publisher);
    router.push(`/books?${params.toString()}`);
  };

  return (
    <div>
      {step === 'menu' && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <MenuCard icon={<Pencil className="text-orange-500" />} title="教科" onClick={() => setStep('subject')} />
          <MenuCard icon={<Bookmark className="text-green-500" />} title="出版社" onClick={() => setStep('publisher')} />
          <MenuCard icon={<School className="text-blue-500" />} title="志望校" onClick={() => {}} />
          <MenuCard icon={<Crown className="text-yellow-500" />} title="ランキング" onClick={() => {}} />
        </div>
      )}

      {step === 'subject' && (
        <div className="space-y-4 pb-24">
          <button onClick={() => setStep('menu')} className="text-sm text-blue-600">← 戻る</button>
          {Object.entries(SUBJECT_DATA).map(([sub, cats]) => (
            <div key={sub} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <label className="flex items-center cursor-pointer flex-1">
                  <input type="radio" name="target" checked={selected?.value === sub} onChange={() => setSelected({ type: 'subject', value: sub })} className="w-5 h-5 mr-3" />
                  <span className="font-bold">{sub}</span>
                </label>
                <button onClick={() => setExpanded(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub])} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">絞り込む</button>
              </div>
              {expanded.includes(sub) && (
                <div className="bg-gray-50 p-4 grid grid-cols-2 gap-3 border-t">
                  {cats.map(cat => (
                    <label key={cat} className="flex items-center cursor-pointer">
                      <input type="radio" name="target" checked={selected?.value === cat} onChange={() => setSelected({ type: 'category', value: cat })} className="w-4 h-4 mr-2" />
                      <span className="text-sm text-gray-600">{cat}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="fixed bottom-20 left-0 right-0 p-4 bg-white/80 border-t md:left-20 md:bottom-0">
            <button onClick={() => selected && onSearch(selected.type === 'subject' ? { subject: selected.value } : { category: selected.value })} disabled={!selected} className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 disabled:bg-gray-300">検索する</button>
          </div>
        </div>
      )}

      {step === 'publisher' && (
        <div className="space-y-4">
          <button onClick={() => setStep('menu')} className="text-sm text-blue-600">← 戻る</button>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input type="text" placeholder="出版社名を入力" value={pubSearch} onChange={e => setPubSearch(e.target.value)} className="w-full py-3 pl-10 pr-4 rounded-xl border border-gray-200" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {publishers.filter(p => p.includes(pubSearch)).map(p => (
              <button key={p} onClick={() => onSearch({ publisher: p })} className="w-full text-left p-4 border-b flex justify-between items-center hover:bg-gray-50">
                <span>{p}</span><ChevronRight size={20} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuCard({ icon, title, onClick }: any) {
  return (
    <button onClick={onClick} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 active:scale-95 transition-transform">
      <div className="p-3 bg-gray-50 rounded-2xl">{icon}</div>
      <span className="font-bold text-gray-700">{title}</span>
    </button>
  );
}