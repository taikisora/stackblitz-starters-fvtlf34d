"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isResetMode, setIsResetMode] = useState(false); // 💡 パスワードリセット画面との切り替え用

  // 新規登録
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('確認メールを送信しました。メールボックスを確認してください。');
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
      // 💡 ログイン成功時、プロフィール（status）が未設定ならオンボーディング画面へ、設定済ならホームへ
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

  // 🔥 パスワードリセットメールの送信
  const handleResetPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // メールのリンクをクリックしたときに戻ってくるURLを指定
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
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">参考書ドットコム</h1>
      
      <form onSubmit={isResetMode ? handleResetPasswordEmail : handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* 💡 パスワードリセットモードの時は、パスワード入力欄を非表示にする */}
        {!isResetMode && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        )}

        {message && <p className="text-sm text-center text-blue-600 font-semibold">{message}</p>}

        {isResetMode ? (
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

      {/* 💡 モード切り替えボタン */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => { setIsResetMode(!isResetMode); setMessage(''); }}
          className="text-sm text-gray-500 hover:underline"
        >
          {isResetMode ? "ログイン画面に戻る" : "パスワードを忘れた方はこちら"}
        </button>
      </div>
    </div>
  );
}