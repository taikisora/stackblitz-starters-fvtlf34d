"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Route, User } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  // 現在のページがアクティブかどうかでスタイルを切り替える補助関数
  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname?.startsWith(path);
    // 💡 非アクティブ時の文字色を slate-700 に濃くし、w-14 md:w-16 で各ボタンの幅を完全一定に統一
    return `flex flex-col items-center justify-center pt-1.5 pb-1 w-14 md:w-16 transition-all active:scale-90 ${
      isActive ? 'text-blue-600 font-black' : 'text-slate-700 hover:text-slate-900 font-bold'
    }`;
  };

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 p-3 flex items-center justify-between shadow-xs">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-2">
        
        {/* 左側：ロゴとアイコン画像 */}
        <Link href="/" className="flex items-center gap-2 active:scale-95 transition-transform shrink-0">
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

        {/* 右側：ナビゲーションメニュー（縦仕切り＆均等幅＆中央重心化） */}
        {/* 💡 items-stretch で子要素（仕切り線）の高さを揃え、中心軸のズレを綺麗に補正 */}
        <nav className="flex items-center gap-0.5 sm:gap-1 shrink-0 select-none">
          
          <Link href="/" className={getLinkClass('/', true)}>
            <Home size={26} />
            <span className="text-[10px] md:text-xs mt-0.5 tracking-tighter">ホーム</span>
          </Link>

          {/* 💡 薄い縦の仕切り線（ボーダー） */}
          <div className="w-[1px] h-6 bg-gray-200/80 self-center mx-0.5" />

          <Link href="/search" className={getLinkClass('/search')}>
            <Search size={26} />
            <span className="text-[10px] md:text-xs mt-0.5 tracking-tighter">検索</span>
          </Link>

          <div className="w-[1px] h-6 bg-gray-200/80 self-center mx-0.5" />

          <Link href="/learning-data" className={getLinkClass('/learning-data')}>
            <Route size={26} />
            {/* 💡 旧タブバーの仕様に合わせて「ルート」に変更し、4つとも完全な等幅に統一 */}
            <span className="text-[10px] md:text-xs mt-0.5 tracking-tighter">ルート</span>
          </Link>

          <div className="w-[1px] h-6 bg-gray-200/80 self-center mx-0.5" />

          <Link href="/mypage" className={getLinkClass('/mypage')}>
            <User size={26} />
            <span className="text-[10px] md:text-xs mt-0.5 tracking-tighter">マイページ</span>
          </Link>

        </nav>

      </div>
    </header>
  );
}