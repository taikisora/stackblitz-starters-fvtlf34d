"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function OnboardingNoticeBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 未ログイン、または特定の画面なら表示しない
      if (!session || pathname === '/onboarding' || pathname === '/login') {
        setShowBar(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, status, stream, university, is_onboarded')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        setShowBar(true);
        return;
      }

      // 1. 基本項目の空チェック
      const isNameEmpty = !profile.username || profile.username.trim() === '';
      const isStatusEmpty = !profile.status || profile.status.trim() === '' || profile.status === 'EMPTY';

      // 2. ステータスに応じた詳細項目のチェック
      let isDetailInvalid = false;
      
      if (profile.status !== 'other') {
        const isStreamEmpty = !profile.stream || profile.stream.trim() === '';
        const isUniversityEmpty = !profile.university || profile.university.trim() === '';
        
        if (isStreamEmpty || isUniversityEmpty) {
          isDetailInvalid = true;
        }
      }

      // フラグが完了になっていない、または必要な項目が空っぽなら警告バーを出す
      if (!profile.is_onboarded || isNameEmpty || isStatusEmpty || isDetailInvalid) {
        setShowBar(true);
      } else {
        setShowBar(false);
      }
    };

    checkProfile();
  }, [pathname]);

  if (!showBar) return null;

  return (
    // 画面全体を固定する背景レイヤー（透明度を下げて、より落ち着いた雰囲気に）
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      
      {/* 画面中央の公式通知カード */}
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-5 animate-scale-in">
        
        {/* 💡 修正：点滅を無くした、警告をしっかり伝えるオレンジの⚠️マーク */}
        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
          <AlertTriangle size={28} strokeWidth={2.5} />
        </div>

        {/* 案内テキスト */}
        <div className="space-y-2">
          <h2 className="text-gray-800 font-black text-base md:text-lg">
            アカウントの初期設定を完了させてください
          </h2>
          <p className="text-xs text-gray-500 font-bold leading-relaxed px-2">
            ユーザー名などの設定を完了させてください。<br />
            設定は1分で完了します。
          </p>
        </div>

        {/* 設定画面への誘導ボタン */}
        <button
          type="button"
          onClick={() => router.push('/onboarding')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-lg shadow-blue-600/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>初期設定に進む</span>
          <ArrowRight size={16} strokeWidth={3} />
        </button>
        
      </div>
    </div>
  );
}