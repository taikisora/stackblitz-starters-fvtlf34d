"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  Trophy, Book, HelpCircle, MessageCircle, 
  ChevronRight, MessageSquare, Flame, Clock
} from 'lucide-react';

// ─── 1. カテゴリデータの定義 ───
const TOPICS = [
  { id: 'university', name: '大学受験', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'book', name: '参考書', icon: Book, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'qa', name: 'Q&A', icon: HelpCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'chat', name: '雑談', icon: MessageCircle, color: 'text-purple-500', bg: 'bg-purple-50' },
];

const CATEGORIES: { [key: string]: { id: string; name: string; description: string }[] } = {
  university: [
    { id: 'waseda_keio', name: '早慶上理', description: '最難関私立大を目指す仲間の議論場' },
    { id: 'imperial', name: '旧帝大・国公立', description: '全国の国公立志望者の情報交換' },
    { id: 'gmarch', name: 'GMARCH', description: '学習院・明治・青山・立教・中央・法政' }, // 💡 MARCH から GMARCH に修正
    { id: 'kankan_douritsu', name: '関関同立', description: '関西大学・関西学院・同志社・立命館' },
    { id: 'other_univ', name: 'その他大学', description: '日東駒専・産近甲龍や各私立・単科大など' }, // 💡 追加
    { id: 'target_general', name: '志望校総合・悩み', description: '併願校や志望校選びの相談など' },
  ],
  book: [
    { id: 'english', name: '英語参考書', description: '単語・文法・長文など英語教材の議論' },
    { id: 'math', name: '数学参考書', description: '数!A・数IIB・数IIICなど数学教材の議論' },
    { id: 'japanese', name: '国語参考書', description: '現代文・古文・漢文の教材議論' },
    { id: 'science', name: '理科参考書', description: '物理・化学・生物・地学の教材やルート議論' }, // 💡 理社から理科に独立
    { id: 'social', name: '社会参考書', description: '日本史・世界史・地理・公共などの教材議論' }, // 💡 社会に独立
  ],
  qa: [
    { id: 'study_method', name: '勉強方法', description: '効率的な勉強スタイルへの質問' },
    { id: 'exam_info', name: '入試情報', description: '日程や出願、制度についての質問' },
  ],
  chat: [
    { id: 'free_talk', name: 'フリートーク', description: '受験生同士の気軽な雑談・息抜き' },
    { id: 'study_log', name: '今日の勉強報告', description: 'モチベ維持！今日の成果を報告し合おう' },
  ]
};

export default function CommunityPage() {
  const router = useRouter();
  const [activeTopic, setActiveTopic] = useState('university');
  const [recentThreads, setRecentThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── 2. 新着スレッドの取得 ───
  useEffect(() => {
    const fetchRecentThreads = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_threads')
        .select(`
          id, title, main_topic, category, created_at,
          profiles(username, avatar_color)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) setRecentThreads(data);
      setLoading(false);
    };
    fetchRecentThreads();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen pb-24">
      
      {/* 🔮 ヒーローヘッダー */}
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          受験生掲示板 <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">β版</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-500 font-bold leading-relaxed">
          志望校の悩みやおすすめの参考書、日々の勉強の雑談まで。<br className="hidden md:block" />
          同じ目標を持つ仲間と、今この瞬間の情報を共有しよう。
        </p>
      </div>

      {/* ── 3. 4大トピック切り替えタブ ── */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-6 sticky top-[60px] z-30">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          const isActive = activeTopic === topic.id;
          return (
            <button
              key={topic.id}
              onClick={() => setActiveTopic(topic.id)}
              className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 py-3 md:py-4 rounded-xl transition-all cursor-pointer ${
                isActive ? `${topic.bg} ${topic.color} font-black shadow-3xs` : 'text-slate-400 font-bold hover:bg-gray-50'
              }`}
            >
              <Icon size={18} strokeWidth={ isActive ? 3 : 2} />
              <span className="text-[10px] md:text-sm">{topic.name}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── 4. カテゴリ一覧（左側メイン） ── */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">板を選択</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES[activeTopic].map((category) => (
              <button
                key={category.id}
                onClick={() => router.push(`/community/boards/${category.id}`)}
                className="group flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-400 transition-all text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="min-w-0 pr-4">
                  <h3 className="font-black text-slate-800 group-hover:text-blue-600 transition-colors text-sm md:text-base leading-tight mb-1">
                    {category.name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-slate-400 font-bold line-clamp-1">{category.description}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-blue-50 transition-colors shrink-0">
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. 新着スレッド（右側サイドバー） ── */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <Flame size={14} className="text-orange-500" /> 全体の新着スレッド
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-300 font-bold animate-pulse">読み込み中...</div>
            ) : recentThreads.length === 0 ? (
              <div className="p-10 text-center text-[10px] text-slate-400 font-bold leading-relaxed">
                まだスレッドがありません。<br />あなたが最初のスレを立ててみませんか？
              </div>
            ) : (
              recentThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => router.push(`/community/threads/${thread.id}`)}
                  className="w-full p-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      {thread.main_topic}
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold flex items-center gap-0.5">
                      <Clock size={10} />
                      {new Date(thread.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-2 leading-relaxed">
                    {thread.title}
                  </h4>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className={`w-3.5 h-3.5 rounded-full bg-${thread.profiles?.avatar_color || 'gray'}-500 flex items-center justify-center`}>
                      <span className="text-[6px] text-white font-bold">U</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold">{thread.profiles?.username || '名無し'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
          
          {/* 💡 修正：背景色をグレーにし、アイコンを見切れないように配置した完全版 */}
          <div className="bg-slate-100/70 rounded-2xl p-5 text-white border border-slate-200/60 overflow-hidden relative shadow-3xs flex items-center gap-4">
             {/* 左側：見切れを解消し、綺麗に収めたアイコン */}
             <div className="bg-blue-600 p-2.5 rounded-xl shrink-0">
                <MessageSquare className="w-5 h-5 text-white stroke-[3]" />
             </div>

             {/* 右側：文字（背景が白・グレー系になったので、黒文字にしてハッキリ見せる） */}
             <div className="relative z-10 space-y-1">
                <span className="text-[10px] font-black tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md uppercase">
                  コミュニティ規定
                </span>
                <h5 className="font-black text-[13px] md:text-sm text-slate-900 leading-relaxed pt-0.5">
                  みんなが気持ちよく使えるよう、<br />
                  お互いに敬意を持って情報交換しましょう！
                </h5>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
}