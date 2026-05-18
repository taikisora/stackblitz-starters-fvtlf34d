"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, User, ShieldAlert, CheckCircle, Send, X } from 'lucide-react';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const targetUserId = params.id as string; // 表示対象のユーザーID

  const [me, setMe] = useState<any>(null); // 自分
  const [profile, setProfile] = useState<any>(null); // 相手のプロフィール
  const [loading, setLoading] = useState(true);

  // 通報モーダルの状態
  const [isOpenReport, setIsOpenReport] = useState(false);
  const [reason, setReason] = useState('不適切な表現・暴言');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      
      // 自分のログイン状態をチェック
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setMe(session.user);

      // 相手のプロフィール（名前など）を取得
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();
        
      if (data) setProfile(data);
      setLoading(false);
    };

    if (targetUserId) fetchUserData();
  }, [targetUserId]);

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) {
      alert('通報するにはログインが必要です。');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: me.id,
        reported_user_id: targetUserId,
        reason,
        details: details.trim()
      });

    if (error) {
      console.error("通報エラー:", error);
      alert('通報の送信に失敗しました。');
    } else {
      setIsSuccess(true);
      setDetails('');
    }
    setIsSubmitting(false);
  };

  if (loading) return <p className="text-center py-20 text-gray-500 font-bold animate-pulse">読み込み中...</p>;
  if (!profile) return <p className="text-center py-20 text-gray-500 font-bold">ユーザーが見つかりませんでした。</p>;

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-24 relative">
      {/* 戻るボタン */}
      <button 
        onClick={() => router.back()} 
        className="text-sm text-blue-600 flex items-center mb-6 font-bold hover:opacity-75"
      >
        <ChevronLeft size={16} /> 戻る
      </button>

      {/* プロフィールカード */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center space-y-4 mb-6">
        {/* デフォルトシルエットアイコン */}
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mx-auto border-2 border-gray-200 shadow-2xs">
          <User size={40} />
        </div>
        
        <div>
          <h1 className="font-extrabold text-xl text-gray-900">{profile.username || '名無しユーザー'}</h1>
          <p className="text-[10px] text-gray-400 font-mono mt-1">ID: {profile.id.slice(0, 8)}...</p>
        </div>

        {/* 自分自身以外のページの場合のみ通報ボタンを出す */}
        {me && me.id !== targetUserId && (
          <button
            onClick={() => { setIsOpenReport(true); setIsSuccess(false); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors pt-2"
          >
            <ShieldAlert size={14} />
            このユーザーを通報する
          </button>
        )}
      </div>

      {/* 📋 通報ポップアップ（モーダル）風UI */}
      {isOpenReport && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-xl border border-gray-100 animate-fade-in relative">
            <button 
              onClick={() => setIsOpenReport(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>

            {isSuccess ? (
              <div className="text-center py-4 space-y-3">
                <div className="flex justify-center text-green-500"><CheckCircle size={36} /></div>
                <h3 className="font-bold text-gray-800 text-sm">通報を送信しました</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">運営にて内容を確認し、不適切な場合はアカウント停止等の対処を行います。</p>
                <button 
                  onClick={() => setIsOpenReport(false)}
                  className="bg-gray-800 text-white font-bold text-xs px-4 py-2 rounded-lg mt-2"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-4">
                <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-1">
                  <ShieldAlert size={16} className="text-red-500" />
                  ユーザーの通報
                </h3>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">通報の理由</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-700 focus:outline-none"
                  >
                    <option value="不適切な表現・暴言">不適切な表現・暴言</option>
                    <option value="解答のネタバレ">解答のネタバレ</option>
                    <option value="嫌がらせ・スパム">嫌がらせ・スパム</option>
                    <option value="その他">その他</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">詳しい状況（任意）</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="具体的なコメント内容などがあれば記入してください"
                    rows={3}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50 focus:outline-none focus:bg-white text-gray-700 min-h-[60px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send size={12} />
                  {isSubmitting ? '送信中...' : '通報を確定する'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}