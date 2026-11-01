import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePlay, calculateRoundBreakdown } from '../src/core/rules.ts';
import { dealInitialGame } from '../src/core/deck.ts';

test('rules.ts: evaluatePlay on empty table places card', () => {
  const card = { id: 'c1', suit: 'hearts', value: 7, isSpecial: false, basePoints: 0, faceUp: false };
  const res = evaluatePlay([], card);
  assert.equal(res.isPisti, false);
  assert.equal(res.isSweep, false);
  assert.equal(res.newTableCards.length, 1);
  assert.equal(res.newTableCards[0].faceUp, true);
  assert.equal(res.reason, 'placed_on_table');
});

test('rules.ts: evaluatePlay single card match triggers regular Pişti (10 pts)', () => {
  const top = { id: 'c1', suit: 'hearts', value: 8, isSpecial: false, basePoints: 0, faceUp: true };
  const played = { id: 'c2', suit: 'spades', value: 8, isSpecial: false, basePoints: 0, faceUp: false };
  const res = evaluatePlay([top], played);
  assert.equal(res.isPisti, true);
  assert.equal(res.isDoublePisti, false);
  assert.equal(res.pointsAwarded, 10);
  assert.equal(res.capturedCards.length, 2);
  assert.equal(res.reason, 'pisti');
});

test('rules.ts: evaluatePlay Jack on Jack triggers Double Pişti (20 pts)', () => {
  const top = { id: 'c1', suit: 'clubs', value: 11, isSpecial: true, basePoints: 1, faceUp: true };
  const played = { id: 'c2', suit: 'diamonds', value: 11, isSpecial: true, basePoints: 1, faceUp: false };
  const res = evaluatePlay([top], played);
  assert.equal(res.isPisti, false);
  assert.equal(res.isDoublePisti, true);
  assert.equal(res.pointsAwarded, 20);
  assert.equal(res.reason, 'double_pisti');
});

test('rules.ts: evaluatePlay Jack on single non-Jack is sweep but NOT Pişti', () => {
  const top = { id: 'c1', suit: 'hearts', value: 9, isSpecial: false, basePoints: 0, faceUp: true };
  const played = { id: 'c2', suit: 'spades', value: 11, isSpecial: true, basePoints: 1, faceUp: false };
  const res = evaluatePlay([top], played);
  assert.equal(res.isPisti, false);
  assert.equal(res.isDoublePisti, false);
  assert.equal(res.isJackSweep, true);
  assert.equal(res.pointsAwarded, 0);
  assert.equal(res.reason, 'jack_sweep');
});

test('rules.ts: evaluatePlay 5 on 5 with fiveRuleEnabled triggers instant win', () => {
  const top = { id: 'c1', suit: 'hearts', value: 5, isSpecial: false, basePoints: 0, faceUp: true };
  const played = { id: 'c2', suit: 'spades', value: 5, isSpecial: false, basePoints: 0, faceUp: false };
  const res = evaluatePlay([top], played, true);
  assert.equal(res.isPisti, true);
  assert.equal(res.isFiveSlamInstantWin, true);
  assert.equal(res.reason, 'five_slam_instant_win');
});

test('rules.ts: calculateRoundBreakdown computes all special card values and majority points correctly', () => {
  const player = {
    id: 'p1',
    name: 'Player',
    avatar: '🐺',
    pistiCount: 2, // 20 pts
    doublePistiCount: 1, // 20 pts
    bonusPoints: 5,
    collectedCards: [
      { id: 'c1', suit: 'hearts', value: 1, isSpecial: true, basePoints: 1 }, // Ace +1
      { id: 'c2', suit: 'spades', value: 1, isSpecial: true, basePoints: 1 }, // Ace +1
      { id: 'c3', suit: 'diamonds', value: 10, isSpecial: true, basePoints: 3 }, // Diamond 10 +3
      { id: 'c4', suit: 'clubs', value: 2, isSpecial: true, basePoints: 2 }, // Club 2 +2
      { id: 'c5', suit: 'spades', value: 11, isSpecial: true, basePoints: 1 }, // Jack +1
      { id: 'c6', suit: 'hearts', value: 7, isSpecial: false, basePoints: 0 }
    ],
    pistiPairs: []
  };

  const breakdown = calculateRoundBreakdown(player, true); // majority = true (+3 pts)
  assert.equal(breakdown.pistiPoints, 20);
  assert.equal(breakdown.doublePistiPoints, 20);
  assert.equal(breakdown.majorityPoints, 3);
  assert.equal(breakdown.acesPoints, 2);
  assert.equal(breakdown.diamonds10Points, 3);
  assert.equal(breakdown.clubs2Points, 2);
  assert.equal(breakdown.jacksPoints, 1);
  assert.equal(breakdown.specialCardPoints, 2 + 3 + 2 + 1); // 8 pts
  assert.equal(breakdown.bonusPoints, 5);
  // Total: 20 + 20 + 3 + 8 + 5 = 56
  assert.equal(breakdown.totalRoundPoints, 56);
  assert.equal(breakdown.cardCount, 6);
});

test('rules.ts: 4-player team score aggregation calculates combined Piştis and bonusPoints without duplicate penalty', () => {
  // Teammate 1 (Player 0)
  const p0 = {
    id: 'p0',
    name: 'You',
    pistiCount: 1, // 10 pts
    doublePistiCount: 0,
    bonusPoints: 0,
    collectedCards: [
      { id: 'c1', suit: 'diamonds', value: 10, isSpecial: true, basePoints: 3 }
    ],
    pistiPairs: []
  };

  // Teammate 2 (Player 2 - Partner)
  const p2 = {
    id: 'p2',
    name: 'Partner',
    pistiCount: 1, // 10 pts
    doublePistiCount: 1, // 20 pts
    bonusPoints: 5, // Deck cut bonus
    collectedCards: [
      { id: 'c2', suit: 'clubs', value: 2, isSpecial: true, basePoints: 2 },
      { id: 'c3', suit: 'hearts', value: 1, isSpecial: true, basePoints: 1 }
    ],
    pistiPairs: []
  };

  const userSideAggregate = {
    ...p0,
    name: 'Bizim Takım',
    pistiCount: p0.pistiCount + p2.pistiCount, // 1 + 1 = 2 (20 pts)
    doublePistiCount: p0.doublePistiCount + p2.doublePistiCount, // 0 + 1 = 1 (20 pts)
    bonusPoints: (p0.bonusPoints || 0) + (p2.bonusPoints || 0), // 0 + 5 = 5 pts
    collectedCards: [...p0.collectedCards, ...p2.collectedCards],
    pistiPairs: [...p0.pistiPairs, ...p2.p2pistiPairs || []]
  };

  const teamBreakdown = calculateRoundBreakdown(userSideAggregate, true);
  // Expected:
  // pistiPoints: 2 * 10 = 20
  // doublePistiPoints: 1 * 20 = 20
  // majorityPoints: 3
  // specialCardPoints: 3 (Diamond 10) + 2 (Club 2) + 1 (Ace) = 6
  // bonusPoints: 5
  // total: 20 + 20 + 3 + 6 + 5 = 54
  assert.equal(teamBreakdown.pistiPoints, 20);
  assert.equal(teamBreakdown.doublePistiPoints, 20);
  assert.equal(teamBreakdown.majorityPoints, 3);
  assert.equal(teamBreakdown.specialCardPoints, 6);
  assert.equal(teamBreakdown.bonusPoints, 5);
  assert.equal(teamBreakdown.totalRoundPoints, 54);
});

test('deck.ts: dealInitialGame awards consecutive Jacks revealed at position 4 to cutter and re-reveals next card', () => {
  // Mock deck where:
  // table gets first 3 cards face down (deck.pop()), then 4th card is a Jack, 5th card is also a Jack, 6th is a 7 of Hearts
  const customDeck = [];
  for (let i = 0; i < 40; i++) {
    customDeck.push({ id: `c-${i}`, suit: 'spades', value: 2, isSpecial: false, basePoints: 0, faceUp: false });
  }
  // The deck pops from the end:
  // pop #1 (table 1): 2
  // pop #2 (table 2): 2
  // pop #3 (table 3): 2
  // pop #4 (revealed): Jack of Hearts
  // pop #5 (revealed): Jack of Spades
  // pop #6 (revealed): 7 of Hearts (final top table card)
  customDeck.push({ id: 'card-next', suit: 'hearts', value: 7, isSpecial: false, basePoints: 0, faceUp: false });
  customDeck.push({ id: 'jack-2', suit: 'spades', value: 11, isSpecial: true, basePoints: 1, faceUp: false });
  customDeck.push({ id: 'jack-1', suit: 'hearts', value: 11, isSpecial: true, basePoints: 1, faceUp: false });
  customDeck.push({ id: 'down-3', suit: 'diamonds', value: 3, isSpecial: false, basePoints: 0, faceUp: false });
  customDeck.push({ id: 'down-2', suit: 'diamonds', value: 4, isSpecial: false, basePoints: 0, faceUp: false });
  customDeck.push({ id: 'down-1', suit: 'diamonds', value: 5, isSpecial: false, basePoints: 0, faceUp: false });

  const result = dealInitialGame(customDeck, 2, true, 0);

  // Both jacks should have been awarded to cutter
  assert.equal(result.jacksAwardedToCutter.length, 2);
  assert.equal(result.jacksAwardedToCutter[0].id, 'jack-1');
  assert.equal(result.jacksAwardedToCutter[0].faceUp, true);
  assert.equal(result.jacksAwardedToCutter[1].id, 'jack-2');
  assert.equal(result.jacksAwardedToCutter[1].faceUp, true);

  // Table must have 4 cards: 3 down, 1 face-up (which is card-next: value 7)
  assert.equal(result.tableCards.length, 4);
  assert.equal(result.tableCards[0].faceUp, false);
  assert.equal(result.tableCards[1].faceUp, false);
  assert.equal(result.tableCards[2].faceUp, false);
  assert.equal(result.tableCards[3].id, 'card-next');
  assert.equal(result.tableCards[3].value, 7);
  assert.equal(result.tableCards[3].faceUp, true);
});
