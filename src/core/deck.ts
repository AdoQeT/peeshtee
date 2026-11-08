import type { Card, CardValue, Suit } from '../types/game';

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
export function dealInitialGame(
  deck: Card[],
  playerCount: 2 | 4 = 2,
  enableJackToCutterRule: boolean = true,
  firstPlayerIdx: number = 0,
  cutterIdx?: number
): {
  tableCards: Card[];
  playerHands: Card[][];
  remainingDeck: Card[];
  jacksAwardedToCutter: Card[];
} {
  const currentDeck = [...deck];

  // Table gets 4 cards: 3 face-down, 1 face-up
  const tableCards: Card[] = [];
  for (let i = 0; i < 3; i++) {
    const card = currentDeck.pop()!;
    tableCards.push({ ...card, faceUp: false });
  }

  let topTableCard = currentDeck.pop()!;
  const jacksAwardedToCutter: Card[] = [];

  // Geleneksel "Vale Kesene Yarar" kuralı:
  // Eğer açılan 4. kart Vale ise, kesen oyuncunun eline verilir ve sıradaki kart açılır!
  if (enableJackToCutterRule) {
    while (topTableCard && topTableCard.value === 11 && currentDeck.length > 0) {
      jacksAwardedToCutter.push({ ...topTableCard, faceUp: true });
      topTableCard = currentDeck.pop()!;
    }
  }

  tableCards.push({ ...topTableCard, faceUp: true });

  // Players get cards starting from firstPlayerIdx in turn order.
  // If the cutter received Jack(s) into hand from the cut ritual, their hand is topped up to 4 cards.
  const playerHands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let offset = 0; offset < playerCount; offset++) {
    const p = ((firstPlayerIdx % playerCount) + playerCount + offset) % playerCount;
    const hand: Card[] = [];
    const isHuman = p === 0;

    if (cutterIdx !== undefined && p === cutterIdx && jacksAwardedToCutter.length > 0) {
      // Cutter already holds the peeled Jack(s) in hand
      jacksAwardedToCutter.forEach(j => {
        hand.push({ ...j, faceUp: isHuman });
      });
      const cardsNeeded = Math.max(0, 4 - hand.length);
      for (let i = 0; i < cardsNeeded; i++) {
        if (currentDeck.length > 0) {
          hand.push({ ...currentDeck.pop()!, faceUp: isHuman });
        }
      }
    } else {
      for (let i = 0; i < 4; i++) {
        if (currentDeck.length > 0) {
          hand.push({ ...currentDeck.pop()!, faceUp: isHuman });
        }
      }
    }

    playerHands[p] = hand;
  }

  return {
    tableCards,
    playerHands,
    remainingDeck: currentDeck,
    jacksAwardedToCutter
  };
}

/**
 * Deals 4 cards to each player in subsequent rounds of the same deal.
 */
export function dealHand(
  deck: Card[],
  playerCount: 2 | 4 = 2,
  firstPlayerIdx: number = 0
): {
  playerHands: Card[][];
  remainingDeck: Card[];
} {
  const currentDeck = [...deck];
  const playerHands: Card[][] = Array.from({ length: playerCount }, () => []);

  for (let offset = 0; offset < playerCount; offset++) {
    const p = ((firstPlayerIdx % playerCount) + playerCount + offset) % playerCount;
    const hand: Card[] = [];
    const isHuman = p === 0;
    for (let i = 0; i < 4; i++) {
      hand.push({ ...currentDeck.pop()!, faceUp: isHuman });
    }
    playerHands[p] = hand;
  }

  return {
    playerHands,
    remainingDeck: currentDeck
  };
}

/**
 * Generates an opaque per-round token ID so card identities cannot be inferred from IDs alone.
 */
function generateOpaqueCardToken(index: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  const cryptoObj = typeof globalThis !== 'undefined' && 'crypto' in globalThis ? globalThis.crypto : null;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buf = new Uint8Array(6);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < 6; i++) rand += chars[buf[i] % chars.length];
  } else {
    for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `c_${index}_${rand}`;
}

/**
 * Assigns fresh opaque IDs to every card in a shuffled deck before a multiplayer round starts.
 */
export function assignOpaqueDeckIds(deck: Card[]): Card[] {
  return deck.map((c, idx) => ({
    ...c,
    id: generateOpaqueCardToken(idx)
  }));
}

/**
 * Creates a masked placeholder card that preserves only the opaque ID and hides suit/value/points.
 * Value defaults to 2 (non-Jack, non-5, non-Ace) so placeholder cards never trigger accidental rules.
 */
export function createMaskedCard(id: string): Card {
  return {
    id,
    suit: 'spades',
    value: 2,
    symbol: '?',
    basePoints: 0,
    isSpecial: false,
    faceUp: false
  };
}

export function isMaskedCard(card: Card | undefined | null): boolean {
  return Boolean(card && card.symbol === '?');
}

/**
 * Builds a guest-specific cut deck where ONLY the cards that guest is legally allowed to know
 * (their own dealt hand in all waves + public face-up center card + any peeled Jacks) have real faces,
 * and every other card (opponent hands, 3 face-down center cards) is a masked placeholder.
 */
export function buildMaskedCutDeckForSeat(
  cutDeck: Card[],
  targetSeat: number,
  playerCount: 2 | 4,
  absStartingTurn: number,
  cutterSeat: number
): Card[] {
  const visibleIds = new Set<string>();
  const simDeck = [...cutDeck];

  // 3 face-down table cards stay hidden
  for (let i = 0; i < 3; i++) simDeck.pop();

  // 4th card + any consecutive Jacks are public
  let topCard = simDeck.pop();
  const jacks: Card[] = [];
  while (topCard && topCard.value === 11 && simDeck.length > 0) {
    visibleIds.add(topCard.id);
    jacks.push(topCard);
    topCard = simDeck.pop();
  }
  if (topCard) visibleIds.add(topCard.id);

  // Wave 1: dealInitialGame order (starts at absStartingTurn)
  for (let offset = 0; offset < playerCount; offset++) {
    const p = ((absStartingTurn % playerCount) + playerCount + offset) % playerCount;
    const needed = p === cutterSeat && jacks.length > 0 ? Math.max(0, 4 - jacks.length) : 4;
    for (let i = 0; i < needed; i++) {
      const c = simDeck.pop();
      if (c && p === targetSeat) visibleIds.add(c.id);
    }
  }

  // Subsequent refill waves (usePistiGame pops 4 cards per seat for seat = 0..N-1)
  while (simDeck.length > 0) {
    for (let seat = 0; seat < playerCount; seat++) {
      for (let i = 0; i < 4; i++) {
        const c = simDeck.pop();
        if (c && seat === targetSeat) visibleIds.add(c.id);
      }
    }
  }

  return cutDeck.map(c => (visibleIds.has(c.id) ? { ...c } : createMaskedCard(c.id)));
}
