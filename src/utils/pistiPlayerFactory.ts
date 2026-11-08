import { Card, Player, ShuffleStyle } from '../types/game';
import { getLanguage, getRandomBotNames } from './i18n';
import { getUserProfile, getAvatarPreset } from '../features/profile/profileManager';
import { LobbyPlayerSlot } from '../features/multiplayer/peerManager';

export const SHUFFLE_STYLES: ShuffleStyle[] = [
  'riffle_bridge',
  'triple_cut',
  'table_wash',
  'farot_wave',
  'hindu_slide'
];

export const getShuffleDuration = (_style: ShuffleStyle): number => {
  return 2500;
};

export function orientHandsForPerspective(
  hands: Card[][],
  mySeatIdx: number = 0
): Card[][] {
  const N = hands.length;
  const oriented: Card[][] = [];
  for (let j = 0; j < N; j++) {
    const originalSeat = (j + mySeatIdx) % N;
    const isMe = j === 0;
    oriented[j] = (hands[originalSeat] || []).map(c => ({
      ...c,
      faceUp: isMe
    }));
  }
  return oriented;
}

export function buildInitialPistiPlayers(
  count: 2 | 4,
  difficulty: string,
  localName: string = 'Oyuncu (Sen)',
  localAvatar: string = '😎',
  customOpponentName?: string,
  customOpponentAvatar?: string,
  mpSlots?: LobbyPlayerSlot[],
  mySeatIdx: number = 0
): Player[] {
  const curProfile = getUserProfile();

  if (mpSlots && mpSlots.length >= count) {
    const playersList: Player[] = [];
    for (let j = 0; j < count; j++) {
      const originalSeat = (j + mySeatIdx) % count;
      const slot = mpSlots[originalSeat];
      const isMe = j === 0;
      playersList.push({
        id: isMe ? 'user' : `player-${originalSeat}`,
        name: isMe ? `${slot.name} (Sen)` : slot.name,
        isAI: Boolean(slot.isAI),
        avatar: slot.avatar,
        avatarId: isMe ? curProfile.avatarId : slot.avatarId || 'wolf',
        customAvatarUrl: isMe ? curProfile.customAvatarDataUrl : slot.customAvatarUrl,
        customTitle: isMe
          ? curProfile.customTitle || getAvatarPreset(curProfile.avatarId || 'wolf').title
          : slot.customTitle || getAvatarPreset(slot.avatarId || 'wolf').title,
        hand: [],
        collectedCards: [],
        pistiPairs: [],
        pistiCount: 0,
        doublePistiCount: 0,
        bonusPoints: 0,
        score: 0,
        roundScore: 0,
        level: 1
      });
    }
    return playersList;
  }

  const botNames = getRandomBotNames(3, getLanguage());
  const p1Name = customOpponentName ? customOpponentName : botNames[0] || 'Alex';

  const bot1Personality =
    difficulty === 'hard'
      ? 'tactician'
      : difficulty === 'easy'
      ? 'aggressive'
      : 'balanced';

  const basePlayers: Player[] = [
    {
      id: 'user',
      name: curProfile.name || localName,
      isAI: false,
      avatar: localAvatar,
      avatarId: curProfile.avatarId || 'wolf',
      customAvatarUrl: curProfile.customAvatarDataUrl,
      customTitle: curProfile.customTitle || getAvatarPreset(curProfile.avatarId || 'wolf').title,
      hand: [],
      collectedCards: [],
      pistiPairs: [],
      pistiCount: 0,
      doublePistiCount: 0,
      score: 0,
      roundScore: 0,
      level: 1
    },
    {
      id: 'bot-1',
      name: p1Name,
      isAI: !customOpponentName,
      personality: bot1Personality,
      avatar: customOpponentAvatar || '🤖',
      avatarId: 'lion',
      customTitle:
        bot1Personality === 'tactician'
          ? '🧠 Tactician'
          : bot1Personality === 'aggressive'
          ? '🔥 Aggressive'
          : '🃏 Balanced',
      hand: [],
      collectedCards: [],
      pistiPairs: [],
      pistiCount: 0,
      doublePistiCount: 0,
      score: 0,
      roundScore: 0,
      level: 1
    }
  ];

  if (count === 4) {
    basePlayers.push(
      {
        id: 'bot-2',
        name: botNames[1] || 'Leo',
        isAI: true,
        personality: 'aggressive',
        avatar: '👴',
        avatarId: 'dayi',
        customTitle: '🔥 Aggressive',
        hand: [],
        collectedCards: [],
        pistiPairs: [],
        pistiCount: 0,
        doublePistiCount: 0,
        bonusPoints: 0,
        score: 0,
        roundScore: 0,
        level: 1
      },
      {
        id: 'bot-3',
        name: botNames[2] || 'Max',
        isAI: true,
        personality: 'tactician',
        avatar: '🧔',
        avatarId: 'muhtar',
        customTitle: '🧠 Tactician',
        hand: [],
        collectedCards: [],
        pistiPairs: [],
        pistiCount: 0,
        doublePistiCount: 0,
        bonusPoints: 0,
        score: 0,
        roundScore: 0,
        level: 1
      }
    );
  }

  return basePlayers;
}
