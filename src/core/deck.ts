import { Card, CardValue, Suit } from '../types/game';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export const VALUE_SYMBOLS: Record<CardValue, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K'
};

export const VALUE_NAMES_TR: Record<CardValue, string> = {
  1: 'As',
  2: 'İkili',
  3: 'Üçlü',
  4: 'Dörtlü',
  5: 'Beşli',
  6: 'Altılı',
  7: 'Yedili',
  8: 'Sekizli',
  9: 'Dokuzlu',
  10: 'Onlu',
  11: 'Vale',
  12: 'Kız',
  13: 'Papaz'
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣'
};

export const SUIT_NAMES_TR: Record<Suit, string> = {
  spades: 'Maça',
  hearts: 'Kupa',
  diamonds: 'Karo',
  clubs: 'Sinek'
};

/**
 * Calculates standard Pişti base points for a single card:
 * - Karo 10: 3 points
 * - Sinek 2: 2 points
 * - As (any suit): 1 point
 * - Vale (any suit): 1 point
 * - Others: 0 points
 */
export function getCardBasePoints(suit: Suit, value: CardValue): number {
  if (suit === 'diamonds' && value === 10) return 3;
  if (suit === 'clubs' && value === 2) return 2;
  if (value === 1) return 1; // As
  if (value === 11) return 1; // Vale
  return 0;
}

/**
 * Generates an orderly 52-card deck.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      const basePoints = getCardBasePoints(suit, value);
      deck.push({
        id: `${suit}-${value}`,
        suit,
        value,
        symbol: VALUE_SYMBOLS[value],
        basePoints,
        isSpecial: basePoints > 0,
        faceUp: false
      });
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle with true randomness.
 */
export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals the starting 4 cards to the table (3 face-down, 1 face-up)
 * and 4 cards to each player (supports 2 or 4 players).
 */
export function dealInitialGame(deck: Card[], playerCount: 2 | 4 = 2): {
  tableCards: Card[];
  playerHands: Card[][];
  remainingDeck: Card[];
} {
  const currentDeck = [...deck];

  // Table gets 4 cards: 3 face-down, 1 face-up
  const tableCards: Card[] = [];
  for (let i = 0; i < 3; i++) {
    const card = currentDeck.pop()!;
    tableCards.push({ ...card, faceUp: false });
  }
  const topTableCard = currentDeck.pop()!;
  tableCards.push({ ...topTableCard, faceUp: true });

  // Players get 4 cards each
  const playerHands: Card[][] = [];
  for (let p = 0; p < playerCount; p++) {
    const hand: Card[] = [];
    const isHuman = p === 0;
    for (let i = 0; i < 4; i++) {
      hand.push({ ...currentDeck.pop()!, faceUp: isHuman });
    }
    playerHands.push(hand);
  }

  return {
    tableCards,
    playerHands,
    remainingDeck: currentDeck
  };
}

/**
 * Deals 4 cards to each player in subsequent rounds of the same deal.
 */
export function dealHand(deck: Card[], playerCount: 2 | 4 = 2): {
  playerHands: Card[][];
  remainingDeck: Card[];
} {
  const currentDeck = [...deck];
  const playerHands: Card[][] = [];

  for (let p = 0; p < playerCount; p++) {
    const hand: Card[] = [];
    const isHuman = p === 0;
    for (let i = 0; i < 4; i++) {
      hand.push({ ...currentDeck.pop()!, faceUp: isHuman });
    }
    playerHands.push(hand);
  }

  return {
    playerHands,
    remainingDeck: currentDeck
  };
}
