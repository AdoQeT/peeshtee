import { Card, Player } from '../types/game';

export interface PlayEvaluation {
  isPisti: boolean;
  isDoublePisti: boolean;
  isFiveSlamInstantWin: boolean;
  isSweep: boolean;
  isJackSweep: boolean;
  capturedCards: Card[];
  newTableCards: Card[];
  pointsAwarded: number;
  reason: 'pisti' | 'double_pisti' | 'five_slam_instant_win' | 'jack_sweep' | 'match_sweep' | 'placed_on_table';
}

/**
 * Evaluates the outcome when a card is played onto the table.
 */
export function evaluatePlay(
  tableCards: Card[],
  playedCard: Card,
  fiveRuleEnabled: boolean = false
): PlayEvaluation {
  const cardWithFaceUp: Card = { ...playedCard, faceUp: true };

  // Empty table: card just sits on the table
  if (tableCards.length === 0) {
    return {
      isPisti: false,
      isDoublePisti: false,
      isFiveSlamInstantWin: false,
      isSweep: false,
      isJackSweep: false,
      capturedCards: [],
      newTableCards: [cardWithFaceUp],
      pointsAwarded: 0,
      reason: 'placed_on_table'
    };
  }

  const topCard = tableCards[tableCards.length - 1];
  const revealedTableCards = tableCards.map(c => ({ ...c, faceUp: true }));

  // Case 1: Exactly 1 card on the table
  if (tableCards.length === 1) {
    // 5'e BASMALI KURALI: Yerde tek 5 varken 5 ile Pişti yapılırsa ANINDA OYUN BİTER / KAZANILIR!
    if (playedCard.value === 5 && topCard.value === 5 && fiveRuleEnabled) {
      return {
        isPisti: true,
        isDoublePisti: false,
        isFiveSlamInstantWin: true,
        isSweep: true,
        isJackSweep: false,
        capturedCards: [...revealedTableCards, cardWithFaceUp],
        newTableCards: [],
        pointsAwarded: 50,
        reason: 'five_slam_instant_win'
      };
    }

    // Matching value on a single card => PİŞTİ!
    if (playedCard.value === topCard.value) {
      const isDouble = playedCard.value === 11; // J on J is Double Pişti!
      const points = isDouble ? 20 : 10;
      return {
        isPisti: !isDouble,
        isDoublePisti: isDouble,
        isFiveSlamInstantWin: false,
        isSweep: true,
        isJackSweep: isDouble,
        capturedCards: [...revealedTableCards, cardWithFaceUp],
        newTableCards: [],
        pointsAwarded: points,
        reason: isDouble ? 'double_pisti' : 'pisti'
      };
    }

    // Vale on a different single card => Jack Sweep (NOT a Pişti, just collects)
    if (playedCard.value === 11) {
      return {
        isPisti: false,
        isDoublePisti: false,
        isFiveSlamInstantWin: false,
        isSweep: true,
        isJackSweep: true,
        capturedCards: [...revealedTableCards, cardWithFaceUp],
        newTableCards: [],
        pointsAwarded: 0,
        reason: 'jack_sweep'
      };
    }

    // Mismatched non-Jack card
    return {
      isPisti: false,
      isDoublePisti: false,
      isFiveSlamInstantWin: false,
      isSweep: false,
      isJackSweep: false,
      capturedCards: [],
      newTableCards: [...tableCards, cardWithFaceUp],
      pointsAwarded: 0,
      reason: 'placed_on_table'
    };
  }

  // Case 2: Table has 2 or more cards
  // Match with the top card: Normal trick sweep
  if (playedCard.value === topCard.value) {
    return {
      isPisti: false,
      isDoublePisti: false,
      isFiveSlamInstantWin: false,
      isSweep: true,
      isJackSweep: false,
      capturedCards: [...revealedTableCards, cardWithFaceUp],
      newTableCards: [],
      pointsAwarded: 0,
      reason: 'match_sweep'
    };
  }

  // Vale played on multiple cards: Jack Sweep
  if (playedCard.value === 11) {
    return {
      isPisti: false,
      isDoublePisti: false,
      isFiveSlamInstantWin: false,
      isSweep: true,
      isJackSweep: true,
      capturedCards: [...revealedTableCards, cardWithFaceUp],
      newTableCards: [],
      pointsAwarded: 0,
      reason: 'jack_sweep'
    };
  }

  // No match & no Jack: Card sits on the pile
  return {
    isPisti: false,
    isDoublePisti: false,
    isFiveSlamInstantWin: false,
    isSweep: false,
    isJackSweep: false,
    capturedCards: [],
    newTableCards: [...tableCards, cardWithFaceUp],
    pointsAwarded: 0,
    reason: 'placed_on_table'
  };
}

export interface DetailedRoundScore {
  pistiPoints: number;
  doublePistiPoints: number;
  majorityPoints: number;
  specialCardPoints: number;
  acesPoints: number;
  jacksPoints: number;
  diamonds10Points: number;
  clubs2Points: number;
  cardCount: number;
  totalRoundPoints: number;
}

/**
 * Calculates detailed score breakdown for a player at the end of a round.
 * Properly accounts for both regular collected cards and crossed Pişti pairs.
 */
export function calculateRoundBreakdown(
  player: Player,
  hasMajority: boolean
): DetailedRoundScore {
  let acesPoints = 0;
  let jacksPoints = 0;
  let diamonds10Points = 0;
  let clubs2Points = 0;

  // Include regular collected cards + cards stored in crossed Pişti pairs
  const allCards = [
    ...player.collectedCards,
    ...(player.pistiPairs || []).flatMap(p => [p.bottomCard, p.topCard])
  ];

  for (const card of allCards) {
    if (card.value === 1) acesPoints += 1;
    if (card.value === 11) jacksPoints += 1;
    if (card.suit === 'diamonds' && card.value === 10) diamonds10Points += 3;
    if (card.suit === 'clubs' && card.value === 2) clubs2Points += 2;
  }

  const specialCardPoints = acesPoints + jacksPoints + diamonds10Points + clubs2Points;
  const pistiPoints = player.pistiCount * 10;
  const doublePistiPoints = player.doublePistiCount * 20;
  const majorityPoints = hasMajority ? 3 : 0;

  const totalRoundPoints =
    pistiPoints + doublePistiPoints + majorityPoints + specialCardPoints;

  return {
    pistiPoints,
    doublePistiPoints,
    majorityPoints,
    specialCardPoints,
    acesPoints,
    jacksPoints,
    diamonds10Points,
    clubs2Points,
    cardCount: allCards.length,
    totalRoundPoints
  };
}
