"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Route, User, MessagesSquare } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export default function TabBar() {
  const pathname = usePathname();
  const [isApp, setIsApp] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    setIsApp(isNative);

    if (!isNative) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // 下までスクロールしきった時のバウンス判定なども考慮しつつシンプルに
      if (currentScrollY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ★ Webの時は何も表示しない（空っぽにする）
  if (!isApp) return null;

  return (
    <nav 
      className={`fixed z-[110] bg-white border-t border-gray-200 bottom-0 left-0 right-0 flex justify-around py-2 transition-transform duration-300 ease-in-out ${
        !isVisible ? 'translate-y-full' : 'translate-y-0'
      }`}
      // ★魔法のコード：iPhoneの下の横線（ホームインジケータ）と被らないように余白を空ける
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Link href="/" className={`flex flex-col items-center w-full py-1 ${pathname === '/' ? 'text-blue-600' : 'text-gray-400'}`}>
        <Home size={22} /><span className="text-[10px] mt-1 font-bold">ホーム</span>
      </Link>
      <Link href="/search" className={`flex flex-col items-center w-full py-1 ${pathname?.startsWith('/search') || pathname?.startsWith('/books') ? 'text-blue-600' : 'text-gray-400'}`}>
        <Search size={22} /><span className="text-[10px] mt-1 font-bold">検索</span>
      </Link>
      <Link href="/community" className={`flex flex-col items-center w-full py-1 ${pathname?.startsWith('/community') ? 'text-blue-600' : 'text-gray-400'}`}>
        <MessagesSquare size={22} /><span className="text-[10px] mt-1 font-bold">掲示板</span>
      </Link>
      <Link href="/learning-data" className={`flex flex-col items-center w-full py-1 ${pathname?.startsWith('/learning-data') ? 'text-blue-600' : 'text-gray-400'}`}>
        <Route size={22} /><span className="text-[10px] mt-1 font-bold">ルート</span>
      </Link>
      <Link href="/mypage" className={`flex flex-col items-center w-full py-1 ${pathname?.startsWith('/mypage') ? 'text-blue-600' : 'text-gray-400'}`}>
        <User size={22} /><span className="text-[10px] mt-1 font-bold">マイページ</span>
      </Link>
    </nav>
  );
}