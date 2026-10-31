import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePlay, calculateRoundBreakdown } from '../src/core/rules.ts';

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
