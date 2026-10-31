import type { Card, AIDifficulty, BotPersonality } from '../../types/game';

/**
 * Chooses the best card for the AI opponent based on difficulty level and personality profile.
 */
export function chooseAICard(
  hand: Card[],
  tableCards: Card[],
  seenCards: Card[],
  difficulty: AIDifficulty,
  personality: BotPersonality = 'balanced'
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

  // 2. Medium (Kurnaz) & 3. Hard (Şampiyon) Logic with Personality Biases
  if (topCard) {
    // Case A: Table has cards. Can we match the top card?
    const matches = hand.filter(c => c.value === topCard.value);
    if (matches.length > 0) {
      // Prioritize capturing with the highest-point matching card (e.g., Karo 10 or Sinek 2)
      // so the bot secures its own special card points inside the captured pile!
      const sortedMatches = [...matches].sort((a, b) => (b.basePoints || 0) - (a.basePoints || 0));
      return sortedMatches[0];
    }

    // Case B: Can we play a Jack to sweep the pile?
    const jack = hand.find(c => c.value === 11);
    if (jack) {
      // Calculate total point value of the pot on table
      const potBasePoints = tableCards.reduce((sum, c) => sum + (c.basePoints || 0), 0);
      const hasValuableCard = potBasePoints > 0;

      // Personality adjustments to Jack eagerness:
      let shouldJack: boolean;
      if (personality === 'aggressive') {
        // "Risk Alan Dayı": Very eager Jack player! Sweeps even with 2 cards or single point.
        shouldJack = tableCards.length >= 2 || hasValuableCard;
      } else if (personality === 'tactician') {
        // "Pusucu / Kart Sayan": Strict conservation. Only Jacks for thick piles or multi-point pots.
        shouldJack = potBasePoints >= 2 || tableCards.length >= 4;
      } else if (personality === 'bluffer') {
        // "Blöfçü": Unpredictable; occasionally sweeps empty-ish piles just to disrupt opponent rhythm!
        shouldJack = tableCards.length >= 2 || hasValuableCard || Math.random() > 0.6;
      } else {
        // Balanced
        shouldJack =
          difficulty === 'hard'
            ? potBasePoints >= 2 || tableCards.length >= 4 || (hasValuableCard && tableCards.length >= 2)
            : tableCards.length >= 3 || hasValuableCard;
      }

      if (shouldJack) {
        return jack;
      }
    }

    // Case C: No match, no Jack (or saving Jack). Pick the safest discard.
    return pickSafestDiscard(hand, seenCards, difficulty, personality);
  }

  // Case D: Table is EMPTY.
  // We must throw a card without giving the opponent an easy Pişti!
  return pickSafestEmptyTableDiscard(hand, seenCards, difficulty, personality);
}

/**
 * Picks the safest card to discard onto an empty table.
 */
function pickSafestEmptyTableDiscard(
  hand: Card[],
  seenCards: Card[],
  difficulty: AIDifficulty,
  personality: BotPersonality = 'balanced'
): Card {
  // Never discard a Jack (11) on an empty table if we have other cards!
  const nonJacks = hand.filter(c => c.value !== 11);
  const pool = nonJacks.length > 0 ? nonJacks : hand;

  // Never discard high-value cards (Karo 10, Sinek 2, As) if possible
  const nonSpecials = pool.filter(c => !c.isSpecial);
  const candidatePool = nonSpecials.length > 0 ? nonSpecials : pool;

  // Bluffer: Sometimes discards an unexpected medium rank to bait opponent
  if (personality === 'bluffer' && candidatePool.length > 1 && Math.random() > 0.5) {
    return candidatePool[Math.floor(Math.random() * candidatePool.length)];
  }

  if (difficulty === 'hard' || personality === 'tactician') {
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

  // Medium / Balanced / Aggressive: Pick rank with duplicate if available
  const valueFrequencies: Record<number, number> = {};
  for (const c of candidatePool) {
    valueFrequencies[c.value] = (valueFrequencies[c.value] || 0) + 1;
  }

  const duplicates = candidatePool.filter(c => valueFrequencies[c.value] > 1);
  if (duplicates.length > 0) {
    return duplicates[0];
  }

  // Otherwise pick lowest base non-special card
  return candidatePool[0];
}

/**
 * Safest discard when table has cards we can't capture
 */
function pickSafestDiscard(
  hand: Card[],
  seenCards: Card[],
  difficulty: AIDifficulty,
  personality: BotPersonality = 'balanced'
): Card {
  // Don't waste Jack
  const nonJacks = hand.filter(c => c.value !== 11);
  const pool = nonJacks.length > 0 ? nonJacks : hand;

  // Don't feed points
  const nonSpecials = pool.filter(c => !c.isSpecial);
  const candidates = nonSpecials.length > 0 ? nonSpecials : pool;

  if (difficulty === 'hard' || personality === 'tactician') {
    // Count how many of each rank have been seen + held in hand to minimize opponent match risk
    const rankCounts: Record<number, number> = {};
    for (const c of seenCards) {
      rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    }
    const sorted = [...candidates].sort((a, b) => {
      const seenA = (rankCounts[a.value] || 0) + hand.filter(c => c.value === a.value).length - 1;
      const seenB = (rankCounts[b.value] || 0) + hand.filter(c => c.value === b.value).length - 1;
      return seenB - seenA;
    });
    return sorted[0];
  }

  return candidates[0];
}

export type BotReactionContext =
  | 'pisti_scored'
  | 'pisti_suffered'
  | 'jack_sweep'
  | 'opponent_jack'
  | 'majority_won'
  | 'game_lost'
  | 'game_won';

export interface BotReaction {
  text: string;
  emoji: string;
}

/**
 * Returns a contextual speech dialogue and emote according to bot personality and game event.
 */
export function getBotContextualReaction(
  context: BotReactionContext,
  personality: BotPersonality = 'balanced',
  lang: 'tr' | 'en' | 'de' | 'es' = 'tr'
): BotReaction {
  const isTr = lang === 'tr';

  switch (context) {
    case 'pisti_scored':
      if (personality === 'aggressive') {
        return {
          text: isTr ? 'İşte böyle basarlar! 🔥' : 'Boom! That is how it is done! 🔥',
          emoji: '🔥'
        };
      }
      if (personality === 'tactician') {
        return {
          text: isTr ? 'Hesaplarıma göre tam zamanıydı. 🧠' : 'Calculated to perfection. 🧠',
          emoji: '😎'
        };
      }
      if (personality === 'bluffer') {
        return {
          text: isTr ? 'Göz göre göre geldi değil mi? 😉' : 'Saw that one coming, right? 😉',
          emoji: '😉'
        };
      }
      return {
        text: isTr ? 'Temiz bir Pişti! 🎴' : 'A clean Pişti! 🎴',
        emoji: '😎'
      };

    case 'pisti_suffered':
      if (personality === 'aggressive') {
        return {
          text: isTr ? 'Şansın yaver gitti sadece! 😤' : 'Pure luck, nothing more! 😤',
          emoji: '😡'
        };
      }
      if (personality === 'tactician') {
        return {
          text: isTr ? 'O kartı saymıştım ama tebrikler... 🧐' : 'I counted that card, well played... 🧐',
          emoji: '🧐'
        };
      }
      return {
        text: isTr ? 'Güzel hamleydi, hakkını yemeyelim. 👏' : 'Great move, gotta admit it. 👏',
        emoji: '👏'
      };

    case 'jack_sweep':
      if (personality === 'aggressive') {
        return {
          text: isTr ? 'Masa temizliği benden sorulur! 🧹' : 'Table cleaning duty taken care of! 🧹',
          emoji: '🧹'
        };
      }
      return {
        text: isTr ? 'Vale kesene yarar dedik! 🃏' : 'The Jack sweeps clean! 🃏',
        emoji: '🃏'
      };

    case 'opponent_jack':
      return {
        text: isTr ? 'Tam da biriktiriyordum ya... 🥲' : 'I was just building that pot... 🥲',
        emoji: '🥲'
      };

    case 'majority_won':
      return {
        text: isTr ? 'Kart çoğunluğu bizde! 📦' : 'Card majority secured! 📦',
        emoji: '🏆'
      };

    case 'game_won':
      return {
        text: isTr ? 'Güzel maçtı, eline sağlık! 🏆' : 'Great match, well played! 🏆',
        emoji: '🏆'
      };

    case 'game_lost':
      return {
        text: isTr ? 'Rövanşı alırız elbet! 🤝' : 'Rematch is definitely on! 🤝',
        emoji: '🤝'
      };
  }
}
