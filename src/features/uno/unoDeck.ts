import { UnoCard, UnoColor, UnoValue } from './unoTypes';

const REGULAR_COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];

/**
 * Creates the authentic standard 108-card Uno Deck:
 * - 19 Red cards (1x 0, 2x 1-9)
 * - 19 Blue cards (1x 0, 2x 1-9)
 * - 19 Green cards (1x 0, 2x 1-9)
 * - 19 Yellow cards (1x 0, 2x 1-9)
 * - 8 Draw Two (+2) cards (2 in each color)
 * - 8 Reverse (Yön Değiştir) cards (2 in each color)
 * - 8 Skip (Pas) cards (2 in each color)
 * - 4 Wild (Renk Seç) cards
 * - 4 Wild Draw Four (+4 & Renk Seç) cards
 * Total: 108 cards!
 */
export function createUnoDeck(): UnoCard[] {
  const cards: UnoCard[] = [];
  let idCounter = 0;

  for (const color of REGULAR_COLORS) {
    // 1x '0'
    cards.push({
      id: `uno-${color}-0-${idCounter++}`,
      color,
      value: '0',
      scoreValue: 0
    });

    // 2x '1' through '9'
    for (let num = 1; num <= 9; num++) {
      const val = String(num) as UnoValue;
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          id: `uno-${color}-${val}-${copy}-${idCounter++}`,
          color,
          value: val,
          scoreValue: num
        });
      }
    }

    // 2x Action cards per color
    const actions: UnoValue[] = ['skip', 'reverse', 'draw2'];
    for (const act of actions) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          id: `uno-${color}-${act}-${copy}-${idCounter++}`,
          color,
          value: act,
          scoreValue: 20
        });
      }
    }
  }

  // 4x Wild cards (Joker Renk Değiştir)
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `uno-wild-${i}-${idCounter++}`,
      color: 'wild',
      value: 'wild',
      scoreValue: 50
    });
  }

  // 4x Wild Draw Four cards (+4 Joker)
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `uno-wild4-${i}-${idCounter++}`,
      color: 'wild',
      value: 'wild_draw4',
      scoreValue: 50
    });
  }

  return cards;
}

/**
 * Modern Fisher-Yates shuffle algorithm
 */
export function shuffleUnoDeck(deck: UnoCard[]): UnoCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals 7 cards to each player and sets initial top discard
 */
export function dealUnoGame(
  deck: UnoCard[],
  playerCount: number
): {
  hands: UnoCard[][];
  remainingDeck: UnoCard[];
  initialDiscard: UnoCard;
  initialColor: UnoColor;
} {
  const remaining = [...deck];
  const hands: UnoCard[][] = [];

  for (let p = 0; p < playerCount; p++) {
    hands.push(remaining.splice(0, 7));
  }

  // Draw first card for discard pile that is NOT a wild +4
  let discardIdx = remaining.findIndex(c => c.value !== 'wild_draw4');
  if (discardIdx === -1) discardIdx = 0;
  const initialDiscard = remaining.splice(discardIdx, 1)[0];

  const initialColor =
    initialDiscard.color === 'wild'
      ? REGULAR_COLORS[Math.floor(Math.random() * REGULAR_COLORS.length)]
      : initialDiscard.color;

  return {
    hands,
    remainingDeck: remaining,
    initialDiscard,
    initialColor
  };
}
