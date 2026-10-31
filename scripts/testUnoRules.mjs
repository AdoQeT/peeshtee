import test from 'node:test';
import assert from 'node:assert/strict';
import { canPlayUnoCard, calculateUnoHandPoints, getBotUnoPlay } from '../src/features/uno/unoRules.ts';

test('unoRules: matching color or matching value is playable', () => {
  const topDiscard = { id: 'u1', color: 'red', value: '7', scoreValue: 7 };
  
  // Same color, diff value
  assert.equal(canPlayUnoCard({ id: 'u2', color: 'red', value: '3', scoreValue: 3 }, topDiscard, 'red', 0), true);
  // Diff color, same value
  assert.equal(canPlayUnoCard({ id: 'u3', color: 'blue', value: '7', scoreValue: 7 }, topDiscard, 'red', 0), true);
  // Diff color, diff value
  assert.equal(canPlayUnoCard({ id: 'u4', color: 'green', value: '2', scoreValue: 2 }, topDiscard, 'red', 0), false);
  // Wild is always playable
  assert.equal(canPlayUnoCard({ id: 'u5', color: 'wild', value: 'wild', scoreValue: 50 }, topDiscard, 'red', 0), true);
});

test('unoRules: draw stacking rules (+2 can be countered by +2 or +4; +4 only by +4)', () => {
  const topDraw2 = { id: 'u1', color: 'red', value: 'draw2', scoreValue: 20 };
  const topDraw4 = { id: 'u2', color: 'wild', value: 'wild_draw4', scoreValue: 50 };

  // Countering +2
  assert.equal(canPlayUnoCard({ id: 'u3', color: 'blue', value: 'draw2', scoreValue: 20 }, topDraw2, 'red', 2), true);
  assert.equal(canPlayUnoCard({ id: 'u4', color: 'wild', value: 'wild_draw4', scoreValue: 50 }, topDraw2, 'red', 2), true);
  assert.equal(canPlayUnoCard({ id: 'u5', color: 'red', value: '5', scoreValue: 5 }, topDraw2, 'red', 2), false);

  // Countering +4
  assert.equal(canPlayUnoCard({ id: 'u6', color: 'blue', value: 'draw2', scoreValue: 20 }, topDraw4, 'blue', 4), false);
  assert.equal(canPlayUnoCard({ id: 'u7', color: 'wild', value: 'wild_draw4', scoreValue: 50 }, topDraw4, 'blue', 4), true);
});

test('unoRules: bot prioritizes stacking when penalty active and chooses dominant wild color', () => {
  const hand = [
    { id: 'u1', color: 'blue', value: '1', scoreValue: 1 },
    { id: 'u2', color: 'blue', value: '2', scoreValue: 2 },
    { id: 'u3', color: 'green', value: 'draw2', scoreValue: 20 },
    { id: 'u4', color: 'wild', value: 'wild_draw4', scoreValue: 50 }
  ];
  const topDiscard = { id: 'top', color: 'red', value: 'draw2', scoreValue: 20 };

  const play = getBotUnoPlay(hand, topDiscard, 'red', 2);
  assert.equal(play.cardToPlay?.value, 'draw2');

  // When only wild is available, choose bot's most frequent color (blue)
  const wildPlay = getBotUnoPlay([
    { id: 'u1', color: 'blue', value: '1', scoreValue: 1 },
    { id: 'u2', color: 'blue', value: '2', scoreValue: 2 },
    { id: 'u4', color: 'wild', value: 'wild', scoreValue: 50 }
  ], { id: 'top', color: 'yellow', value: '8', scoreValue: 8 }, 'yellow', 0);
  assert.equal(wildPlay.cardToPlay?.value, 'wild');
  assert.equal(wildPlay.chosenWildColor, 'blue');
});

test('unoRules: calculateUnoHandPoints sums card values accurately', () => {
  const hand = [
    { id: 'u1', color: 'red', value: '5', scoreValue: 5 },
    { id: 'u2', color: 'blue', value: 'skip', scoreValue: 20 },
    { id: 'u3', color: 'wild', value: 'wild_draw4', scoreValue: 50 }
  ];
  assert.equal(calculateUnoHandPoints(hand), 75);
});
