// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sanko-sho.com';

  // 1. 固定の基本ページを設定
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  try {
    // 2. Supabaseから全ての参考書の「ID」だけをまとめて取得
    const { data: books } = await supabase
      .from('books')
      .select('id')
      .order('created_at', { ascending: false });

    if (!books) return staticRoutes;

    // 3. 参考書の数だけURLの地図データを自動生成
    const bookRoutes: MetadataRoute.Sitemap = books.map((book) => ({
      url: `${baseUrl}/books/${book.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly', // レビューがつく可能性があるので週次に設定
      priority: 0.6,             // 個別ページの優先度
    }));

    // 4. 合体させて1つの大きな地図にする
    return [...staticRoutes, ...bookRoutes];
  } catch (error) {
    console.error('サイトマップ生成エラー:', error);
    return staticRoutes;
  }
}