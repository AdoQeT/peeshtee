import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Sparkles, X, Swords, RefreshCw } from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import { AvatarBadge } from './AvatarBadge';
import { LeaderboardEntry, fetchLeaderboard } from '../features/progression/leaderboardService';
import { UserProfile } from '../features/profile/profileManager';
import { getLanguage, translations, Language } from '../utils/i18n';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserProfile;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile
}) => {
  const [category, setCategory] = useState<'xp' | 'wins' | 'pistis'>('xp');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const lang = getLanguage() as Language;
  const t = translations[lang] || translations.tr;

  const loadData = async (cat: 'xp' | 'wins' | 'pistis') => {
    setIsLoading(true);
    const data = await fetchLeaderboard(cat);
    setEntries(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData(category);
    }
  }, [isOpen, category]);

  if (!isOpen) return null;

  const myRankEntry = entries.find(e => e.friendCode === currentUserProfile.friendCode);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-amber-400/30 shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-cyber tracking-wide uppercase">
                {lang === 'en' ? 'LEADERBOARD' : lang === 'de' ? 'BESTENLISTE' : lang === 'es' ? 'CLASIFICACIÓN' : 'LİDERLİK TABLOSU'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'en' ? 'Global Hall of Fame & Top Peeshtee Champions' : 'En İyi Oyuncular ve Küresel Sıralama'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                loadData(category);
              }}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950/70 border-b border-white/10 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setCategory('xp');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              category === 'xp'
                ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.levelLabel || 'Seviye'} & XP</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setCategory('wins');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              category === 'wins'
                ? 'bg-cyan-400 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Wins' : 'Galibiyet'}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setCategory('pistis');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              category === 'pistis'
                ? 'bg-orange-500 text-white shadow-sm font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{t.totalPistisLabel || 'Piştiler'}</span>
          </button>
        </div>

        {/* Leaderboard Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs font-cyber">{lang === 'en' ? 'Loading Champions...' : 'Sıralama Yükleniyor...'}</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              {lang === 'en' ? 'No players recorded yet. Play a match to climb the ranks!' : 'Henüz kayıtlı oyuncu yok. Maç yaparak zirveye tırman!'}
            </div>
          ) : (
            entries.map(entry => {
              const isTop1 = entry.rank === 1;
              const isTop2 = entry.rank === 2;
              const isTop3 = entry.rank === 3;
              const isMe = entry.friendCode === currentUserProfile.friendCode;

              return (
                <div
                  key={entry.friendCode}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-200 ${
                    isMe
                      ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                      : isTop1
                      ? 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : isTop2
                      ? 'bg-gradient-to-r from-slate-800/40 via-slate-900 to-slate-900 border-slate-400/40'
                      : isTop3
                      ? 'bg-gradient-to-r from-amber-900/20 via-slate-900 to-slate-900 border-amber-700/40'
                      : 'bg-slate-950/60 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-7 text-center shrink-0">
                      {isTop1 ? (
                        <span className="text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]">🥇</span>
                      ) : isTop2 ? (
                        <span className="text-xl">🥈</span>
                      ) : isTop3 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="font-mono font-black text-xs text-slate-400">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <AvatarBadge
                      avatarId={entry.avatarId}
                      customAvatarUrl={entry.avatarThumb || undefined}
                      size="sm"
                      isOwner={entry.isOwner}
                    />

                    {/* Player Info */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-white max-w-[120px] sm:max-w-[160px] truncate">
                          {entry.name}
                        </span>
                        {entry.isOwner && (
                          <span title="Kurucu" className="text-amber-400 text-xs">
                            👑
                          </span>
                        )}
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black">
                            {lang === 'en' ? 'YOU' : 'SEN'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono text-cyan-400">#{entry.friendCode}</span>
                        {entry.customTitle && (
                          <span className="truncate max-w-[110px] text-amber-300/80">
                            • {entry.customTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metric Value */}
                  <div className="text-right shrink-0">
                    {category === 'xp' ? (
                      <>
                        <div className="text-xs sm:text-sm font-black font-cyber text-amber-300">
                          LVL {entry.level}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {entry.xp} XP
                        </div>
                      </>
                    ) : category === 'wins' ? (
                      <>
                        <div className="text-xs sm:text-sm font-black font-cyber text-cyan-300">
                          {entry.wins + entry.unoWins} W
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {entry.wins} Pişti / {entry.unoWins} RENQ
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs sm:text-sm font-black font-cyber text-orange-400">
                          ⚡ {entry.pistiCount}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {lang === 'en' ? 'Total Piştis' : 'Toplam Pişti'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Current User Fixed Bottom Bar */}
        {myRankEntry && (
          <div className="px-5 py-3 border-t border-white/10 bg-slate-950/90 flex items-center justify-between text-xs font-bold text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Trophy className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Your Ranking:' : 'Senin Sıran:'}</span>
              <strong className="text-white font-mono text-sm font-black">#{myRankEntry.rank}</strong>
            </span>
            <span className="font-mono text-slate-400 text-[11px]">
              LVL {currentUserProfile.level || 1} • {currentUserProfile.xp || 0} XP
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
