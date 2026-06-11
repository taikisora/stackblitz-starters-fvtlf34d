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

  // 💡 追加：Googleでログイン / 新規登録
  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 認証後に戻ってくるURL（今回はトップページを指定）
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setMessage('Googleログインに失敗しました: ' + error.message);
      setLoading(false);
    }
    // ※OAuthは一度Googleの画面に飛ぶため、成功時の画面遷移処理はここには書きません
  };

  // 💡 追加：X（旧Twitter）でログイン / 新規登録
  const handleXLogin = async () => {
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'x',
      options: {
        redirectTo: `${window.location.origin}/`,
        // 💡 追加：Xの認証画面で毎回ログイン（アカウント入力）を強制する
        queryParams: {
          prompt: 'login',
        },
      },
    });

    if (error) {
      setMessage('Xログインに失敗しました: ' + error.message);
      setLoading(false);
    }
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

        {/* 💡 追加：ソーシャルログインボタン（通常モードの時のみ表示） */}
        {!isOtpMode && !isResetMode && (
          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-4">
              <div className="border-t border-gray-200 w-full"></div>
              <span className="bg-white px-3 text-sm text-gray-400 absolute">または</span>
            </div>
            
            {/* 💡 修正：ボタンを縦に並べるために space-y-3 を追加したdivで囲む */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
              >
                {/* GoogleのGマークロゴ（SVG） */}
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Googleでログイン / 新規登録
              </button>

              {/* 💡 追加：Xログインボタン */}
              <button
                type="button"
                onClick={handleXLogin}
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm disabled:bg-slate-400 cursor-pointer"
              >
                {/* Xのロゴ（SVG） */}
                <svg className="w-5 h-5 mr-3 fill-current" viewBox="0 0 1200 1227" xmlns="http://www.w3.org/2000/svg">
                  <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
                </svg>
                Xでログイン / 新規登録
              </button>
            </div>
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