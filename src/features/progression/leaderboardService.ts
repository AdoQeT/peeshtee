import { rtdb, ref, get, query, limitToLast } from '../../core/firebase';
import { logger } from '../../utils/logger';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  friendCode: string;
  name: string;
  avatarId: string;
  avatarThumb?: string | null;
  customTitle?: string | null;
  isOwner?: boolean;
  level: number;
  xp: number;
  wins: number;
  pistiCount: number;
  unoWins: number;
}

let cachedLeaderboard: { timestamp: number; data: LeaderboardEntry[] } | null = null;
const CACHE_DURATION_MS = 25000; // 25s cache

export async function fetchLeaderboard(
  category: 'xp' | 'wins' | 'pistis' = 'xp'
): Promise<LeaderboardEntry[]> {
  const now = Date.now();
  if (cachedLeaderboard && now - cachedLeaderboard.timestamp < CACHE_DURATION_MS) {
    return sortLeaderboardEntries(cachedLeaderboard.data, category);
  }

  try {
    if (!rtdb) return getFallbackLeaderboard(category);

    const profilesQuery = query(ref(rtdb, 'profiles'), limitToLast(60));
    const snap = await get(profilesQuery);

    if (snap.exists()) {
      const raw = snap.val();
      const entries: LeaderboardEntry[] = [];

      Object.keys(raw).forEach(key => {
        const p = raw[key];
        if (p && typeof p.name === 'string') {
          entries.push({
            rank: 0,
            id: p.id || key,
            friendCode: p.friendCode || key,
            name: p.name,
            avatarId: p.avatarId || 'wolf',
            avatarThumb: p.avatarThumb || undefined,
            customTitle: p.customTitle || undefined,
            isOwner: Boolean(p.isOwner),
            level: typeof p.level === 'number' ? p.level : 1,
            xp: typeof p.xp === 'number' ? p.xp : 0,
            wins: p.stats?.wins || 0,
            pistiCount: p.stats?.pistiCount || 0,
            unoWins: p.stats?.unoWins || 0
          });
        }
      });

      cachedLeaderboard = { timestamp: now, data: entries };
      return sortLeaderboardEntries(entries, category);
    }
  } catch (err) {
    logger.warn('Failed to fetch leaderboard from RTDB:', err);
  }

  return getFallbackLeaderboard(category);
}

function sortLeaderboardEntries(
  entries: LeaderboardEntry[],
  category: 'xp' | 'wins' | 'pistis'
): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (category === 'wins') {
      return (b.wins + b.unoWins) - (a.wins + a.unoWins) || b.xp - a.xp;
    }
    if (category === 'pistis') {
      return b.pistiCount - a.pistiCount || b.xp - a.xp;
    }
    return b.xp - a.xp || b.level - a.level;
  });

  return sorted.slice(0, 25).map((entry, idx) => ({
    ...entry,
    rank: idx + 1
  }));
}

function getFallbackLeaderboard(category: 'xp' | 'wins' | 'pistis'): LeaderboardEntry[] {
  const sample: LeaderboardEntry[] = [
    {
      rank: 1,
      id: 'bot-1',
      friendCode: '772190',
      name: 'Ado',
      avatarId: 'wolf',
      customTitle: '👑 Geliştirici & Kurucu',
      isOwner: true,
      level: 6,
      xp: 2450,
      wins: 28,
      pistiCount: 42,
      unoWins: 14
    },
    {
      rank: 2,
      id: 'bot-2',
      friendCode: '581290',
      name: 'Gölge Şampiyon',
      avatarId: 'cyber_samurai',
      customTitle: '🃏 Kart Cambazı',
      isOwner: false,
      level: 4,
      xp: 1420,
      wins: 19,
      pistiCount: 26,
      unoWins: 8
    },
    {
      rank: 3,
      id: 'bot-3',
      friendCode: '319082',
      name: 'Kıraathane Reisi',
      avatarId: 'dayi',
      customTitle: 'Batak & Pişti Pirî',
      isOwner: false,
      level: 3,
      xp: 980,
      wins: 12,
      pistiCount: 19,
      unoWins: 5
    }
  ];

  return sortLeaderboardEntries(sample, category);
}
