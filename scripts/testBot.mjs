import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAICard } from '../src/core/ai/bot.ts';

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

test('bot.ts: aggressive personality eagerly plays Jack on thin 2-card table', () => {
  const hand = [
    { id: 'c1', value: 3, isSpecial: false, basePoints: 0 },
    { id: 'c2', value: 11, isSpecial: true, basePoints: 1 }
  ];
  const thinTable = [
    { id: 't1', value: 6, isSpecial: false, basePoints: 0 },
    { id: 't2', value: 7, isSpecial: false, basePoints: 0 }
  ];
  // Aggressive bot ("Risk Alan Dayı") plays Jack even on thin 2-card pile!
  const chosenAggressive = chooseAICard(hand, thinTable, [], 'medium', 'aggressive');
  assert.equal(chosenAggressive.value, 11);
});
