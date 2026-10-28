import { UnoCard, UnoColor } from './unoTypes';

/**
 * Checks whether a card is legally playable onto the current discard pile:
 * 1. Stacking rules:
 *    - Over a +2: another +2 OR a +4 Wild can be played!
 *    - Over a +4: ONLY another +4 Wild can be played!
 * 2. Normal rules:
 *    - Wild cards ('wild' or 'wild_draw4') can always be played.
 *    - Card matches the currently active color.
 *    - Card matches the top discard card's value/number.
 */
export function canPlayUnoCard(
  card: UnoCard,
  topDiscard: UnoCard,
  currentColor: UnoColor,
  pendingDrawPenalty: number = 0
): boolean {
  if (pendingDrawPenalty > 0) {
    if (topDiscard.value === 'draw2') {
      // +2 üstüne +2 veya +4 atılabilir!
      return card.value === 'draw2' || card.value === 'wild_draw4';
    }
    if (topDiscard.value === 'wild_draw4') {
      // +4 üstüne ise SADECE +4 atılabilir!
      return card.value === 'wild_draw4';
    }
  }

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
 * Intelligent Bot Move Selector for UNO with Stacking Support:
 * - If there is an active stacking penalty, prioritizes stacking +2 or +4 to avoid drawing!
 * - Prioritizes action cards (+2, Skip, Reverse) to disrupt opponents.
 * - Saves Wild +4 for strategic moments.
 * - When choosing a Wild color, picks the color that the bot has the most of!
 */
export function getBotUnoPlay(
  hand: UnoCard[],
  topDiscard: UnoCard,
  currentColor: UnoColor,
  pendingDrawPenalty: number = 0
): {
  cardToPlay: UnoCard | null;
  chosenWildColor?: UnoColor;
} {
  const playable = hand.filter(c =>
    canPlayUnoCard(c, topDiscard, currentColor, pendingDrawPenalty)
  );

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

  // If there's an active penalty, stack +2 first, then +4
  if (pendingDrawPenalty > 0) {
    const stack2 = playable.find(c => c.value === 'draw2');
    if (stack2) return { cardToPlay: stack2 };
    const stack4 = playable.find(c => c.value === 'wild_draw4');
    if (stack4) return { cardToPlay: stack4, chosenWildColor: bestColor };
    return { cardToPlay: null };
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
