"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Route, User } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname?.startsWith(path);
    // 💡 スマホ時の幅を w-12 (48px) に設定。11だとパツパツ、14だと見切れるため、12が最も「程よく収まる」黄金比です
    return `flex flex-col items-center justify-center pt-1 pb-0.5 w-12 sm:w-16 transition-all active:scale-90 shrink-0 ${
      isActive ? 'text-blue-600 font-black' : 'text-slate-700 hover:text-slate-900 font-bold'
    }`;
  };

  return (
    /* 💡 justify-between（左右振り分け）に戻し、左右のパディングを px-3 にして画面端の窮屈感を解消 */
    <header className="sticky top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 py-2 sm:p-3 flex items-center justify-between shadow-xs">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-1">
        
        {/* 左側：ロゴとアイコン画像（小さすぎず、見切れない程よいサイズ） */}
        <Link href="/" className="flex items-center gap-1.5 active:scale-95 transition-transform shrink-0">
          {/* ファビコン画像を w-5.5 (22px) のちょうどいい存在感に調整 */}
          <div className="w-[22px] h-[22px] shrink-0 flex items-center justify-center overflow-hidden">
            <img 
              src="/favicon.ico" 
              alt="Icon" 
              className="w-full h-full object-contain"
            />
          </div>
          {/* タイトル文字を text-[15px] に。16pxだと見切れ、14pxだと小さすぎたため、中間のベストサイズに固定 */}
          <h1 className="text-[15px] sm:text-xl font-black text-slate-900 tracking-tighter shrink-0">
            参考書<span className="text-black">ドットコム</span>
          </h1>
        </Link>

        {/* 右側：ナビゲーションメニュー（右詰めのまま、等間隔をキープ） */}
        {/* 💡 gap-0 にすることで、アイコン同士の間隔が w-12 の枠線の中で1ミリも狂わず美しく均等に並びます */}
        <nav className="flex items-center gap-0 shrink-0 select-none">
          
          <Link href="/" className={getLinkClass('/', true)}>
            {/* アイコンサイズを 22 にし、中央ラインより少しだけ下げて浮き気味だったのを綺麗に補正 */}
            <Home size={22} className="sm:w-[26px] sm:h-[26px]" />
            <span className="text-[9px] sm:text-xs mt-0.5 tracking-tighter">ホーム</span>
          </Link>

          {/* 縦の仕切り線（高さを少し抑えて、より自然な区切りに） */}
          <div className="w-[1px] h-4 bg-gray-200/80 self-center shrink-0" />

          <Link href="/search" className={getLinkClass('/search')}>
            <Search size={22} className="sm:w-[26px] sm:h-[26px]" />
            <span className="text-[9px] sm:text-xs mt-0.5 tracking-tighter">検索</span>
          </Link>

          <div className="w-[1px] h-4 bg-gray-200/80 self-center shrink-0" />

          <Link href="/learning-data" className={getLinkClass('/learning-data')}>
            <Route size={22} className="sm:w-[26px] sm:h-[26px]" />
            <span className="text-[9px] sm:text-xs mt-0.5 tracking-tighter">ルート</span>
          </Link>

          <div className="w-[1px] h-4 bg-gray-200/80 self-center shrink-0" />

          <Link href="/mypage" className={getLinkClass('/mypage')}>
            <User size={22} className="sm:w-[26px] sm:h-[26px]" />
            <span className="text-[9px] sm:text-xs mt-0.5 tracking-tighter">マイページ</span>
          </Link>

        </nav>

      </div>
    </header>
  );
}