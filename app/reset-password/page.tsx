"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // 🔥 入力された新しいパスワードでユーザー情報を更新する
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage('更新に失敗しました: ' + error.message);
    } else {
      setMessage('パスワードを更新しました！ログイン画面へ移動します。');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">新しいパスワードの設定</h1>
      
      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">新しいパスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500"
            required
            placeholder="6文字以上の新しいパスワード"
          />
        </div>
        
        {message && <p className="text-sm text-center text-blue-600 font-semibold">{message}</p>}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
        >
          パスワードを変更する
        </button>
      </form>
    </div>
  );
}