"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Send, CheckCircle } from 'lucide-react';

export default function RequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // フォームの状態
  const [type, setType] = useState<'add' | 'update' | 'opinion'>('add');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('リクエストを送るするにはログインが必要です。');
        router.push('/login');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('内容を入力してください。');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('inquiries')
      .insert({
        user_id: user.id,
        type,
        title: type !== 'opinion' ? title.trim() : null, // ご意見のときはタイトル不要
        content: content.trim()
      });

    if (error) {
      console.error("送信エラー:", error);
      alert('送信に失敗しました。時間をおいて再度お試しください。');
    } else {
      setIsSuccess(true);
      setTitle('');
      setContent('');
    }
    setIsSubmitting(false);
  };

  if (loading) return <p className="text-center py-20 text-gray-500 font-bold animate-pulse">読み込み中...</p>;

  return (
    // 💡 修正点： max-w-2xl に広げ、外側を薄いグレー背景（bg-gray-50）、フォーム部分を白カード化してマイページとデザインを統一しました
    <div className="max-w-2xl mx-auto my-6 px-4 space-y-6 pb-20 min-h-screen">
      {/* 戻るボタン */}
      <button 
        onClick={() => router.back()} 
        className="text-sm text-blue-600 flex items-center mb-2 font-bold hover:opacity-75 active:scale-95 transition-transform"
      >
        <ChevronLeft size={16} /> 戻る
      </button>

      {/* 白いカード型で横いっぱいに綺麗に広がるように調整 */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <h1 className="font-extrabold text-gray-900 text-xl px-1">
          リクエスト・ご意見
        </h1>

        {isSuccess ? (
          // 送信成功時の画面
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center space-y-3 animate-fade-in">
            <div className="flex justify-center text-green-500">
              <CheckCircle size={40} />
            </div>
            <h2 className="font-bold text-gray-800 text-sm">送信が完了しました！</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              貴重なご意見・リクエストありがとうございます。<br />
              管理者が確認し、順次対応させていただきます。
            </p>
            <button
              onClick={() => setIsSuccess(false)}
              className="mt-2 text-xs font-bold text-green-700 hover:underline"
            >
              続けて別のメッセージを送る
            </button>
          </div>
        ) : (
          // 入力フォーム（縦一列の美しさをキープ）
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* お問い合わせ種別 */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">お問い合わせの種類</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'add', label: '参考書追加' },
                  { key: 'update', label: '情報の修正' },
                  { key: 'opinion', label: 'その他意見' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setType(item.key as any)}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition-all active:scale-[0.98] ${
                      type === item.key
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 参考書タイトル（追加・修正リクエストの時だけ表示） */}
            {type !== 'opinion' && (
              <div className="animate-fade-in">
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  参考書のタイトル <span className="text-gray-400 font-medium">(判る範囲でOK)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 青チャート 数学I+A"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm font-medium transition-colors"
                />
              </div>
            )}

            {/* メッセージ本文 */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                {type === 'add' && '追加してほしい理由やURLなど'}
                {type === 'update' && 'どの情報のどこを修正すべきか'}
                {type === 'opinion' && '不具合報告や、アプリへのご意見・ご感想'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="こちらに入力してください..."
                rows={5}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all min-h-[140px]"
              />
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300 shadow-sm"
            >
              <Send size={16} />
              {isSubmitting ? '送信中...' : 'リクエストを送信する'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}