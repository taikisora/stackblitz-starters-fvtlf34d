import type { Metadata } from 'next'; // 🎯 Viewportを削除して元に戻しました
import './globals.css';
import Header from '../components/Header';
import TabBar from '../components/TabBar';
import OnboardingNoticeBar from '../components/OnboardingNoticeBar';
import Script from 'next/script';

export const metadata: Metadata = {
  title: '参考書ドットコム｜大学受験用参考書のまとめサイト',
  description: 'さまざまな参考書の検索・管理ができるWebアプリです。参考書ルートを作って公開することもできます。',
  // 🎯 Next.js 13用の書き方：ここにカメラ被りを防ぐ魔法のコードを1行で書きます
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
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
        <Header />
        <OnboardingNoticeBar />
        
        <main className="w-full flex-1 bg-slate-50">
          {children}
        </main>

        <TabBar />
      </body>
    </html>
  );
}