import test from 'node:test';
import assert from 'node:assert/strict';

function pickSafestEmptyTableDiscard(hand, seenCards, difficulty) {
  const nonJacks = hand.filter(c => c.value !== 11);
  const pool = nonJacks.length > 0 ? nonJacks : hand;

  const nonSpecials = pool.filter(c => !c.isSpecial);
  const candidatePool = nonSpecials.length > 0 ? nonSpecials : pool;

  if (difficulty === 'hard') {
    const rankCounts = {};
    for (const c of seenCards) {
      rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    }

    const sortedBySafety = [...candidatePool].sort((a, b) => {
      const seenA = (rankCounts[a.value] || 0) + hand.filter(c => c.value === a.value).length - 1;
      const seenB = (rankCounts[b.value] || 0) + hand.filter(c => c.value === b.value).length - 1;
      return seenB - seenA;
    });

    return sortedBySafety[0];
  }

  const valueFrequencies = {};
  for (const c of candidatePool) {
    valueFrequencies[c.value] = (valueFrequencies[c.value] || 0) + 1;
  }

  const duplicates = candidatePool.filter(c => valueFrequencies[c.value] > 1);
  if (duplicates.length > 0) {
    return duplicates[0];
  }

  return candidatePool[0];
}

function pickSafestDiscard(hand, seenCards, difficulty) {
  const nonJacks = hand.filter(c => c.value !== 11);
  const pool = nonJacks.length > 0 ? nonJacks : hand;

  const nonSpecials = pool.filter(c => !c.isSpecial);
  const candidates = nonSpecials.length > 0 ? nonSpecials : pool;

  if (difficulty === 'hard') {
    const rankCounts = {};
    for (const c of seenCards) {
      rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    }
    const sorted = [...candidates].sort((a, b) => {
      const seenA = rankCounts[a.value] || 0;
      const seenB = rankCounts[b.value] || 0;
      return seenB - seenA;
    });
    return sorted[0];
  }

  return candidates[0];
}

function chooseAICard(hand, tableCards, seenCards, difficulty) {
  if (hand.length === 0) {
    throw new Error('AI hand is empty');
  }

  if (difficulty === 'easy') {
    if (tableCards.length > 0) {
      const topCard = tableCards[tableCards.length - 1];
      const match = hand.find(c => c.value === topCard.value);
      if (match) return match;
    }
    return hand[0];
  }

  const topCard = tableCards.length > 0 ? tableCards[tableCards.length - 1] : null;

  if (topCard) {
    const match = hand.find(c => c.value === topCard.value);
    if (match) return match;

    const jack = hand.find(c => c.value === 11);
    if (jack) {
      const potBasePoints = tableCards.reduce((sum, c) => sum + (c.basePoints || 0), 0);
      const hasValuableCard = potBasePoints > 0;
      const shouldJack =
        difficulty === 'hard'
          ? potBasePoints >= 2 || tableCards.length >= 4 || (hasValuableCard && tableCards.length >= 2)
          : tableCards.length >= 3 || hasValuableCard;

      if (shouldJack) {
        return jack;
      }
    }

    return pickSafestDiscard(hand, seenCards, difficulty);
  }

  return pickSafestEmptyTableDiscard(hand, seenCards, difficulty);
}

test('bot.ts: directly captures with matching card when available', () => {
  const hand = [
    { id: 'c1', value: 3, isSpecial: false, basePoints: 0 },
    { id: 'c2', value: 9, isSpecial: false, basePoints: 0 },
    { id: 'c3', value: 11, isSpecial: true, basePoints: 1 }
  ];
  const table = [{ id: 't1', value: 9, isSpecial: false, basePoints: 0 }];
  
  const chosen = chooseAICard(hand, table, [], 'hard');
  assert.equal(chosen.value, 9);
});

test('bot.ts: Jack sweeps when table is valuable or pile threshold met', () => {
  const hand = [
    { id: 'c1', value: 3, isSpecial: false, basePoints: 0 },
    { id: 'c2', value: 11, isSpecial: true, basePoints: 1 }
  ];
  // Table has diamond 10 (basePoints = 3)
  const valuableTable = [{ id: 't1', value: 10, suit: 'diamonds', isSpecial: true, basePoints: 3 }];
  const chosenWithValuable = chooseAICard(hand, valuableTable, [], 'hard');
  assert.equal(chosenWithValuable.value, 11);

  // Table has only 2 non-valuable cards -> Hard bot preserves Jack
  const smallTable = [
    { id: 't1', value: 6, isSpecial: false, basePoints: 0 },
    { id: 't2', value: 7, isSpecial: false, basePoints: 0 }
  ];
  const chosenPreserve = chooseAICard(hand, smallTable, [], 'hard');
  assert.equal(chosenPreserve.value, 3);
});

test('bot.ts: empty table discard avoids Jack and avoids high-value cards', () => {
  const hand = [
    { id: 'c1', value: 11, isSpecial: true, basePoints: 1 }, // Jack
    { id: 'c2', value: 1, isSpecial: true, basePoints: 1 },  // Ace (special)
    { id: 'c3', value: 4, isSpecial: false, basePoints: 0 }  // Safe 4
  ];
  const chosen = chooseAICard(hand, [], [], 'hard');
  assert.equal(chosen.value, 4);
});

test('bot.ts: card counting on hard difficulty selects most-seen rank to prevent Pişti', () => {
  const hand = [
    { id: 'c1', value: 7, isSpecial: false, basePoints: 0 },
    { id: 'c2', value: 8, isSpecial: false, basePoints: 0 }
  ];
  // Suppose three 8s have already been seen/played in the game
  const seenCards = [
    { id: 's1', value: 8 },
    { id: 's2', value: 8 },
    { id: 's3', value: 8 }
  ];
  const chosen = chooseAICard(hand, [], seenCards, 'hard');
  // 8 is 100% immune to Pişti because all other 3 are accounted for!
  assert.equal(chosen.value, 8);
});
