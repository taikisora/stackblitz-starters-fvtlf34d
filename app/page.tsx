"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Megaphone, Search } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error("お知らせ取得エラー:", error);
      } else if (data) {
        setAnnouncements(data);
      }
      setLoading(false);
    };

    fetchAnnouncements();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4">
      
      {/* 🔮 ヒーローセクション */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-8 shadow-md text-center relative overflow-hidden mb-8">
        <div className="relative z-10 max-w-md mx-auto space-y-3">
          <h2 className="text-4xl font-black tracking-tight">参考書ドットコム</h2>
          <p className="text-sm text-blue-100 font-medium">
            大学受験の参考書学習をサポートするアプリ
          </p>
          <div className="pt-4">
            {/* 💡 Linkコンポーネントを完全に廃止し、router.pushへ切り替え */}
            <button 
              onClick={() => router.push('/search')}
              className="inline-flex items-center justify-center gap-2 w-full max-w-[260px] bg-white text-blue-600 font-extrabold text-base py-3.5 rounded-2xl shadow-md hover:bg-blue-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Search size={18} className="stroke-[2.5]" />
              参考書を今すぐ探す
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 📢 お知らせ（掲示板）セクション */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 p-2 rounded-xl shadow-2xs">
                <Megaphone size={18} className="text-amber-600" />
              </div>
              <h3 className="font-extrabold text-gray-800 text-base">運営からのお知らせ</h3>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 bg-gray-100 rounded-2xl"></div>
              <div className="h-16 bg-gray-100 rounded-2xl"></div>
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10 font-bold">
              現在、お知らせはありません。
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {announcements.map((announcement) => (
                  <button 
                    onClick={() => router.push(`/announcements/${announcement.id}`)}
                    key={announcement.id} 
                    className="w-full flex justify-between items-center bg-gray-50/60 p-4 rounded-2xl border border-gray-100 shadow-2xs hover:border-blue-400 hover:bg-white transition-all group text-left"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-[10px] text-gray-400 font-bold mb-1">
                        {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
                      </p>
                      <h4 className="font-bold text-sm text-gray-700 leading-tight truncate group-hover:text-blue-600 transition-colors">
                        {announcement.title}
                      </h4>
                    </div>
                    <span className="text-gray-300 group-hover:text-blue-500 transition-colors font-bold shrink-0 pl-2 text-sm">➔</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => router.push('/announcements')}
                className="w-full block text-center text-xs font-bold text-blue-600 hover:text-blue-700 py-3.5 bg-gray-50/30 rounded-2xl border border-dashed border-gray-200 hover:bg-white transition-all mt-4"
              >
                過去のお知らせをすべて見る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}