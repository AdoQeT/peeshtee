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
  },
  {
    level: 5,
    type: 'theme',
    rewardId: 'neon_cyber',
    name: 'Neon Cyberpunk Masa',
    description: 'Siber ızgara ve elektrik mavisi lazer raylı gelecek masası',
    icon: '⚡',
    title: 'Siber Masa Teması'
  },
  {
    level: 6,
    type: 'card_back',
    rewardId: 'ottoman_tughra',
    name: 'Payitaht Tuğra Kart Arkası',
    description: 'Hünkar bordosu ve altın Selçuklu yıldızı işlemeli kart arkası',
    icon: '🕌',
    title: 'Tarihi Kart Arkası'
  },
  {
    level: 6,
    type: 'theme',
    rewardId: 'ottoman_palace',
    name: 'Saray İhtişamı Masa',
    description: 'Kاشi çini ve altın varaklı Osmanlı saray divanı masası',
    icon: '🏛️',
    title: 'Saray Masa Teması'
  },
  {
    level: 7,
    type: 'card_back',
    rewardId: 'aurora_crystal',
    name: 'Kuzey Işıkları Kart Arkası',
    description: 'Kutup yeşili ve prizmatik buz kristali parıltılı kart arkası',
    icon: '❄️',
    title: 'Kutup Kart Arkası'
  },
  {
    level: 7,
    type: 'theme',
    rewardId: 'arctic_aurora',
    name: 'Kuzey Işıkları Masa',
    description: 'Buzul turkuazı ve kutup aurorası yansımalı masa teması',
    icon: '🌌',
    title: 'Aurora Masa Teması'
  },
  {
    level: 8,
    type: 'card_back',
    rewardId: 'obsidian_flame',
    name: 'Obsidyen Alev Kart Arkası',
    description: 'Volkanik siyah obsidyen ve kor alev damarlı efsanevi kart arkası',
    icon: '🔥',
    title: 'Efsanevi Kart Arkası'
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
