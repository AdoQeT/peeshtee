import { UserProfile, addXp } from '../profile/profileManager';
import { sound } from '../../core/audio/soundEngine';

export interface Achievement {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  rewardXp: number;
  condition: (profile: UserProfile, context?: AchievementContext) => boolean;
}

export interface AchievementContext {
  justPisti?: boolean;
  justDoublePisti?: boolean;
  justPlayedCard?: { isJack?: boolean; value?: number };
  sweptCount?: number;
  score?: number;
  isUnoWild4?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_pisti',
    icon: '🂡',
    titleKey: 'achFirstPistiTitle',
    descKey: 'achFirstPistiDesc',
    rewardXp: 60,
    condition: (p, ctx) => (p.stats.pistiCount || 0) >= 1 || Boolean(ctx?.justPisti)
  },
  {
    id: 'double_pisti_master',
    icon: '👑',
    titleKey: 'achDoublePistiTitle',
    descKey: 'achDoublePistiDesc',
    rewardXp: 120,
    condition: (p, ctx) => (p.stats.doublePistiCount || 0) >= 1 || Boolean(ctx?.justDoublePisti)
  },
  {
    id: 'win_streak_3',
    icon: '⚡',
    titleKey: 'achStreak3Title',
    descKey: 'achStreak3Desc',
    rewardXp: 150,
    condition: (p) => (p.stats.currentStreak || 0) >= 3 || (p.stats.bestWinStreak || 0) >= 3
  },
  {
    id: 'renq_wild_storm',
    icon: '🌈',
    titleKey: 'achRenqWildTitle',
    descKey: 'achRenqWildDesc',
    rewardXp: 90,
    condition: (_p, ctx) => Boolean(ctx?.isUnoWild4)
  },
  {
    id: 'century_score',
    icon: '🎯',
    titleKey: 'achCenturyTitle',
    descKey: 'achCenturyDesc',
    rewardXp: 100,
    condition: (p, ctx) => (p.stats.highestScore || 0) >= 100 || (ctx?.score || 0) >= 100
  },
  {
    id: 'table_sovereign',
    icon: '💎',
    titleKey: 'achLevel5Title',
    descKey: 'achLevel5Desc',
    rewardXp: 200,
    condition: (p) => (p.level || 1) >= 5
  },
  {
    id: 'arcade_veteran',
    icon: '🚀',
    titleKey: 'achVeteranTitle',
    descKey: 'achVeteranDesc',
    rewardXp: 120,
    condition: (p) => ((p.stats.matchesPlayed || 0) + (p.stats.unoMatchesPlayed || 0)) >= 10
  },
  {
    id: 'grand_sweep',
    icon: '🧹',
    titleKey: 'achGrandSweepTitle',
    descKey: 'achGrandSweepDesc',
    rewardXp: 80,
    condition: (_p, ctx) => (ctx?.sweptCount || 0) >= 8
  }
];

export interface UnlockedAchievementNotification {
  id: string;
  icon: string;
  title: string;
  rewardXp: number;
}

type AchievementListener = (ach: UnlockedAchievementNotification) => void;
const listeners = new Set<AchievementListener>();

export function onAchievementUnlocked(listener: AchievementListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerAchievementUnlock(ach: UnlockedAchievementNotification) {
  listeners.forEach(l => {
    try {
      l(ach);
    } catch (e) {
      console.error('Achievement listener error:', e);
    }
  });
}

export function checkAndUnlockAchievements(
  profile: UserProfile,
  context?: AchievementContext,
  onUnlock?: (achievement: UnlockedAchievementNotification) => void
): { newlyUnlocked: Achievement[]; updatedProfile: UserProfile } {
  const currentUnlocked = new Set(profile.unlockedAchievements || []);
  const newlyUnlocked: Achievement[] = [];
  let totalBonusXp = 0;

  for (const ach of ACHIEVEMENTS) {
    if (!currentUnlocked.has(ach.id)) {
      if (ach.condition(profile, context)) {
        currentUnlocked.add(ach.id);
        newlyUnlocked.push(ach);
        totalBonusXp += ach.rewardXp;
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    profile.unlockedAchievements = Array.from(currentUnlocked);
    if (totalBonusXp > 0) {
      addXp(totalBonusXp);
    }
    sound.playPointCardChime(3);

    newlyUnlocked.forEach(ach => {
      const payload: UnlockedAchievementNotification = {
        id: ach.id,
        icon: ach.icon,
        title: ach.titleKey,
        rewardXp: ach.rewardXp
      };
      if (onUnlock) {
        onUnlock(payload);
      }
      triggerAchievementUnlock(payload);
    });
  }

  return { newlyUnlocked, updatedProfile: profile };
}
