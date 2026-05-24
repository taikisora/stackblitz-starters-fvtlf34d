"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { AlertTriangle, ArrowRight, LogOut } from 'lucide-react';

export default function OnboardingNoticeBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showBar, setShowBar] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
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

      // 2. 詳細項目のチェック（英語・漢字どちらのデータが来ても安全に判定する）
      let isDetailInvalid = false;
      
      if (profile.status !== 'other' && profile.status !== 'other') {
        const isStreamEmpty = !profile.stream || profile.stream.trim() === '';
        const isUniversityEmpty = !profile.university || profile.university.trim() === '';
        
        if (isStreamEmpty || isUniversityEmpty) {
          isDetailInvalid = true;
        }
      }

      if (!profile.is_onboarded || isNameEmpty || isStatusEmpty || isDetailInvalid) {
        setShowBar(true);
      } else {
        setShowBar(false);
      }
    };

    checkProfile();
  }, [pathname]);

  // 💡 追加：ポップアップの中から安全にログアウトさせる関数
  const handlePopupLogout = async () => {
    setLoadingLogout(true);
    await supabase.auth.signOut();
    setShowBar(false);
    // クッキーやセッションを完全にクリアしてログイン画面へ
    window.location.href = '/login';
  };

  if (!showBar) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-5 animate-scale-in">
        
        {/* 警告の⚠️マーク */}
        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
          <AlertTriangle size={28} strokeWidth={2.5} />
        </div>

        <div className="space-y-2">
          <h2 className="text-gray-800 font-black text-base md:text-lg">
            アカウントの初期設定が必要です
          </h2>
          <p className="text-xs text-gray-500 font-bold leading-relaxed px-2">
            『参考書ドットコム』を快適にご利用いただくため、ユーザー名と志望校のご登録をお願いしております。<br />
            設定は1分で完了します。
          </p>
        </div>

        {/* メインの設定に進むボタン */}
        <button
          type="button"
          onClick={() => router.push('/onboarding')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-lg shadow-blue-600/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>初期設定に進む</span>
          <ArrowRight size={16} strokeWidth={3} />
        </button>

        {/* 💡 修正：不整合データから確実に抜け出すための「緊急ログアウトボタン」 */}
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            disabled={loadingLogout}
            onClick={handlePopupLogout}
            className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer p-2 disabled:opacity-50"
          >
            <LogOut size={13} />
            <span>{loadingLogout ? 'ログアウト中...' : '一度ログアウトする'}</span>
          </button>
        </div>
        
      </div>
    </div>
  );
}