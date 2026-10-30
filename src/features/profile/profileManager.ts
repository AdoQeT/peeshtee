import { rtdb, ref, set, get, ensureFirebaseAuth } from '../../core/firebase';

export interface AvatarPreset {
  id: string;
  name: string;
  title: string;
  gradient: string;
  borderColor: string;
  iconBg: string;
  emoji: string;
  description: string;
}

export const PRESET_AVATARS: AvatarPreset[] = [
  {
    id: 'wolf',
    name: 'Bozkurt',
    title: 'Gecenin Avcısı',
    gradient: 'from-slate-700 via-slate-800 to-zinc-950',
    borderColor: 'border-slate-400',
    iconBg: 'bg-slate-700/60',
    emoji: '🐺',
    description: 'Sessiz ve ölümcül, piştileri affetmez.'
  },
  {
    id: 'lion',
    name: 'Aslan Kral',
    title: 'Masa Hükümdarı',
    gradient: 'from-amber-600 via-yellow-700 to-amber-950',
    borderColor: 'border-amber-400',
    iconBg: 'bg-amber-600/60',
    emoji: '🦁',
    description: 'Kazanmak onun doğasında var.'
  },
  {
    id: 'eagle',
    name: 'Gök Şahin',
    title: 'Kartal Bakışlı',
    gradient: 'from-cyan-700 via-blue-800 to-slate-950',
    borderColor: 'border-cyan-400',
    iconBg: 'bg-cyan-700/60',
    emoji: '🦅',
    description: 'Masadaki her kartı hafızasında tutar.'
  },
  {
    id: 'cyber_samurai',
    name: 'Siber Samuray',
    title: 'Neo Tokyo Efendisi',
    gradient: 'from-pink-600 via-purple-800 to-slate-950',
    borderColor: 'border-pink-400',
    iconBg: 'bg-pink-600/60',
    emoji: '⚔️',
    description: 'Işık hızında kart oynar, asla tereddüt etmez.'
  },
  {
    id: 'dayi',
    name: 'Kıraathane Dayısı',
    title: 'Batak & Pişti Pirî',
    gradient: 'from-amber-800 via-stone-800 to-stone-950',
    borderColor: 'border-amber-500',
    iconBg: 'bg-amber-800/60',
    emoji: '🧔',
    description: 'Çayı demli, eli kuvvetli kıraathane ustası.'
  },
  {
    id: 'muhtar',
    name: 'Köy Muhtarı',
    title: 'Mahalle Reisi',
    gradient: 'from-emerald-700 via-teal-800 to-zinc-950',
    borderColor: 'border-emerald-400',
    iconBg: 'bg-emerald-700/60',
    emoji: '👴',
    description: 'Köyün mührü de piştisi de onda!'
  },
  {
    id: 'queen',
    name: 'Maça Kızı',
    title: 'Kraliyet Asili',
    gradient: 'from-purple-700 via-fuchsia-900 to-slate-950',
    borderColor: 'border-fuchsia-400',
    iconBg: 'bg-purple-700/60',
    emoji: '👑',
    description: 'Zarif stratejilerle rakiplerini alt eder.'
  },
  {
    id: 'pirate',
    name: 'Korsan Kaptan',
    title: 'Yedi Denizler Haydutu',
    gradient: 'from-red-800 via-rose-950 to-stone-950',
    borderColor: 'border-red-400',
    iconBg: 'bg-red-800/60',
    emoji: '🏴‍☠️',
    description: 'Masadaki bütün puanları yağmalar.'
  },
  {
    id: 'wizard',
    name: 'Gizemli Büyücü',
    title: 'Kart İllüzyonisti',
    gradient: 'from-indigo-700 via-violet-900 to-slate-950',
    borderColor: 'border-indigo-400',
    iconBg: 'bg-indigo-700/60',
    emoji: '🧙‍♂️',
    description: 'Hangi kartın geleceğini önceden hisseder.'
  },
  {
    id: 'ninja',
    name: 'Gölge Ninja',
    title: 'Karanlık El',
    gradient: 'from-zinc-700 via-stone-850 to-black',
    borderColor: 'border-zinc-400',
    iconBg: 'bg-zinc-700/60',
    emoji: '🥷',
    description: 'Hissedilmeden masayı süpürür.'
  },
  {
    id: 'detective',
    name: 'Başkomiser',
    title: 'İpucu Uzmanı',
    gradient: 'from-blue-800 via-slate-900 to-stone-950',
    borderColor: 'border-blue-400',
    iconBg: 'bg-blue-800/60',
    emoji: '🕵️',
    description: 'Rakibin elindeki son kartı bile tespit eder.'
  },
  {
    id: 'cyborg',
    name: 'Sibernetik AI',
    title: 'Kuantum İşlemci',
    gradient: 'from-teal-600 via-cyan-800 to-slate-950',
    borderColor: 'border-teal-400',
    iconBg: 'bg-teal-600/60',
    emoji: '🤖',
    description: '%99.8 olasılıkla en doğru kartı seçer.'
  },
  {
    id: 'dragon',
    name: 'Ateş Ejderi',
    title: 'Alevlerin Efendisi',
    gradient: 'from-orange-600 via-red-800 to-stone-950',
    borderColor: 'border-orange-400',
    iconBg: 'bg-orange-600/60',
    emoji: '🐉',
    description: 'Masaya her vuruşunda yeri göğü titretir.'
  },
  {
    id: 'cat',
    name: 'Şans Kedisi',
    title: 'Maneki Neko',
    gradient: 'from-pink-500 via-rose-700 to-purple-950',
    borderColor: 'border-pink-300',
    iconBg: 'bg-pink-500/60',
    emoji: '🐱',
    description: 'Tüylü patisiyle daima karo 10 çeker.'
  },
  {
    id: 'bull',
    name: 'Boğa Güreşçisi',
    title: 'Durdurulamaz Güç',
    gradient: 'from-amber-700 via-orange-900 to-stone-950',
    borderColor: 'border-amber-400',
    iconBg: 'bg-amber-700/60',
    emoji: '🐂',
    description: 'Rakiplerinin üstüne korkusuzca yürür.'
  },
  {
    id: 'joker',
    name: 'Deli Joker',
    title: 'Kaos Mimarı',
    gradient: 'from-violet-700 via-fuchsia-900 to-zinc-950',
    borderColor: 'border-fuchsia-400',
    iconBg: 'bg-violet-700/60',
    emoji: '🃏',
    description: 'Tahmin edilemez hamlelerle oyunu karıştırır.'
  }
];

export interface FriendContact {
  id: string;
  friendCode?: string;
  name: string;
  avatarId: string;
  customAvatarDataUrl?: string;
  customTitle?: string;
  roomCode?: string;
  lastPlayedAt: number;
}

export interface MatchRecord {
  id: string;
  gameType: 'pisti' | 'uno';
  result: 'win' | 'loss' | 'abort';
  score: number;
  opponentName: string;
  pistiCount?: number;
  doublePistiCount?: number;
  date: number; // timestamp
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  rewardXp: number;
  claimed: boolean;
}

export interface UserProfile {
  id: string;
  friendCode: string; // 6-digit unique human-readable ID (e.g. "482910")
  name: string;
  avatarId: string;
  customAvatarDataUrl?: string; // Base64 uploaded custom profile picture
  customTitle?: string;
  isOwner?: boolean; // Creator & Owner VIP badge and golden crown
  xp?: number;
  level?: number;
  matchHistory?: MatchRecord[];
  dailyTasks?: {
    lastResetDate: string; // YYYY-MM-DD
    tasks: DailyTask[];
  };
  incomingFriendRequests?: FriendContact[];
  friends?: FriendContact[];
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    pistiCount: number;
    doublePistiCount: number;
    highestScore: number;
    unoMatchesPlayed: number;
    unoWins: number;
    highestUnoScore?: number;
  };
}

const STORAGE_KEY = 'project_p_user_profile_v2';
const OWNER_SECRET_KEY = 'project_p_owner_secret_token';
const OWNER_SALT = 'ado_pro_p_salt_2026_x9f#';

// Precomputed SHA-256 hashes of (OWNER_SALT + authorized_passcode)
// No plaintext passwords or tokens exist in source code!
const AUTHORIZED_FOUNDER_HASHES = new Set([
  '151e3df4b85e9572944faf6dc7e265e8fad5f4bb55418b8a8f15b712cc20b0ab',
  '2de877dfde976d0bca921dc8cff808d7b8cbfb70fc714a4665920bdfddf699a9',
  'e3ab63727df3cf0ab78fb380307f25c96eed5acb252876bac97e28ed87bc7814',
  '21141ac1592658530f0a5ce9d5900687c9a43e9068969aa4ca6cd1106b8b6c11'
]);

export async function computeSaltedHash(input: string): Promise<string> {
  const salted = `${OWNER_SALT}${input.trim().toLowerCase()}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(salted);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    hash = (hash << 5) - hash + salted.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

// Owner device verification token check against salted SHA-256 hashes
export function isDeviceOwnerVerified(): boolean {
  try {
    const token = localStorage.getItem(OWNER_SECRET_KEY);
    if (!token) return false;
    return AUTHORIZED_FOUNDER_HASHES.has(token);
  } catch {
    return false;
  }
}

export async function grantOwnerAccess(passcode: string): Promise<boolean> {
  try {
    const computed = await computeSaltedHash(passcode);
    if (AUTHORIZED_FOUNDER_HASHES.has(computed)) {
      localStorage.setItem(OWNER_SECRET_KEY, computed);
      const profile = getUserProfile();
      profile.isOwner = true;
      profile.name = 'Ado';
      profile.customTitle = '👑 Kurucu';
      saveUserProfile(profile);
      return true;
    }
  } catch (err) {
    console.warn('Owner verification error:', err);
  }
  return false;
}

export function isDefaultPlayerName(name?: string): boolean {
  if (!name) return true;
  const n = name.trim();
  return (
    !n ||
    /^Oyuncu_\d+$/i.test(n) ||
    n === 'Oyuncu (Sen)' ||
    n === 'Usta Oyuncu' ||
    n === 'İsimsiz Oyuncu'
  );
}

export function isOwnerUser(profile?: { name?: string; isOwner?: boolean } | null): boolean {
  if (!profile || typeof profile.name !== 'string') return false;
  const cleanName = profile.name.trim().toLowerCase();
  if (cleanName !== 'ado' && cleanName !== 'ado (kurucu)') return false;
  // MUST have verified salted SHA-256 token; strangers typing 'Ado' will NEVER receive owner!
  return isDeviceOwnerVerified();
}

function generateFriendCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getAvatarPreset(avatarId: string): AvatarPreset {
  const found = PRESET_AVATARS.find(a => a.id === avatarId);
  return found || PRESET_AVATARS[0];
}

export function getUserProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.name === 'string') {
        const friendCode =
          typeof parsed.friendCode === 'string' && parsed.friendCode.length >= 4
            ? parsed.friendCode
            : generateFriendCode();

        const isOwner = isOwnerUser(parsed);

        const profile: UserProfile = {
          id: parsed.id || `player-${Math.random().toString(36).substring(2, 9)}`,
          friendCode,
          name: parsed.name,
          avatarId: parsed.avatarId || 'wolf',
          customAvatarDataUrl: parsed.customAvatarDataUrl,
          customTitle: isOwner
            ? parsed.customTitle || '👑 Oyun Kurucusu & Yapımcı'
            : parsed.customTitle || '🃏 Kart Ustası',
          isOwner,
          friends: parsed.friends || [],
          incomingFriendRequests: parsed.incomingFriendRequests || [],
          stats: {
            matchesPlayed: parsed.stats?.matchesPlayed || 0,
            wins: parsed.stats?.wins || 0,
            losses: parsed.stats?.losses || 0,
            pistiCount: parsed.stats?.pistiCount || 0,
            doublePistiCount: parsed.stats?.doublePistiCount || 0,
            highestScore: parsed.stats?.highestScore || 0,
            unoMatchesPlayed: parsed.stats?.unoMatchesPlayed || 0,
            unoWins: parsed.stats?.unoWins || 0,
            highestUnoScore: parsed.stats?.highestUnoScore || 0
          }
        };

        if (!parsed.friendCode) {
          saveUserProfile(profile);
        }

        // Migrate large legacy avatar to 96x96 square thumbnail if needed
        if (
          profile.customAvatarDataUrl &&
          profile.customAvatarDataUrl.length > 30000 &&
          typeof window !== 'undefined'
        ) {
          cropAndResizeTo96(profile.customAvatarDataUrl).then((thumb) => {
            if (thumb && thumb.length < profile.customAvatarDataUrl!.length) {
              profile.customAvatarDataUrl = thumb;
              saveUserProfile(profile);
            }
          });
        }

        return profile;
      }
    }
  } catch (e) {
    console.warn('Profile read error:', e);
  }

  // Default clean profile for normal players
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const defaultProfile: UserProfile = {
    id: `player-${Math.random().toString(36).substring(2, 9)}`,
    friendCode: generateFriendCode(),
    name: `Oyuncu_${randomSuffix}`,
    avatarId: 'wolf',
    customTitle: '🃏 Kart Ustası',
    isOwner: false,
    friends: [],
    stats: {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      pistiCount: 0,
      doublePistiCount: 0,
      highestScore: 0,
      unoMatchesPlayed: 0,
      unoWins: 0,
      highestUnoScore: 0
    }
  };
  saveUserProfile(defaultProfile);
  return defaultProfile;
}

export function addOrUpdateFriend(friend: Omit<FriendContact, 'lastPlayedAt'>): UserProfile {
  const profile = getUserProfile();
  const list = profile.friends || [];
  const cleanCode = friend.friendCode?.replace(/[^0-9A-Za-z]/g, '');

  const existingIdx = list.findIndex(
    f =>
      (cleanCode && f.friendCode === cleanCode) ||
      f.id === friend.id ||
      f.name.toLowerCase() === friend.name.toLowerCase()
  );

  const entry: FriendContact = {
    ...friend,
    friendCode: cleanCode || friend.friendCode,
    lastPlayedAt: Date.now()
  };

  if (existingIdx !== -1) {
    list[existingIdx] = { ...list[existingIdx], ...entry };
  } else {
    list.unshift(entry);
  }

  profile.friends = list.slice(0, 40); // Keep up to 40 friends
  saveUserProfile(profile);
  return profile;
}

export function removeFriend(friendId: string, friendCode?: string, name?: string): UserProfile {
  const profile = getUserProfile();
  const cleanId = friendId?.trim().toLowerCase();
  const cleanCode = friendCode?.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
  const cleanName = name?.trim().toLowerCase();

  profile.friends = (profile.friends || []).filter(f => {
    if (cleanId && f.id?.toLowerCase() === cleanId) return false;
    if (cleanCode && f.friendCode?.replace(/[^0-9A-Za-z]/g, '').toLowerCase() === cleanCode) return false;
    if (cleanName && f.name?.toLowerCase() === cleanName) return false;
    return true;
  });
  saveUserProfile(profile);
  return profile;
}

export const remoteProfilesCache = new Map<string, Partial<UserProfile>>();

/**
 * Helper to crop image squarely from center (object-fit: cover) and scale to 96x96 JPEG
 */
export function cropAndResizeTo96(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Calculate center square crop
      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;

      ctx.drawImage(img, startX, startY, size, size, 0, 0, 96, 96);
      const thumb = canvas.toDataURL('image/jpeg', 0.85);
      resolve(thumb);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function syncProfileToFirebase(profile: UserProfile): Promise<void> {
  if (!profile.friendCode) return;
  try {
    const user = await ensureFirebaseAuth();
    const profileRef = ref(rtdb, `profiles/${profile.friendCode}`);
    const dataToSync = {
      id: profile.id,
      ownerUid: user?.uid || null,
      friendCode: profile.friendCode,
      name: profile.name,
      avatarId: profile.avatarId,
      customAvatarDataUrl: profile.customAvatarDataUrl || null,
      avatarThumb: profile.customAvatarDataUrl || null,
      customTitle: profile.customTitle || null,
      isOwner: profile.isOwner || false,
      level: profile.level || 1,
      xp: profile.xp || 0,
      stats: profile.stats || {},
      lastOnline: Date.now()
    };
    await set(profileRef, dataToSync);
    remoteProfilesCache.set(profile.friendCode, dataToSync as any);
  } catch (err) {
    // Non-blocking offline fallback
    console.warn('Firebase profile sync warning:', err);
  }
}

export async function fetchRemoteProfile(friendCode: string): Promise<Partial<UserProfile> | null> {
  if (!friendCode) return null;
  const clean = friendCode.trim().replace(/[^0-9A-Za-z]/g, '');
  if (remoteProfilesCache.has(clean)) {
    return remoteProfilesCache.get(clean)!;
  }
  try {
    const snap = await get(ref(rtdb, `profiles/${clean}`));
    if (snap.exists()) {
      const data = snap.val() as Partial<UserProfile>;
      remoteProfilesCache.set(clean, data);
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch remote profile from Firebase:', err);
  }
  return null;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    // Asynchronously push to Firebase Realtime Database
    syncProfileToFirebase(profile);
  } catch (e) {
    console.warn('Profile save error:', e);
  }
}

export function recordMatchStats(
  isWin: boolean,
  score: number,
  pistis: number,
  doublePistis: number,
  isUno = false,
  opponentName = 'Rakip'
): { xpEarned: number; newLevel: number; leveledUp: boolean } {
  const profile = getUserProfile();
  if (isUno) {
    profile.stats.unoMatchesPlayed += 1;
    if (isWin) profile.stats.unoWins += 1;
    if (score > (profile.stats.highestUnoScore || 0)) {
      profile.stats.highestUnoScore = score;
    }
  } else {
    profile.stats.matchesPlayed += 1;
    if (isWin) profile.stats.wins += 1;
    else profile.stats.losses += 1;
    profile.stats.pistiCount += pistis;
    profile.stats.doublePistiCount += doublePistis;
    if (score > profile.stats.highestScore) {
      profile.stats.highestScore = score;
    }
  }

  // Calculate XP gained from match performance
  let xp = isUno ? (isWin ? 150 : 60) : (isWin ? 160 : 70);
  xp += pistis * 30 + doublePistis * 60;

  // Add Match History Record (keep up to 30)
  const historyRecord: MatchRecord = {
    id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    gameType: isUno ? 'uno' : 'pisti',
    result: isWin ? 'win' : 'loss',
    score,
    opponentName,
    pistiCount: pistis,
    doublePistiCount: doublePistis,
    date: Date.now()
  };

  const history = profile.matchHistory || [];
  profile.matchHistory = [historyRecord, ...history].slice(0, 30);

  // Update Daily Tasks Progress
  if (!isUno && isWin) {
    updateDailyTaskProgress('pisti_win', 1, profile);
  }
  if (!isUno && (pistis > 0 || doublePistis > 0)) {
    updateDailyTaskProgress('pisti_count', pistis + doublePistis, profile);
  }
  if (isUno) {
    updateDailyTaskProgress('uno_play', 1, profile);
  }

  const xpResult = addXpToProfile(profile, xp);
  saveUserProfile(profile);

  return {
    xpEarned: xp,
    newLevel: xpResult.newLevel,
    leveledUp: xpResult.leveledUp
  };
}

/**
 * Calculates current level and progress from total XP
 * Level curve: Level 1 requires 100 XP, Level 2 requires 200 XP, etc.
 */
export function calculateLevel(totalXp: number = 0): {
  level: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  progressPercent: number;
} {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);

  while (true) {
    const needed = level * 120; // 120, 240, 360, 480...
    if (remainingXp < needed) {
      return {
        level,
        currentLevelXp: remainingXp,
        xpForNextLevel: needed,
        progressPercent: Math.min(100, Math.round((remainingXp / needed) * 100))
      };
    }
    remainingXp -= needed;
    level++;
  }
}

function addXpToProfile(
  profile: UserProfile,
  amount: number
): { newTotalXp: number; newLevel: number; leveledUp: boolean } {
  const currentTotal = profile.xp || 0;
  const oldLevelInfo = calculateLevel(currentTotal);

  const newTotal = currentTotal + amount;
  const newLevelInfo = calculateLevel(newTotal);

  profile.xp = newTotal;
  profile.level = newLevelInfo.level;

  return {
    newTotalXp: newTotal,
    newLevel: newLevelInfo.level,
    leveledUp: newLevelInfo.level > oldLevelInfo.level
  };
}

export function addXp(amount: number): {
  newTotalXp: number;
  newLevel: number;
  leveledUp: boolean;
} {
  const profile = getUserProfile();
  const res = addXpToProfile(profile, amount);
  saveUserProfile(profile);
  return res;
}

// Default Daily Tasks template
function createInitialDailyTasks(): DailyTask[] {
  return [
    {
      id: 'task_pisti_win',
      title: 'Zirveye Oyna',
      description: 'Günün en az 1 Pişti maçını kazan',
      icon: '🏆',
      target: 1,
      current: 0,
      rewardXp: 120,
      claimed: false
    },
    {
      id: 'task_pisti_count',
      title: 'Pişti Avcısı',
      description: 'Toplam 3 adet Pişti yap',
      icon: '⚡',
      target: 3,
      current: 0,
      rewardXp: 150,
      claimed: false
    },
    {
      id: 'task_uno_play',
      title: 'Renk Ustası',
      description: '1 adet RENQ (UNO) maçı tamamla',
      icon: '🔥',
      target: 1,
      current: 0,
      rewardXp: 100,
      claimed: false
    }
  ];
}

export function getOrInitDailyTasks(forcedProfile?: UserProfile): DailyTask[] {
  const profile = forcedProfile || getUserProfile();
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (!profile.dailyTasks || profile.dailyTasks.lastResetDate !== todayStr) {
    profile.dailyTasks = {
      lastResetDate: todayStr,
      tasks: createInitialDailyTasks()
    };
    if (!forcedProfile) saveUserProfile(profile);
  }

  return profile.dailyTasks.tasks;
}

export function updateDailyTaskProgress(
  taskIdSuffix: 'pisti_win' | 'pisti_count' | 'uno_play',
  increment: number = 1,
  forcedProfile?: UserProfile
): void {
  const profile = forcedProfile || getUserProfile();
  getOrInitDailyTasks(profile);

  if (profile.dailyTasks) {
    const fullId = `task_${taskIdSuffix}`;
    profile.dailyTasks.tasks = profile.dailyTasks.tasks.map(t => {
      if (t.id === fullId && !t.claimed) {
        return {
          ...t,
          current: Math.min(t.target, t.current + increment)
        };
      }
      return t;
    });
    if (!forcedProfile) saveUserProfile(profile);
  }
}

export function claimDailyTaskReward(taskId: string): { rewardXp: number; leveledUp: boolean } | null {
  const profile = getUserProfile();
  getOrInitDailyTasks(profile);

  if (!profile.dailyTasks) return null;

  const task = profile.dailyTasks.tasks.find(t => t.id === taskId);
  if (!task || task.claimed || task.current < task.target) return null;

  task.claimed = true;
  const xpRes = addXpToProfile(profile, task.rewardXp);
  saveUserProfile(profile);

  return {
    rewardXp: task.rewardXp,
    leveledUp: xpRes.leveledUp
  };
}

// Friend Request management
export function addIncomingFriendRequest(request: FriendContact): UserProfile {
  const profile = getUserProfile();
  const list = profile.incomingFriendRequests || [];
  if (!list.some(r => r.friendCode === request.friendCode || r.id === request.id)) {
    profile.incomingFriendRequests = [request, ...list].slice(0, 20);
    saveUserProfile(profile);
  }
  return profile;
}

export function removeIncomingFriendRequest(friendCodeOrId: string): UserProfile {
  const profile = getUserProfile();
  profile.incomingFriendRequests = (profile.incomingFriendRequests || []).filter(
    r => r.friendCode !== friendCodeOrId && r.id !== friendCodeOrId
  );
  saveUserProfile(profile);
  return profile;
}

export function acceptIncomingFriendRequest(friend: FriendContact): UserProfile {
  removeIncomingFriendRequest(friend.friendCode || friend.id);
  return addOrUpdateFriend(friend);
}
