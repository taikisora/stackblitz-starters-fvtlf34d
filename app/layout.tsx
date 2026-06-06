import type { Metadata, Viewport } from 'next'; // 🎯 Viewportをインポートに追加
import './globals.css';
import Header from '../components/Header';
import TabBar from '../components/TabBar'; // 🎯 1. TabBarをインポート
import OnboardingNoticeBar from '../components/OnboardingNoticeBar';
import Script from 'next/script';

export const metadata: Metadata = {
  title: '参考書ドットコム｜大学受験用参考書のまとめサイト',
  description: 'さまざまな参考書の検索・管理ができるWebアプリです。参考書ルートを作って公開することもできます。',
};

// 🎯 2. iPhoneの「カメラ被り」を防ぎ、端っこまで画面を使えるようにする魔法の設定
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2558388156982404"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>

      <body className="antialiased bg-slate-50 min-h-screen flex flex-col">
        {/* 上部固定のスタイリッシュヘッダー */}
        <Header />

        {/* 未設定のログインユーザーのみ、ここに黄色いお知らせバーが出ます */}
        <OnboardingNoticeBar />
        
        {/* メインコンテンツエリア */}
        <main className="w-full flex-1 bg-slate-50">
          {children}
        </main>

        {/* 🎯 3. フッターとしてTabBarを配置！ */}
        <TabBar />

      </body>
    </html>
  );
}