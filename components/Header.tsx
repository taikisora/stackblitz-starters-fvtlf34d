"use client";

import Link from 'next/link';
import { Search, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-100 shadow-3xs">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* 左側：ロゴとアイコン画像 */}
        <Link href="/" className="flex items-center gap-2 active:scale-95 transition-transform">
          {/* ローカルのfavicon.pngをそのままimgタグで表示 */}
          <div className="w-6 h-6 shrink-0 flex items-center justify-center overflow-hidden">
            <img 
              src="/favicon.ico" 
              alt="Icon" 
              className="w-full h-full object-contain"
            />
          </div>
          
          <h1 className="text-xl font-black text-slate-900 tracking-tighter">
            参考書<span className="text-black">ドットコム</span>
          </h1>
        </Link>

        {/* 右側：検索 ＆ マイページアイコン */}
        <div className="flex items-center gap-1">
          <Link href="/search" className="p-2 text-slate-500 hover:bg-gray-50 rounded-full transition-colors">
            <Search size={20} />
          </Link>
          <Link href="/mypage" className="p-2 text-slate-500 hover:bg-gray-50 rounded-full transition-colors">
            <User size={20} />
          </Link>
        </div>

      </div>
    </header>
  );
}