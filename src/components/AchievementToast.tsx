import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { UnlockedAchievementNotification, onAchievementUnlocked } from '../features/progression/achievements';
import { getLanguage, translations, Language } from '../utils/i18n';

interface AchievementToastProps {
  achievement?: UnlockedAchievementNotification | null;
  onClose?: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement: propAch, onClose: propOnClose }) => {
  const [internalAch, setInternalAch] = useState<UnlockedAchievementNotification | null>(null);
  const activeAch = propAch !== undefined ? propAch : internalAch;
  const lang = getLanguage() as Language;
  const t = translations[lang] || translations.tr;

  useEffect(() => {
    if (propAch !== undefined) return;
    const unsub = onAchievementUnlocked(ach => {
      setInternalAch(ach);
    });
    return unsub;
  }, [propAch]);

  useEffect(() => {
    if (!activeAch) return;
    const timer = window.setTimeout(() => {
      if (propOnClose) {
        propOnClose();
      } else {
        setInternalAch(null);
      }
    }, 3800);
    return () => window.clearTimeout(timer);
  }, [activeAch, propOnClose]);

  if (!activeAch) return null;

  const title = (t as any)[activeAch.title] || activeAch.title;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-in fade-in slide-in-from-top-6 duration-300">
      <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-amber-950/95 border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.5)] backdrop-blur-xl flex items-center gap-3.5 max-w-sm sm:max-w-md">
        <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(251,191,36,0.8)] shrink-0 animate-bounce">
          {activeAch.icon || '🏆'}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-black font-cyber tracking-widest text-amber-300 uppercase">
              {lang === 'en' ? 'ACHIEVEMENT UNLOCKED!' : 'BAŞARIM KİLİDİ AÇILDI!'}
            </span>
          </div>
          <h4 className="text-xs sm:text-sm font-black text-white font-cyber tracking-wide">
            {title}
          </h4>
        </div>

        <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-black text-xs shrink-0">
          <Sparkles className="w-3 h-3" />
          <span>+{activeAch.rewardXp} XP</span>
        </div>
      </div>
    </div>
  );
};
