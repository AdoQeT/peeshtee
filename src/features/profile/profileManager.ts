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

export interface UserProfile {
  id: string;
  name: string;
  avatarId: string;
  customAvatarDataUrl?: string; // Base64 uploaded custom profile picture
  customTitle?: string;
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    pistiCount: number;
    doublePistiCount: number;
    highestScore: number;
    unoMatchesPlayed: number;
    unoWins: number;
  };
}

const STORAGE_KEY = 'project_p_user_profile';

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
        return {
          id: parsed.id || `player-${Math.random().toString(36).substring(2, 9)}`,
          name: parsed.name,
          avatarId: parsed.avatarId || 'wolf',
          customAvatarDataUrl: parsed.customAvatarDataUrl,
          customTitle: parsed.customTitle,
          stats: {
            matchesPlayed: parsed.stats?.matchesPlayed || 0,
            wins: parsed.stats?.wins || 0,
            losses: parsed.stats?.losses || 0,
            pistiCount: parsed.stats?.pistiCount || 0,
            doublePistiCount: parsed.stats?.doublePistiCount || 0,
            highestScore: parsed.stats?.highestScore || 0,
            unoMatchesPlayed: parsed.stats?.unoMatchesPlayed || 0,
            unoWins: parsed.stats?.unoWins || 0
          }
        };
      }
    }
  } catch (e) {
    console.warn('Profile read error:', e);
  }

  // Default guest profile
  const defaultProfile: UserProfile = {
    id: `player-${Math.random().toString(36).substring(2, 9)}`,
    name: 'Usta Oyuncu',
    avatarId: 'wolf',
    customTitle: 'Pişti Avcısı',
    stats: {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      pistiCount: 0,
      doublePistiCount: 0,
      highestScore: 0,
      unoMatchesPlayed: 0,
      unoWins: 0
    }
  };
  saveUserProfile(defaultProfile);
  return defaultProfile;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Profile save error:', e);
  }
}

export function recordMatchStats(isWin: boolean, score: number, pistis: number, doublePistis: number, isUno = false): void {
  const profile = getUserProfile();
  if (isUno) {
    profile.stats.unoMatchesPlayed += 1;
    if (isWin) profile.stats.unoWins += 1;
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
  saveUserProfile(profile);
}
