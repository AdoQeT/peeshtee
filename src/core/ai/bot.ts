import { Card, AIDifficulty } from '../../types/game';

/**
 * Chooses the best card for the AI opponent based on difficulty level.
 */
export function chooseAICard(
  hand: Card[],
  tableCards: Card[],
  seenCards: Card[],
  difficulty: AIDifficulty
): Card {
  if (hand.length === 0) {
    throw new Error('AI hand is empty');
  }

  // 1. Easy (Çaylak / Acemi): Simple or random
  if (difficulty === 'easy') {
    // 50% chance to match if possible, otherwise random
    if (tableCards.length > 0 && Math.random() > 0.4) {
      const topCard = tableCards[tableCards.length - 1];
      const match = hand.find(c => c.value === topCard.value);
      if (match) return match;
    }
    const randomIndex = Math.floor(Math.random() * hand.length);
    return hand[randomIndex];
  }

  const topCard = tableCards.length > 0 ? tableCards[tableCards.length - 1] : null;

  // 2. Medium (Kurnaz) & 3. Hard (Şampiyon) Logic
  if (topCard) {
    // Case A: Table has cards. Can we match the top card?
    const match = hand.find(c => c.value === topCard.value);
    if (match) {
      // Prioritize Pişti or capturing pile!
      return match;
    }

    // Case B: Can we play a Jack to sweep the pile?
    const jack = hand.find(c => c.value === 11);
    if (jack) {
      // Calculate total point value of the pot on table
      const potBasePoints = tableCards.reduce((sum, c) => sum + (c.basePoints || 0), 0);
      const hasValuableCard = potBasePoints > 0;

      // Hard bot evaluates the exact point density and pile thickness
      const shouldJack =
        difficulty === 'hard'
          ? potBasePoints >= 2 || tableCards.length >= 4 || (hasValuableCard && tableCards.length >= 2)
          : tableCards.length >= 3 || hasValuableCard;

      if (shouldJack) {
        return jack;
      }
    }

    // Case C: No match, no Jack (or saving Jack). Pick the safest discard.
    // Avoid discarding points or Jacks.
    return pickSafestDiscard(hand, seenCards, difficulty);
  }

  // Case D: Table is EMPTY.
  // We must throw a card without giving the opponent an easy Pişti!
  return pickSafestEmptyTableDiscard(hand, seenCards, difficulty);
}

/**
 * Picks the safest card to discard onto an empty table.
 */
function pickSafestEmptyTableDiscard(
  hand: Card[],
  seenCards: Card[],
  difficulty: AIDifficulty
): Card {
  // Never discard a Jack (11) on an empty table if we have other cards!
  const nonJacks = hand.filter(c => c.value !== 11);
  const pool = nonJacks.length > 0 ? nonJacks : hand;

  // Never discard high-value cards (Karo 10, Sinek 2, As) if possible
  const nonSpecials = pool.filter(c => !c.isSpecial);
  const candidatePool = nonSpecials.length > 0 ? nonSpecials : pool;

  if (difficulty === 'hard') {
    // MASTER STRATEGY: Card Counting!
    // Check which card values have already been seen the most.
    // If 3 cards of rank X were already played, rank X is 100% IMMUNE to Pişti!
    const rankCounts: Record<number, number> = {};
    for (const c of seenCards) {
      rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    }

    // Sort candidate cards by how many of their rank have already appeared
    const sortedBySafety = [...candidatePool].sort((a, b) => {
      const seenA = (rankCounts[a.value] || 0) + hand.filter(c => c.value === a.value).length - 1;
      const seenB = (rankCounts[b.value] || 0) + hand.filter(c => c.value === b.value).length - 1;
      // The higher the total known count of this rank (approaching 4), the safer it is!
      return seenB - seenA;
    });

    return sortedBySafety[0];
  }

  // Medium: Pick rank with lowest value or where AI holds a duplicate
  // If AI has two of the same rank (e.g. two 7s), throwing one is great because if player matches, AI can Pişti back!
  const valueFrequencies: Record<number, number> = {};
  for (const c of candidatePool) {
    valueFrequencies[c.value] = (valueFrequencies[c.value] || 0) + 1;
  }

  const duplicates = candidatePool.filter(c => valueFrequencies[c.value] > 1);
  if (duplicates.length > 0) {
    return duplicates[0];
  }

  // Otherwise pick any non-special card
  return candidatePool[0];
}

/**
 * Safest discard when table has cards we can't capture
 */
function pickSafestDiscard(
  hand: Card[],
  seenCards: Card[],
  difficulty: AIDifficulty
): Card {
  // Don't waste Jack
  const nonJacks = hand.filter(c => c.value !== 11);
  const pool = nonJacks.length > 0 ? nonJacks : hand;

  // Don't feed points
  const nonSpecials = pool.filter(c => !c.isSpecial);
  const candidates = nonSpecials.length > 0 ? nonSpecials : pool;

  if (difficulty === 'hard') {
    // Count how many of each rank have been seen
    const rankCounts: Record<number, number> = {};
    for (const c of seenCards) {
      rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    }
    // Ranks with more seen cards are safer because the opponent has fewer remaining copies
    const sorted = [...candidates].sort((a, b) => {
      const seenA = rankCounts[a.value] || 0;
      const seenB = rankCounts[b.value] || 0;
      return seenB - seenA;
    });
    return sorted[0];
  }

  return candidates[0];
}
