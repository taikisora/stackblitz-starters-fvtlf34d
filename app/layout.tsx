import type { Metadata } from 'next';
import './globals.css';
import Header from '../components/Header';

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
      {/* 💡 背景がドロドロ黒くならないクリーンな土台に変形 */}
      <body className="antialiased bg-slate-50 min-h-screen flex flex-col">
        {/* 上部固定のスタイリッシュヘッダー */}
        <Header />
        
        {/* メインコンテンツエリア */}
        <main className="w-full flex-1 bg-slate-50">
          {children}
        </main>
      </body>
    </html>
  );
}