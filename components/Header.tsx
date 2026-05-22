"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Route, User } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname?.startsWith(path);
    // 💡 スマホの横幅に合わせて、最も「程よく収まる」黄金比(w-12)を確実にキープ
    return `flex flex-col items-center justify-center pt-1 pb-0.5 w-12 sm:w-16 transition-all active:scale-90 shrink-0 ${
      isActive ? 'text-blue-600 font-black' : 'text-slate-700 hover:text-slate-900 font-bold'
    }`;
  };

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 py-2 sm:p-3 flex items-center justify-between shadow-xs">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-1">
        
        {/* 左側：ロゴとアイコン画像（大画面での暴走を完全阻止） */}
        <Link href="/" className="flex items-center gap-1.5 active:scale-95 transition-transform shrink-0">
          
          {/* 💡 修正の核心：Tailwindの w-xx ではなく、直接HTML属性として width="24" height="24" を強制付与！
              これでPC大画面だろうがスマホだろうが、絶対に24pxの可愛いサイズから1ミリも動かなくなります */}
          <div className="w-6 h-6 shrink-0 flex items-center justify-center overflow-hidden">
            <img 
              src="/favicon.ico" 
              alt="Icon" 
              width="24"
              height="24"
              className="object-contain"
            />
          </div>

          {/* タイトル文字は、スマホで見切れず小さすぎないベストサイズ[15px]を維持 */}
          <h1 className="text-[15px] sm:text-xl font-black text-slate-900 tracking-tighter shrink-0">
            参考書<span className="text-black">ドットコム</span>
          </h1>
        </Link>

        {/* 右側：ナビゲーションメニュー（右詰め・等間隔キープ） */}
        <nav className="flex items-center gap-0 shrink-0 select-none">
          
          <Link href="/" className={getLinkClass('/', true)}>
            <Home size={22} className="sm:w-[26px] sm:h-[26px]" />
            <span className="text-[9px] sm:text-xs mt-0.5 tracking-tighter">ホーム</span>
          </Link>

          {/* 縦の仕切り線 */}
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