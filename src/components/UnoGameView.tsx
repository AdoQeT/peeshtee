import { logger } from '../utils/logger';
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
import { getLanguage, onLanguageChange, translations, Language, getRandomBotNames } from '../utils/i18n';
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

export function getColorName(color: UnoColor, currentLang: Language = getLanguage()): string {
  const t = translations[currentLang] || translations.tr;
  const map: Record<UnoColor, string> = {
    red: t.renqColorRed,
    blue: t.renqColorBlue,
    green: t.renqColorGreen,
    yellow: t.renqColorYellow,
    wild: t.renqColorWild
  };
  return map[color] || color;
}

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

export function formatCardName(card: UnoCard, currentLang: Language = getLanguage()): string {
  const t = translations[currentLang] || translations.tr;
  const colorName = getColorName(card.color, currentLang);
  const valMap: Record<string, string> = {
    skip: `🚫 ${t.renqPassBtn}`,
    reverse: `⇄ ${t.renqDirectionCounter}`,
    draw2: '+2',
    wild: `🌈 ${t.renqColorWild}`,
    wild_draw4: `🌈 +4 ${t.renqColorWild}`
  };
  const v = valMap[card.value] || card.value;
  if (card.color === 'wild') return v;
  return `${colorName} ${v}`;
}

export interface ActiveEmote {
  playerIdx: number;
  emoji: string;
  id: string;
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

    const botNames = getRandomBotNames(3, getLanguage());
    const botTemplates = [
      { name: botNames[0] || 'Alex', avatarId: 'lion' },
      { name: botNames[1] || 'Leo', avatarId: 'cyber_samurai' },
      { name: botNames[2] || 'Max', avatarId: 'dayi' }
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

  // Localization State
  const [lang, setLang] = useState<Language>(getLanguage());
  useEffect(() => onLanguageChange(setLang), []);
  const t = translations[lang] || translations.tr;

  // Emote Wheel & FX States
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);
  const [isReverseLightActive, setIsReverseLightActive] = useState(false);

  const handleTriggerEmote = useCallback((playerIdx: number, emoji: string) => {
    const newEmote: ActiveEmote = {
      playerIdx,
      emoji,
      id: `emote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    };
    setActiveEmotes(prev => [...prev.slice(-8), newEmote]);
    window.setTimeout(() => {
      setActiveEmotes(prev => prev.filter(e => e.id !== newEmote.id));
    }, 2000);
  }, []);

  const handleSendUserEmote = (emoji: string) => {
    sound.playEmoteSound(emoji);
    handleTriggerEmote(0, emoji);
    if (isMultiplayer) {
      multiplayerManager.send({
        type: 'MP_EMOTE',
        emoji,
        seatIndex: mySeatIndex,
        senderPeerId: multiplayerManager.instanceId
      });
    }
  };

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
  const opponentCardRackRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
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

  const getSeatAngle = useCallback(
    (playerIdx: number): number => {
      if (playerIdx === 0) return 0;
      if (players.length === 2) return 180;
      if (playerIdx === 1) return 75; // Left bot
      if (playerIdx === 2) return 180; // Top bot
      if (playerIdx === 3) return -75; // Right bot
      return 180;
    },
    [players.length]
  );

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

      // Check opponent card rack first for high-precision physical takeoff and landing
      const rackEl = opponentCardRackRefs.current[playerIdx];
      if (rackEl) {
        const r = rackEl.getBoundingClientRect();
        if (r.width > 20 && r.height > 20) return r;
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
        arcHeight?: number;
        motionType?: 'deal' | 'play' | 'sweep' | 'jack' | 'pisti_slam';
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
        duration: options.duration ?? (options.motionType === 'play' ? 490 : 440),
        arcHeight: options.arcHeight ?? (options.motionType === 'play' ? 125 : 85),
        motionType: options.motionType ?? 'deal',
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
        const targetEl = step.playerIdx === 0 ? document.getElementById(`uno-user-card-${step.card.id}`) : null;
        const handRect = targetEl ? targetEl.getBoundingClientRect() : getSafeSeatRect(step.playerIdx);
        const targetRot = step.playerIdx === 0 ? 0 : getSeatAngle(step.playerIdx);

        spawnFlyingUnoCard(step.card, deckRect, handRect, {
          startFaceUp: false,
          endFaceUp: step.playerIdx === 0,
          startRotation: -8,
          targetRotation: targetRot,
          duration: 450,
          motionType: 'deal',
          arcHeight: 90,
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
        duration: 490,
        motionType: 'play',
        arcHeight: 115,
        startRotation: -12,
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

      if (drawnCards.length > 0) {
        let completedCount = 0;
        drawnCards.forEach((c, i) => {
          window.setTimeout(() => {
            const targetEl = playerIdx === 0 ? document.getElementById(`uno-user-card-${c.id}`) : null;
            const targetRect = targetEl ? targetEl.getBoundingClientRect() : getSafeSeatRect(playerIdx);

            let targetRot = getSeatAngle(playerIdx);
            if (playerIdx === 0) {
              const cardIdx = nextPlayers[0].hand.findIndex(x => x.id === c.id);
              const totalCards = nextPlayers[0].hand.length;
              const angleStep = Math.min(4.5, 36 / Math.max(1, totalCards - 1));
              targetRot = cardIdx >= 0 ? (cardIdx - (totalCards - 1) / 2) * angleStep : 0;
            }

            sound.playCardDeal();
            spawnFlyingUnoCard(c, dRect, targetRect, {
              startFaceUp: false,
              endFaceUp: playerIdx === 0,
              startRotation: -12,
              targetRotation: targetRot,
              duration: 440,
              motionType: 'deal',
              arcHeight: 85,
              onFinish: () => {
                setHiddenCardIds(prev => {
                  const next = new Set(prev);
                  next.delete(c.id);
                  return next;
                });
                completedCount++;
                if (completedCount === drawnCards.length) {
                  onAllLanded?.(drawnCards);
                }
              }
            });
          }, i * 120);
        });
      } else {
        onAllLanded?.([]);
      }

      return drawnCards;
    },
    [getSafeSeatRect, getSeatAngle, spawnFlyingUnoCard]
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
          const targetEl = playerIdx === 0 ? document.getElementById(`uno-user-card-${c.id}`) : null;
          const targetRectFinal = targetEl ? targetEl.getBoundingClientRect() : targetRect;
          let targetRot = getSeatAngle(playerIdx);
          if (playerIdx === 0) {
            const cardIdx = updatedHand.findIndex(x => x.id === c.id);
            const totalCards = updatedHand.length;
            const angleStep = Math.min(4.5, 36 / Math.max(1, totalCards - 1));
            targetRot = cardIdx >= 0 ? (cardIdx - (totalCards - 1) / 2) * angleStep : 0;
          }

          sound.playCardDeal();
          spawnFlyingUnoCard(c, startRect, targetRectFinal, {
            startFaceUp: false,
            endFaceUp: playerIdx === 0,
            startRotation: -6,
            targetRotation: targetRot,
            duration: 380,
            motionType: 'deal',
            arcHeight: 90,
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
        }, idx * 105);
      });
    },
    [getSafeSeatRect, getSeatAngle, spawnFlyingUnoCard, advanceTurn, isMultiplayer, mySeatIndex]
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
      const seatAngle = getSeatAngle(playerIdx);
      const startRot = playerIdx === 0
        ? (sourceRect ? (Math.random() * 6 - 3) : 0)
        : seatAngle + (Math.random() * 12 - 6);

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

      const cardReadable = formatCardName(card, lang);
      showSeatBubble(
        playerIdx,
        card.color === 'wild'
          ? `${cardReadable} (${getColorName(newActiveColor, lang)})`
          : `${cardReadable} attı!`
      );

      spawnFlyingUnoCard(card, startRect, targetRect, {
        startFaceUp: playerIdx === 0,
        endFaceUp: true,
        startRotation: startRot,
        targetRotation: finalRotation,
        motionType: 'play',
        arcHeight: 125,
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
            setIsReverseLightActive(true);
            window.setTimeout(() => setIsReverseLightActive(false), 1400);

            if (nextPlayers.length === 2) {
              nextStep = 2;
              actionMsg = `🔄 ${actingPlayer.name}: ${t.renqDirectionCounter} (1v1)`;
            } else {
              actionMsg = `🔄 ${actingPlayer.name}: ${
                activeDir === 1 ? t.renqDirectionClockwise : t.renqDirectionCounter
              }`;
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
            actionMsg = `🌈 ${actingPlayer.name} ${t.renqColorWild}! ${t.renqColorLabel} ${getColorName(newActiveColor, lang)}`;
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
      getSafeSeatRect,
      getSeatAngle,
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
        if (!verifiedId || !mpSlots || !mpSlots[seatIndex]) return false;
        const slot = mpSlots[seatIndex];
        const expectedPeerId = slot.isAI ? mpSlots[0]?.peerId : slot.peerId;
        if (!expectedPeerId) return false;

        if (verifiedId !== expectedPeerId) {
          logger.warn(`[AntiCheat] Blocked spoofed UNO event ${event.type} from sender ${verifiedId} targeting seat ${seatIndex} (${expectedPeerId})`);
          return false;
        }
        if (declaredPeerId && declaredPeerId !== expectedPeerId) {
          logger.warn(`[AntiCheat] Blocked spoofed UNO peerId in ${event.type}: declared ${declaredPeerId} vs expected ${expectedPeerId}`);
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
          logger.warn(`Card ${event.cardId} not found in player ${targetLocalIdx}'s hand!`);
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
      } else if (event.type === 'MP_EMOTE') {
        if (event.senderPeerId === multiplayerManager.instanceId) return;
        const currentPlayers = playersSyncRef.current;
        const N = currentPlayers.length;
        const targetLocalIdx = (event.seatIndex - mySeatIndex + N) % N;
        handleTriggerEmote(targetLocalIdx, event.emoji);
      } else if (event.type === 'MP_UNO_NEXT_ROUND') {
        if (!isSenderAuthorized(0)) return;
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
        logger.warn(e);
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

        {/* Floating Active Emotes for Opponent */}
        {activeEmotes
          ?.filter(e => e.playerIdx === playerIdx)
          .map(e => (
            <div
              key={e.id}
              style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
            >
              <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-amber-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                {e.emoji}
              </div>
            </div>
          ))}

        {/* Active Turn Glowing Beacon */}
        {isTurn && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.95)] animate-bounce flex items-center gap-1 whitespace-nowrap">
            ⚡ {t.renqYourTurnTitle ? t.renqYourTurnTitle.slice(0, 10).toUpperCase() : 'SIRADA'}
          </div>
        )}

        {/* 1 Card Left Danger Warning Beacon */}
        {opp.hand.length === 1 && !isTurn && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white font-cyber text-[9px] font-black uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.95)] animate-bounce flex items-center gap-1 whitespace-nowrap border border-white">
            <Flame className="w-3 h-3 text-yellow-300 fill-yellow-300 animate-pulse" />
            <span>
              {lang === 'tr'
                ? '⚠️ 1 KART KALDI!'
                : lang === 'de'
                ? '⚠️ NUR 1 KARTE!'
                : lang === 'es'
                ? '⚠️ ¡ÚLTIMA CARTA!'
                : '⚠️ LAST CARD!'}
            </span>
          </div>
        )}

        {/* Skipped Laser Barrier Stamp */}
        {isSkipped && (
          <div className="absolute -top-3 z-30 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs border-2 border-white shadow-[0_0_25px_rgba(239,68,68,0.95)] animate-bounce flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            {t.renqPassBtn.toUpperCase()}!
          </div>
        )}

        {/* Opponent Badge Card */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all duration-200 ${
            isTurn
              ? 'bg-amber-500/35 border-amber-300 ring-4 ring-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.95)] scale-105'
              : opp.hand.length === 1
              ? 'bg-rose-950/70 border-rose-400 ring-4 ring-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.9)] animate-pulse'
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
              <span className="text-amber-300 font-bold">{opp.score}{t.renqPointSuffix}</span>
              <span className="text-slate-400">•</span>
              <span
                className={`font-black ${
                  opp.hand.length === 1 ? 'text-red-400 animate-pulse' : 'text-cyan-300'
                }`}
              >
                {opp.hand.length} {t.renqCardCountSuffix}
              </span>
            </div>
          </div>
        </div>

        {/* Opponent's Fanned Card Backs */}
        <div
          ref={el => {
            opponentCardRackRefs.current[playerIdx] = el;
          }}
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

      {/* Keyframes for Emote Pop */}
      <style>{`
        @keyframes emotePop2s {
          0% {
            transform: translate(-50%, 8px) scale(0.4);
            opacity: 0;
          }
          15% {
            transform: translate(-50%, -10px) scale(1.15);
            opacity: 1;
          }
          30% {
            transform: translate(-50%, -6px) scale(1);
            opacity: 1;
          }
          75% {
            transform: translate(-50%, -12px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -24px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>

      {/* Reverse Direction Orbital Light Ring Sweep (Table Edge Neon Aura) */}
      {isReverseLightActive && (
        <div className="absolute inset-2 sm:inset-5 rounded-[44px] pointer-events-none z-20 border-4 border-sky-400 shadow-[0_0_80px_rgba(56,189,248,0.95),inset_0_0_70px_rgba(56,189,248,0.7)] animate-pulse transition-opacity duration-300" />
      )}

      {/* HEADER HUD BAR */}
      <header className="relative z-30 flex items-center justify-between px-3 sm:px-4 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/15 shadow-xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleExitClick}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title={t.renqReturnToMenu}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t.menuLabel || 'Menü'}</span>
          </button>
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg sm:text-xl font-black italic tracking-tighter text-amber-300 font-cyber drop-shadow-md">
              RENQ
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
              {isMultiplayer ? (t.mpRoomHeaderRenq || 'Multiplayer') : '3D Table'}
            </span>
          </div>
        </div>

        {/* Active Color Indicator, Direction & Target Score */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Color Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-white/15 text-xs font-black text-white">
            <span className={`w-3 h-3 rounded-full ${COLOR_DOT_CLASSES[gameState.currentColor]}`} />
            <span>{t.renqColorLabel} {getColorName(gameState.currentColor, lang)}</span>
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
                <span className="hidden sm:inline">{t.renqDirectionClockwise}</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />
                <span className="hidden sm:inline">{t.renqDirectionCounter}</span>
              </>
            )}
          </div>

          <div className="hidden md:block text-xs font-bold text-slate-300 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10">
            {t.targetScoreLabel}: <strong className="text-amber-300">{gameState.targetScore}P</strong>
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
        {/* =========================================================
            0. EXTERNAL PERIMETER PLAYER PROFILE BANNERS (Outside Table Edge)
           ========================================================= */}
        {/* Top Opponent External Horizontal Banner */}
        {(() => {
          const topOpp = players.length === 2 ? players[1] : players[2];
          if (!topOpp) return null;
          const isTopTurn = gameState.currentTurn === (players.length === 2 ? 1 : 2);
          return (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border-2 transition-colors flex items-center gap-1.5 shadow-xl whitespace-nowrap ${
                  isTopTurn
                    ? 'border-amber-400 bg-slate-900 text-amber-300 ring-2 ring-amber-400/50'
                    : 'border-white/10 bg-slate-950/90 text-slate-300'
                }`}
              >
                <AvatarBadge avatarId={topOpp.avatarId} customAvatarUrl={topOpp.customAvatarUrl} size="xs" />
                <span>{topOpp.name}</span>
                <span className="font-mono text-[10px] text-amber-400">({topOpp.score}{t.renqPointSuffix})</span>
                <span className="text-[10px] text-cyan-300">• {topOpp.hand.length} {t.renqCardCountSuffix}</span>
              </span>
            </div>
          );
        })()}

        {/* Bottom User External Horizontal Banner */}
        {user && (
          <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border-2 transition-colors flex items-center gap-1.5 shadow-xl whitespace-nowrap ${
                isUserTurn
                  ? 'border-emerald-400 bg-slate-900 text-emerald-300 ring-2 ring-emerald-400/50'
                  : 'border-white/10 bg-slate-950/90 text-slate-300'
              }`}
            >
              <AvatarBadge avatarId={user.avatarId} customAvatarUrl={user.customAvatarUrl} size="xs" isOwner={userProfile.isOwner} />
              <span>{user.name} ({t.youLabel})</span>
              <span className="font-mono text-[10px] text-amber-400">({user.score}{t.renqPointSuffix})</span>
              <span className="text-[10px] text-cyan-300">• {user.hand.length} {t.renqCardCountSuffix}</span>
            </span>
          </div>
        )}

        {/* Left Player External Horizontal Banner (4-Player Seat 1) */}
        {players.length >= 4 && players[1] && (
          <div className="absolute left-2 sm:-left-3 top-1/2 -translate-y-[170px] sm:-translate-y-[190px] z-30 pointer-events-none">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border-2 transition-colors flex items-center gap-1.5 shadow-xl whitespace-nowrap ${
                gameState.currentTurn === 1
                  ? 'border-amber-400 bg-slate-900 text-amber-300 ring-2 ring-amber-400/50'
                  : 'border-white/10 bg-slate-950/90 text-slate-300'
              }`}
            >
              <AvatarBadge avatarId={players[1].avatarId} customAvatarUrl={players[1].customAvatarUrl} size="xs" />
              <span>{players[1].name}</span>
              <span className="font-mono text-[10px] text-amber-400">({players[1].score}{t.renqPointSuffix})</span>
              <span className="text-[10px] text-cyan-300">• {players[1].hand.length} {t.renqCardCountSuffix}</span>
            </span>
          </div>
        )}

        {/* Right Player External Horizontal Banner (4-Player Seat 3) */}
        {players.length >= 4 && players[3] && (
          <div className="absolute right-2 sm:-right-3 top-1/2 -translate-y-[170px] sm:-translate-y-[190px] z-30 pointer-events-none">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border-2 transition-colors flex items-center gap-1.5 shadow-xl whitespace-nowrap ${
                gameState.currentTurn === 3
                  ? 'border-amber-400 bg-slate-900 text-amber-300 ring-2 ring-amber-400/50'
                  : 'border-white/10 bg-slate-950/90 text-slate-300'
              }`}
            >
              <AvatarBadge avatarId={players[3].avatarId} customAvatarUrl={players[3].customAvatarUrl} size="xs" />
              <span>{players[3].name}</span>
              <span className="font-mono text-[10px] text-amber-400">({players[3].score}{t.renqPointSuffix})</span>
              <span className="text-[10px] text-cyan-300">• {players[3].hand.length} {t.renqCardCountSuffix}</span>
            </span>
          </div>
        )}

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

          {/* CENTER FELT: DIRECTION ARROWS + DRAW DECK + FANNED DISCARD HISTORY */}
          <div className="relative flex-1 flex flex-col items-center justify-center">

            {/* Animated SVG Direction Orbit with 2 Semi-Transparent Directional Arrows on Felt */}
            <div className="relative flex items-center justify-center py-3 px-6 sm:px-12 rounded-[36px] bg-slate-950/60 border border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.7)]">

              {/* Dealing in progress indicator */}
              {isInitialDealing && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1 rounded-full bg-slate-900/90 border border-emerald-400 text-emerald-300 font-cyber text-[10px] font-black tracking-wider flex items-center gap-1.5 animate-pulse shadow-md pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>KARTLAR DAĞITILIYOR...</span>
                </div>
              )}

              {/* 2 Semi-Transparent Orbital Direction Flow Arrows directly on felt */}
              <svg
                viewBox="0 0 380 200"
                className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-500 ${
                  isReverseLightActive ? 'opacity-85 filter drop-shadow-[0_0_14px_rgba(56,189,248,0.9)]' : 'opacity-30'
                }`}
              >
                <defs>
                  <marker
                    id="felt-arrow-head"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={currentTheme.strokeHex} />
                  </marker>
                </defs>

                {/* Outer Stadium Track Border */}
                <rect
                  x="14"
                  y="14"
                  width="352"
                  height="172"
                  rx="84"
                  fill="none"
                  stroke={currentTheme.strokeHex}
                  strokeWidth="2"
                  strokeDasharray="8 6"
                />

                {/* 2 Semi-Transparent Orbital Direction Flow Arcs with Arrowheads */}
                {gameState.direction === 1 ? (
                  <>
                    {/* Clockwise: Top Arc flowing Left to Right */}
                    <path
                      d="M 80 50 Q 190 20 300 50"
                      fill="none"
                      stroke={currentTheme.strokeHex}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      markerEnd="url(#felt-arrow-head)"
                    />
                    {/* Clockwise: Bottom Arc flowing Right to Left */}
                    <path
                      d="M 300 150 Q 190 180 80 150"
                      fill="none"
                      stroke={currentTheme.strokeHex}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      markerEnd="url(#felt-arrow-head)"
                    />
                  </>
                ) : (
                  <>
                    {/* Counter-Clockwise: Top Arc flowing Right to Left */}
                    <path
                      d="M 300 50 Q 190 20 80 50"
                      fill="none"
                      stroke={currentTheme.strokeHex}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      markerEnd="url(#felt-arrow-head)"
                    />
                    {/* Counter-Clockwise: Bottom Arc flowing Left to Right */}
                    <path
                      d="M 80 150 Q 190 180 300 150"
                      fill="none"
                      stroke={currentTheme.strokeHex}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      markerEnd="url(#felt-arrow-head)"
                    />
                  </>
                )}
              </svg>

              <div className="relative z-10 flex items-center justify-center gap-8 sm:gap-16">
                {/* DRAW PILE (DESTE) */}
                <div className="relative flex flex-col items-center">
                  {/* Bouncing Callout when User has NO Playable Cards or Pending Penalty! */}
                  {isUserTurn && (!hasAnyPlayableCard || (gameState.pendingDrawPenalty && gameState.pendingDrawPenalty > 0)) && !hasDrawnPlayableThisTurn && (
                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-[11px] whitespace-nowrap shadow-[0_0_25px_rgba(245,158,11,0.9)] animate-bounce flex items-center gap-1">
                      <Hand className="w-3.5 h-3.5" />
                      <span>{gameState.pendingDrawPenalty && gameState.pendingDrawPenalty > 0 ? `💥 ${t.renqDrawPenaltyAction.replace('{count}', String(gameState.pendingDrawPenalty))}` : t.renqDrawCardAction}</span>
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
                        ? t.renqDrawCardAction
                        : ''
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
                    {t.renqDeckLabel} ({gameState.deck.length})
                  </span>
                </div>

                {/* PENALTY POOL (Ceza Havuzu) - Physical waiting cards on the table with dynamic combo scale */}
                {(() => {
                  const poolCount = Math.max(penaltyPoolCount, gameState.pendingDrawPenalty || 0);
                  if (poolCount <= 0) return null;
                  const comboScale = poolCount >= 8 ? 1.35 : poolCount >= 6 ? 1.25 : poolCount >= 4 ? 1.15 : 1.0;
                  const isMegaPenalty = poolCount >= 4;

                  return (
                    <div
                      ref={penaltyPoolRef}
                      style={{ transform: `scale(${comboScale})` }}
                      className="relative flex flex-col items-center animate-in zoom-in-95 duration-200 transition-transform"
                    >
                      <div className={`absolute -top-11 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white font-cyber text-[10px] font-black whitespace-nowrap shadow-[0_0_25px_rgba(239,68,68,0.95)] flex items-center gap-1.5 border border-white/60 ${
                        isMegaPenalty ? 'animate-bounce ring-4 ring-red-500/50 shadow-[0_0_35px_rgba(239,68,68,1)]' : 'animate-pulse'
                      }`}>
                        <Flame className={`w-3.5 h-3.5 text-yellow-300 ${isMegaPenalty ? 'animate-spin-slow' : 'animate-pulse'}`} />
                        <span>+{poolCount} {t.renqPenaltyPool.replace('{count}', String(poolCount))}</span>
                      </div>

                      <div className="relative w-14 sm:w-18 h-20 sm:h-24 flex items-center justify-center">
                        {Array.from({ length: Math.min(poolCount, 6) }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              position: 'absolute',
                              transform: `translate3d(${(i - 1) * 3}px, ${(i - 1) * -3}px, 0) rotate(${(i - 1) * 4}deg)`
                            }}
                            className={`shadow-xl transition-all ${isMegaPenalty ? 'ring-2 ring-red-500 rounded-lg' : ''}`}
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
                        const ageFromTop = arr.length - 1 - idx;
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
                                ? `${item.playedBy}: ${formatCardName(item.card, lang)}`
                                : formatCardName(item.card, lang)
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

                  {/* Stacking Penalty Banner (when +2 or +4 accumulated) with combo scale */}
                  {Boolean(gameState.pendingDrawPenalty && gameState.pendingDrawPenalty > 0) && (
                    <div
                      style={{ transform: `scale(${(gameState.pendingDrawPenalty || 0) >= 4 ? 1.15 : 1.02})` }}
                      className="mt-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white font-cyber text-[11px] font-black border border-white shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-bounce flex items-center gap-1.5 transition-transform"
                    >
                      <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                      <span>+{gameState.pendingDrawPenalty} {t.renqPenaltyPool.replace('{count}', String(gameState.pendingDrawPenalty))}</span>
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

          {/* Floating Active Emote for User */}
          {activeEmotes
            ?.filter(e => e.playerIdx === 0)
            .map(e => (
              <div
                key={e.id}
                style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
                className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
              >
                <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-emerald-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                  {e.emoji}
                </div>
              </div>
            ))}

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
                    {user.name} ({t.youLabel})
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
                      {t.renqYourTurnTitle ? t.renqYourTurnTitle.slice(0, 7).toUpperCase() : 'SIRANDA'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-amber-300 font-mono font-bold">
                  {user.score} {t.renqPointSuffix} • {user.hand.length} {t.renqCardCountSuffix}
                </span>
              </div>
            </div>

            {/* Interactive Turn Status & Pass Button */}
            <div className="flex items-center gap-2">
              {isUserTurn ? (
                hasDrawnPlayableThisTurn ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-200 border border-amber-400 animate-pulse">
                      ✨ {t.renqCanPlayOrPass}
                    </span>
                    <button
                      onClick={handleHumanPassAfterDraw}
                      className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white border border-white/25 text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer transition-transform active:scale-95"
                    >
                      <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.renqPassBtn}</span>
                    </button>
                  </div>
                ) : hasAnyPlayableCard ? (
                  <span className="px-4 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/80 flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {t.renqYourTurnTitle} ({playableCardsInHand.length})
                  </span>
                ) : (
                  <button
                    onClick={handleHumanDraw}
                    className="px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-bounce flex items-center gap-1.5 cursor-pointer"
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>{t.renqNoPlayableDraw}</span>
                  </button>
                )
              ) : (
                <span className="px-3.5 py-1 rounded-full bg-slate-900/90 border border-white/10 text-xs font-bold text-slate-300">
                  ⏳ {players[gameState.currentTurn]?.name || '...'}
                </span>
              )}

              {/* Minimalist Quick Emote Reaction Trigger & Radial Wheel */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmotePicker(prev => !prev)}
                  title={t.sendReaction}
                  className="p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-white/20 hover:border-amber-400/60 text-amber-300 shadow-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  <span className="text-base sm:text-lg">💬</span>
                </button>

                {showEmotePicker && (
                  <div className="absolute bottom-12 right-0 z-50 w-44 h-44 rounded-full bg-slate-950/95 border-2 border-amber-400/80 shadow-[0_12px_40px_rgba(0,0,0,0.9),0_0_24px_rgba(245,158,11,0.35)] backdrop-blur-xl animate-in zoom-in-95 duration-200 flex items-center justify-center">
                    {/* Center Close Hub */}
                    <button
                      type="button"
                      onClick={() => setShowEmotePicker(false)}
                      className="w-10 h-10 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 text-amber-300 text-xs font-black flex items-center justify-center cursor-pointer transition-colors"
                    >
                      ✕
                    </button>

                    {/* 8 Emotes Arranged Radially */}
                    {[
                      { emoji: '👍', name: 'Beğeni' },
                      { emoji: '👏', name: 'Alkış' },
                      { emoji: '😂', name: 'Kahkaha' },
                      { emoji: '🔥', name: 'Alev' },
                      { emoji: '😎', name: 'Havalı' },
                      { emoji: '😮', name: 'Şaşkın' },
                      { emoji: '😢', name: 'Üzgün' },
                      { emoji: '😡', name: 'Kızgın' }
                    ].map((item, i) => {
                      const angle = (i * 2 * Math.PI) / 8 - Math.PI / 2;
                      const radius = 58;
                      const x = Math.round(radius * Math.cos(angle));
                      const y = Math.round(radius * Math.sin(angle));

                      return (
                        <button
                          key={item.emoji}
                          type="button"
                          onClick={() => {
                            handleSendUserEmote(item.emoji);
                            setShowEmotePicker(false);
                          }}
                          title={item.name}
                          style={{
                            transform: `translate(${x}px, ${y}px)`
                          }}
                          className="absolute w-9 h-9 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/20 hover:border-amber-400 text-lg flex items-center justify-center shadow-lg transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                        >
                          {item.emoji}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
                <span>{user.hasCalledUno ? t.renqShoutedUnoBadge : t.renqShoutUnoBtn}</span>
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
                    id={`uno-user-card-${card.id}`}
                    onMouseEnter={() => {
                      setHoveredCardId(card.id);
                      if (isPlayable && !isHidden) {
                        sound.playCardHover();
                      }
                    }}
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
              {t.renqWildPickerTitle}
            </h3>
            <p className="text-[11px] text-slate-300 mb-4">
              {t.renqWildPickerSub}
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
                    <span>{getColorName(color, lang)}</span>
                    <span className={`text-[10px] font-mono font-bold ${color === 'yellow' ? 'text-slate-900/80' : 'text-white/80'}`}>
                      ({count} {t.renqCardCountSuffix.toLowerCase()})
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
              {t.renqWildPickerCancel}
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
              {t.renqSurrenderTitle}
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {isMultiplayer
                ? t.renqSurrenderSubMp
                : t.renqSurrenderSubSolo}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsSurrenderModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                {t.renqStayAtTable}
              </button>
              <button
                onClick={handleConfirmSurrender}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer transition-colors"
              >
                {t.renqLeaveMatch}
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
              {t.renqMatchAbortedTitle}
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
              {t.renqReturnToMenu}
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
                ? `🏆 ${t.renqGameOverTitle}`
                : `🏆 ${gameState.roundWinner.name.toUpperCase()} ${t.renqWinnerSuffix}`}
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
                      {p.name} {idx === 0 ? `(${t.youLabel})` : ''}
                    </span>
                  </div>
                  <span className="font-cyber font-black text-amber-300">
                    {p.score} {t.renqPointSuffix}
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
                      <span>{t.renqWaitingHostNextRound}</span>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onExitToMenu();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
                    >
                      {t.renqReturnToMenu}
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
                    {t.renqNextRoundBtn}
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
                    {t.rematchBtn}
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      onExitToMenu();
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-slate-800 hover:bg-slate-700 text-white shadow-lg cursor-pointer transition-transform active:scale-95 border border-white/10"
                  >
                    {t.renqReturnToMenu}
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
