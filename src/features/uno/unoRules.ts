import { UnoCard, UnoColor } from './unoTypes';

/**
 * Checks whether a card is legally playable onto the current discard pile:
 * 1. Wild cards ('wild' or 'wild_draw4') can always be played!
 * 2. Card matches the currently active color.
 * 3. Card matches the top discard card's value/number.
 */
export function canPlayUnoCard(
  card: UnoCard,
  topDiscard: UnoCard,
  currentColor: UnoColor
): boolean {
  if (card.color === 'wild') return true;
  if (card.color === currentColor) return true;
  if (card.value === topDiscard.value) return true;
  return false;
}

/**
 * Sums remaining points in a player's hand when someone wins the round
 */
export function calculateUnoHandPoints(hand: UnoCard[]): number {
  return hand.reduce((sum, card) => sum + card.scoreValue, 0);
}

const REGULAR_COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];

/**
 * Intelligent Bot Move Selector for UNO:
 * - Prioritizes action cards (+2, Skip, Reverse) to disrupt opponents.
 * - Saves Wild +4 for strategic moments.
 * - When choosing a Wild color, picks the color that the bot has the most of!
 */
export function getBotUnoPlay(
  hand: UnoCard[],
  topDiscard: UnoCard,
  currentColor: UnoColor
): {
  cardToPlay: UnoCard | null;
  chosenWildColor?: UnoColor;
} {
  const playable = hand.filter(c => canPlayUnoCard(c, topDiscard, currentColor));

  if (playable.length === 0) {
    return { cardToPlay: null };
  }

  // Count bot's color distribution
  const colorCounts: Record<UnoColor, number> = {
    red: hand.filter(c => c.color === 'red').length,
    blue: hand.filter(c => c.color === 'blue').length,
    green: hand.filter(c => c.color === 'green').length,
    yellow: hand.filter(c => c.color === 'yellow').length,
    wild: 0
  };

  // Best color for bot
  let bestColor: UnoColor = 'red';
  let maxCount = -1;
  for (const c of REGULAR_COLORS) {
    if (colorCounts[c] > maxCount) {
      maxCount = colorCounts[c];
      bestColor = c;
    }
  }

  // Preference 1: Action cards (+2, skip, reverse) of active color
  const actionPlay = playable.find(
    c => c.color !== 'wild' && (c.value === 'draw2' || c.value === 'skip' || c.value === 'reverse')
  );
  if (actionPlay) {
    return { cardToPlay: actionPlay };
  }

  // Preference 2: Number cards that match bot's best color
  const matchingBestColorNumber = playable.find(
    c => c.color === bestColor && c.color !== 'wild'
  );
  if (matchingBestColorNumber) {
    return { cardToPlay: matchingBestColorNumber };
  }

  // Preference 3: Any regular matching color or number card
  const regularCard = playable.find(c => c.color !== 'wild');
  if (regularCard) {
    return { cardToPlay: regularCard };
  }

  // Preference 4: Regular Wild card
  const wildCard = playable.find(c => c.value === 'wild');
  if (wildCard) {
    return { cardToPlay: wildCard, chosenWildColor: bestColor };
  }

  // Preference 5: Wild Draw 4
  const wild4Card = playable.find(c => c.value === 'wild_draw4');
  if (wild4Card) {
    return { cardToPlay: wild4Card, chosenWildColor: bestColor };
  }

  return { cardToPlay: playable[0] };
}
