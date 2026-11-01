export interface LevelReward {
  level: number;
  title: string;
  type: 'card_back' | 'theme' | 'title';
  rewardId: string;
  name: string;
  description: string;
  icon: string;
}

export const LEVEL_REWARDS: LevelReward[] = [
  {
    level: 2,
    type: 'card_back',
    rewardId: 'cyber_neon',
    name: 'Siber Neon Kart Arkası',
    description: 'Hareketli neon ızgara desenli özel siber kart arkası',
    icon: '⚡',
    title: 'Kart Arkası Kilidi'
  },
  {
    level: 2,
    type: 'title',
    rewardId: 'title_card_wizard',
    name: '🃏 Kart Cambazı',
    description: 'Profilinde sergileyebileceğin özel ünvan',
    icon: '✨',
    title: 'Yeni Ünvan'
  },
  {
    level: 3,
    type: 'card_back',
    rewardId: 'gold_dragon',
    name: 'Altın Ejder Kart Arkası',
    description: 'Işıkta parıldayan altın ejderha motifli lüks kart deseni',
    icon: '🐉',
    title: 'Lüks Kart Arkası'
  },
  {
    level: 3,
    type: 'theme',
    rewardId: 'monaco_velvet',
    name: 'Monaco Velvet Masa',
    description: 'Derin kadife moru ve altın dikişli Monaco kumarhane masası',
    icon: '🎲',
    title: 'VIP Masa Teması'
  },
  {
    level: 4,
    type: 'theme',
    rewardId: 'sakura',
    name: 'Sakura Blossom Masa',
    description: 'Japon kiraz çiçekleri ve pembe neon ambiyanslı özel masa',
    icon: '🌸',
    title: 'Özel Masa Teması'
  },
  {
    level: 5,
    type: 'title',
    rewardId: 'title_grandmaster',
    name: '👑 Grandmaster',
    description: 'Masanın mutlak hükümdarlarına özel altın efsanevi ünvan',
    icon: '👑',
    title: 'Efsanevi Ünvan'
  }
];

export function getUnlockedLevelRewards(currentLevel: number = 1): LevelReward[] {
  return LEVEL_REWARDS.filter(r => r.level <= currentLevel);
}

export function getUpcomingReward(currentLevel: number = 1): LevelReward | undefined {
  return LEVEL_REWARDS.find(r => r.level > currentLevel);
}

export function isItemLockedByLevel(type: 'card_back' | 'theme', id: string, userLevel: number = 1): { isLocked: boolean; requiredLevel?: number } {
  const found = LEVEL_REWARDS.find(r => r.type === type && r.rewardId === id);
  if (!found) return { isLocked: false };
  return {
    isLocked: userLevel < found.level,
    requiredLevel: found.level
  };
}
