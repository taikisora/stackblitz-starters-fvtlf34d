"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { LogOut, Edit2, Check, X, User, BookOpen, Heart, ChevronRight, Mail, Palette, Trash2, AlertTriangle } from 'lucide-react';
import { UNIVERSITY_LIST } from '../../lib/universities';

const COLOR_OPTIONS = [
  { id: 'gray', name: 'グレー', bg: 'bg-gray-500', ring: 'ring-gray-300' },
  { id: 'red', name: 'レッド', bg: 'bg-red-500', ring: 'ring-red-300' },
  { id: 'orange', name: 'オレンジ', bg: 'bg-orange-500', ring: 'ring-orange-300' },
  { id: 'amber', name: 'イエロー', bg: 'bg-amber-500', ring: 'ring-amber-300' },
  { id: 'emerald', name: 'グリーン', bg: 'bg-emerald-500', ring: 'ring-emerald-300' },
  { id: 'sky', name: 'ライトブルー', bg: 'bg-sky-500', ring: 'ring-sky-300' },
  { id: 'blue', name: 'ブルー', bg: 'bg-blue-500', ring: 'ring-blue-300' },
  { id: 'indigo', name: 'インディゴ', bg: 'bg-indigo-500', ring: 'ring-indigo-300' },
  { id: 'purple', name: 'パープル', bg: 'bg-purple-500', ring: 'ring-purple-300' },
  { id: 'pink', name: 'ピンク', bg: 'bg-pink-500', ring: 'ring-pink-300' },
];

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    username: '',
    status: '',
    stream: '',
    university: '',
    university2: '',
    university3: '',
    avatar_color: 'gray' 
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    status: '',
    stream: '',
    university: '',
    university2: '',
    university3: '',
    avatar_color: 'gray'
  });
  
  const [isUniUndecided, setIsUniUndecided] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) {
        // 💡 修正：データベースの値が「未定」の時だけ、画面上のチェックボックスをONにして、入力欄を空文字にする
        const isUndecided = data.university === '未定';
        // 💡 修正：データベースの値が「無し」の場合も、画面上では空欄（''）にしてあげる
        const isNone = data.university === '無し';

        const loadedProfile = {
          username: data.username || 'ユーザー',
          status: data.status || '',
          stream: data.stream || '',
          university: (isUndecided || isNone) ? '' : (data.university || ''),
          university2: data.university2 || '',
          university3: data.university3 || '',
          avatar_color: data.avatar_color || 'gray'
        };
        
        setProfile(loadedProfile);
        setEditData(loadedProfile);
        setIsUniUndecided(isUndecided); // 👈 「未定」という意思表示がある場合のみON
      }
      setLoading(false);
    };
    fetchUserData();
  }, [router]);

  const handleUniversityChange = (field: string, value: string) => {
    setEditData({ ...editData, [field]: value });
    setActiveField(field);
    if (field === 'university') setIsUniUndecided(false);

    if (value.trim() === '') {
      setSuggestions([]);
      return;
    }
    const filtered = UNIVERSITY_LIST.filter(uni => uni.includes(value)).slice(0, 50);
    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleSaveProfile = async () => {
    if (!editData.username || !editData.username.trim()) {
      alert('ユーザーネームを入力してください。');
      return;
    }
    setLoading(true);

    const updateData: any = {
      id: user.id,
      username: editData.username || 'ユーザー',
      status: editData.status,
      avatar_color: editData.avatar_color
    };

    if (editData.status === 'other') {
      updateData.stream = null;
      updateData.university = null;
      updateData.university2 = null;
      updateData.university3 = null;
    } else {
      // 💡 修正：日本語に変換せず、editData.stream に入っている英語（'humanities' | 'sciences' | 'undecided'）をそのままDBへ保存する！
      updateData.stream = editData.stream || 'undecided';
      
      // 💡 修正：「まだ決めていない（未定）」にチェックがあれば、DBへ「未定」という固定文字を送る
      // 💡 修正：もし入力欄に文字があればそれを優先。文字がなくて、かつ未定チェックがあれば「未定」にする
      const trimmedUni = editData.university.trim();
      updateData.university = trimmedUni ? trimmedUni : (isUniUndecided ? '未定' : null);
      updateData.university2 = editData.university2.trim() || null;
      updateData.university3 = editData.university3.trim() || null;
    }

    const { error } = await supabase.from('profiles').upsert(updateData);

    if (error) {
      alert('保存に失敗しました: ' + error.message);
    } else {
      setProfile({
        username: updateData.username,
        status: updateData.status,
        // 💡 修正：DBに送った英語データをそのまま画面の表示状態にも反映する
        stream: updateData.stream,
        university: updateData.university || '',
        university2: updateData.university2 || '',
        university3: updateData.university3 || '',
        avatar_color: updateData.avatar_color
      });
      setIsEditing(false);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      alert('アカウントの削除に失敗しました: ' + error.message);
      setIsDeleteModalOpen(false);
    } else {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  // 💡 修正：チェックが入っているか、入力文字が「未定」か、正式な大学名であれば保存ボタンを押せるようにする
  const isUni1Valid = isUniUndecided || editData.university.trim() === '未定' || UNIVERSITY_LIST.includes(editData.university.trim());
  const isUni2Valid = editData.university2.trim() === '' || UNIVERSITY_LIST.includes(editData.university2.trim());
  const isUni3Valid = editData.university3.trim() === '' || UNIVERSITY_LIST.includes(editData.university3.trim());

  const getStatusText = (status: string) => {
    if (status === 'studying') return '大学受験生';
    if (status === 'experienced') return '大学受験 経験済み';
    if (status === 'other') return 'その他（大人の学び直しなど）';
    return '未設定';
  };
  const getStreamText = (stream: string) => {
    if (stream === 'humanities') return '文系';
    if (stream === 'sciences') return '理系';
    return '未定';
  };

  if (loading && !profile.username) return <div className="p-10 text-center text-gray-500 font-medium animate-pulse">読み込み中...</div>;

  const currentProfileColor = COLOR_OPTIONS.find(c => c.id === profile.avatar_color) || COLOR_OPTIONS[0];
  const currentEditColor = COLOR_OPTIONS.find(c => c.id === editData.avatar_color) || COLOR_OPTIONS[0];

  return (
    // 💡 修正点： max-w-2xl（中くらいの広さ）に設定し、1列のまま綺麗な縦配列に統一しました
    <div className="max-w-2xl mx-auto my-6 px-4 space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 ml-2">マイページ</h1>

      {/* ── 1. アカウント情報カード ── */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            アカウント情報
          </h2>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-sm flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
            >
              <Edit2 className="w-4 h-4" /> 編集
            </button>
          ) : (
            <button 
              onClick={() => { setIsEditing(false); setEditData(profile); }}
              className="text-sm flex items-center gap-1 text-gray-500 font-bold bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" /> キャンセル
            </button>
          )}
        </div>

        <div className="text-center space-y-3 mb-6 pb-4 border-b border-gray-50">
          <div className={`w-20 h-20 ${isEditing ? currentEditColor.bg : currentProfileColor.bg} text-white rounded-full flex items-center justify-center mx-auto border border-gray-100 shadow-sm transition-colors duration-300`}>
            <User size={36} />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-800 text-lg">{profile.username}</h3>
            <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mt-1 font-medium">
              <Mail size={12} />
              <span>{user?.email}</span>
            </div>
          </div>
        </div>

        {/* 閲覧モード */}
        {!isEditing && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">現在のステータス</p>
              <p className="font-semibold text-gray-800">{getStatusText(profile.status)}</p>
            </div>
            
            {profile.status !== 'other' && profile.status !== '' && (
              <div className="space-y-4 pt-2 border-t border-gray-50">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">文系 / 理系</p>
                  <p className="font-semibold text-gray-800">{getStreamText(profile.stream)}</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">
                      {profile.status === 'studying' ? '第一志望校' : '受験・在籍大学 (1)'}
                    </p>
                    <p className="font-bold text-gray-800">{profile.university || '未定'}</p>
                  </div>
                  {(profile.university2 || profile.status === 'studying') && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">
                        {profile.status === 'studying' ? '第二志望校' : '受験・在籍大学 (2)'}
                      </p>
                      <p className="font-semibold text-gray-700">{profile.university2 || '未設定'}</p>
                    </div>
                  )}
                  {(profile.university3 || profile.status === 'studying') && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">
                        {profile.status === 'studying' ? '第三志望校' : '受験・在籍大学 (3)'}
                      </p>
                      <p className="font-semibold text-gray-700">{profile.university3 || '未設定'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 編集モード */}
        {isEditing && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 space-y-2">
              <div className="flex items-center gap-1 text-gray-500 font-bold text-[11px] px-1">
                <Palette size={12} className="text-blue-500" />
                <span>アイコンのカラー変更</span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-0.5">
                {COLOR_OPTIONS.map((color) => {
                  const isSelected = editData.avatar_color === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setEditData({ ...editData, avatar_color: color.id })}
                      className={`w-7 h-7 ${color.bg} rounded-full mx-auto transition-all transform hover:scale-110 active:scale-95 ${isSelected ? `ring-4 ring-offset-1 ${color.ring} scale-105` : 'opacity-70 hover:opacity-100'}`}
                      title={color.name}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">ユーザーネーム</label>
              {/* 💡 修正：text-slate-800 font-bold を追加 */}
              <input type="text" value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm text-slate-800 font-bold" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">現在の状況</label>
              {/* 💡 修正：text-slate-800 font-bold を追加 */}
              <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm text-slate-800 font-bold cursor-pointer" >
                <option value="" disabled hidden>選択してください</option>
                <option value="studying">これから大学受験に挑む</option>
                <option value="experienced">大学受験を経験済み</option>
                <option value="other">その他（大人の学び直しなど）</option>
              </select>
            </div>

            {editData.status !== 'other' && editData.status !== '' && (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">文系 / 理系</label>
                  {/* 💡 修正：text-slate-800 font-bold を追加 */}
                  <select value={editData.stream} onChange={(e) => setEditData({ ...editData, stream: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm text-slate-800 font-bold cursor-pointer" >
                    <option value="" disabled hidden>選択してください</option>
                    <option value="humanities">文系</option>
                    <option value="sciences">理系</option>
                    <option value="undecided">未定/どちらでもない</option>
                  </select>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{editData.status === 'studying' ? '第一志望校' : '大学名 (1)'}</label>
                    {/* 💡 修正：text-slate-800 font-bold を追加 */}
                    <input type="text" placeholder="例: 東京大学" value={editData.university} disabled={isUniUndecided} onChange={(e) => handleUniversityChange('university', e.target.value)} onFocus={() => { setShowSuggestions(true); setActiveField('university'); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm text-slate-800 font-bold disabled:opacity-50" />
                    <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={isUniUndecided} onChange={(e) => { setIsUniUndecided(e.target.checked); if (e.target.checked) setEditData({ ...editData, university: '' }); }} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      <span className="text-xs font-medium text-gray-500">まだ決めていない（未定）</span>
                    </label>
                  </div>

                  <div className="relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{editData.status === 'studying' ? '第二志望校 (任意)' : '大学名 (2) (任意)'}</label>
                    {/* 💡 修正：text-slate-800 font-bold を追加 */}
                    <input type="text" placeholder="例: 早稲田大学" value={editData.university2} onChange={(e) => handleUniversityChange('university2', e.target.value)} onFocus={() => { setShowSuggestions(true); setActiveField('university2'); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm text-slate-800 font-bold" />
                  </div>

                  <div className="relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{editData.status === 'studying' ? '第三志望校 (任意)' : '大学名 (3) (任意)'}</label>
                    {/* 💡 修正：text-slate-800 font-bold を追加 */}
                    <input type="text" placeholder="例: 明治大学" value={editData.university3} onChange={(e) => handleUniversityChange('university3', e.target.value)} onFocus={() => { setShowSuggestions(true); setActiveField('university3'); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm text-slate-800 font-bold" />
                  </div>

                  {showSuggestions && suggestions.length > 0 && activeField && (
                    <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {suggestions.map((uni) => (
                        <li key={uni}>
                          <button type="button" onMouseDown={() => { setEditData({ ...editData, [activeField]: uni }); setShowSuggestions(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-slate-800 font-bold transition-colors text-sm" >{uni}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            <button onClick={handleSaveProfile} disabled={Boolean(loading || !editData.username || !editData.username.trim() || (editData.status !== "" && editData.status !== "other" && (!isUni1Valid || !isUni2Valid || !isUni3Valid)))} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300 mt-4 cursor-pointer active:scale-[0.99]" >
              <Check className="w-5 h-5" />
              {loading ? '保存中...' : '変更を保存する'}
            </button>
          </div>
        )}
      </div>

      {/* ── 2. 参考書管理メニュー ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
        <Link href="/mypage/saved" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-pink-50 p-2 rounded-lg">
              <Heart className="w-5 h-5 text-pink-500 fill-current" />
            </div>
            <span className="font-bold text-gray-700">いいねした参考書</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
        <Link href="/mypage/used" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-500 fill-current" />
            </div>
            <span className="font-bold text-gray-700">使用した参考書</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
        
        {/* 💡 追加：いいねしたルート（デザイン・枠・矢印のサイズを完全統一） */}
        <Link href="/mypage/saved-routes" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2 rounded-lg">
              {/* ➔ ルートを象徴するオレンジ・イエロー基調のHeartアイコンを配置 */}
              <Heart className="w-5 h-5 text-amber-500 fill-current" />
            </div>
            <span className="font-bold text-gray-700">いいねしたルート</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      {/* ── 3. 運営へのリクエストメニュー ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <Link href="/request" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700">参考書リクエスト・ご意見</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      {/* 💡 【修正点】リクエストのすぐ下に、全く同じ大きさ・仕様・デザインで「利用規約」を配置 */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-3">
          <Link href="/terms" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-700">利用規約を確認する</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

      {/* ── 4. 各種設定・ログアウト・退会 ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition-colors" >
          <div className="bg-gray-100 p-2 rounded-lg">
            <LogOut className="w-5 h-5 text-gray-600" />
          </div>
          <span className="font-bold text-gray-700">ログアウト</span>
        </button>
        <button onClick={() => setIsDeleteModalOpen(true)} className="w-full flex items-center gap-3 p-5 text-left hover:bg-red-50 transition-colors" >
          <div className="bg-red-50 p-2 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <span className="font-bold text-red-600">アカウントを削除（退会）</span>
        </button>
      </div>

      

      {/* アカウント削除ポップアップ */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="text-red-600 w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-center text-gray-800 mb-2">本当にアカウントを削除しますか？</h3>
            <p className="text-sm text-gray-500 text-center mb-6 font-medium">この操作は取り消せません。<br/>プロフィールや登録した参考書データがすべて完全に削除されます。</p>
            <div className="space-y-3">
              <button onClick={handleDeleteAccount} className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 transition-colors" >削除して退会する</button>
              <button onClick={() => setIsDeleteModalOpen(false)} className="w-full bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors" >キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}