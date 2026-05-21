"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';

export default function AnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("全お知らせ取得エラー:", error);
      } else if (data) {
        setAnnouncements(data);
      }
      setLoading(false);
    };

    fetchAllAnnouncements();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 min-h-screen pb-24 rounded-3xl shadow-sm border border-gray-100 mt-4 space-y-6">
      <button 
        onClick={() => router.back()} 
        className="text-sm text-blue-600 flex items-center font-bold bg-white border border-gray-100 shadow-2xs px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors w-max"
      >
        <ChevronLeft size={16} /> ホームへ戻る
      </button>

      <div className="flex items-center gap-2 px-1">
        <div className="bg-amber-100 p-2 rounded-xl shadow-2xs">
          <Megaphone size={18} className="text-amber-600" />
        </div>
        <h1 className="font-black text-gray-800 text-xl">お知らせ一覧</h1>
      </div>

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16 bg-white rounded-2xl border shadow-2xs font-bold">
          現在、公開中のお知らせはありません。
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {announcements.map((announcement) => (
            <Link 
              href={`/announcements/${announcement.id}`}
              key={announcement.id} 
              className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs hover:border-blue-400 transition-all group"
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] text-gray-400 font-bold mb-1">
                  {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
                </p>
                <h4 className="font-extrabold text-sm text-gray-700 leading-tight truncate group-hover:text-blue-600 transition-colors">
                  {announcement.title}
                </h4>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}