"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// ★ 変更：BarChart2 を削除し、ルート一覧にぴったりな Route アイコンを追加
import { Home, Search, Route, User } from 'lucide-react';

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed z-[110] bg-white border-gray-200 bottom-0 left-0 right-0 border-t flex justify-around py-3 pb-6 md:top-0 md:bottom-0 md:right-auto md:w-20 md:h-screen md:border-t-0 md:border-r md:flex-col md:justify-center md:gap-8 md:pb-0">
      <Link href="/" className={`flex flex-col items-center w-full py-2 ${pathname === '/' ? 'text-blue-600' : 'text-gray-400'}`}>
        <Home size={24} /><span className="text-[10px] mt-1 font-bold">ホーム</span>
      </Link>
      <Link href="/search" className={`flex flex-col items-center w-full py-2 ${pathname?.startsWith('/search') || pathname?.startsWith('/books') ? 'text-blue-600' : 'text-gray-400'}`}>
        <Search size={24} /><span className="text-[10px] mt-1 font-bold">検索</span>
      </Link>
      {/* ★ 変更：href を /learning-data に変更し、アクティブ時に青文字になる判定を追加 */}
      <Link href="/learning-data" className={`flex flex-col items-center w-full py-2 ${pathname?.startsWith('/learning-data') ? 'text-blue-600' : 'text-gray-400'}`}>
        <Route size={24} /><span className="text-[10px] mt-1 font-bold">参考書ルート</span>
      </Link>
      <Link href="/mypage" className={`flex flex-col items-center w-full py-2 ${pathname?.startsWith('/mypage') ? 'text-blue-600' : 'text-gray-400'}`}>
        <User size={24} /><span className="text-[10px] mt-1 font-bold">マイページ</span>
      </Link>
    </nav>
  );
}