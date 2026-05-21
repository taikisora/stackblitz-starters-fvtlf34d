"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { Megaphone, Search, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      // ────────────────────────────────────────────────────────
      // 📢 お知らせデータの取得（検問はすべて撤廃しました！）
      // ────────────────────────────────────────────────────────
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
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* ヒーローセクション */}
      <div className="bg-white px-4 pt-12 pb-8 border-b border-gray-200 mb-6 shadow-sm">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2 tracking-tight">Welcome!</h2>
          <p className="text-sm text-gray-500 font-medium">参考書を見つけよう</p>
          
          <Link 
            href="/books" 
            className="mt-6 inline-flex items-center justify-center gap-2 w-full max-w-[240px] bg-blue-600 text-white font-bold text-sm py-3 rounded-full shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Search size={16} />
            参考書を探す
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-6">
        
        {/* お知らせ（掲示板）セクション */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="bg-amber-100 p-1.5 rounded-lg shadow-xs">
              <Megaphone size={16} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm">運営からのお知らせ</h3>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-14 bg-gray-200 rounded-xl"></div>
              <div className="h-14 bg-gray-200 rounded-xl"></div>
              <div className="h-14 bg-gray-200 rounded-xl"></div>
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 bg-white rounded-xl border border-gray-100 shadow-sm">
              現在、お知らせはありません。
            </p>
          ) : (
            <div className="space-y-2">
              {announcements.map((announcement) => (
                <Link 
                  href={`/announcements/${announcement.id}`}
                  key={announcement.id} 
                  className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs hover:border-blue-300 transition-colors group"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[9px] text-gray-400 font-bold mb-0.5">
                      {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
                    </p>
                    <h4 className="font-bold text-xs text-gray-700 leading-tight truncate group-hover:text-blue-600 transition-colors">
                      {announcement.title}
                    </h4>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                </Link>
              ))}

              <Link
                href="/announcements"
                className="block text-center text-xs font-bold text-blue-600 hover:text-blue-700 py-3 bg-white rounded-xl border border-dashed border-gray-200 shadow-2xs hover:bg-gray-50 transition-colors mt-2"
              >
                過去のお知らせをすべて見る
              </Link>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}