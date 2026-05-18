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
      // 過去のお知らせを全件、最新順で取得
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
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-24">
      {/* 戻るボタン */}
      <button 
        onClick={() => router.back()} 
        className="text-sm text-blue-600 flex items-center mb-4 font-bold hover:opacity-75"
      >
        <ChevronLeft size={16} /> ホームへ戻る
      </button>

      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="bg-amber-100 p-1.5 rounded-lg">
          <Megaphone size={16} className="text-amber-600" />
        </div>
        <h1 className="font-extrabold text-gray-800 text-lg">お知らせ一覧</h1>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-12 bg-white rounded-xl border shadow-sm">
          お知らせはありません。
        </p>
      ) : (
        <div className="space-y-2">
          {announcements.map((announcement) => (
            <Link 
              href={`/announcements/${announcement.id}`}
              key={announcement.id} 
              className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-xs hover:border-blue-300 transition-all group"
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] text-gray-400 font-bold mb-0.5">
                  {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
                </p>
                <h4 className="font-bold text-sm text-gray-700 leading-tight truncate group-hover:text-blue-600">
                  {announcement.title}
                </h4>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}