import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  
  const appId = 'e5f632e7-1b0b-4a6c-97dc-d492e17c73bd';
  const accessKey = 'pk_XXNCsfOtnRa78tPTGwXx0fMqlrCajK5W68Xv8FX4u1t';
  const apiUrl = 'https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404';

  const params = new URLSearchParams({
    format: 'json',
    title: keyword || '',
    booksGenreId: '001',
    applicationId: appId,
    accessKey: accessKey
  });

  const finalUrl = `${apiUrl}?${params.toString()}`;

  try {
    const res = await fetch(finalUrl, {
      headers: {
        // ▼ ここを、あなたが教えてくれた本当のApplication URLに書き換えました！ ▼
        'Referer': 'https://stackblitz-starters-fvtlf34d-j7tpley0s-taikisoras-projects.vercel.app/'
      }
    });
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: '通信失敗' }, { status: 500 });
  }
}