"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { UNIVERSITY_LIST } from '../../lib/universities';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  
  // 入力データ
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');         // 'studying' | 'experienced' | 'other'
  const [stream, setStream] = useState('');         // 'humanities' | 'sciences' | 'undecided'
  const [university, setUniversity] = useState('');
  const [isUniUndecided, setIsUniUndecided] = useState(false);
  const [loading, setLoading] = useState(false);

  // サジェスト表示用の状態
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const { data } = await supabase.from('profiles').select('username, is_onboarded').eq('id', session.user.id).single();
        
        if (data && data.is_onboarded) {
          router.push('/');
          return;
        }
        if (data && data.username) setUsername(data.username);
      }
    };
    checkUser();
  }, [router]);

  // 入力に合わせて候補を絞り込む関数
  const handleUniversityChange = (value: string) => {
    setUniversity(value);
    setIsUniUndecided(false);

    if (value.trim() === '') {
      setSuggestions([]);
      return;
    }

    const filtered = UNIVERSITY_LIST.filter(uni => 
      uni.includes(value)
    ).slice(0, 50);

    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  // 💡 保存処理（NULLにせず「未定」「無し」の文字で埋める）
  const handleSave = async () => {
    if (!username.trim()) {
      alert('お名前を入力してください。');
      setStep(1);
      return;
    }

    setLoading(true);

    // 💡 修正：保存する直前に、Supabaseのセッションから最新のユーザーIDを確実に取得する
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      alert('セッションが切れました。もう一度ログインし直してください。');
      router.push('/login');
      setLoading(false);
      return;
    }

    const updateData: any = {
      id: session.user.id, // 👈 確実に実在するログインIDをセット
      username: username.trim(),
      status: status,
      is_onboarded: true,
    };

    // 💡 修正：NULLではなく、明確な文字列で埋める
    if (status === 'other') {
      updateData.stream = 'other'; // 💡 英語で統一
      updateData.university = '無し';
    } else {
      updateData.stream = stream; // 💡 選択された英語（'humanities' | 'sciences' | 'undecided'）をそのまま保存！
      updateData.university = isUniUndecided ? '未定' : university.trim();
    }

    const { error } = await supabase.from('profiles').upsert(updateData);

    if (error) {
      alert('保存に失敗しました: ' + error.message);
      setLoading(false);
    } else {
      window.location.href = '/';
    }
  };

  const isUniversityValid = UNIVERSITY_LIST.includes(university.trim());

  if (!user) return <p className="p-6 text-center text-gray-500">読み込み中...</p>;

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 relative">
      
      {/* 💡 修正：「あとで設定する」のボタンコードを完全に消去しました */}

      {/* 進捗バー */}
      <div className="w-full bg-gray-100 h-2 rounded-full mb-8 mt-8">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${(step / (status === 'other' ? 2 : 4)) * 100}%` }}
        />
      </div>

      {/* STEP 1: ユーザーネーム */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold mb-2 text-center text-gray-800">お名前を教えてください</h2>
          <p className="text-sm text-gray-500 text-center mb-6">アプリ内で表示されるニックネームです</p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 focus:outline-none focus:border-blue-500 mb-6 text-gray-800 font-medium"
          />
          <button
            onClick={() => setStep(2)}
            disabled={!username.trim()}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            次へ進む
          </button>
        </div>
      )}

      {/* STEP 2: 現在のステータス */}
      {step === 2 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold mb-6 text-center text-gray-800">現在の状況を教えてください</h2>
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setStatus('studying')}
              className={`w-full py-4 rounded-xl border font-bold transition-all ${status === 'studying' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
            >
              これから大学受験に挑む（受験生）
            </button>
            <button
              onClick={() => setStatus('experienced')}
              className={`w-full py-4 rounded-xl border font-bold transition-all ${status === 'experienced' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
            >
              大学受験を経験済み（受験経験者）
            </button>
            <button
              onClick={() => setStatus('other')}
              className={`w-full py-4 rounded-xl border font-bold transition-all ${status === 'other' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
            >
              その他
            </button>
          </div>
          
          {status === 'other' ? (
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              {loading ? '登録中...' : 'この内容で始める'}
            </button>
          ) : (
            <button
              onClick={() => setStep(3)}
              disabled={!status}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              次へ進む
            </button>
          )}
          <button onClick={() => setStep(1)} className="text-sm text-gray-400 mt-6 block text-center w-full hover:underline">戻る</button>
        </div>
      )}

      {/* STEP 3: 文理の選択 */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold mb-6 text-center text-gray-800">文系·理系どちらですか？</h2>
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setStream('humanities')}
              className={`w-full py-4 rounded-xl border font-bold transition-all ${stream === 'humanities' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
            >
              文系
            </button>
            <button
              onClick={() => setStream('sciences')}
              className={`w-full py-4 rounded-xl border font-bold transition-all ${stream === 'sciences' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
            >
              理系
            </button>
            <button
              onClick={() => setStream('undecided')}
              className={`w-full py-4 rounded-xl border font-bold transition-all ${stream === 'undecided' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700 border-dashed'}`}
            >
              未定/どちらでもない
            </button>
          </div>
          <button
            onClick={() => setStep(4)}
            disabled={!stream}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            次へ進む
          </button>
          <button onClick={() => setStep(2)} className="text-sm text-gray-400 mt-6 block text-center w-full hover:underline">戻る</button>
        </div>
      )}

      {/* STEP 4: 大学名の入力 */}
      {step === 4 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
            {status === 'studying' ? '第一志望の大学名' : '受験した·在籍する大学名'}
          </h2>
          <p className="text-xs text-gray-400 text-center mb-4">※候補から選択してください</p>
          
          <div className="space-y-3 mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="例: 早稲田大学"
                value={university}
                disabled={isUniUndecided}
                onChange={(e) => handleUniversityChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 focus:outline-none focus:border-blue-500 text-gray-800 font-medium disabled:opacity-50"
              />

              {showSuggestions && suggestions.length > 0 && !isUniUndecided && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {suggestions.map((uni) => (
                    <li key={uni}>
                      <button
                        type="button"
                        onMouseDown={() => {
                          setUniversity(uni);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 font-medium transition-colors text-sm"
                      >
                        {uni}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => {
                setIsUniUndecided(!isUniUndecided);
                if (!isUniUndecided) setUniversity('');
              }}
              className={`w-full py-3 rounded-xl border text-sm font-semibold transition-all ${isUniUndecided ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {isUniUndecided ? '✓ まだ決めていない（未定）' : 'まだ決めていない（未定）'}
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={loading || (!isUniUndecided && !isUniversityValid)}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {loading ? '登録中...' : '登録を完了する'}
          </button>
          <button onClick={() => setStep(3)} className="text-sm text-gray-400 mt-6 block text-center w-full hover:underline">戻る</button>
        </div>
      )}
    </div>
  );
}