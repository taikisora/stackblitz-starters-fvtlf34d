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
      // URLにあるIDを使って、特定のお知らせ1件を狙い撃ちで取得
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
      loading && setLoading(false);
    };

    if (announcementId) fetchDetail();
  }, [announcementId]);

  if (loading) return <p className="text-center py-20 text-gray-500 font-bold animate-pulse">読み込み中...</p>;
  if (!announcement) return <p className="text-center py-20 text-gray-500 font-bold">お知らせが見つかりませんでした。</p>;

  return (
    <div className="max-w-6xl mx-auto my-6 px-4 space-y-6 pb-20 min-h-screen">
      {/* 戻るボタン */}
      <button 
        onClick={() => router.back()} 
        className="text-sm text-blue-600 flex items-center mb-5 font-bold hover:opacity-75"
      >
        <ChevronLeft size={16} /> 戻る
      </button>

      {/* お知らせヘッダーエリア */}
      <div className="border-b border-gray-100 pb-4 mb-5">
        <div className="flex items-center gap-1 text-gray-400 text-[11px] font-bold mb-2">
          <Calendar size={12} />
          <span>{new Date(announcement.created_at).toLocaleString('ja-JP')}</span>
        </div>
        <h1 className="font-extrabold text-lg text-gray-900 leading-snug">
          {announcement.title}
        </h1>
      </div>

      {/* お知らせ本文エリア */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100/70">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
          {announcement.content}
        </p>
      </div>
    </div>
  );
}