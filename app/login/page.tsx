"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
// 💡 修正：パスワードの表示・非表示を切り替える目のアイコン（Eye, EyeOff）をインポート
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isResetMode, setIsResetMode] = useState(false); // パスワードリセット画面との切り替え用
  const [isOtpMode, setIsOtpMode] = useState(false); // 💡 追加：OTP（8桁コード）入力画面との切り替え用

  // 💡 修正：パスワードの表示状態を管理するStateを追加（false = 非表示, true = 表示）
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(''); // 💡 追加：入力された8桁コードを保存するState

  // 新規登録
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    {/* 💡 修正：メールかパスワードが空っぽなら、Supabaseを呼び出さずにここで即座に終了させる */}
    if (!email.trim() || !password.trim()) {
      setMessage('メールアドレスとパスワードを入力してから新規登録ボタンを押してください（そのままアカウント設定になります）。');
      return; // 👈 ここで処理を止めるので、絶対にあの英語エラーは発生しなくなります！
    }

    setLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // 💡 変更：URLを踏ませないので options (emailRedirectTo) は丸ごと削除
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('確認メールに記載された8桁のコードを入力してください。');
      setIsOtpMode(true); // 💡 追加：OTP入力画面に切り替える
    }
    setLoading(false);
  };

  // ログイン
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage('ログインに失敗しました。');
      setLoading(false);
      return;
    }

    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (profile && profile.status) {
        window.location.href = '/';
      } else {
        window.location.href = '/onboarding';
      }
    }
  };

  // 💡 追加：8桁のコードを検証してログインを完了させる処理
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    if (error) {
      setMessage('認証コードが間違っているか、有効期限が切れています。');
      setLoading(false);
      return;
    }

    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (profile && profile.status) {
        window.location.href = '/';
      } else {
        window.location.href = '/onboarding';
      }
    }
  };

  // 💡 追加：認証コードを再送信する処理
  const handleResendOtp = async () => {
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      setMessage('再送信に失敗しました: ' + error.message);
    } else {
      setMessage('認証コードを再送信しました。メールをご確認ください。');
    }
    setLoading(false);
  };

  // パスワードリセットメールの送信
  const handleResetPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage('エラーが発生しました: ' + error.message);
    } else {
      setMessage('パスワード再設定用のメールを送信しました。メールをご確認ください。');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 light select-none text-slate-900" style={{ color: '#1e293b' }}>
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">参考書ドットコム</h1>
      
      {/* 💡 修正：onSubmitの条件分岐に isOtpMode の場合を追加 */}
      <form onSubmit={isOtpMode ? handleVerifyOtp : isResetMode ? handleResetPasswordEmail : handleLogin} className="space-y-4">
        
        {/* 💡 追加：OTPモードの時は、メール・パスワードを隠してコード入力欄だけを表示 */}
        {isOtpMode ? (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 text-center">8桁の認証コード</label>
            <input
              type="text"
              maxLength={8} // 💡 8に変更
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 focus:outline-none focus:border-blue-500 text-slate-800 font-bold tracking-widest text-center text-2xl"
              required
              placeholder="例：12345678" // 💡 8桁に変更
            />
          </div>
        ) : (
          /* 💡 ここから下は元のメール＆パスワード入力欄（フラグメント <> で囲む） */
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-slate-800 font-bold"
                required
              />
            </div>

            {/* パスワードリセットモードの時は、パスワード入力欄を非表示にする */}
            {!isResetMode && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">パスワード</label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 pr-11 focus:outline-none focus:border-blue-500 text-slate-800 font-bold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg cursor-pointer"
                    title={showPassword ? "パスワードを非表示" : "パスワードを表示"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {message && <p className="text-sm text-center text-blue-600 font-semibold">{message}</p>}

        {/* 💡 修正：ボタン群の出し分けに isOtpMode を追加 */}
        {isOtpMode ? (
          <button
            type="submit"
            disabled={loading || otp.length !== 8} // 💡 8に変更
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            認証して登録を完了する
          </button>
        ) : isResetMode ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            再設定メールを送信
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-white text-blue-600 border border-blue-600 font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors disabled:border-blue-300 disabled:text-blue-300"
            >
              新規登録
            </button>
          </div>
        )}
      </form>

      {/* モード切り替えボタン */}
      <div className="text-center mt-4 flex flex-col space-y-4">
        {isOtpMode ? (
          <>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-xs text-slate-500 hover:text-blue-600 font-bold hover:underline transition-colors disabled:text-slate-300"
            >
              コードを再送信する
            </button>
            <button
              type="button"
              onClick={() => { setIsOtpMode(false); setMessage(''); }}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold hover:underline transition-colors"
            >
              メールアドレスを入力し直す（戻る）
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => { setIsResetMode(!isResetMode); setMessage(''); }}
            className="text-xs text-slate-500 hover:text-blue-600 font-bold hover:underline transition-colors"
          >
            {isResetMode ? "ログイン画面に戻る" : "パスワードを忘れた方はこちら"}
          </button>
        )}
      </div>
    </div>
  );
}