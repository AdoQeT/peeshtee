export type UnoColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export type UnoValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild_draw4';

export interface UnoCard {
  id: string;
  color: UnoColor;
  value: UnoValue;
  scoreValue: number;
}

export interface UnoPlayer {
  id: string;
  name: string;
  avatarId: string;
  avatarEmoji?: string;
  customAvatarUrl?: string;
  customTitle?: string;
  isAI: boolean;
  hand: UnoCard[];
  score: number;
  hasCalledUno: boolean;
}

export type UnoDirection = 1 | -1; // 1 = clockwise, -1 = counter-clockwise

export interface UnoGameState {
  round: number;
  deck: UnoCard[];
  discardPile: UnoCard[];
  currentColor: UnoColor;
  currentTurn: number;
  direction: UnoDirection;
  targetScore: number;
  winner: UnoPlayer | null;
  roundWinner: UnoPlayer | null;
  isRoundOver: boolean;
  isGameOver: boolean;
  lastActionMessage: string | null;
  pendingDrawPenalty?: number;
}
