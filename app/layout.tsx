import type { Metadata } from 'next';
import './globals.css';
import Header from '../components/Header';
import OnboardingNoticeBar from '../components/OnboardingNoticeBar';
import Script from 'next/script'; // 🎯 1. Next.js専用のスクリプト読み込み機能をインポート

export const metadata: Metadata = {
  title: '参考書ドットコム｜大学受験用参考書のまとめサイト',
  description: 'さまざまな参考書の検索・管理ができるWebアプリです。参考書ルートを作って公開することもできます。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      {/* 🎯 2. headタグを追加し、その中にアドセンスのコードをNext.jsの仕様に変換して配置 */}
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2558388156982404"
          crossOrigin="anonymous"
          strategy="afterInteractive" // ➔ アプリの表示速度を落とさないように優しく読み込む設定
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
      </body>
    </html>
  );
}