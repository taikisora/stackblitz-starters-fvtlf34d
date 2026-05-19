import type { Metadata } from 'next';
import './globals.css';
import Header from '../components/Header';
import TabBar from '../components/TabBar';

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
      <body>
        <div className="min-h-screen bg-gray-50 text-gray-800 transition-all pb-24 md:pb-0 md:pl-20">
          <Header />
          <main className="p-4">
            {children}
          </main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}