// app/books/[id]/layout.tsx
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// 💡 サーバーサイド専用の軽量なSupabaseクライアントを手動で作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

// 🔍 Googleのロボットがこのページを巡回した瞬間に実行される処理
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const bookId = resolvedParams.id;

  // Supabaseから本のタイトルと著者名を取得
  const { data: book } = await supabase
    .from('books')
    .select('title, author')
    .eq('id', bookId)
    .single();

  if (!book) {
    return {
      title: '参考書詳細 | 参考書ドットコム',
    };
  }

  // 🎯 Googleの検索結果やブラウザのタブに表示される文字をカスタマイズ！
  return {
    title: `${book.title}（${book.author}）の詳細・レビュー | 参考書ドットコム`,
    description: `参考書ドットコムによる「${book.title}」の詳細ページです。この参考書を使ったおすすめの勉強ルートや、受験生によるリアルなレビュー・質問・議論をチェックしよう！`,
  };
}

export default function BookDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}