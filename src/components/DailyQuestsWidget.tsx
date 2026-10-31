import React, { useState, useEffect } from 'react';
import { CalendarCheck, Check } from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import {
  UserProfile,
  getOrInitDailyTasks,
  checkAndAutoClaimDailyTasks,
  DailyTask,
  getUserProfile
} from '../features/profile/profileManager';
import { getLanguage, translations, Language } from '../utils/i18n';

interface DailyQuestsWidgetProps {
  userProfile: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
  onClose?: () => void;
  className?: string;
}

export const DailyQuestsWidget: React.FC<DailyQuestsWidgetProps> = ({
  userProfile,
  onProfileUpdated,
  onClose,
  className = ''
}) => {
  const [tasks, setTasks] = useState<DailyTask[]>(() => getOrInitDailyTasks(userProfile));
  const [autoClaimToast, setAutoClaimToast] = useState<string | null>(null);

  const lang = getLanguage() as Language;
  const t = translations[lang] || translations.tr;

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
          ? `🎉 +${res.claimedXp} XP auto-claimed!`
          : `🎉 +${res.claimedXp} XP otomatik eklendi!`
      );
      window.setTimeout(() => setAutoClaimToast(null), 3000);
    }
  }, [lang, onProfileUpdated]);

  const completedCount = tasks.filter(t => t.claimed).length;

  return (
    <div
      className={`rounded-3xl bg-slate-950/90 backdrop-blur-xl border border-white/15 p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${className}`}
    >
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Widget Header */}
      <div>
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-xs font-black text-white font-cyber tracking-wider uppercase">
              {t.tabTasks || 'GÖREVLER'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-amber-400/90 font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              {completedCount}/{tasks.length}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Kapat"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quests List */}
        <div className="space-y-2">
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
