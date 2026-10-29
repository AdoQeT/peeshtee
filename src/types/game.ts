export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

// 1 = As (A), 2-10, 11 = Vale (J), 12 = Kız (Q), 13 = Papaz (K)
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string; // unique e.g., 'diamonds-10'
  suit: Suit;
  value: CardValue;
  symbol: string; // 'A', '2'-'10', 'J', 'Q', 'K'
  basePoints: number; // Karo 10 = 3, Sinek 2 = 2, As = 1, Vale = 1, others = 0
  isSpecial: boolean; // True for 10D, 2C, A, J
  faceUp: boolean;
  devForceFaceUp?: boolean;
  tableOffsetX?: number;
  tableOffsetY?: number;
  tableRotation?: number;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface GameSetupConfig {
  playerCount: 2 | 4;
  targetScore: number;
  fiveRuleEnabled: boolean;
  botDifficulty: AIDifficulty;
}

export interface PistiPair {
  bottomCard: Card; // Face-down (ters)
  topCard: Card; // Face-up facing us (düz, bize bakıyor, 90° açıyla)
  isDouble: boolean;
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  avatar: string; // Emoji fallback or label
  avatarId?: string; // Preset avatar id (e.g. 'wolf', 'lion', 'dayi')
  customAvatarUrl?: string; // Custom uploaded base64 data url
  hand: Card[];
  collectedCards: Card[]; // Regular captured cards
  pistiPairs: PistiPair[]; // Tersli düzlü 90 derece çapraz Pişti çiftleri!
  pistiCount: number;
  doublePistiCount: number;
  bonusPoints?: number; // 5-rule or custom bonus points
  score: number;
  roundScore: number;
  level: number;
}

export type TableTheme =
  | 'estoril_blue'
  | 'alpine_white'
  | 'melbourne_red'
  | 'monaco_velvet'
  | 'traditional'
  | 'sakura'
  | 'luxury_gold';

export function getCardBackForTheme(theme: TableTheme): string {
  switch (theme) {
    case 'estoril_blue':
      return 'estoril_sport';
    case 'alpine_white':
      return 'alpine_platinum';
    case 'melbourne_red':
      return 'melbourne_speed';
    case 'monaco_velvet':
      return 'monaco_royal';
    case 'sakura':
      return 'sakura_blossom';
    case 'luxury_gold':
      return 'gold_dragon';
    case 'traditional':
    default:
      return 'classic_blue';
  }
}

export type AmbienceType = 'none' | 'cafe' | 'jazz' | 'rain';

export interface GameSettings {
  soundEnabled: boolean;
  sfxVolume: number;
  ambience: AmbienceType;
  ambienceVolume: number;
  screenShake: boolean;
  particlesEnabled: boolean;
  theme: TableTheme;
  cardBack: string; // 'sakura_blossom' | 'classic_blue' | 'cyber_neon' | 'gold_dragon'
  targetScore: number;
  aiDifficulty: AIDifficulty;
  playerCount: 2 | 4;
  fiveRuleEnabled: boolean;
}

export type GameStatus =
  | 'menu'
  | 'shuffling'
  | 'dealing'
  | 'playing'
  | 'counting_ceremony'
  | 'round_end'
  | 'game_over';

export interface SlamEvent {
  id: string;
  type: 'pisti' | 'double_pisti' | 'jack_sweep' | 'match_sweep' | 'five_slam_instant_win';
  card: Card;
  playerId: string;
  playerName: string;
  pointsAwarded: number;
  x?: number;
  y?: number;
  timestamp: number;
}

export interface FlyingCardAnim {
  id: string;
  card: Card;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  rotation: number;
  scale: number;
  faceUp: boolean;
  onComplete?: () => void;
}

export type ShuffleStyle =
  | 'riffle_bridge'
  | 'hindu_slide'
  | 'triple_cut'
  | 'table_wash'
  | 'farot_wave';

export interface OnTableCountState {
  isActive: boolean;
  userCountedIndex: number;
  oppCountedIndex: number;
  userTotal: number;
  oppTotal: number;
  userCurrentCard?: Card;
  oppCurrentCard?: Card;
  userPointCards: Card[];
  oppPointCards: Card[];
  userCardPoints: number;
  oppCardPoints: number;
  userPistiPoints?: number;
  oppPistiPoints?: number;
  userMajority: boolean;
  oppMajority: boolean;
  isDone: boolean;
  isFast: boolean;
}
