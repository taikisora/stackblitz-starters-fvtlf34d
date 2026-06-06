"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Route, User, MessagesSquare } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname?.startsWith(path);
    // 💡 修正：スマホ時の横幅を w-12 から w-11 にして全体をキュッと引き締めました
    return `flex flex-col items-center justify-center pt-1 pb-0.5 w-11 sm:w-16 transition-all active:scale-90 shrink-0 ${
      isActive ? 'text-blue-600 font-black' : 'text-slate-700 hover:text-slate-900 font-bold'
    }`;
  };

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 py-2 sm:p-3 flex items-center justify-between shadow-xs">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-1">
        
        {/* 左側：ロゴとアイコン画像 */}
        <Link href="/" className="flex items-center gap-1.5 active:scale-95 transition-transform shrink-0">
          <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center overflow-hidden">
            <img 
              src="/favicon.ico" 
              alt="Icon" 
              width="20"
              height="20"
              className="object-contain"
            />
          </div>

          {/* 💡 修正：スマホ時の文字サイズを 15px から 13px(text-[13px]) に少しだけスリムに */}
          <h1 className="text-[13px] sm:text-xl font-black text-slate-900 tracking-tighter shrink-0">
            参考書<span className="text-black">ドットコム</span>
          </h1>
        </Link>

        {/* 右側：ナビゲーションメニュー */}
        <nav className="flex items-center gap-0 shrink-0 select-none">
          
          <Link href="/" className={getLinkClass('/', true)}>
            {/* 💡 修正：アイコンサイズを 22 から 19 へ一回りコンパクトに */}
            <Home size={19} className="sm:w-[26px] sm:h-[26px]" />
            {/* 💡 修正：文字サイズを 9px から 8px(text-[8px]) に微調整 */}
            <span className="text-[8px] sm:text-xs mt-0.5 tracking-tighter">ホーム</span>
          </Link>

          <div className="w-[1px] h-3.5 bg-gray-200/80 self-center shrink-0" />

          <Link href="/search" className={getLinkClass('/search')}>
            <Search size={19} className="sm:w-[26px] sm:h-[26px]" />
            <span className="text-[8px] sm:text-xs mt-0.5 tracking-tighter">検索</span>
          </Link>

          <div className="w-[1px] h-3.5 bg-gray-200/80 self-center shrink-0" />

          <Link href="/community" className={getLinkClass('/community')}>
            <MessagesSquare size={19} className="sm:w-[26px] sm:h-[26px]" />
            <span className="text-[8px] sm:text-xs mt-0.5 tracking-tighter">掲示板</span>
          </Link>

          <div className="w-[1px] h-3.5 bg-gray-200/80 self-center shrink-0" />

          <Link href="/learning-data" className={getLinkClass('/learning-data')}>
            <Route size={19} className="sm:w-[26px] sm:h-[26px]" />
            <span className="text-[8px] sm:text-xs mt-0.5 tracking-tighter">ルート</span>
          </Link>

          <div className="w-[1px] h-3.5 bg-gray-200/80 self-center shrink-0" />

          <Link href="/mypage" className={getLinkClass('/mypage')}>
            <User size={19} className="sm:w-[26px] sm:h-[26px]" />
            <span className="text-[8px] sm:text-xs mt-0.5 tracking-tighter">マイページ</span>
          </Link>

        </nav>

      </div>
    </header>
  );
}