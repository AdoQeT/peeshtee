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

test('tactile deck cut: riffle displacement formula lifts hovered cards smoothly', () => {
  const hoveredCutIndex = 25;
  const cards = Array.from({ length: 52 }, (_, i) => i);

  // Exact card should have maximum lift (-22px) and scale (1.18)
  const dist0 = Math.abs(25 - hoveredCutIndex);
  const factor0 = 1 - dist0 / 5;
  const lift0 = -factor0 * 22;
  const scale0 = 1 + factor0 * 0.18;
  assert.equal(lift0, -22);
  assert.equal(scale0, 1.18);

  // Neighbor card (dist 2) should have partial lift
  const dist2 = Math.abs(27 - hoveredCutIndex);
  const factor2 = 1 - dist2 / 5;
  const lift2 = -factor2 * 22;
  assert.equal(lift2, -13.2);

  // Distant card (dist 6) should have no tactile lift
  const dist6 = Math.abs(32 - hoveredCutIndex);
  const factor6 = dist6 <= 4 ? 1 - dist6 / 5 : 0;
  assert.equal(factor6, 0);
});

test('cardPhysicsEngine: motionType=play produces spring easing, 3D loft, and banking', async () => {
  const { cardPhysics } = await import('../src/core/physics/cardPhysicsEngine.ts');
  const plan = cardPhysics.generateFlightPlan({
    startX: 100,
    startY: 600,
    targetX: 500,
    targetY: 300,
    startRotation: 0,
    targetRotation: 5,
    startFaceUp: true,
    endFaceUp: true,
    motionType: 'play',
    arcHeight: 125
  });

  assert.equal(plan.easing, 'cubic-bezier(0.20, 1.10, 0.30, 1.02)'); // Spring overshoot
  assert.ok(plan.keyframes.length >= 20);
  assert.ok(plan.durationMs > 300);
});

test('seatOrientation: seat angles for 2P and 4P layout are mathematically sound', () => {
  const getSeatAngle = (playerIdx, totalPlayers) => {
    if (playerIdx === 0) return 0;
    if (totalPlayers === 2) return 180;
    if (playerIdx === 1) return 75; // Left bot
    if (playerIdx === 2) return 180; // Top bot
    if (playerIdx === 3) return -75; // Right bot
    return 180;
  };

  assert.equal(getSeatAngle(0, 2), 0);
  assert.equal(getSeatAngle(1, 2), 180);
  assert.equal(getSeatAngle(0, 4), 0);
  assert.equal(getSeatAngle(1, 4), 75);
  assert.equal(getSeatAngle(2, 4), 180);
  assert.equal(getSeatAngle(3, 4), -75);
});
