// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

// 💡 確実に値を認識させるため、NEXT_PUBLIC_ の環境変数を明示的に代入します
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sanko-sho.com';

  // 1. 固定の基本ページ
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

  // 万が一環境変数が空だった場合は安全に基本ページだけ返す
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Sitemap: Supabaseの環境変数が読み込めませんでした。');
    return staticRoutes;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 2. Supabaseから全ての参考書の「id」だけを取得
    const { data: books, error } = await supabase
      .from('books')
      .select('id');

    if (error || !books) {
      console.error('Sitemap: データ取得エラー', error);
      return staticRoutes;
    }

    // 3. 参考書の数だけURLを自動生成
    const bookRoutes: MetadataRoute.Sitemap = books.map((book) => ({
      url: `${baseUrl}/books/${book.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    // 4. 合体させて返す
    return [...staticRoutes, ...bookRoutes];
  } catch (error) {
    console.error('Sitemap: 予期せぬエラー', error);
    return staticRoutes;
  }
}