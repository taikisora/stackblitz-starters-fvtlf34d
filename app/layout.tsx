import type { Metadata } from 'next';
/* 💡 修正箇所：元の正しいファイル名である './globals.css' （s付き）に修正しました */
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
      <body className="antialiased text-slate-900">
        {/* 画面上部に常についてくる新・高機能ヘッダー */}
        <Header />
        
        {/* メインコンテンツエリア */}
        <main className="w-full">
          {children}
        </main>
      </body>
    </html>
  );
}