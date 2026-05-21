"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Calendar } from 'lucide-react';

export default function AnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const announcementId = params.id as string;

  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', announcementId)
        .single();

      if (error) {
        console.error("詳細取得エラー:", error);
      } else if (data) {
        setAnnouncement(data);
      }
      setLoading(false);
    };

    if (announcementId) fetchDetail();
  }, [announcementId]);

  if (loading) return <div className="text-center py-20 text-gray-400 font-bold animate-pulse text-sm">お知らせを読み込み中...</div>;
  if (!announcement) return <div className="text-center py-20 text-gray-500 font-bold text-sm">お知らせが見つかりませんでした。</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white min-h-screen pb-24 rounded-3xl shadow-md border border-gray-100 mt-4">
      <button 
        onClick={() => router.back()} 
        className="text-sm text-blue-600 flex items-center mb-6 font-bold bg-gray-50 border border-gray-100 shadow-2xs px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors w-max"
      >
        <ChevronLeft size={16} /> 戻る
      </button>

      {/* お知らせヘッダーエリア */}
      <div className="border-b border-gray-100 pb-5 mb-6 space-y-2">
        <div className="flex items-center gap-1 text-gray-400 text-xs font-bold bg-gray-50 w-max px-2.5 py-1 rounded-md">
          <Calendar size={13} className="text-gray-400" />
          <span>{new Date(announcement.created_at).toLocaleString('ja-JP')}</span>
        </div>
        <h1 className="font-black text-xl md:text-2xl text-gray-900 leading-snug">
          {announcement.title}
        </h1>
      </div>

      {/* お知らせ本文エリア */}
      <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-100/70 shadow-2xs">
        <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
          {announcement.content}
        </p>
      </div>
    </div>
  );
}