import React, { useState, useEffect } from 'react';
import { Sparkles, CalendarCheck, Check } from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import {
  UserProfile,
  calculateLevel,
  getOrInitDailyTasks,
  checkAndAutoClaimDailyTasks,
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
  const [autoClaimToast, setAutoClaimToast] = useState<string | null>(null);

  const lang = getLanguage() as Language;
  const t = translations[lang] || translations.tr;

  const lvlInfo = calculateLevel(userProfile.xp || 0);

  // Automatically claim any finished tasks on mount or when profile updates
  useEffect(() => {
    const res = checkAndAutoClaimDailyTasks();
    if (res.claimedXp > 0) {
      sound.playMatchSweep();
      const updatedTasks = getOrInitDailyTasks();
      setTasks([...updatedTasks]);
      const freshProfile = getUserProfile();
      if (onProfileUpdated) {
        onProfileUpdated(freshProfile);
      }
      setAutoClaimToast(
        lang === 'en'
          ? `🎉 Quest Complete! +${res.claimedXp} XP auto-claimed!`
          : `🎉 Görev Tamamlandı! +${res.claimedXp} XP otomatik eklendi!`
      );
      window.setTimeout(() => setAutoClaimToast(null), 3000);
    }
  }, [lang, onProfileUpdated]);

  const completedCount = tasks.filter(t => t.claimed).length;

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
          <span className="text-[10px] font-mono text-amber-400/90 font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            {completedCount}/{tasks.length} {lang === 'en' ? 'Done' : 'Bitti'}
          </span>
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
            const isDone = task.current >= task.target || task.claimed;
            const pct = isDone ? 100 : Math.min(100, Math.round((task.current / task.target) * 100));

            return (
              <div
                key={task.id}
                className={`p-2.5 rounded-2xl border transition-all ${
                  task.claimed
                    ? 'bg-slate-950/40 border-emerald-500/20'
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
                    {task.claimed ? (
                      <span className="text-[10px] text-emerald-400 font-black px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>+{task.rewardXp} XP</span>
                      </span>
                    ) : (
                      <>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                          +{task.rewardXp} XP
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {task.current}/{task.target}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      task.claimed
                        ? 'bg-emerald-400'
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

      {/* Auto-Claim Toast Notification */}
      {autoClaimToast && (
        <div className="mt-2.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black text-center shadow-lg animate-in fade-in zoom-in-95">
          {autoClaimToast}
        </div>
      )}
    </div>
  );
};
