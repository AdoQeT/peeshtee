import React, { useState } from 'react';
import { Sparkles, CalendarCheck, Check, Gift } from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import {
  UserProfile,
  calculateLevel,
  getOrInitDailyTasks,
  claimDailyTaskReward,
  DailyTask,
  getUserProfile
} from '../features/profile/profileManager';
import { getLanguage, translations, Language } from '../utils/i18n';

interface DailyQuestsWidgetProps {
  userProfile: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
  className?: string;
}

export const DailyQuestsWidget: React.FC<DailyQuestsWidgetProps> = ({
  userProfile,
  onProfileUpdated,
  className = ''
}) => {
  const [tasks, setTasks] = useState<DailyTask[]>(() => getOrInitDailyTasks(userProfile));
  const [claimedRewardToast, setClaimedRewardToast] = useState<string | null>(null);

  const lang = getLanguage() as Language;
  const t = translations[lang] || translations.tr;

  const lvlInfo = calculateLevel(userProfile.xp || 0);

  const handleClaim = (taskId: string) => {
    sound.playClick();
    const result = claimDailyTaskReward(taskId);
    if (result) {
      sound.playMatchSweep();
      const updatedTasks = getOrInitDailyTasks();
      setTasks([...updatedTasks]);
      const freshProfile = getUserProfile();
      if (onProfileUpdated) {
        onProfileUpdated(freshProfile);
      }
      setClaimedRewardToast(`+${result.rewardXp} XP!`);
      window.setTimeout(() => setClaimedRewardToast(null), 2500);
    }
  };

  const unclaimedCount = tasks.filter(t => t.current >= t.target && !t.claimed).length;

  return (
    <div
      className={`rounded-3xl bg-slate-950/85 backdrop-blur-xl border border-white/15 p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${className}`}
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Widget Header & Level Card */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-black text-white font-cyber tracking-wider uppercase">
              {t.tabTasks || 'GÖREVLER'}
            </h3>
          </div>
          {unclaimedCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black animate-pulse flex items-center gap-1 shadow-md">
              <Gift className="w-3 h-3" />
              <span>{unclaimedCount} {lang === 'en' ? 'Ready' : 'Hazır'}</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono text-slate-400">
              00:00 ↻
            </span>
          )}
        </div>

        {/* Level & XP Progress Section */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 mb-3 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-black text-[10px]">
                <Sparkles className="w-3 h-3" />
              </div>
              <span className="text-amber-300 font-cyber font-black tracking-wide">
                {t.levelLabel ? t.levelLabel.toUpperCase() : 'SEVİYE'} {lvlInfo.level}
              </span>
            </div>
            <span className="text-slate-300 font-mono text-[11px]">
              {lvlInfo.currentLevelXp} <span className="text-slate-500">/</span> {lvlInfo.xpForNextLevel} XP
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/10 relative">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-500"
              style={{ width: `${lvlInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quests List */}
        <div className="space-y-2.5">
          {tasks.map(task => {
            const isDone = task.current >= task.target;
            const pct = Math.min(100, Math.round((task.current / task.target) * 100));

            return (
              <div
                key={task.id}
                className={`p-2.5 rounded-2xl border transition-all ${
                  task.claimed
                    ? 'bg-slate-950/40 border-white/5 opacity-60'
                    : isDone
                    ? 'bg-amber-950/30 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'bg-slate-900/70 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{task.icon}</span>
                    <div>
                      <h4 className="text-[11px] font-bold text-white leading-tight">{task.title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{task.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                      +{task.rewardXp}
                    </span>
                    {task.claimed ? (
                      <span className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-800 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    ) : isDone ? (
                      <button
                        type="button"
                        onClick={() => handleClaim(task.id)}
                        className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-[10px] font-black cursor-pointer shadow animate-pulse"
                      >
                        {lang === 'en' ? 'Claim' : 'Al'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {task.current}/{task.target}
                      </span>
                    )}
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      task.claimed
                        ? 'bg-slate-600'
                        : isDone
                        ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                        : 'bg-cyan-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claim Toast / Feedback notification */}
      {claimedRewardToast && (
        <div className="mt-2.5 py-1 px-2.5 rounded-xl bg-amber-400/90 text-slate-950 text-xs font-black text-center shadow-lg animate-in fade-in zoom-in-95">
          🎉 {claimedRewardToast}
        </div>
      )}
    </div>
  );
};
