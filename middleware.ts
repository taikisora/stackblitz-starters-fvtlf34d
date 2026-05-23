import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPABASE_URL = 'https://gftwcfexduvwgvffigbg.supabase.co';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl.clone();

  const isLoginPage = url.pathname === '/login';
  const isOnboardingPage = url.pathname === '/onboarding';

  // 1. Next.jsのCookieからSupabaseのセッションCookieを直接取得
  const supabaseCookieName = `sb-gftwcfexduvwgvffigbg-auth-token`;
  const authCookie = req.cookies.get(supabaseCookieName)?.value;

  let userId: string | null = null;
  let accessToken: string | null = null;

  if (authCookie) {
    try {
      let rawJson = authCookie;
      
      // 💡 Supabase特有の Cookie の特殊なプレフィックス（base64url:）を綺麗に除去・デコードする
      if (authCookie.startsWith('base64url:')) {
        const base64Str = authCookie.substring('base64url:'.length);
        // Next.jsのミドルウェア環境（Edge Runtime）でも安全に動くデコード処理
        const jsonStr = Buffer.from(base64Str, 'base64').toString('utf-8');
        rawJson = jsonStr;
      } else if (authCookie.startsWith('%7B')) {
        // URLエンコードされている場合の対策
        rawJson = decodeURIComponent(authCookie);
      }

      // 2. 配列形式やオブジェクト形式、どちらで保存されていても確実にデータを抽出
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        userId = parsed[0]?.user?.id || null;
        accessToken = parsed[0]?.access_token || null;
      } else if (parsed) {
        userId = parsed.user?.id || parsed[0] || null;
        accessToken = parsed.access_token || parsed[1] || null;
      }
    } catch (e) {
      console.error("Cookieの解読に失敗しました。認証の形式が特殊な可能性があります:", e);
    }
  }

  // 【未ログインの場合】
  if (!userId) {
    if (isOnboardingPage) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return res;
  }

  // 【ログイン済みの場合】profiles から完了フラグを取得する
  try {
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_onboarded`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdHdjZmV4ZHV2d2d2ZmZpZ2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTUzNTYsImV4cCI6MjA5Mzk3MTM1Nn0.SIUtKv-tvLqBbP0VLHf0QIV3tZBZSPtKzXjR2Tyad8c',
        'Authorization': `Bearer ${accessToken || ''}`
      },
      cache: 'no-store'
    });

    if (profileRes.ok) {
      const profiles = await profileRes.json();
      const profile = profiles?.[0];

      // まだオンボーディングが終わっていない場合
      if (!profile?.is_onboarded) {
        if (!isOnboardingPage && !isLoginPage) {
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
      } else {
        // すでに終わっているのにオンボーディング画面を開こうとしたらホームへ
        if (isOnboardingPage) {
          url.pathname = '/';
          return NextResponse.redirect(url);
        }
      }
    }
  } catch (error) {
    console.error("ミドルウェアでのプロフィール取得エラー:", error);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.).*)',
  ],
};