import React, { useEffect, useState } from 'react';
import { X, Shield, Users, Trophy, Plus, LogIn, LogOut, Copy, Check, Flame } from 'lucide-react';
import { UserProfile } from '../features/profile/profileManager';
import {
  GuildData,
  GUILD_EMBLEMS,
  getMyGuildCode,
  getCachedGuild,
  fetchGuild,
  createGuild,
  joinGuild,
  leaveGuild,
  fetchGuildLeaderboard
} from '../features/guild/guildManager';
import { AvatarBadge } from './AvatarBadge';
import { sound } from '../core/audio/soundEngine';

interface GuildModalProps {
  isOpen: boolean;
  userProfile: UserProfile;
  onClose: () => void;
}

export const GuildModal: React.FC<GuildModalProps> = ({ isOpen, userProfile, onClose }) => {
  const [tab, setTab] = useState<'my' | 'join' | 'rank'>('my');
  const [myGuild, setMyGuild] = useState<GuildData | null>(getCachedGuild);
  const [leaderboard, setLeaderboard] = useState<GuildData[]>([]);
  const [loading, setLoading] = useState(false);

  // Create form
  const [guildName, setGuildName] = useState('');
  const [guildTag, setGuildTag] = useState('');
  const [emblem, setEmblem] = useState('🛡️');
  // Join form
  const [joinCode, setJoinCode] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const code = getMyGuildCode();
    if (code) {
      setLoading(true);
      fetchGuild(code)
        .then(g => {
          setMyGuild(g);
          if (!g) setTab('join');
        })
        .finally(() => setLoading(false));
    } else {
      setMyGuild(null);
      setTab('join');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || tab !== 'rank') return;
    setLoading(true);
    fetchGuildLeaderboard()
      .then(setLeaderboard)
      .finally(() => setLoading(false));
  }, [isOpen, tab]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildName.trim()) {
      setFeedback('Lütfen bir lonca adı girin.');
      return;
    }
    sound.playClick();
    setLoading(true);
    setFeedback(null);
    try {
      const created = await createGuild(guildName, guildTag, emblem, userProfile);
      setMyGuild(created);
      setTab('my');
      setGuildName('');
      setGuildTag('');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    sound.playClick();
    setLoading(true);
    setFeedback(null);
    try {
      const joined = await joinGuild(joinCode, userProfile);
      if (joined) {
        setMyGuild(joined);
        setTab('my');
        setJoinCode('');
      } else {
        setFeedback('Lonca bulunamadı. Kodu kontrol edin (örn: GLD-4X9A).');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    sound.playClick();
    await leaveGuild(userProfile);
    setMyGuild(null);
    setTab('join');
  };

  const memberList = myGuild ? Object.values(myGuild.members || {}) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-slate-950 border border-amber-400/35 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-500/15">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="font-cyber font-black text-base sm:text-lg tracking-wider text-amber-300">
              LONCA / GUILD
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 bg-slate-900/70 border-b border-white/10">
          {myGuild && (
            <button
              type="button"
              onClick={() => setTab('my')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                tab === 'my' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Loncam</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'join' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kur / Katıl</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('rank')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'rank' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Lonca Ligi</span>
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {tab === 'my' && myGuild && (
            <>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-400/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl">
                    {myGuild.emblem}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-black text-[10px]">
                        [{myGuild.tag}]
                      </span>
                      <span className="font-black text-base text-white">{myGuild.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                      <span>Kod: {myGuild.code}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(myGuild.code).catch(() => {});
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1800);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
                        title="Kodu Kopyala"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLeave}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Ayrıl</span>
                </button>
              </div>

              {/* Daily Guild Quest */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/35 border border-emerald-400/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Günlük Lonca Görevi</span>
                  </span>
                  <span className="text-amber-300 font-mono">+{myGuild.dailyQuest.rewardXp} XP</span>
                </div>
                <p className="text-xs text-slate-200">{myGuild.dailyQuest.title}</p>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300"
                    style={{
                      width: `${Math.min(100, Math.round((myGuild.dailyQuest.progress / Math.max(1, myGuild.dailyQuest.target)) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* Members */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Üyeler ({memberList.length})
                </div>
                {memberList.map(m => (
                  <div
                    key={m.friendCode}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-white/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <AvatarBadge avatarId={m.avatarId} size="xs" />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{m.name}</span>
                          {m.role === 'leader' && (
                            <span className="text-[10px] text-amber-400">👑 Lider</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">#{m.friendCode}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <div className="text-amber-300 font-bold">{m.elo} ELO</div>
                      <div className="text-slate-400">{m.xp} XP</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'join' && (
            <div className="space-y-5">
              {feedback && (
                <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-400/40 text-rose-200 text-xs font-bold">
                  {feedback}
                </div>
              )}

              <form onSubmit={handleJoin} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Lonca Koduyla Katıl</span>
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="GLD-XXXX"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    KATIL
                  </button>
                </div>
              </form>

              <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-slate-900/80 border border-amber-400/25 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Lonca Kur</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={guildName}
                    onChange={e => setGuildName(e.target.value)}
                    placeholder="Lonca Adı"
                    maxLength={28}
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    value={guildTag}
                    onChange={e => setGuildTag(e.target.value.toUpperCase())}
                    placeholder="TAG (4)"
                    maxLength={4}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {GUILD_EMBLEMS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmblem(em)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border cursor-pointer transition-transform ${
                        emblem === em
                          ? 'bg-amber-400/25 border-amber-400 scale-110'
                          : 'bg-slate-950 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs font-cyber tracking-wider cursor-pointer"
                >
                  LONCA KUR
                </button>
              </form>
            </div>
          )}

          {tab === 'rank' && (
            <div className="space-y-2">
              {loading ? (
                <div className="text-center text-xs text-slate-400 py-6">Loncalar yükleniyor...</div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-6">
                  Henüz kayıtlı lonca yok. İlk loncayı sen kur!
                </div>
              ) : (
                leaderboard.map((g, idx) => (
                  <div
                    key={g.code}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-white/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 text-center font-mono font-black text-xs text-amber-400">
                        #{idx + 1}
                      </span>
                      <span className="text-xl">{g.emblem}</span>
                      <div>
                        <div className="text-xs font-black text-white">
                          [{g.tag}] {g.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {Object.keys(g.members || {}).length} üye • {g.code}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-amber-300 font-black">
                      {g.totalXp || 0} XP
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
