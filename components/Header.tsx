"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Route, User, MessagesSquare } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export default function Header() {
  const pathname = usePathname();
  const [isApp, setIsApp] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    // 1. 今アプリで開かれているか判定
    const isNative = Capacitor.isNativePlatform();
    setIsApp(isNative);

    // 2. アプリの時だけ、スクロール方向を検知する
    if (!isNative) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setIsVisible(true); // 一番上の時は絶対に表示
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(false); // 下にスクロールしたら隠す
      } else {
        setIsVisible(true); // 上にスクロールしたら出す
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getLinkClass = (path: string, exact = false) => {
    const isActive = exact ? pathname === path : pathname?.startsWith(path);
    return `flex flex-col items-center justify-center pt-1 pb-0.5 w-11 sm:w-16 transition-all active:scale-90 shrink-0 ${
      isActive ? 'text-blue-600 font-black' : 'text-slate-700 hover:text-slate-900 font-bold'
    }`;
  };

  return (
    <header 
      className={`fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs transition-transform duration-300 ease-in-out ${
        !isVisible && isApp ? '-translate-y-full' : 'translate-y-0'
      }`}
      // ★魔法のコード：iOSの時刻やカメラに被らないように自動で余白を空ける
      style={isApp ? { paddingTop: 'env(safe-area-inset-top)' } : {}}
    >
      <div className="px-3 py-2 sm:p-3 max-w-7xl w-full mx-auto flex items-center justify-between gap-1">
        
        {/* 左側：ロゴとアイコン画像（Webもアプリも共通表示） */}
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
          <h1 className="text-[13px] sm:text-xl font-black text-slate-900 tracking-tighter shrink-0">
            参考書<span className="text-black">ドットコム</span>
          </h1>
        </Link>

        {/* 右側：ナビゲーションメニュー（★Webの時だけ表示する！） */}
        {!isApp && (
          <nav className="flex items-center gap-0 shrink-0 select-none">
            <Link href="/" className={getLinkClass('/', true)}>
              <Home size={19} className="sm:w-[26px] sm:h-[26px]" />
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
        )}
      </div>
    </header>
  );
}