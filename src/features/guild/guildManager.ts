import { ref, get, set, update } from 'firebase/database';
import { rtdb as db, ensureFirebaseAuth } from '../../core/firebase';
import { UserProfile } from '../profile/profileManager';
import { logger } from '../../utils/logger';

export interface GuildMember {
  friendCode: string;
  name: string;
  avatarId: string;
  elo: number;
  xp: number;
  role: 'leader' | 'member';
  joinedAt: number;
}

export interface GuildDailyQuest {
  dateKey: string;
  title: string;
  target: number;
  progress: number;
  rewardXp: number;
}

export interface GuildData {
  code: string;
  name: string;
  tag: string;
  emblem: string;
  leaderCode: string;
  createdAt: number;
  totalXp: number;
  totalWins: number;
  members: Record<string, GuildMember>;
  dailyQuest: GuildDailyQuest;
}

const LOCAL_GUILD_KEY = 'project_p_my_guild_code';
const LOCAL_GUILD_CACHE_KEY = 'project_p_guild_cache';

const GUILD_QUEST_POOL = [
  { title: 'Lonca olarak 10 maç tamamla', target: 10, rewardXp: 250 },
  { title: 'Lonca üyeleriyle 5 galibiyet al', target: 5, rewardXp: 300 },
  { title: 'Lonca toplam 500 XP kazan', target: 500, rewardXp: 280 },
  { title: 'Lonca olarak 8 Pişti veya RENQ eli oyna', target: 8, rewardXp: 260 }
];

export const GUILD_EMBLEMS = ['🛡️', '⚔️', '👑', '🐉', '🔥', '🦅', '🐺', '💎'];

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildDailyGuildQuest(dateKey: string = getTodayKey()): GuildDailyQuest {
  const hash = dateKey.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const template = GUILD_QUEST_POOL[hash % GUILD_QUEST_POOL.length];
  return {
    dateKey,
    title: template.title,
    target: template.target,
    progress: 0,
    rewardXp: template.rewardXp
  };
}

function generateGuildCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'GLD-';
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function getMyGuildCode(): string | null {
  try {
    return localStorage.getItem(LOCAL_GUILD_KEY);
  } catch {
    return null;
  }
}

function saveLocalGuildCache(guild: GuildData | null) {
  try {
    if (!guild) {
      localStorage.removeItem(LOCAL_GUILD_KEY);
      localStorage.removeItem(LOCAL_GUILD_CACHE_KEY);
    } else {
      localStorage.setItem(LOCAL_GUILD_KEY, guild.code);
      localStorage.setItem(LOCAL_GUILD_CACHE_KEY, JSON.stringify(guild));
    }
  } catch {}
}

export function getCachedGuild(): GuildData | null {
  try {
    const raw = localStorage.getItem(LOCAL_GUILD_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuildData;
  } catch {
    return null;
  }
}

export async function createGuild(
  name: string,
  tag: string,
  emblem: string,
  profile: UserProfile
): Promise<GuildData> {
  const cleanName = name.trim().slice(0, 28) || 'Peeshtee Loncası';
  const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'PST';
  const code = generateGuildCode();
  const member: GuildMember = {
    friendCode: profile.friendCode,
    name: profile.name,
    avatarId: profile.avatarId || 'wolf',
    elo: profile.elo || 1000,
    xp: profile.xp || 0,
    role: 'leader',
    joinedAt: Date.now()
  };

  const guild: GuildData = {
    code,
    name: cleanName,
    tag: cleanTag,
    emblem: emblem || '🛡️',
    leaderCode: profile.friendCode,
    createdAt: Date.now(),
    totalXp: profile.xp || 0,
    totalWins: profile.stats?.wins || 0,
    members: { [profile.friendCode]: member },
    dailyQuest: buildDailyGuildQuest()
  };

  saveLocalGuildCache(guild);

  try {
    await ensureFirebaseAuth();
    if (db) {
      await set(ref(db, `guilds/${code}`), guild);
    }
  } catch (err) {
    logger.warn('Guild RTDB create fallback to local cache:', err);
  }

  return guild;
}

export async function fetchGuild(code: string): Promise<GuildData | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;
  try {
    await ensureFirebaseAuth();
    if (db) {
      const snap = await get(ref(db, `guilds/${cleanCode}`));
      if (snap.exists()) {
        const data = snap.val() as GuildData;
        const today = getTodayKey();
        if (!data.dailyQuest || data.dailyQuest.dateKey !== today) {
          data.dailyQuest = buildDailyGuildQuest(today);
        }
        return data;
      }
    }
  } catch (err) {
    logger.warn('Guild RTDB fetch error:', err);
  }
  const cached = getCachedGuild();
  return cached && cached.code === cleanCode ? cached : null;
}

export async function joinGuild(code: string, profile: UserProfile): Promise<GuildData | null> {
  const normalized = code.trim().toUpperCase().startsWith('GLD-')
    ? code.trim().toUpperCase()
    : `GLD-${code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

  const existing = await fetchGuild(normalized);
  if (!existing) return null;

  const member: GuildMember = {
    friendCode: profile.friendCode,
    name: profile.name,
    avatarId: profile.avatarId || 'wolf',
    elo: profile.elo || 1000,
    xp: profile.xp || 0,
    role: existing.leaderCode === profile.friendCode ? 'leader' : 'member',
    joinedAt: Date.now()
  };

  const updated: GuildData = {
    ...existing,
    totalXp: existing.members?.[profile.friendCode]
      ? existing.totalXp
      : (existing.totalXp || 0) + (profile.xp || 0),
    members: {
      ...(existing.members || {}),
      [profile.friendCode]: member
    }
  };

  saveLocalGuildCache(updated);
  try {
    await ensureFirebaseAuth();
    if (db) {
      await update(ref(db, `guilds/${normalized}`), {
        [`members/${profile.friendCode}`]: member,
        totalXp: updated.totalXp
      });
    }
  } catch (err) {
    logger.warn('Guild RTDB join error:', err);
  }
  return updated;
}

export async function leaveGuild(profile: UserProfile): Promise<void> {
  const code = getMyGuildCode();
  saveLocalGuildCache(null);
  if (!code) return;

  try {
    await ensureFirebaseAuth();
    if (db) {
      await set(ref(db, `guilds/${code}/members/${profile.friendCode}`), null);
    }
  } catch (err) {
    logger.warn('Guild RTDB leave error:', err);
  }
}

export async function fetchGuildLeaderboard(): Promise<GuildData[]> {
  try {
    await ensureFirebaseAuth();
    if (db) {
      const snap = await get(ref(db, 'guilds'));
      if (snap.exists()) {
        const raw = snap.val() as Record<string, GuildData>;
        return Object.values(raw)
          .filter(g => g && g.code && g.name)
          .sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0))
          .slice(0, 20);
      }
    }
  } catch (err) {
    logger.warn('Guild leaderboard fetch error:', err);
  }
  const cached = getCachedGuild();
  return cached ? [cached] : [];
}
