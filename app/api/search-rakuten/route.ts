import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  
  const appId = 'e5f632e7-1b0b-4a6c-97dc-d492e17c73bd';
  const accessKey = 'pk_XXNCsfOtnRa78tPTGwXx0fMqlrCajK5W68Xv8FX4u1t';
  
  // テストフォームで成功した新しいドメイン
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
      method: 'GET',
      headers: {
        // Q&Aの解決策を完全適用：Origin, Referer, User-Agentをすべてセットする
        // ※URLはあなたのVercel環境のものを指定します
        'Origin': 'https://stackblitzstartersfvtlf34d-0rsu--3000--4c73681d.local-credentialless.webcontainer.io',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: '通信失敗' }, { status: 500 });
  }
}