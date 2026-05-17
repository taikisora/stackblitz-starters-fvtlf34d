"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { UNIVERSITY_LIST } from '../../lib/universities'; // 💡 大学リストをインポート

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  
  // 入力データ
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');         // 'studying' | 'experienced' | 'other'
  const [stream, setStream] = useState('');         // 'humanities' | 'sciences' | 'undecided' (💡 未定を追加)
  const [university, setUniversity] = useState('');
  const [isUniUndecided, setIsUniUndecided] = useState(false); // 💡 大学名未定フラグ
  const [loading, setLoading] = useState(false);

  // 💡 サジェスト表示用の状態
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const { data } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        if (data && data.username) setUsername(data.username);
      }
    };
    checkUser();
  }, [router]);

  // 💡 入力に合わせて候補を絞り込む関数
  const handleUniversityChange = (value: string) => {
    setUniversity(value);
    setIsUniUndecided(false);

    if (value.trim() === '') {
      setSuggestions([]);
      return;
    }

    // 💡 制限を50件に変更（多すぎると重くなるため）
    const filtered = UNIVERSITY_LIST.filter(uni => 
      uni.includes(value)
    ).slice(0, 50);

    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  // 💡 保存処理
  const handleSave = async (isSkip = false) => {
    setLoading(true);

    const updateData: any = {
      id: user?.id,
      // ❌ updated_at: new Date().toISOString(), ← この行を削除しました
    };

    if (!isSkip) {
      updateData.username = username || 'ユーザー';
      updateData.status = status;
      
      // 💡 ステータスが「その他」なら文理・大学は強制的に null
      if (status === 'other') {
        updateData.stream = null;
        updateData.university = null;
      } else {
        // 💡 「まだ決めていない」が選ばれていたら null を代入するロジック
        updateData.stream = stream === 'undecided' ? null : stream;
        updateData.university = isUniUndecided ? null : university.trim();
      }
    }

    const { error } = await supabase.from('profiles').upsert(updateData);

    if (error) {
      alert('保存に失敗しました: ' + error.message);
      setLoading(false);
    } else {
      window.location.href = '/';
    }
  };

  // 💡 大学名がリストに存在するかチェックする変数
  const isUniversityValid = UNIVERSITY_LIST.includes(university.trim());

  if (!user) return <p className="p-6 text-center text-gray-500">読み込み中...</p>;

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 relative">
      
      {/* 右上のスキップボタン */}
      <button 
        onClick={() => handleSave(true)} 
        className="absolute top-6 right-6 text-sm text-gray-400 hover:text-gray-600 font-medium"
      >
        あとで設定する
      </button>

      {/* 進捗バー */}
      <div className="w-full bg-gray-100 h-2 rounded-full mb-8 mt-8">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${(step / (status === 'other' ? 2 : 4)) * 100}%` }}
        />
      </div>

      {/* ── STEP 1: ユーザーネーム ── */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold mb-2 text-center text-gray-800">お名前を教えてください</h2>
          <p className="text-sm text-gray-500 text-center mb-6">アプリ内で表示されるニックネームです</p>
          <input
            type="text"
            placeholder="例: タイキ"
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

      {/* ── STEP 2: 現在のステータス ── */}
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
              onClick={() => handleSave(false)}
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

      {/* ── STEP 3: 文理の選択（受験生・経験者のみ） ── */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold mb-6 text-center text-gray-800">文系・理系どちらですか？</h2>
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
              まだ決めていない（未定）
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

      {/* ── STEP 4: 大学名の入力（受験生・経験者のみ） ── */}
      {step === 4 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
            {status === 'studying' ? '第一志望の大学名' : '受験した・在籍する大学名'}
          </h2>
          <p className="text-xs text-gray-400 text-center mb-4">※候補から選択してください</p>
          
          <div className="space-y-3 mb-6">
            {/* 💡 サジェストリストと入力欄を一つのrelativeブロックでまとめる */}
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

              {/* サジェストリスト表示部分 */}
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
            
            {/* 💡 大学名未定の切り替えトグルボタン */}
            <button
              type="button"
              onClick={() => {
                setIsUniUndecided(!isUniUndecided);
                if (!isUniUndecided) setUniversity(''); // 未定にしたら入力欄をクリア
              }}
              className={`w-full py-3 rounded-xl border text-sm font-semibold transition-all ${isUniUndecided ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {isUniUndecided ? '✓ まだ決めていない（未定）' : 'まだ決めていない（未定）'}
            </button>
          </div>

          <button
            onClick={() => handleSave(false)}
            // 💡 大学名がリストに存在するか、または未定フラグが立っていればボタンを活性化
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