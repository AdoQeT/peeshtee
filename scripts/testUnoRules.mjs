import test from 'node:test';
import assert from 'node:assert/strict';

function canPlayUnoCard(card, topDiscard, currentColor, pendingDrawPenalty = 0) {
  if (pendingDrawPenalty > 0) {
    if (topDiscard.value === 'draw2') {
      return card.value === 'draw2' || card.value === 'wild_draw4';
    }
    if (topDiscard.value === 'wild_draw4') {
      return card.value === 'wild_draw4';
    }
  }

  if (card.color === 'wild') return true;
  if (card.color === currentColor) return true;
  if (card.value === topDiscard.value) return true;
  return false;
}

function calculateUnoHandPoints(hand) {
  return hand.reduce((sum, card) => sum + card.scoreValue, 0);
}

function getBotUnoPlay(hand, topDiscard, currentColor, pendingDrawPenalty = 0) {
  const playable = hand.filter(c =>
    canPlayUnoCard(c, topDiscard, currentColor, pendingDrawPenalty)
  );

  if (playable.length === 0) {
    return { cardToPlay: null };
  }

  const colorCounts = {
    red: hand.filter(c => c.color === 'red').length,
    blue: hand.filter(c => c.color === 'blue').length,
    green: hand.filter(c => c.color === 'green').length,
    yellow: hand.filter(c => c.color === 'yellow').length,
    wild: 0
  };

  let bestColor = 'red';
  let maxCount = -1;
  for (const [col, count] of Object.entries(colorCounts)) {
    if (col !== 'wild' && count > maxCount) {
      maxCount = count;
      bestColor = col;
    }
  }

  if (pendingDrawPenalty > 0) {
    const stackDraw2 = playable.find(c => c.value === 'draw2');
    if (stackDraw2) return { cardToPlay: stackDraw2 };

    const stackDraw4 = playable.find(c => c.value === 'wild_draw4');
    if (stackDraw4) return { cardToPlay: stackDraw4, chosenWildColor: bestColor };
  }

  const action = playable.find(
    c => c.value === 'draw2' || c.value === 'skip' || c.value === 'reverse'
  );
  if (action) return { cardToPlay: action };

  const normalSameColor = playable.find(c => c.color === currentColor && c.color !== 'wild');
  if (normalSameColor) return { cardToPlay: normalSameColor };

  const normalOther = playable.find(c => c.color !== 'wild');
  if (normalOther) return { cardToPlay: normalOther };

  const wildCard = playable.find(c => c.color === 'wild');
  return { cardToPlay: wildCard || null, chosenWildColor: bestColor };
}

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
