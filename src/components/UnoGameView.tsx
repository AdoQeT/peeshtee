import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UnoCard,
  UnoColor,
  UnoPlayer,
  UnoGameState
} from '../features/uno/unoTypes';
import {
  createUnoDeck,
  shuffleUnoDeck,
  dealUnoGame
} from '../features/uno/unoDeck';
import {
  canPlayUnoCard,
  calculateUnoHandPoints,
  getBotUnoPlay
} from '../features/uno/unoRules';
import { UnoCardView, UnoCardBack } from './UnoCardView';
import { AvatarBadge } from './AvatarBadge';
import { getUserProfile, recordMatchStats, getAvatarPreset } from '../features/profile/profileManager';
import { sound } from '../core/audio/soundEngine';
import { FlyingUnoCardData, UnoCardAnimationLayer } from './UnoCardAnimationLayer';
import { UnoGrandShuffleLayer } from './UnoGrandShuffleLayer';
import { AmbientParticles } from './AmbientParticles';
import { multiplayerManager, LobbyPlayerSlot } from '../features/multiplayer/peerManager';
import { friendNetwork } from '../features/friends/friendNetwork';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCw,
  RotateCcw,
  Sparkles,
  Trophy,
  AlertTriangle,
  Flame,
  Zap,
  ShieldAlert,
  Hand,
  SkipForward
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UnoGameViewProps {
  onExitToMenu: () => void;
  playerCount?: number;
  targetScore?: number;
  isMultiplayer?: boolean;
  isHost?: boolean;
  mySeatIndex?: number;
  mpSlots?: LobbyPlayerSlot[];
  seedCards?: UnoCard[];
}

export function sortUnoCardsByColor(cards: UnoCard[]): UnoCard[] {
  const COLOR_ORDER: Record<UnoColor, number> = {
    red: 0,
    blue: 1,
    green: 2,
    yellow: 3,
    wild: 4
  };
  const VALUE_ORDER: Record<string, number> = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'skip': 10, 'reverse': 11, 'draw2': 12, 'wild': 13, 'wild_draw4': 14
  };

  return [...cards].sort((a, b) => {
    const colorDiff = (COLOR_ORDER[a.color] ?? 99) - (COLOR_ORDER[b.color] ?? 99);
    if (colorDiff !== 0) return colorDiff;
    return (VALUE_ORDER[a.value] ?? 99) - (VALUE_ORDER[b.value] ?? 99);
  });
}

const COLOR_NAMES: Record<UnoColor, string> = {
  red: 'Kırmızı',
  blue: 'Mavi',
  green: 'Yeşil',
  yellow: 'Sarı',
  wild: 'Joker'
};

const COLOR_DOT_CLASSES: Record<UnoColor, string> = {
  red: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]',
  blue: 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)]',
  green: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]',
  yellow: 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.9)]',
  wild: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.9)]'
};

const COLOR_THEMES: Record<
  UnoColor,
  {
    glow: string;
    text: string;
    bgRing: string;
    border: string;
    tableAura: string;
    strokeHex: string;
  }
> = {
  red: {
    glow: 'rgba(239, 68, 68, 0.45)',
    text: 'text-red-400',
    bgRing: 'ring-red-500/70',
    border: 'border-red-500/80',
    tableAura: 'from-red-950/45 via-red-900/15 to-transparent',
    strokeHex: '#ef4444'
  },
  blue: {
    glow: 'rgba(59, 130, 246, 0.45)',
    text: 'text-blue-400',
    bgRing: 'ring-blue-500/70',
    border: 'border-blue-500/80',
    tableAura: 'from-blue-950/45 via-blue-900/15 to-transparent',
    strokeHex: '#3b82f6'
  },
  green: {
    glow: 'rgba(16, 185, 129, 0.45)',
    text: 'text-emerald-400',
    bgRing: 'ring-emerald-500/70',
    border: 'border-emerald-500/80',
    tableAura: 'from-emerald-950/45 via-emerald-900/15 to-transparent',
    strokeHex: '#10b981'
  },
  yellow: {
    glow: 'rgba(245, 158, 11, 0.45)',
    text: 'text-amber-400',
    bgRing: 'ring-amber-400/70',
    border: 'border-amber-400/80',
    tableAura: 'from-amber-950/45 via-amber-900/15 to-transparent',
    strokeHex: '#f59e0b'
  },
  wild: {
    glow: 'rgba(168, 85, 247, 0.45)',
    text: 'text-purple-400',
    bgRing: 'ring-purple-500/70',
    border: 'border-purple-500/80',
    tableAura: 'from-purple-950/45 via-purple-900/15 to-transparent',
    strokeHex: '#a855f7'
  }
};

function formatCardName(card: UnoCard): string {
  const valMap: Record<string, string> = {
    skip: '🚫 Pas',
    reverse: '⇄ Yön Değiştir',
    draw2: '+2 Kart',
    wild: '🌈 Joker',
    wild_draw4: '🌈 +4 Joker'
  };
  const v = valMap[card.value] || card.value;
  if (card.color === 'wild') return v;
  return `${COLOR_NAMES[card.color]} ${v}`;
}

interface DiscardStackItem {
  card: UnoCard;
  rotation: number;
  offsetX: number;
  offsetY: number;
  playedBy?: string;
}

export const UnoGameView: React.FC<UnoGameViewProps> = ({
  onExitToMenu,
  playerCount = 4,
  targetScore = 250,
  isMultiplayer = false,
  isHost = true,
  mySeatIndex = 0,
  mpSlots,
  seedCards
}) => {
  const userProfile = getUserProfile();

  // Players state setup
  const [players, setPlayers] = useState<UnoPlayer[]>(() => {
    if (isMultiplayer && mpSlots && mpSlots.length >= playerCount) {
      const list: UnoPlayer[] = [];
      for (let j = 0; j < playerCount; j++) {
        const originalSeat = (j + mySeatIndex) % playerCount;
        const slot = mpSlots[originalSeat];
        const isMe = j === 0;
        list.push({
          id: isMe ? userProfile.id : `player-${originalSeat}`,
          name: isMe ? `${slot.name} (Sen)` : slot.name,
          avatarId: isMe ? userProfile.avatarId : slot.avatarId || 'wolf',
          customAvatarUrl: isMe ? userProfile.customAvatarDataUrl : slot.customAvatarUrl,
          isAI: Boolean(slot.isAI),
          hand: [],
          score: 0,
          hasCalledUno: false
        });
      }
      return list;
    }

    const list: UnoPlayer[] = [
      {
        id: userProfile.id,
        name: userProfile.name,
        avatarId: userProfile.avatarId,
        customAvatarUrl: userProfile.customAvatarDataUrl,
        isAI: false,
        hand: [],
        score: 0,
        hasCalledUno: false
      }
    ];

    const botTemplates = [
      { name: 'Kurnaz Bot', avatarId: 'lion' },
      { name: 'Siber AI', avatarId: 'cyber_samurai' },
      { name: 'Kıraathane Dayısı', avatarId: 'dayi' }
    ];

    for (let i = 1; i < playerCount; i++) {
      const template = botTemplates[(i - 1) % botTemplates.length];
      list.push({
        id: `bot-${i}`,
        name: template.name,
        avatarId: template.avatarId,
        isAI: true,
        hand: [],
        score: 0,
        hasCalledUno: false
      });
    }
    return list;
  });

  const [gameState, setGameState] = useState<UnoGameState>(() => ({
    round: 1,
    deck: [],
    discardPile: [],
    currentColor: 'red',
    currentTurn: isMultiplayer ? (0 - mySeatIndex + playerCount) % playerCount : 0,
    direction: 1,
    targetScore,
    winner: null,
    roundWinner: null,
    isRoundOver: false,
    isGameOver: false,
    lastActionMessage: 'RENQ Masasına Hoş Geldiniz!'
  }));

  // Synchronous mirrors to prevent React 18 batching closure bugs
  const deckSyncRef = useRef<UnoCard[]>([]);
  const discardSyncRef = useRef<UnoCard[]>([]);
  const playersSyncRef = useRef<UnoPlayer[]>(players);
  playersSyncRef.current = players;
  const gameStateSyncRef = useRef<UnoGameState>(gameState);
  gameStateSyncRef.current = gameState;

  // Discard pile physical fanned history stack (last 5 played cards)
  const [discardStack, setDiscardStack] = useState<DiscardStackItem[]>([]);

  // Per-player floating action speech bubble
  const [seatBubbles, setSeatBubbles] = useState<Record<number, string>>({});

  // Interactive Card Hand States
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [newlyDrawnCardId, setNewlyDrawnCardId] = useState<string | null>(null);
  const [hasDrawnPlayableThisTurn, setHasDrawnPlayableThisTurn] = useState(false);
  const [isAnimatingAction, setIsAnimatingAction] = useState(false);
  const [isUnoShuffling, setIsUnoShuffling] = useState(false);
  const [isInitialDealing, setIsInitialDealing] = useState(false);

  const [wildPickerCard, setWildPickerCard] = useState<UnoCard | null>(null);
  const [wildPickerRect, setWildPickerRect] = useState<DOMRect | undefined>(undefined);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // FX & Banner States
  const [actionBanner, setActionBanner] = useState<{
    text: string;
    type?: 'reverse' | 'skip' | 'draw' | 'uno' | 'wild';
  } | null>(null);
  const [skippedPlayerIdx, setSkippedPlayerIdx] = useState<number | null>(null);
  const [tablePulseKey, setTablePulseKey] = useState(0);

  // Flying Card Animation State
  const [flyingCards, setFlyingCards] = useState<FlyingUnoCardData[]>([]);
  const [hiddenCardIds, setHiddenCardIds] = useState<Set<string>>(new Set());

  // Penalty Pool (Ceza Havuzu) - Physical waiting cards on the table
  const [penaltyPoolCount, setPenaltyPoolCount] = useState(0);

  // Surrender & Online Abort Confirmation Modals
  const [isSurrenderModalOpen, setIsSurrenderModalOpen] = useState(false);
  const [matchAbortedReason, setMatchAbortedReason] = useState<string | null>(null);

  // DOM Refs
  const deckRef = useRef<HTMLButtonElement | null>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const penaltyPoolRef = useRef<HTMLDivElement | null>(null);
  const userHandContainerRef = useRef<HTMLDivElement | null>(null);
  const playerHandRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const botTurnTimerRef = useRef<number | null>(null);
  const dealtCacheRef = useRef<ReturnType<typeof dealUnoGame> | null>(null);
  const actionLogRef = useRef<string[]>([]);

  const pushActionLog = useCallback((entry: string) => {
    actionLogRef.current = [entry, ...actionLogRef.current.slice(0, 2)];
  }, []);

  const showSeatBubble = useCallback((seatIdx: number, text: string, duration = 2200) => {
    setSeatBubbles(prev => ({ ...prev, [seatIdx]: text }));
    window.setTimeout(() => {
      setSeatBubbles(prev => {
        if (prev[seatIdx] !== text) return prev;
        const copy = { ...prev };
        delete copy[seatIdx];
        return copy;
      });
    }, duration);
  }, []);

  const getDeckTargetPos = useCallback(() => {
    const el = deckRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 20 && r.height > 20) {
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    }
    return { x: window.innerWidth / 2 - 70, y: window.innerHeight / 2 };
  }, []);

  const getSafeSeatRect = useCallback(
    (playerIdx: number): { x: number; y: number; width: number; height: number } => {
      if (playerIdx === 0) {
        const el = userHandContainerRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.width > 20 && r.height > 20) return r;
        }
        return { x: window.innerWidth / 2 - 40, y: window.innerHeight - 130, width: 80, height: 116 };
      }

      const el = playerHandRefs.current[playerIdx];
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 20 && r.height > 20) return r;
      }

      if (players.length === 2) {
        return { x: window.innerWidth / 2 - 35, y: 70, width: 70, height: 90 };
      }
      if (playerIdx === 1) {
        return { x: 75, y: window.innerHeight / 2 - 45, width: 70, height: 90 };
      }
      if (playerIdx === 2) {
        return { x: window.innerWidth / 2 - 35, y: 70, width: 70, height: 90 };
      }
      if (playerIdx === 3) {
        return { x: window.innerWidth - 145, y: window.innerHeight / 2 - 45, width: 70, height: 90 };
      }
      return { x: window.innerWidth / 2 - 35, y: 80, width: 70, height: 90 };
    },
    [players.length]
  );

  // Spawn Flying Card helper
  const spawnFlyingUnoCard = useCallback(
    (
      card: UnoCard,
      startRect: DOMRect | { x: number; y: number; width?: number; height?: number },
      targetRect: DOMRect | { x: number; y: number; width?: number; height?: number },
      options: {
        startFaceUp?: boolean;
        endFaceUp?: boolean;
        startRotation?: number;
        targetRotation?: number;
        duration?: number;
        onFinish?: () => void;
      } = {}
    ) => {
      const extractCenter = (
        r: DOMRect | { x: number; y: number; width?: number; height?: number; left?: number; top?: number },
        defaultW = 80,
        defaultH = 116
      ) => {
        const w = r.width || defaultW;
        const h = r.height || defaultH;
        if ('left' in r && r.left !== undefined) {
          return {
            x: r.left + w / 2,
            y: (r.top ?? 0) + h / 2
          };
        }
        return {
          x: r.x + w / 2,
          y: r.y + h / 2
        };
      };

      const start = extractCenter(startRect, 80, 116);
      const target = extractCenter(targetRect, 88, 128);
      const startX = start.x;
      const startY = start.y;
      const targetX = target.x;
      const targetY = target.y;

      const animId = `uno-fly-${Date.now()}-${Math.random()}`;

      setHiddenCardIds(prev => new Set(prev).add(card.id));

      const newFly: FlyingUnoCardData = {
        id: animId,
        card,
        startX,
        startY,
        targetX,
        targetY,
        startRotation: options.startRotation ?? -8,
        targetRotation: options.targetRotation ?? (Math.random() * 14 - 7),
        startFaceUp: options.startFaceUp ?? false,
        endFaceUp: options.endFaceUp ?? true,
        duration: options.duration ?? 480,
        arcHeight: 95,
        size: 'md',
        onComplete: () => {
          setFlyingCards(prev => prev.filter(c => c.id !== animId));
          setHiddenCardIds(prev => {
            const next = new Set(prev);
            next.delete(card.id);
            return next;
          });
          options.onFinish?.();
        }
      };

      setFlyingCards(prev => [...prev, newFly]);
    },
    []
  );

  // Trigger Action Banner
  const triggerBanner = useCallback(
    (
      text: string,
      type?: 'reverse' | 'skip' | 'draw' | 'uno' | 'wild',
      duration = 2400
    ) => {
      setActionBanner({ text, type });
      const timer = window.setTimeout(() => setActionBanner(null), duration);
      return () => window.clearTimeout(timer);
    },
    []
  );

  // Start / Reset Round with animated 108-card 3D shuffle
  const startNewRound = useCallback((customDeck?: UnoCard[]) => {
    // Instantly dismiss round summary modal with 0ms delay
    setGameState(prev => ({
      ...prev,
      isRoundOver: false,
      roundWinner: null,
      pendingDrawPenalty: 0
    }));
    gameStateSyncRef.current.isRoundOver = false;
    gameStateSyncRef.current.roundWinner = null;
    gameStateSyncRef.current.pendingDrawPenalty = 0;

    setIsAnimatingAction(true);
    setIsUnoShuffling(true);

    const fullDeck =
      customDeck && customDeck.length > 0
        ? [...customDeck]
        : seedCards && seedCards.length > 0
        ? [...seedCards]
        : shuffleUnoDeck(createUnoDeck());
    const totalP = playersSyncRef.current.length;
    const dealt = dealUnoGame(fullDeck, totalP);
    dealtCacheRef.current = dealt;

    deckSyncRef.current = [...dealt.remainingDeck];
    discardSyncRef.current = [dealt.initialDiscard];

    // Collect all card IDs initially hidden while dealing
    const idsToHide = new Set<string>();
    dealt.hands.forEach(h => h.forEach(c => idsToHide.add(c.id)));
    idsToHide.add(dealt.initialDiscard.id);
    setHiddenCardIds(idsToHide);

    const updatedPlayers = playersSyncRef.current.map((p, idx) => {
      const handIdx = isMultiplayer ? (idx + mySeatIndex) % totalP : idx;
      const rawHand = dealt.hands[handIdx] || [];
      return {
        ...p,
        hand: idx === 0 ? sortUnoCardsByColor(rawHand) : rawHand,
        hasCalledUno: false
      };
    });
    playersSyncRef.current = updatedPlayers;
    setPlayers(updatedPlayers);

    setDiscardStack([]);
    setPenaltyPoolCount(0);
    setNewlyDrawnCardId(null);
    setHasDrawnPlayableThisTurn(false);
    setSeatBubbles({});
  }, [isMultiplayer, mySeatIndex, seedCards]);

  // Callback when 108-card 3D shuffle finishes cleanly at the draw deck:
  const handleShuffleFinish = useCallback(() => {
    setIsUnoShuffling(false);
    setIsInitialDealing(true);

    const dealt = dealtCacheRef.current;
    if (!dealt) {
      setIsInitialDealing(false);
      setIsAnimatingAction(false);
      return;
    }

    const totalP = playersSyncRef.current.length;
    const initialCard = dealt.initialDiscard;

    // 7 cards per player dealt round-robin
    const dealSteps: { playerIdx: number; card: UnoCard; delay: number }[] = [];
    let delay = 60;
    const stepInterval = 55;

    for (let c = 0; c < 7; c++) {
      for (let p = 0; p < totalP; p++) {
        const handIdx = isMultiplayer ? (p + mySeatIndex) % totalP : p;
        const card = dealt.hands[handIdx]?.[c];
        if (!card) continue;
        dealSteps.push({ playerIdx: p, card, delay });
        delay += stepInterval;
      }
    }

    dealSteps.forEach(step => {
      window.setTimeout(() => {
        sound.playCardDeal();
        const deckRect = deckRef.current?.getBoundingClientRect() || {
          x: window.innerWidth / 2 - 80,
          y: window.innerHeight / 2 - 50,
          width: 80,
          height: 116
        };
        const handRect = getSafeSeatRect(step.playerIdx);

        spawnFlyingUnoCard(step.card, deckRect, handRect, {
          startFaceUp: false,
          endFaceUp: step.playerIdx === 0,
          duration: 460,
          onFinish: () => {
            setHiddenCardIds(prev => {
              const next = new Set(prev);
              next.delete(step.card.id);
              return next;
            });
          }
        });
      }, step.delay);
    });

    // After all player cards dealt, deal the 1st discard card
    const finishDealDelay = delay + 120;
    window.setTimeout(() => {
      sound.playCardDeal();
      const deckRect = deckRef.current?.getBoundingClientRect() || {
        x: window.innerWidth / 2 - 80,
        y: window.innerHeight / 2 - 50,
        width: 80,
        height: 116
      };
      const discardRect = discardRef.current?.getBoundingClientRect() || {
        x: window.innerWidth / 2 + 30,
        y: window.innerHeight / 2 - 50,
        width: 88,
        height: 128
      };

      spawnFlyingUnoCard(initialCard, deckRect, discardRect, {
        startFaceUp: false,
        endFaceUp: true,
        duration: 480,
        targetRotation: 3,
        onFinish: () => {
          setHiddenCardIds(new Set());
          setDiscardStack([
            {
              card: initialCard,
              rotation: 3,
              offsetX: 0,
              offsetY: 0,
              playedBy: 'Başlangıç'
            }
          ]);

          // Calculate global starting seat (Host = global seat 0)
          let globalStartSeat = 0;
          let startingDirection: 1 | -1 = 1;
          let startingPenalty = 0;

          // Official RENQ Opening Card Rules
          if (initialCard.value === 'draw2') {
            startingPenalty = 2;
          } else if (initialCard.value === 'skip') {
            globalStartSeat = 1 % totalP;
          } else if (initialCard.value === 'reverse') {
            startingDirection = -1;
            globalStartSeat = (totalP - 1) % totalP;
          }

          // Map globalStartSeat to this client's local player index
          const startingTurn = isMultiplayer
            ? (globalStartSeat - mySeatIndex + totalP) % totalP
            : globalStartSeat;

          const nextGameState: UnoGameState = {
            ...gameStateSyncRef.current,
            deck: dealt.remainingDeck,
            discardPile: [initialCard],
            currentColor: dealt.initialColor,
            currentTurn: startingTurn,
            direction: startingDirection,
            roundWinner: null,
            isRoundOver: false,
            lastActionMessage: `Başlangıç Kartı: ${formatCardName(initialCard)}`,
            pendingDrawPenalty: startingPenalty
          };
          gameStateSyncRef.current = nextGameState;
          setGameState(nextGameState);

          setIsInitialDealing(false);
          setIsAnimatingAction(false);
          setTablePulseKey(k => k + 1);
          pushActionLog(`🎴 Yeni el başladı! Ortadaki kart: ${formatCardName(initialCard)}`);
          triggerBanner(`Ortadaki Kart: ${formatCardName(initialCard)}!`, 'wild', 2000);
        }
      });
    }, finishDealDelay);
  }, [getSafeSeatRect, spawnFlyingUnoCard, triggerBanner, pushActionLog]);

  // Initial Deal
  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  // Advance turn according to direction and step
  const advanceTurn = useCallback(
    (step: number = 1, customDirection?: 1 | -1) => {
      setHasDrawnPlayableThisTurn(false);
      setNewlyDrawnCardId(null);
      setGameState(prev => {
        const N = playersSyncRef.current.length;
        const dir = customDirection ?? prev.direction;
        const nextTurn = (prev.currentTurn + dir * step + N * 10) % N;
        const updated = {
          ...prev,
          direction: dir,
          currentTurn: nextTurn
        };
        gameStateSyncRef.current = updated;
        return updated;
      });
    },
    []
  );

  // SYNCHRONOUS Draw card helper from draw pile with guaranteed 3D flying animation!
  const drawCardsForPlayer = useCallback(
    (playerIdx: number, count: number, onAllLanded?: (drawn: UnoCard[]) => void): UnoCard[] => {
      let currentDeck = [...deckSyncRef.current];
      let currentDiscard = [...discardSyncRef.current];

      if (currentDeck.length < count && currentDiscard.length > 1) {
        const topCard = currentDiscard[0];
        const recycled = shuffleUnoDeck(currentDiscard.slice(1));
        currentDeck = [...currentDeck, ...recycled];
        currentDiscard = [topCard];
      }

      const drawnCards = currentDeck.splice(0, count);
      deckSyncRef.current = currentDeck;
      discardSyncRef.current = currentDiscard;

      setGameState(prev => {
        const updated = {
          ...prev,
          deck: currentDeck,
          discardPile: currentDiscard
        };
        gameStateSyncRef.current = updated;
        return updated;
      });

      // Add cards to player's hand immediately (hidden while in flight via hiddenCardIds!)
      const nextPlayers = playersSyncRef.current.map((p, idx) => {
        if (idx === playerIdx) {
          const nextHand = [...p.hand, ...drawnCards];
          return {
            ...p,
            hand: idx === 0 ? sortUnoCardsByColor(nextHand) : nextHand,
            hasCalledUno: nextHand.length === 1 ? p.hasCalledUno : false
          };
        }
        return p;
      });
      playersSyncRef.current = nextPlayers;
      setPlayers(nextPlayers);

      // Hide all drawn cards until their flight starts/completes
      if (drawnCards.length > 0) {
        setHiddenCardIds(prev => {
          const next = new Set(prev);
          drawnCards.forEach(c => next.add(c.id));
          return next;
        });
      }

      // Animate each drawn card flying from Deck to Player Hand!
      const deckEl = deckRef.current;
      const dRect = deckEl
        ? deckEl.getBoundingClientRect()
        : { x: window.innerWidth / 2 - 80, y: window.innerHeight / 2 - 50, width: 80, height: 116 };

      const hRect = getSafeSeatRect(playerIdx);

      if (drawnCards.length > 0) {
        let completedCount = 0;
        drawnCards.forEach((c, i) => {
          window.setTimeout(() => {
            sound.playCardDeal();
            spawnFlyingUnoCard(c, dRect, hRect, {
              startFaceUp: false,
              endFaceUp: playerIdx === 0,
              startRotation: -12,
              targetRotation: 0,
              duration: 430,
              onFinish: () => {
                completedCount++;
                if (completedCount === drawnCards.length) {
                  onAllLanded?.(drawnCards);
                }
              }
            });
          }, i * 130);
        });
      } else {
        onAllLanded?.([]);
      }

      return drawnCards;
    },
    [getSafeSeatRect, spawnFlyingUnoCard]
  );

  // Deliver Penalty Stack Cards directly from the Center Waiting Pool to Player's hand
  const deliverPenaltyCardsToPlayer = useCallback(
    (playerIdx: number, penaltyCount: number) => {
      setIsAnimatingAction(true);
      // Clear pool cards from table immediately so they fly cleanly without leaving duplicate ghost cards on table
      setPenaltyPoolCount(0);
      setGameState(prev => {
        const updated: UnoGameState = {
          ...prev,
          pendingDrawPenalty: 0
        };
        gameStateSyncRef.current = updated;
        return updated;
      });

      const targetRect = getSafeSeatRect(playerIdx);
      const poolEl = penaltyPoolRef.current;
      const startRect = poolEl
        ? poolEl.getBoundingClientRect()
        : { x: window.innerWidth / 2 - 10, y: window.innerHeight / 2 - 50, width: 75, height: 105 };

      const currentDeck = [...deckSyncRef.current];
      let drawnCards: UnoCard[] = [];
      if (currentDeck.length >= penaltyCount) {
        drawnCards = currentDeck.splice(0, penaltyCount);
        deckSyncRef.current = currentDeck;
      } else {
        const recycled = shuffleUnoDeck(discardSyncRef.current.slice(1));
        const combined = [...currentDeck, ...recycled];
        drawnCards = combined.splice(0, penaltyCount);
        deckSyncRef.current = combined;
      }

      if (drawnCards.length === 0) {
        setPenaltyPoolCount(0);
        setGameState(prev => {
          const updated: UnoGameState = {
            ...prev,
            pendingDrawPenalty: 0
          };
          gameStateSyncRef.current = updated;
          return updated;
        });
        setIsAnimatingAction(false);
        advanceTurn(1, gameStateSyncRef.current.direction);
        return;
      }

      if (isMultiplayer && playerIdx === 0) {
        multiplayerManager.send({
          type: 'MP_UNO_DRAW_CARD',
          seatIndex: mySeatIndex,
          count: penaltyCount,
          penalty: true,
          senderPeerId: multiplayerManager.instanceId
        });
      }

      const targetPlayer = playersSyncRef.current[playerIdx];
      const updatedHand =
        playerIdx === 0
          ? sortUnoCardsByColor([...targetPlayer.hand, ...drawnCards])
          : [...targetPlayer.hand, ...drawnCards];
      const nextPlayers = playersSyncRef.current.map((p, idx) =>
        idx === playerIdx ? { ...p, hand: updatedHand } : p
      );
      playersSyncRef.current = nextPlayers;

      setHiddenCardIds(prev => {
        const next = new Set(prev);
        drawnCards.forEach(c => next.add(c.id));
        return next;
      });

      setPenaltyPoolCount(0);
      sound.playUnoDrawPenalty();

      drawnCards.forEach((c, idx) => {
        window.setTimeout(() => {
          sound.playCardDeal();
          spawnFlyingUnoCard(c, startRect, targetRect, {
            startFaceUp: false,
            endFaceUp: playerIdx === 0,
            startRotation: -6,
            targetRotation: 0,
            duration: 380,
            onFinish: () => {
              setHiddenCardIds(prev => {
                const next = new Set(prev);
                next.delete(c.id);
                return next;
              });
              if (idx === drawnCards.length - 1) {
                setPlayers(nextPlayers);
                setGameState(prev => {
                  const updated: UnoGameState = {
                    ...prev,
                    deck: deckSyncRef.current,
                    pendingDrawPenalty: 0
                  };
                  gameStateSyncRef.current = updated;
                  return updated;
                });
                setIsAnimatingAction(false);
                advanceTurn(1, gameStateSyncRef.current.direction);
              }
            }
          });
        }, idx * 130);
      });
    },
    [getSafeSeatRect, spawnFlyingUnoCard, advanceTurn, isMultiplayer, mySeatIndex]
  );

  // Handle Play Card with flying 3D arc animation & fanned discard stack physics!
  const executePlayCard = useCallback(
    (playerIdx: number, card: UnoCard, chosenColor?: UnoColor, sourceRect?: DOMRect) => {
      const currentPlayers = playersSyncRef.current;
      const actingPlayer = currentPlayers[playerIdx];
      if (!actingPlayer) return;

      setIsAnimatingAction(true);
      setHasDrawnPlayableThisTurn(false);
      setNewlyDrawnCardId(null);

      const discardEl = discardRef.current;
      const startRect = sourceRect || getSafeSeatRect(playerIdx);
      const targetRect = discardEl
        ? discardEl.getBoundingClientRect()
        : { x: window.innerWidth / 2 + 40, y: window.innerHeight / 2, width: 88, height: 128 };

      const finalRotation = Math.random() * 14 - 7;

      sound.playCardPlay();

      // Remove card from player hand immediately
      const nextPlayers = currentPlayers.map((p, idx) => {
        if (idx === playerIdx) {
          const nextHand = p.hand.filter(c => c.id !== card.id);
          return {
            ...p,
            hand: idx === 0 ? sortUnoCardsByColor(nextHand) : nextHand,
            hasCalledUno: nextHand.length === 1 ? p.hasCalledUno : false
          };
        }
        return p;
      });
      playersSyncRef.current = nextPlayers;
      setPlayers(nextPlayers);

      // Determine next active color
      const newActiveColor: UnoColor =
        card.color === 'wild' ? chosenColor || 'red' : card.color;

      const cardReadable = formatCardName(card);
      showSeatBubble(
        playerIdx,
        card.color === 'wild'
          ? `${cardReadable} (${COLOR_NAMES[newActiveColor]})`
          : `${cardReadable} attı!`
      );

      spawnFlyingUnoCard(card, startRect, targetRect, {
        startFaceUp: true,
        endFaceUp: true,
        targetRotation: finalRotation,
        duration: 490,
        onFinish: () => {
          sound.playClick();
          setTablePulseKey(k => k + 1);

          // Update Fanned Discard Stack (Keep last 5 cards so history is clearly visible!)
          setDiscardStack(prev => [
            {
              card,
              rotation: finalRotation,
              offsetX: 0,
              offsetY: 0,
              playedBy: actingPlayer.name
            },
            ...prev.slice(0, 4)
          ]);

          const nextDiscardPile = [card, ...discardSyncRef.current];
          discardSyncRef.current = nextDiscardPile;

          // Check for round win (empty hand)
          const remainingHandCount = actingPlayer.hand.length - 1;

          if (remainingHandCount === 0) {
            setIsAnimatingAction(false);
            sound.playUnoShout();
            confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });

            const totalRoundPoints = nextPlayers.reduce((sum, p, idx) => {
              if (idx === playerIdx) return sum;
              return sum + calculateUnoHandPoints(p.hand);
            }, 0);

            const newPlayerScore = actingPlayer.score + totalRoundPoints;
            const isGameEnd = true; // Her tamamlanan RENQ maçı/eli profile ve maç geçmişine kaydedilir

            if (isGameEnd) {
              const oppName = playerIdx === 0 ? (nextPlayers[1]?.name || 'Online Rakip') : (nextPlayers[playerIdx]?.name || 'Online Rakip');
              if (playerIdx === 0) {
                recordMatchStats(true, Math.max(50, newPlayerScore), 0, 0, true, oppName);
              } else {
                recordMatchStats(false, nextPlayers[0]?.score || 0, 0, 0, true, oppName);
              }
            }

            const scoredPlayers = nextPlayers.map((p, idx) =>
              idx === playerIdx ? { ...p, score: newPlayerScore } : p
            );
            playersSyncRef.current = scoredPlayers;
            setPlayers(scoredPlayers);

            setGameState(prev => {
              const updated: UnoGameState = {
                ...prev,
                discardPile: nextDiscardPile,
                currentColor: newActiveColor,
                isRoundOver: true,
                isGameOver: isGameEnd,
                roundWinner: { ...actingPlayer, score: newPlayerScore },
                winner: isGameEnd ? { ...actingPlayer, score: newPlayerScore } : null,
                lastActionMessage: `🏆 ${actingPlayer.name} eli bitirdi ve +${totalRoundPoints} PUAN kazandı!`
              };
              gameStateSyncRef.current = updated;
              return updated;
            });
            return;
          }

          // Check RENQ declaration when dropping to exactly 1 card!
          if (remainingHandCount === 1) {
            const hadCalled = actingPlayer.hasCalledUno;
            if (playerIdx === 0) {
              if (!hadCalled) {
                // User forgot to declare RENQ! Auto +2 penalty!
                sound.playUnoDrawPenalty();
                drawCardsForPlayer(0, 2);
                showSeatBubble(0, '⚠️ RENQ Demedin! (+2 Kart)', 2600);
                triggerBanner('⚠️ "RENQ!" demeyi unuttun! Ceza olarak 2 kart çektin!', 'draw', 3000);
              } else {
                showSeatBubble(0, '🔥 RENQ!', 2400);
              }
            } else {
              if (!hadCalled) {
                sound.playUnoDrawPenalty();
                drawCardsForPlayer(playerIdx, 2);
                showSeatBubble(playerIdx, '⚠️ RENQ Demedi! (+2 Kart)', 2400);
                triggerBanner(`⚠️ ${actingPlayer.name} "RENQ!" demeyi unuttu ve 2 kart çekti!`, 'draw', 3000);
              } else {
                showSeatBubble(playerIdx, '🔥 RENQ!', 2400);
              }
            }
          }

          // Special UNO Card Action Mechanics with Competitive Stacking (+2 on +2/+4, +4 on +4)
          let nextStep = 1;
          let activeDir = gameStateSyncRef.current.direction;
          let actionMsg = `${actingPlayer.name}: ${cardReadable}`;
          let newPendingPenalty = gameStateSyncRef.current.pendingDrawPenalty || 0;
          let addedPenalty = 0;

          if (card.value === 'reverse') {
            activeDir = (activeDir * -1) as 1 | -1;
            sound.playUnoReverse();

            if (nextPlayers.length === 2) {
              nextStep = 2;
              actionMsg = `🔄 ${actingPlayer.name} YÖN DEĞİŞTİRDİ! (Sıra tekrar onda)`;
            } else {
              actionMsg = `🔄 ${actingPlayer.name} YÖNÜ DEĞİŞTİRDİ! (${
                activeDir === 1 ? 'Saat Yönü ⟳' : 'Ters Yön ⟲'
              })`;
            }
            triggerBanner(actionMsg, 'reverse');
          } else if (card.value === 'skip') {
            nextStep = 2;
            const skippedIdx =
              (playerIdx + activeDir + nextPlayers.length) % nextPlayers.length;
            sound.playUnoSkip();
            setSkippedPlayerIdx(skippedIdx);
            showSeatBubble(skippedIdx, '🚫 PAS GEÇTİ!', 2000);
            window.setTimeout(() => setSkippedPlayerIdx(null), 1900);
            actionMsg = `🚫 ${actingPlayer.name} -> ${nextPlayers[skippedIdx].name} PAS GEÇTİ!`;
            triggerBanner(actionMsg, 'skip');
          } else if (card.value === 'draw2') {
            sound.playUnoDrawPenalty();
            addedPenalty = 2;
            newPendingPenalty += 2;
            nextStep = 1; // Passes turn to next player to allow stacking!
            actionMsg = newPendingPenalty > 2
              ? `💥 ${actingPlayer.name} +2 İLE KATLADI! (Havuz: ${newPendingPenalty} Kart)`
              : `💥 ${actingPlayer.name} +2 attı! (Havuz: ${newPendingPenalty} Kart)`;
            triggerBanner(actionMsg, 'draw');
          } else if (card.value === 'wild_draw4') {
            sound.playUnoDrawPenalty();
            sound.playUnoWild();
            addedPenalty = 4;
            newPendingPenalty += 4;
            nextStep = 1; // Passes turn to next player to allow stacking!
            actionMsg = newPendingPenalty > 4
              ? `🌈💥 ${actingPlayer.name} +4 İLE KATLADI! (Havuz: ${newPendingPenalty} Kart)`
              : `🌈💥 +4 JOKER BOMBASI! (Havuz: ${newPendingPenalty} Kart)`;
            triggerBanner(actionMsg, 'wild');
          } else if (card.value === 'wild') {
            sound.playUnoWild();
            actionMsg = `🌈 ${actingPlayer.name} JOKER attı! Yeni Renk: ${COLOR_NAMES[newActiveColor]}`;
            triggerBanner(actionMsg, 'wild');
          }

          // If penalty was added, fly cards from Draw Deck into the Central Penalty Pool waiting zone!
          if (addedPenalty > 0) {
            const deckEl = deckRef.current;
            const poolEl = penaltyPoolRef.current;
            const dRect = deckEl
              ? deckEl.getBoundingClientRect()
              : { x: window.innerWidth / 2 - 80, y: window.innerHeight / 2 - 50, width: 80, height: 116 };
            const pRect = poolEl
              ? poolEl.getBoundingClientRect()
              : { x: window.innerWidth / 2 - 10, y: window.innerHeight / 2 - 50, width: 75, height: 105 };

            for (let i = 0; i < addedPenalty; i++) {
              window.setTimeout(() => {
                sound.playCardDeal();
                const tempCard: UnoCard = {
                  id: `penalty-fly-${Date.now()}-${i}`,
                  color: 'wild',
                  value: 'draw2',
                  scoreValue: 20
                };
                spawnFlyingUnoCard(tempCard, dRect, pRect, {
                  startFaceUp: false,
                  endFaceUp: false,
                  startRotation: -10,
                  targetRotation: (i - 1) * 8,
                  duration: 380
                });
              }, i * 110);
            }
            setPenaltyPoolCount(newPendingPenalty);
          }

          pushActionLog(actionMsg);

          setGameState(prev => {
            const updated: UnoGameState = {
              ...prev,
              direction: activeDir,
              discardPile: nextDiscardPile,
              currentColor: newActiveColor,
              lastActionMessage: actionMsg,
              pendingDrawPenalty: newPendingPenalty
            };
            gameStateSyncRef.current = updated;
            return updated;
          });

          advanceTurn(nextStep, activeDir);
          setIsAnimatingAction(false);
        }
      });
    },
    [
      targetScore,
      drawCardsForPlayer,
      advanceTurn,
      spawnFlyingUnoCard,
      triggerBanner,
      pushActionLog,
      showSeatBubble
    ]
  );

  // Listen to Multiplayer UNO events
  useEffect(() => {
    if (!isMultiplayer) return;

    const unsubscribe = multiplayerManager.onEvent(event => {
      // Anti-cheat verification helper
      const isSenderAuthorized = (seatIndex: number, declaredPeerId?: string): boolean => {
        const verifiedId = (event as any)._verifiedSenderId;
        if (!mpSlots || !mpSlots[seatIndex]) return true;
        const expectedPeerId = mpSlots[seatIndex].peerId;
        if (!expectedPeerId) return true; // Bot or unassigned slot

        if (verifiedId && verifiedId !== expectedPeerId) {
          console.warn(`[AntiCheat] Blocked spoofed UNO event ${event.type} from sender ${verifiedId} targeting seat ${seatIndex} (${expectedPeerId})`);
          return false;
        }
        if (declaredPeerId && declaredPeerId !== expectedPeerId) {
          console.warn(`[AntiCheat] Blocked spoofed UNO peerId in ${event.type}: declared ${declaredPeerId} vs expected ${expectedPeerId}`);
          return false;
        }
        return true;
      };

      if (event.type === 'MP_UNO_PLAY_CARD') {
        if (event.senderPeerId === multiplayerManager.instanceId) return;
        if (!isSenderAuthorized(event.seatIndex, event.senderPeerId)) return;

        const currentPlayers = playersSyncRef.current;
        const N = currentPlayers.length;
        const targetLocalIdx = (event.seatIndex - mySeatIndex + N) % N;
        const targetP = currentPlayers[targetLocalIdx];
        if (!targetP) return;

        const foundCard = targetP.hand.find(c => c.id === event.cardId);
        if (foundCard) {
          executePlayCard(targetLocalIdx, foundCard, event.chosenColor as UnoColor);
        } else {
          console.warn(`Card ${event.cardId} not found in player ${targetLocalIdx}'s hand!`);
        }
      } else if (event.type === 'MP_UNO_DRAW_CARD') {
        if (event.senderPeerId === multiplayerManager.instanceId) return;
        if (!isSenderAuthorized(event.seatIndex, event.senderPeerId)) return;

        const currentPlayers = playersSyncRef.current;
        const N = currentPlayers.length;
        const targetLocalIdx = (event.seatIndex - mySeatIndex + N) % N;
        if (event.penalty) {
          showSeatBubble(targetLocalIdx, `💥 ${event.count || 1} Ceza Kartı Çekti`, 2200);
          deliverPenaltyCardsToPlayer(targetLocalIdx, event.count || 1);
        } else {
          drawCardsForPlayer(targetLocalIdx, event.count || 1);
          showSeatBubble(targetLocalIdx, `📥 ${event.count || 1} Kart Çekti`);
          pushActionLog(`📥 ${currentPlayers[targetLocalIdx]?.name || 'Rakip'} desteden kart çekti.`);
        }
      } else if (event.type === 'MP_UNO_CALL_UNO') {
        if (event.senderPeerId === multiplayerManager.instanceId) return;
        if (!isSenderAuthorized(event.seatIndex, event.senderPeerId)) return;

        const currentPlayers = playersSyncRef.current;
        const N = currentPlayers.length;
        const targetLocalIdx = (event.seatIndex - mySeatIndex + N) % N;
        setPlayers(prev =>
          prev.map((p, idx) => (idx === targetLocalIdx ? { ...p, hasCalledUno: true } : p))
        );
        sound.playUnoShout();
        showSeatBubble(targetLocalIdx, '🔥 RENQ DEDİ!', 2500);
        triggerBanner(`🔥 ${currentPlayers[targetLocalIdx]?.name || 'Rakip'} "RENQ!" DEDİ!`, 'uno');
      } else if (event.type === 'MP_UNO_PASS') {
        if (event.senderPeerId === multiplayerManager.instanceId) return;
        if (!isSenderAuthorized(event.seatIndex, event.senderPeerId)) return;

        const currentPlayers = playersSyncRef.current;
        const N = currentPlayers.length;
        const targetLocalIdx = (event.seatIndex - mySeatIndex + N) % N;
        showSeatBubble(targetLocalIdx, '⏭️ Pas Geçti', 1800);
        advanceTurn(1);
      } else if (event.type === 'MP_UNO_NEXT_ROUND') {
        startNewRound(event.seedCards);
      } else if (event.type === 'MP_MATCH_ABORTED') {
        if (event.gameType && event.gameType !== 'uno') return;
        try { multiplayerManager.leaveRoom(); } catch {}
        setMatchAbortedReason(
          event.reason === 'surrender'
            ? `${event.senderName || 'Rakip'} maçı terk etti.`
            : `${event.senderName || 'Rakip'} bağlantısı koptu.`
        );
      } else if (event.type === 'PEER_DISCONNECTED') {
        try { multiplayerManager.leaveRoom(); } catch {}
        setMatchAbortedReason('Rakip masadan ayrıldı. Bağlantı koptu.');
      }
    });

    return unsubscribe;
  }, [
    isMultiplayer,
    mySeatIndex,
    executePlayCard,
    drawCardsForPlayer,
    deliverPenaltyCardsToPlayer,
    triggerBanner,
    showSeatBubble,
    pushActionLog
  ]);

  // Human card click
  const handleHumanCardClick = (card: UnoCard, e?: React.MouseEvent) => {
    if (gameState.currentTurn !== 0 || gameState.isRoundOver || isAnimatingAction) return;

    const topDiscard = gameState.discardPile[0];
    if (!canPlayUnoCard(card, topDiscard, gameState.currentColor, gameState.pendingDrawPenalty)) return;

    const sourceRect = e ? (e.currentTarget as HTMLElement).getBoundingClientRect() : undefined;

    if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild_draw4') {
      setWildPickerRect(sourceRect);
      setWildPickerCard(card);
    } else {
      executePlayCard(0, card, undefined, sourceRect);
      if (isMultiplayer) {
        multiplayerManager.send({
          type: 'MP_UNO_PLAY_CARD',
          cardId: card.id,
          seatIndex: mySeatIndex,
          senderPeerId: multiplayerManager.instanceId
        });
      }
    }
  };

  // Human draws a card from the Deck with full 3D flight & clear feedback!
  const handleHumanDraw = () => {
    if (
      gameState.currentTurn !== 0 ||
      gameState.isRoundOver ||
      isAnimatingAction ||
      hasDrawnPlayableThisTurn
    ) {
      return;
    }

    const penalty = gameStateSyncRef.current.pendingDrawPenalty || 0;
    if (penalty > 0) {
      showSeatBubble(0, `💥 ${penalty} Ceza Kartı Çekildi`, 2400);
      triggerBanner(`💥 Ceza olarak ${penalty} kart çektin ve sıran geçti!`, 'draw', 2600);
      deliverPenaltyCardsToPlayer(0, penalty);
      return;
    }

    setIsAnimatingAction(true);
    const topDiscard = gameStateSyncRef.current.discardPile[0];
    const activeColor = gameStateSyncRef.current.currentColor;

    if (isMultiplayer) {
      multiplayerManager.send({
        type: 'MP_UNO_DRAW_CARD',
        seatIndex: mySeatIndex,
        count: 1,
        senderPeerId: multiplayerManager.instanceId
      });
    }

    drawCardsForPlayer(0, 1, drawn => {
      if (drawn.length > 0) {
        const drawnCard = drawn[0];
        const cardTitle = formatCardName(drawnCard);
        setNewlyDrawnCardId(drawnCard.id);

        if (canPlayUnoCard(drawnCard, topDiscard, activeColor, 0)) {
          setIsAnimatingAction(false);
          setHasDrawnPlayableThisTurn(true);
          showSeatBubble(0, `✨ ${cardTitle} Çekildi (Oynanabilir!)`, 2600);
          triggerBanner(`✨ Çektiğin kart (${cardTitle}) oynanabilir! Tıkla veya Pas Geç.`, 'wild', 2800);
        } else {
          showSeatBubble(0, `📥 ${cardTitle} Çekildi`, 1800);
          window.setTimeout(() => {
            setIsAnimatingAction(false);
            if (isMultiplayer) {
              multiplayerManager.send({
                type: 'MP_UNO_PASS',
                seatIndex: mySeatIndex,
                senderPeerId: multiplayerManager.instanceId
              });
            }
            advanceTurn(1);
          }, 700);
        }
      } else {
        setIsAnimatingAction(false);
        if (isMultiplayer) {
          multiplayerManager.send({
            type: 'MP_UNO_PASS',
            seatIndex: mySeatIndex,
            senderPeerId: multiplayerManager.instanceId
          });
        }
        advanceTurn(1);
      }
    });
  };

  // Human chooses to pass after drawing a playable card
  const handleHumanPassAfterDraw = () => {
    if (!hasDrawnPlayableThisTurn || gameState.currentTurn !== 0) return;
    sound.playClick();
    setHasDrawnPlayableThisTurn(false);
    setNewlyDrawnCardId(null);
    showSeatBubble(0, '⏭️ Pas Geçti');
    if (isMultiplayer) {
      multiplayerManager.send({
        type: 'MP_UNO_PASS',
        seatIndex: mySeatIndex,
        senderPeerId: multiplayerManager.instanceId
      });
    }
    advanceTurn(1);
  };

  // Human calls "UNO!"
  const handleCallUno = () => {
    sound.playUnoShout();
    setPlayers(prev => {
      const updated = prev.map((p, idx) => (idx === 0 ? { ...p, hasCalledUno: true } : p));
      playersSyncRef.current = updated;
      return updated;
    });
    if (isMultiplayer) {
      multiplayerManager.send({
        type: 'MP_UNO_CALL_UNO',
        seatIndex: mySeatIndex,
        senderPeerId: multiplayerManager.instanceId
      });
    }
    showSeatBubble(0, '🔥 RENQ DEDİ!', 2500);
    triggerBanner('🔥 "RENQ!" DEDİNİZ!', 'uno');
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.8 } });
  };

  // Bot Turn Automation (AI plays with clear pacing, speech bubbles & flying cards)
  useEffect(() => {
    if (gameState.isRoundOver || isAnimatingAction) return;
    if (isMultiplayer && !isHost) return;

    const botIdx = gameState.currentTurn;
    const bot = playersSyncRef.current[botIdx];
    if (!bot || !bot.isAI) return;

    botTurnTimerRef.current = window.setTimeout(() => {
      const topDiscard = gameStateSyncRef.current.discardPile[0];
      const currentColor = gameStateSyncRef.current.currentColor;
      const currentBot = playersSyncRef.current[botIdx];
      if (!currentBot) return;

      const pendingPenalty = gameStateSyncRef.current.pendingDrawPenalty || 0;
      const botDecision = getBotUnoPlay(currentBot.hand, topDiscard, currentColor, pendingPenalty);

      // Bot calls UNO if about to drop to 1 card (with ~85% probability)
      if (currentBot.hand.length === 2 && !currentBot.hasCalledUno && botDecision.cardToPlay) {
        const willCall = Math.random() < 0.85;
        if (willCall) {
          sound.playUnoShout();
          setPlayers(prev => {
            const updated = prev.map((p, idx) =>
              idx === botIdx ? { ...p, hasCalledUno: true } : p
            );
            playersSyncRef.current = updated;
            return updated;
          });
          showSeatBubble(botIdx, '🔥 RENQ!', 2400);
          triggerBanner(`🔥 ${currentBot.name} "RENQ!" DEDİ!`, 'uno');
          if (isMultiplayer) {
            const botAbsSeat = (botIdx + mySeatIndex) % players.length;
            multiplayerManager.send({
              type: 'MP_UNO_CALL_UNO',
              seatIndex: botAbsSeat,
              senderPeerId: multiplayerManager.instanceId
            });
          }
        }
      }

      if (botDecision.cardToPlay) {
        executePlayCard(botIdx, botDecision.cardToPlay, botDecision.chosenWildColor);
        if (isMultiplayer) {
          const botAbsSeat = (botIdx + mySeatIndex) % players.length;
          multiplayerManager.send({
            type: 'MP_UNO_PLAY_CARD',
            cardId: botDecision.cardToPlay.id,
            chosenColor: botDecision.chosenWildColor,
            seatIndex: botAbsSeat,
            senderPeerId: multiplayerManager.instanceId
          });
        }
      } else {
        if (pendingPenalty > 0) {
          showSeatBubble(botIdx, `💥 ${pendingPenalty} Ceza Çekiyor!`, 2200);
          triggerBanner(`💥 ${currentBot.name} katlanan ${pendingPenalty} ceza kartını çekti!`, 'draw');
          deliverPenaltyCardsToPlayer(botIdx, pendingPenalty);
          if (isMultiplayer) {
            const botAbsSeat = (botIdx + mySeatIndex) % players.length;
            multiplayerManager.send({
              type: 'MP_UNO_DRAW_CARD',
              seatIndex: botAbsSeat,
              count: pendingPenalty,
              penalty: true,
              senderPeerId: multiplayerManager.instanceId
            });
          }
        } else {
          setIsAnimatingAction(true);
          showSeatBubble(botIdx, '📥 Kart Çekiyor...', 1800);
          drawCardsForPlayer(botIdx, 1, drawn => {
            if (isMultiplayer) {
              const botAbsSeat = (botIdx + mySeatIndex) % players.length;
              multiplayerManager.send({
                type: 'MP_UNO_DRAW_CARD',
                seatIndex: botAbsSeat,
                count: 1,
                penalty: false,
                senderPeerId: multiplayerManager.instanceId
              });
            }
            if (
              drawn.length > 0 &&
              canPlayUnoCard(drawn[0], topDiscard, currentColor, 0)
            ) {
              window.setTimeout(() => {
                const chosenWild =
                  drawn[0].color === 'wild' ? ('red' as UnoColor) : undefined;
                executePlayCard(botIdx, drawn[0], chosenWild);
                if (isMultiplayer) {
                  const botAbsSeat = (botIdx + mySeatIndex) % players.length;
                  multiplayerManager.send({
                    type: 'MP_UNO_PLAY_CARD',
                    cardId: drawn[0].id,
                    chosenColor: chosenWild,
                    seatIndex: botAbsSeat,
                    senderPeerId: multiplayerManager.instanceId
                  });
                }
              }, 450);
            } else {
              window.setTimeout(() => {
                setIsAnimatingAction(false);
                advanceTurn(1);
                if (isMultiplayer) {
                  const botAbsSeat = (botIdx + mySeatIndex) % players.length;
                  multiplayerManager.send({
                    type: 'MP_UNO_PASS',
                    seatIndex: botAbsSeat,
                    senderPeerId: multiplayerManager.instanceId
                  });
                }
              }, 500);
            }
          });
        }
      }
    }, 1050);

    return () => {
      if (botTurnTimerRef.current) window.clearTimeout(botTurnTimerRef.current);
    };
  }, [
    gameState.currentTurn,
    gameState.isRoundOver,
    isAnimatingAction,
    drawCardsForPlayer,
    deliverPenaltyCardsToPlayer,
    executePlayCard,
    advanceTurn,
    triggerBanner,
    showSeatBubble,
    pushActionLog
  ]);

  // Auto-deliver penalty to human player if they have NO cards to counter (+2 / +4)
  useEffect(() => {
    if (gameState.isRoundOver || isAnimatingAction || gameState.currentTurn !== 0) return;
    const pendingPenalty = gameState.pendingDrawPenalty || 0;
    if (pendingPenalty <= 0) return;

    const topDiscard = gameState.discardPile[0];
    const currentColor = gameState.currentColor;
    const user = players[0];
    if (!user || !topDiscard) return;

    const canCounter = user.hand.some(c => canPlayUnoCard(c, topDiscard, currentColor, pendingPenalty));
    if (!canCounter) {
      const timer = window.setTimeout(() => {
        if (
          gameStateSyncRef.current.currentTurn === 0 &&
          (gameStateSyncRef.current.pendingDrawPenalty || 0) > 0 &&
          !gameStateSyncRef.current.isRoundOver
        ) {
          showSeatBubble(0, `💥 ${pendingPenalty} Ceza Çekiyorsun!`, 2200);
          triggerBanner(`⚠️ Karşılayacak kartın yok! +${pendingPenalty} ceza kartını çekiyorsun!`, 'draw');
          deliverPenaltyCardsToPlayer(0, pendingPenalty);
        }
      }, 750);
      return () => window.clearTimeout(timer);
    }
  }, [
    gameState.currentTurn,
    gameState.pendingDrawPenalty,
    gameState.isRoundOver,
    isAnimatingAction,
    players,
    gameState.discardPile,
    gameState.currentColor,
    deliverPenaltyCardsToPlayer,
    showSeatBubble,
    triggerBanner
  ]);

  // Exit button click handler (Surrender confirmation)
  const handleExitClick = () => {
    sound.playClick();
    if (gameState.isGameOver) {
      if (isMultiplayer) {
        try { multiplayerManager.leaveRoom(); } catch {}
      }
      friendNetwork.setStatus('menu', undefined);
      onExitToMenu();
    } else {
      setIsSurrenderModalOpen(true);
    }
  };

  // Confirm surrender in multiplayer
  const handleConfirmSurrender = () => {
    setIsSurrenderModalOpen(false);
    recordMatchStats(false, 0, 0, 0, true, 'Online Rakip');
    if (isMultiplayer) {
      try {
        multiplayerManager.send({
          type: 'MP_MATCH_ABORTED',
          reason: 'surrender',
          senderName: userProfile.name,
          gameType: 'uno'
        });
        multiplayerManager.leaveRoom();
      } catch (e) {
        console.warn(e);
      }
    }
    friendNetwork.setStatus('menu', undefined);
    onExitToMenu();
  };

  const topDiscardCard = gameState.discardPile[0];
  const user = players[0];
  const isUserTurn = gameState.currentTurn === 0 && !gameState.isRoundOver;
  const currentTheme = COLOR_THEMES[gameState.currentColor];

  // Count how many playable cards the user currently has
  const playableCardsInHand = user.hand.filter(
    c => topDiscardCard && canPlayUnoCard(c, topDiscardCard, gameState.currentColor, gameState.pendingDrawPenalty)
  );
  const hasAnyPlayableCard = playableCardsInHand.length > 0;

  // Render an Opponent Seat Widget (supports 'top', 'left', 'right' positions)
  const renderOpponentSeat = (playerIdx: number, position: 'top' | 'left' | 'right') => {
    const opp = players[playerIdx];
    if (!opp) return null;

    const isTurn = gameState.currentTurn === playerIdx && !gameState.isRoundOver;
    const isSkipped = skippedPlayerIdx === playerIdx;
    const bubbleText = seatBubbles[playerIdx];
    const visibleCardsCount = Math.min(opp.hand.length, 8);

    return (
      <div
        ref={el => {
          playerHandRefs.current[playerIdx] = el;
        }}
        className={`relative flex flex-col items-center transition-all duration-300 ${
          isTurn ? 'scale-105 z-20' : 'opacity-90 z-10'
        }`}
      >
        {/* Live Speech / Action Bubble */}
        {bubbleText && (
          <div className="absolute -top-9 z-40 px-3 py-1 rounded-2xl bg-slate-900/95 border-2 border-cyan-400 text-cyan-200 font-black text-[11px] whitespace-nowrap shadow-[0_6px_20px_rgba(0,0,0,0.75)] animate-bounce">
            {bubbleText}
          </div>
        )}

        {/* Active Turn Glowing Beacon */}
        {isTurn && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.95)] animate-bounce flex items-center gap-1 whitespace-nowrap">
            ⚡ SIRADA
          </div>
        )}

        {/* Skipped Laser Barrier Stamp */}
        {isSkipped && (
          <div className="absolute -top-3 z-30 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs border-2 border-white shadow-[0_0_25px_rgba(239,68,68,0.95)] animate-bounce flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            PAS GEÇTİ!
          </div>
        )}

        {/* Opponent Badge Card */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all duration-200 ${
            isTurn
              ? 'bg-amber-500/35 border-amber-300 ring-4 ring-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.95)] scale-105'
              : 'bg-slate-950/80 border-white/15'
          }`}
        >
          <div className="relative">
            <AvatarBadge
              avatarId={opp.avatarId}
              customAvatarUrl={opp.customAvatarUrl}
              size="sm"
            />
            {isTurn && (
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white max-w-[105px] truncate">
                {opp.name}
              </span>
              {opp.hasCalledUno && (
                <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-red-600 to-amber-500 text-[9px] font-black text-white animate-pulse">
                  🔥 RENQ!
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold text-amber-300/90 truncate max-w-[110px]">
              {opp.customTitle || getAvatarPreset(opp.avatarId || 'wolf').title}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-amber-300 font-bold">{opp.score}P</span>
              <span className="text-slate-400">•</span>
              <span
                className={`font-black ${
                  opp.hand.length === 1 ? 'text-red-400 animate-pulse' : 'text-cyan-300'
                }`}
              >
                {opp.hand.length} Kart
              </span>
            </div>
          </div>
        </div>

        {/* Opponent's Fanned Card Backs */}
        <div
          className={`flex items-center justify-center ${
            position === 'top' ? '-space-x-8 mt-1.5 min-h-[74px]' : '-space-x-9 mt-1 min-h-[68px]'
          }`}
        >
          {Array.from({ length: visibleCardsCount }).map((_, i) => {
            const tilt = (i - (visibleCardsCount - 1) / 2) * 5;
            return (
              <div
                key={i}
                style={{
                  transform: `rotate(${tilt}deg) translateY(${Math.abs(tilt) * 0.35}px)`
                }}
                className="transition-transform duration-200"
              >
                <UnoCardBack size="sm" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative h-screen max-h-screen w-full flex flex-col justify-between overflow-hidden bg-neutral-950 font-sans select-none p-2 sm:p-4"
    >
      {/* 60/120 FPS Ambient Particles Motor matching active Uno Color */}
      <AmbientParticles
        theme="uno"
        unoColor={gameState.currentColor === 'wild' ? undefined : gameState.currentColor}
        intensity="dense"
      />

      {/* Dynamic 3D Felt Stadium & Lighting Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)',
            backgroundSize: '22px 22px'
          }}
        />

        <div
          key={tablePulseKey}
          className={`absolute inset-0 transition-all duration-700 opacity-35 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${currentTheme.tableAura}`}
        />

        {/* Outer Table Neon Rim */}
        <div
          className="absolute inset-3 sm:inset-7 rounded-[44px] border border-white/10 shadow-2xl pointer-events-none transition-all duration-500"
          style={{
            boxShadow: `inset 0 0 110px ${currentTheme.glow}`
          }}
        />
      </div>

      {/* Zero-Teleportation 3D Flipping Flying Uno Card Layer */}
      <UnoCardAnimationLayer flyingCards={flyingCards} />

      {/* 108-Card Grand Deck Shuffle Layer */}
      {isUnoShuffling && (
        <UnoGrandShuffleLayer
          getTargetPos={getDeckTargetPos}
          onComplete={handleShuffleFinish}
        />
      )}

      {/* HEADER HUD BAR */}
      <header className="relative z-30 flex items-center justify-between px-3 sm:px-4 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/15 shadow-xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleExitClick}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Masadan Ayrıl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Menü</span>
          </button>
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg sm:text-xl font-black italic tracking-tighter text-amber-300 font-cyber drop-shadow-md">
              RENQ
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
              {isMultiplayer ? 'Online Çok Oyunculu' : '3D İnteraktif Masa'}
            </span>
          </div>
        </div>

        {/* Active Color Indicator, Direction & Target Score */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Color Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-white/15 text-xs font-black text-white">
            <span className={`w-3 h-3 rounded-full ${COLOR_DOT_CLASSES[gameState.currentColor]}`} />
            <span>Renk: {COLOR_NAMES[gameState.currentColor]}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              gameState.direction === 1
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                : 'bg-rose-500/15 text-rose-300 border-rose-400/40'
            }`}
          >
            {gameState.direction === 1 ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span className="hidden sm:inline">Saat Yönü ⟳</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />
                <span className="hidden sm:inline">Ters Yön ⟲</span>
              </>
            )}
          </div>

          <div className="hidden md:block text-xs font-bold text-slate-300 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10">
            Hedef: <strong className="text-amber-300">{gameState.targetScore}P</strong>
          </div>

          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.setEnabled(next);
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 transition-colors cursor-pointer"
            title={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* CINEMATIC ACTION BANNER / TOAST */}
      {actionBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-black border-2 shadow-2xl flex items-center gap-2 ${
              actionBanner.type === 'reverse'
                ? 'bg-blue-950/95 border-sky-400 text-sky-200 shadow-[0_0_35px_rgba(56,189,248,0.6)]'
                : actionBanner.type === 'skip'
                ? 'bg-rose-950/95 border-red-400 text-rose-200 shadow-[0_0_35px_rgba(244,63,94,0.6)]'
                : actionBanner.type === 'uno'
                ? 'bg-amber-950/95 border-amber-400 text-amber-200 shadow-[0_0_40px_rgba(245,158,11,0.8)]'
                : actionBanner.type === 'draw'
                ? 'bg-purple-950/95 border-purple-400 text-purple-200 shadow-[0_0_35px_rgba(168,85,247,0.6)]'
                : 'bg-slate-900/95 border-emerald-400 text-emerald-200 shadow-[0_0_35px_rgba(16,185,129,0.6)]'
            }`}
          >
            <Sparkles className="w-4 h-4 animate-spin shrink-0" />
            <span>{actionBanner.text}</span>
          </div>
        </div>
      )}

      {/* =========================================================
          4-SIDED CIRCULAR STADIUM ARENA (Top, Left, Center, Right, Bottom)
         ========================================================= */}
      <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto flex flex-col justify-between items-center py-1">
        {/* 1. TOP SEAT (Seat 2 in 4P mode, or Seat 1 in 2P mode) */}
        <div className="w-full flex items-center justify-center pt-1">
          {players.length === 2 ? renderOpponentSeat(1, 'top') : renderOpponentSeat(2, 'top')}
        </div>

        {/* 2. MIDDLE ROW: LEFT SEAT + CENTER FELT PILES + RIGHT SEAT */}
        <div className="w-full flex items-center justify-between gap-1 sm:gap-4 my-auto px-1 sm:px-4">
          {/* LEFT SEAT (Seat 1 in 4P mode) */}
          <div className="flex items-center justify-center min-w-[90px] sm:min-w-[130px]">
            {players.length >= 4 && renderOpponentSeat(1, 'left')}
          </div>

          {/* CENTER FELT: DIRECTION RING + DRAW DECK + FANNED DISCARD HISTORY */}
          <div className="relative flex-1 flex flex-col items-center justify-center">

            {/* Animated SVG Direction Orbit Ring behind Center Piles */}
            <div className="relative flex items-center justify-center py-3 px-6 sm:px-12 rounded-[36px] bg-slate-950/60 border border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.7)]">

              {/* Dealing in progress indicator */}
              {isInitialDealing && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1 rounded-full bg-slate-900/90 border border-emerald-400 text-emerald-300 font-cyber text-[10px] font-black tracking-wider flex items-center gap-1.5 animate-pulse shadow-md pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>KARTLAR MASAYA DAĞITILIYOR...</span>
                </div>
              )}

              <svg
                viewBox="0 0 360 190"
                className="absolute inset-0 w-full h-full pointer-events-none opacity-35"
              >
                <rect
                  x="12"
                  y="12"
                  width="336"
                  height="166"
                  rx="80"
                  fill="none"
                  stroke={currentTheme.strokeHex}
                  strokeWidth="2.5"
                  strokeDasharray="10 8"
                />
              </svg>

              <div className="relative z-10 flex items-center justify-center gap-8 sm:gap-16">
                {/* DRAW PILE (DESTE) */}
                <div className="relative flex flex-col items-center">
                  {/* Bouncing Callout when User has NO Playable Cards or Pending Penalty! */}
                  {isUserTurn && (!hasAnyPlayableCard || (gameState.pendingDrawPenalty && gameState.pendingDrawPenalty > 0)) && !hasDrawnPlayableThisTurn && (
                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-[11px] whitespace-nowrap shadow-[0_0_25px_rgba(245,158,11,0.9)] animate-bounce flex items-center gap-1">
                      <Hand className="w-3.5 h-3.5" />
                      <span>{gameState.pendingDrawPenalty && gameState.pendingDrawPenalty > 0 ? `💥 ${gameState.pendingDrawPenalty} KART ÇEK!` : 'KART ÇEK!'}</span>
                    </div>
                  )}

                  <button
                    ref={deckRef}
                    onClick={handleHumanDraw}
                    disabled={!isUserTurn || isAnimatingAction || hasDrawnPlayableThisTurn}
                    className={`relative group transition-all duration-200 active:scale-95 ${
                      isUserTurn && !hasDrawnPlayableThisTurn
                        ? 'cursor-pointer hover:scale-108 hover:-translate-y-1'
                        : 'cursor-not-allowed opacity-80'
                    }`}
                    title={
                      isUserTurn
                        ? 'Desteden 1 Kart Çek (Tıkla)'
                        : 'Sıranız geldiğinde kart çekebilirsiniz'
                    }
                  >
                    {/* 3D Physical Deck Layers */}
                    <div className="absolute inset-0 translate-y-2 translate-x-2 rounded-xl bg-black/80 shadow-xl pointer-events-none" />
                    <div className="absolute inset-0 translate-y-1 translate-x-1 rounded-xl bg-zinc-800 border border-white/20 pointer-events-none" />
                    <UnoCardBack size="md" />

                    {isUserTurn && !hasDrawnPlayableThisTurn && (
                      <div
                        className={`absolute inset-0 rounded-xl pointer-events-none ${
                          !hasAnyPlayableCard
                            ? 'ring-4 ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.85)] animate-pulse'
                            : 'ring-2 ring-emerald-400/80 group-hover:ring-4'
                        }`}
                      />
                    )}
                  </button>

                  <span className="text-[11px] font-black text-slate-200 mt-2 bg-slate-900/90 px-3 py-0.5 rounded-full border border-white/15">
                    Deste ({gameState.deck.length})
                  </span>
                </div>

                {/* PENALTY POOL (Ceza Havuzu) - Physical waiting cards on the table */}
                {(() => {
                  const poolCount = Math.max(penaltyPoolCount, gameState.pendingDrawPenalty || 0);
                  if (poolCount <= 0) return null;
                  return (
                    <div
                      ref={penaltyPoolRef}
                      className="relative flex flex-col items-center animate-in zoom-in-95 duration-200"
                    >
                      <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white font-cyber text-[10px] font-black whitespace-nowrap shadow-[0_0_25px_rgba(239,68,68,0.95)] animate-bounce flex items-center gap-1.5 border border-white/60">
                        <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                        <span>+{poolCount} CEZA HAVUZU</span>
                      </div>

                      <div className="relative w-14 sm:w-18 h-20 sm:h-24 flex items-center justify-center">
                        {Array.from({ length: Math.min(poolCount, 6) }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              position: 'absolute',
                              transform: `translate3d(${(i - 1) * 3}px, ${(i - 1) * -3}px, 0) rotate(${(i - 1) * 4}deg)`
                            }}
                            className="shadow-xl"
                          >
                            <UnoCardBack size="sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* FANNED DISCARD HISTORY PILE (SON ATILAN KARTLAR YELPAZESİ) */}
                <div className="relative flex flex-col items-center">
                  {/* Fanned Container: shows last 5 played cards spread horizontally so old cards are visible! */}
                  <div
                    ref={discardRef}
                    className="relative w-36 sm:w-48 h-[120px] sm:h-[144px] flex items-center justify-center"
                  >
                    {discardStack
                      .slice()
                      .reverse()
                      .map((item, idx, arr) => {
                        const isTop = idx === arr.length - 1;
                        const ageFromTop = arr.length - 1 - idx; // 0 = newest, 1 = prev, 2 = older...
                        // Spread older cards clearly to the left so their numbers & colors remain visible!
                        const fanOffsetX = isTop ? 18 : 18 - ageFromTop * 22;
                        const fanOffsetY = isTop ? 0 : ageFromTop * 3;
                        const fanScale = isTop ? 1.04 : Math.max(0.84, 1 - ageFromTop * 0.04);
                        const fanRot = isTop ? item.rotation : -ageFromTop * 7;

                        return (
                          <div
                            key={`${item.card.id}-hist-${idx}`}
                            style={{
                              transform: `translateX(${fanOffsetX}px) translateY(${fanOffsetY}px) rotate(${fanRot}deg) scale(${fanScale})`,
                              zIndex: 10 + idx,
                              filter: isTop ? 'none' : 'brightness(0.82)'
                            }}
                            className="absolute transition-all duration-300 ease-out"
                            title={
                              item.playedBy
                                ? `${item.playedBy}: ${formatCardName(item.card)}`
                                : formatCardName(item.card)
                            }
                          >
                            <UnoCardView
                              card={item.card}
                              size="md"
                              className={
                                isTop
                                  ? `ring-2 ${currentTheme.bgRing} shadow-[0_10px_30px_rgba(0,0,0,0.75)]`
                                  : 'shadow-md'
                              }
                            />
                          </div>
                        );
                      })}
                  </div>

                  {/* Stacking Penalty Banner (when +2 or +4 accumulated) */}
                  {Boolean(gameState.pendingDrawPenalty && gameState.pendingDrawPenalty > 0) && (
                    <div className="mt-2 px-3.5 py-1 rounded-full bg-red-600 text-white font-cyber text-[11px] font-black border border-white shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-bounce flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-yellow-300" />
                      <span>CEZA KATLANDI: +{gameState.pendingDrawPenalty} KART!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SEAT (Seat 3 in 4P mode) */}
          <div className="flex items-center justify-center min-w-[90px] sm:min-w-[130px]">
            {players.length >= 4 && renderOpponentSeat(3, 'right')}
          </div>
        </div>

        {/* =========================================================
            3. BOTTOM HUMAN PLAYER HAND AREA (Auto-Pop Playable Cards & 3D Arc)
           ========================================================= */}
        <div
          ref={el => {
            playerHandRefs.current[0] = el;
          }}
          className="relative z-20 flex flex-col items-center w-full max-w-5xl mx-auto pt-1"
        >
          {/* Floating Speech Bubble for Human Player */}
          {seatBubbles[0] && (
            <div className="mb-1 px-4 py-1 rounded-full bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-xs font-black shadow-lg animate-bounce">
              {seatBubbles[0]}
            </div>
          )}

          {/* Turn Status Bar & Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 w-full px-3 mb-2">
            {/* Player Info Badge */}
            <div
              className={`flex items-center gap-2 bg-slate-950/85 px-3 py-1.5 rounded-2xl border transition-all duration-300 ${
                isUserTurn
                  ? 'border-emerald-400 ring-4 ring-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.7)]'
                  : 'border-white/10'
              }`}
            >
              <AvatarBadge
                avatarId={user.avatarId}
                customAvatarUrl={user.customAvatarUrl}
                size="sm"
                isOwner={userProfile.isOwner}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white font-cyber">
                    {user.name} (Sen)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-300 font-bold border border-amber-400/30">
                    {userProfile.customTitle || getAvatarPreset(userProfile.avatarId || 'wolf').title}
                  </span>
                  {userProfile.isOwner && (
                    <span
                      title="Kurucu"
                      className="text-amber-400 select-none text-xs drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]"
                    >
                      👑
                    </span>
                  )}
                  {isUserTurn && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                      SIRANDA
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-amber-300 font-mono font-bold">
                  {user.score} Puan • {user.hand.length} Kart
                </span>
              </div>
            </div>

            {/* Interactive Turn Status & Pass Button */}
            <div className="flex items-center gap-2">
              {isUserTurn ? (
                hasDrawnPlayableThisTurn ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-200 border border-amber-400 animate-pulse">
                      ✨ Çektiğin kartı oynayabilir veya pas geçebilirsin!
                    </span>
                    <button
                      onClick={handleHumanPassAfterDraw}
                      className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white border border-white/25 text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer transition-transform active:scale-95"
                    >
                      <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pas Geç</span>
                    </button>
                  </div>
                ) : hasAnyPlayableCard ? (
                  <span className="px-4 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/80 flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Senin Sıran — Yukarı Çıkan ({playableCardsInHand.length}) Uygun Karttan Birini At!
                  </span>
                ) : (
                  <button
                    onClick={handleHumanDraw}
                    className="px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-bounce flex items-center gap-1.5 cursor-pointer"
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>Elinde Uygun Kart Yok — Kart Çekmek İçin Tıkla!</span>
                  </button>
                )
              ) : (
                <span className="px-3.5 py-1 rounded-full bg-slate-900/90 border border-white/10 text-xs font-bold text-slate-300">
                  ⏳ {players[gameState.currentTurn]?.name || 'Rakip'} hamlesini yapıyor...
                </span>
              )}
            </div>

            {/* Fiery RENQ Shout Button - strictly active when player has 2 cards and it's their turn */}
            {user.hand.length === 2 && isUserTurn && (
              <button
                onClick={handleCallUno}
                className={`px-5 py-2 sm:px-6 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black italic tracking-wide uppercase transition-all duration-200 active:scale-95 cursor-pointer shadow-2xl flex items-center gap-2 ${
                  user.hasCalledUno
                    ? 'bg-emerald-600 text-white border-2 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                    : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:brightness-110 text-white border-2 border-white animate-bounce shadow-[0_0_35px_rgba(239,68,68,0.95)] ring-4 ring-red-500/40'
                }`}
              >
                <Flame className="w-5 h-5 text-yellow-300 animate-pulse" />
                <span>{user.hasCalledUno ? '🔥 "RENQ!" DEDİN!' : '🔥 "RENQ!" DİYE BAĞIR!'}</span>
              </button>
            )}
          </div>

          {/* DYNAMIC 3D CURVED HAND FAN WITH AUTO-LIFTED PLAYABLE CARDS */}
          <div
            ref={userHandContainerRef}
            className="relative w-full flex items-center justify-center min-h-[155px] sm:min-h-[180px] px-4 pt-8 pb-2 overflow-visible"
          >
            {(() => {
              const sortedHand = sortUnoCardsByColor(user.hand);
              const N = sortedHand.length;
              const maxAngle = Math.min(44, Math.max(12, N * 3.8));
              const angleStep = N > 1 ? (maxAngle * 2) / (N - 1) : 0;
              const spacingStep = Math.min(46, Math.max(22, 560 / Math.max(1, N)));

              return sortedHand.map((card, idx) => {
                const isPlayable =
                  isUserTurn &&
                  !isAnimatingAction &&
                  Boolean(topDiscardCard && canPlayUnoCard(card, topDiscardCard, gameState.currentColor, gameState.pendingDrawPenalty));
                const isHidden = hiddenCardIds.has(card.id);
                const isHovered = hoveredCardId === card.id;
                const isNewlyDrawn = newlyDrawnCardId === card.id;

                // Base Fan Arc Calculations
                const normalizedDist = idx - (N - 1) / 2;
                const baseRot = normalizedDist * angleStep;
                const baseOffsetNorm = N > 1 ? normalizedDist / ((N - 1) / 2) : 0;
                const arcDropY = Math.abs(baseOffsetNorm) * 12;

                // Dynamic spreading when neighbor is hovered
                let hoverDisplaceX = 0;
                if (hoveredCardId && !isHovered) {
                  const hoveredIdx = user.hand.findIndex(c => c.id === hoveredCardId);
                  if (hoveredIdx !== -1) {
                    if (idx < hoveredIdx) hoverDisplaceX = -18;
                    else if (idx > hoveredIdx) hoverDisplaceX = 18;
                  }
                }

                // AUTO-POP PLAYABLE CARDS UPWARDS ON USER'S TURN!
                // Playable cards step up -28px automatically (-52px when hovered).
                // Non-playable cards on user's turn sink down +12px and dim soplayable cards stand out!
                let finalLiftY = arcDropY;
                let finalScale = 1;
                let finalRot = baseRot;

                if (isHovered && isPlayable) {
                  finalLiftY = -52;
                  finalScale = 1.2;
                  finalRot = 0;
                } else if (isHovered) {
                  finalLiftY = -18;
                  finalScale = 1.05;
                  finalRot = baseRot * 0.5;
                } else if (isPlayable) {
                  finalLiftY = -28 + arcDropY * 0.35;
                  finalScale = 1.06;
                } else if (isUserTurn) {
                  finalLiftY = 12 + arcDropY * 0.5;
                  finalScale = 0.93;
                }

                return (
                  <div
                    key={card.id}
                    onMouseEnter={() => setHoveredCardId(card.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    style={{
                      transform: `translateX(${hoverDisplaceX}px) translateY(${finalLiftY}px) rotate(${finalRot}deg) scale(${finalScale})`,
                      zIndex: isHovered ? 50 : isPlayable ? 25 + idx : idx,
                      marginLeft: idx === 0 ? 0 : `-${Math.max(14, 48 - spacingStep)}px`,
                      opacity: isHidden ? 0 : isUserTurn && !isPlayable && !isHovered ? 0.48 : 1,
                      filter:
                        isUserTurn && !isPlayable && !isHovered
                          ? 'brightness(0.7) saturate(0.75)'
                          : 'none'
                    }}
                    className="relative transition-all duration-200 ease-out origin-bottom shrink-0"
                  >
                    {/* Floating Playable Callout Pill on Playable Cards */}
                    {isPlayable && !isHidden && (
                      <div
                        className={`absolute -top-6 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap pointer-events-none transition-all ${
                          isHovered
                            ? 'bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.9)] scale-110'
                            : isNewlyDrawn
                            ? 'bg-amber-400 text-slate-950 shadow-md animate-bounce'
                            : 'bg-emerald-950/90 text-emerald-300 border border-emerald-400/60'
                        }`}
                      >
                        {isHovered ? '🚀 OYNA' : isNewlyDrawn ? '✨ YENİ' : '⚡ UYGUN'}
                      </div>
                    )}

                    <UnoCardView
                      card={card}
                      isPlayable={isPlayable && !isHidden}
                      size="md"
                      onClick={e => handleHumanCardClick(card, e)}
                    />
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* FLOATING HUD COLOR SELECTOR (Click outside or 'Vazgeç' to cancel) */}
      {wildPickerCard && (
        <div
          onClick={() => {
            sound.playClick();
            setWildPickerCard(null);
            setWildPickerRect(undefined);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] cursor-pointer animate-in fade-in duration-150"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="p-5 sm:p-6 rounded-3xl bg-slate-950/95 border-2 border-white/25 shadow-[0_0_80px_rgba(0,0,0,0.95)] backdrop-blur-md text-center max-w-xs sm:max-w-sm w-full animate-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="inline-flex p-2.5 rounded-2xl bg-purple-500/25 border border-purple-400/40 text-purple-300 mb-2 shadow-inner">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-base sm:text-lg font-black text-white font-cyber mb-0.5">
              JOKER RENK SEÇİMİ
            </h3>
            <p className="text-[11px] text-slate-300 mb-4">
              Hangi renkle devam etmek istiyorsun?
            </p>

            <div className="grid grid-cols-2 gap-3">
              {(['red', 'blue', 'green', 'yellow'] as UnoColor[]).map(color => {
                const count = user.hand.filter(c => c.color === color).length;
                return (
                  <button
                    key={color}
                    onClick={() => {
                      const c = wildPickerCard;
                      const rect = wildPickerRect;
                      setWildPickerCard(null);
                      setWildPickerRect(undefined);
                      executePlayCard(0, c, color, rect);
                      if (isMultiplayer) {
                        multiplayerManager.send({
                          type: 'MP_UNO_PLAY_CARD',
                          cardId: c.id,
                          chosenColor: color,
                          seatIndex: mySeatIndex,
                          senderPeerId: multiplayerManager.instanceId
                        });
                      }
                    }}
                    className={`py-3 px-2 rounded-2xl text-xs sm:text-sm font-black text-white shadow-xl transition-all duration-150 active:scale-95 cursor-pointer border-2 hover:scale-105 flex flex-col items-center justify-center gap-0.5 ${
                      color === 'red'
                        ? 'bg-gradient-to-br from-red-500 to-rose-700 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                        : color === 'blue'
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-700 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                        : color === 'green'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    }`}
                  >
                    <span>{COLOR_NAMES[color]}</span>
                    <span className={`text-[10px] font-mono font-bold ${color === 'yellow' ? 'text-slate-900/80' : 'text-white/80'}`}>
                      ({count} kart)
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setWildPickerCard(null);
                setWildPickerRect(undefined);
              }}
              className="mt-3.5 w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
            >
              Vazgeç (Geri Al)
            </button>
          </div>
        </div>
      )}

      {/* SURRENDER CONFIRMATION MODAL (Online Multiplayer Exit Warning) */}
      {isSurrenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/80 shadow-[0_0_50px_rgba(244,63,94,0.4)] text-center max-w-sm w-full">
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/20 text-rose-400 mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              Maçı Terk Etmek İstiyor Musunuz?
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {isMultiplayer
                ? 'Masadan ayrılırsanız devam eden online maç iptal edilecek ve diğer oyuncular bilgilendirilecektir.'
                : 'Masadan ayrılırsanız devam eden oyununuz sonlandırılacaktır. Ayrılmak istediğinizden emin misiniz?'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsSurrenderModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                Masada Kal
              </button>
              <button
                onClick={handleConfirmSurrender}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer transition-colors"
              >
                Maçı Terk Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCH ABORTED MODAL (When Opponent Surrenders or Disconnects) */}
      {matchAbortedReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-center max-w-sm w-full">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-300 mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              Maç İptal Edildi
            </h3>
            <p className="text-xs text-slate-300 mb-6">{matchAbortedReason}</p>
            <button
              onClick={() => {
                setMatchAbortedReason(null);
                try {
                  multiplayerManager.leaveRoom();
                } catch {}
                onExitToMenu();
              }}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg cursor-pointer"
            >
              Ana Menüye Dön
            </button>
          </div>
        </div>
      )}

      {/* ROUND END & GAME OVER SUMMARY MODAL */}
      {gameState.isRoundOver && gameState.roundWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-center max-w-md w-full">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 mb-3">
              <Trophy className="w-8 h-8" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white font-cyber tracking-tight">
              {gameState.isGameOver
                ? '🏆 OYUN BİTTİ — ŞAMPİYON BELLİ OLDU!'
                : `🏆 ELİ ${gameState.roundWinner.name.toUpperCase()} KAZANDI!`}
            </h3>

            <p className="text-xs text-slate-300 mt-2 mb-5">
              {gameState.lastActionMessage}
            </p>

            {/* Scoreboard table */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 mb-6 space-y-2">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-900/60"
                >
                  <div className="flex items-center gap-2">
                    <AvatarBadge
                      avatarId={p.avatarId}
                      customAvatarUrl={p.customAvatarUrl}
                      size="xs"
                    />
                    <span className="font-bold text-white">
                      {p.name} {idx === 0 ? '(Sen)' : ''}
                    </span>
                  </div>
                  <span className="font-cyber font-black text-amber-300">
                    {p.score} Puan
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              {!gameState.isGameOver ? (
                isMultiplayer && !isHost ? (
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-amber-300 border border-amber-500/30 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>Oda Yöneticisinin Yeni Eli Başlatması Bekleniyor...</span>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onExitToMenu();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
                    >
                      Menüye Dön
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      sound.playClick();
                      if (isMultiplayer && isHost) {
                        const nextDeck = shuffleUnoDeck(createUnoDeck());
                        multiplayerManager.send({
                          type: 'MP_UNO_NEXT_ROUND',
                          seedCards: nextDeck,
                          startingTurnSeat: 0
                        });
                        startNewRound(nextDeck);
                      } else {
                        startNewRound();
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95"
                  >
                    Sonraki Eli Başlat →
                  </button>
                )
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      sound.playClick();
                      const resetPlayers = playersSyncRef.current.map(p => ({
                        ...p,
                        score: 0,
                        hand: [],
                        hasCalledUno: false
                      }));
                      playersSyncRef.current = resetPlayers;
                      setPlayers(resetPlayers);
                      if (isMultiplayer && isHost) {
                        const freshDeck = shuffleUnoDeck(createUnoDeck());
                        multiplayerManager.send({
                          type: 'MP_UNO_NEXT_ROUND',
                          seedCards: freshDeck,
                          startingTurnSeat: 0
                        });
                        startNewRound(freshDeck);
                      } else {
                        startNewRound();
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95"
                  >
                    Rövanş Oyna 🔄
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      onExitToMenu();
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-slate-800 hover:bg-slate-700 text-white shadow-lg cursor-pointer transition-transform active:scale-95 border border-white/10"
                  >
                    Ana Menüye Dön
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
