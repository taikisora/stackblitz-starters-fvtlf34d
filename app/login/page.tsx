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

  // 💡 修正：パスワードの表示状態を管理するStateを追加（false = 非表示, true = 表示）
  const [showPassword, setShowPassword] = useState(false);

  // 新規登録
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://sanko-sho.com/mypage',
      },
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
      
      <form onSubmit={isResetMode ? handleResetPasswordEmail : handleLogin} className="space-y-4">
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
            {/* 💡 修正：右端に目のマークを綺麗に重ねるため、親要素に relative を配置 */}
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"} // 💡 修正：目のマークの状態に合わせてタイプを動的に切り替え
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 pr-11 focus:outline-none focus:border-blue-500 text-slate-800 font-bold"
                required
              />
              {/* 💡 修正：パスワード入力欄の右側にぴったり配置する切り替えアイコンボタン */}
              <button
                type="button" // フォーム送信の誤作動を防ぐために絶対に button タイプにする
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg cursor-pointer"
                title={showPassword ? "パスワードを非表示" : "パスワードを表示"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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

      {/* モード切り替えボタン */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => { setIsResetMode(!isResetMode); setMessage(''); }}
          className="text-xs text-slate-500 hover:text-blue-600 font-bold hover:underline transition-colors"
        >
          {isResetMode ? "ログイン画面に戻る" : "パスワードを忘れた方はこちら"}
        </button>
      </div>
    </div>
  );
}