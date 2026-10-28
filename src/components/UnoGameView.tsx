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
import { getUserProfile, recordMatchStats } from '../features/profile/profileManager';
import { sound } from '../core/audio/soundEngine';
import { FlyingUnoCardData, UnoCardAnimationLayer } from './UnoCardAnimationLayer';
import { multiplayerManager, LobbyPlayerSlot } from '../features/multiplayer/peerManager';
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
  ShieldAlert
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
}

const COLOR_NAMES: Record<UnoColor, string> = {
  red: 'Kırmızı',
  blue: 'Mavi',
  green: 'Yeşil',
  yellow: 'Sarı',
  wild: 'Joker'
};

const COLOR_THEMES: Record<
  UnoColor,
  {
    glow: string;
    text: string;
    bgRing: string;
    border: string;
    tableAura: string;
  }
> = {
  red: {
    glow: 'rgba(239, 68, 68, 0.45)',
    text: 'text-red-400',
    bgRing: 'ring-red-500/70',
    border: 'border-red-500/80',
    tableAura: 'from-red-950/40 via-red-900/10 to-transparent'
  },
  blue: {
    glow: 'rgba(59, 130, 246, 0.45)',
    text: 'text-blue-400',
    bgRing: 'ring-blue-500/70',
    border: 'border-blue-500/80',
    tableAura: 'from-blue-950/40 via-blue-900/10 to-transparent'
  },
  green: {
    glow: 'rgba(16, 185, 129, 0.45)',
    text: 'text-emerald-400',
    bgRing: 'ring-emerald-500/70',
    border: 'border-emerald-500/80',
    tableAura: 'from-emerald-950/40 via-emerald-900/10 to-transparent'
  },
  yellow: {
    glow: 'rgba(245, 158, 11, 0.45)',
    text: 'text-amber-400',
    bgRing: 'ring-amber-400/70',
    border: 'border-amber-400/80',
    tableAura: 'from-amber-950/40 via-amber-900/10 to-transparent'
  },
  wild: {
    glow: 'rgba(168, 85, 247, 0.45)',
    text: 'text-purple-400',
    bgRing: 'ring-purple-500/70',
    border: 'border-purple-500/80',
    tableAura: 'from-purple-950/40 via-purple-900/10 to-transparent'
  }
};

interface DiscardStackItem {
  card: UnoCard;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

export const UnoGameView: React.FC<UnoGameViewProps> = ({
  onExitToMenu,
  playerCount = 4,
  targetScore = 250,
  isMultiplayer = false,
  mySeatIndex = 0,
  mpSlots
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
    currentTurn: 0,
    direction: 1,
    targetScore,
    winner: null,
    roundWinner: null,
    isRoundOver: false,
    isGameOver: false,
    lastActionMessage: 'UNO Masasına Hoş Geldiniz!'
  }));

  // Discard pile physical 3D history stack
  const [discardStack, setDiscardStack] = useState<DiscardStackItem[]>([]);

  // Interactive Card Hand States
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [wildPickerCard, setWildPickerCard] = useState<UnoCard | null>(null);
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

  // Surrender & Online Abort Confirmation Modals
  const [isSurrenderModalOpen, setIsSurrenderModalOpen] = useState(false);
  const [matchAbortedReason, setMatchAbortedReason] = useState<string | null>(null);

  // DOM Refs
  const deckRef = useRef<HTMLDivElement | null>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const playerHandRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const botTurnTimerRef = useRef<number | null>(null);

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
      const startW = startRect.width || 80;
      const startH = startRect.height || 116;
      const targetW = targetRect.width || 96;
      const targetH = targetRect.height || 140;

      const startX = 'x' in startRect ? startRect.x + startW / 2 : (startRect as DOMRect).left + startW / 2;
      const startY = 'y' in startRect ? startRect.y + startH / 2 : (startRect as DOMRect).top + startH / 2;
      const targetX = 'x' in targetRect ? targetRect.x + targetW / 2 : (targetRect as DOMRect).left + targetW / 2;
      const targetY = 'y' in targetRect ? targetRect.y + targetH / 2 : (targetRect as DOMRect).top + targetH / 2;

      const animId = `uno-fly-${Date.now()}-${Math.random()}`;

      setHiddenCardIds(prev => new Set(prev).add(card.id));

      const newFly: FlyingUnoCardData = {
        id: animId,
        card,
        startX,
        startY,
        targetX,
        targetY,
        startRotation: options.startRotation ?? 0,
        targetRotation: options.targetRotation ?? (Math.random() * 20 - 10),
        startFaceUp: options.startFaceUp ?? false,
        endFaceUp: options.endFaceUp ?? true,
        duration: options.duration ?? 380,
        arcHeight: 55,
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
  const triggerBanner = (
    text: string,
    type?: 'reverse' | 'skip' | 'draw' | 'uno' | 'wild',
    duration = 2400
  ) => {
    setActionBanner({ text, type });
    const timer = window.setTimeout(() => setActionBanner(null), duration);
    return () => window.clearTimeout(timer);
  };

  // Start / Reset Round with full deals
  const startNewRound = useCallback(() => {
    const fullDeck = shuffleUnoDeck(createUnoDeck());
    const dealt = dealUnoGame(fullDeck, players.length);

    setPlayers(prev =>
      prev.map((p, idx) => ({
        ...p,
        hand: dealt.hands[idx],
        hasCalledUno: false
      }))
    );

    const initialCard = dealt.initialDiscard;
    setGameState(prev => ({
      ...prev,
      deck: dealt.remainingDeck,
      discardPile: [initialCard],
      currentColor: dealt.initialColor,
      currentTurn: 0,
      direction: 1,
      roundWinner: null,
      isRoundOver: false,
      lastActionMessage: 'Yeni el dağıtıldı!'
    }));

    setDiscardStack([
      {
        card: initialCard,
        rotation: Math.random() * 8 - 4,
        offsetX: 0,
        offsetY: 0
      }
    ]);
  }, [players.length]);

  // Initial Deal
  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  // Advance turn according to direction and step
  const advanceTurn = useCallback(
    (step: number = 1) => {
      setGameState(prev => {
        const N = players.length;
        const nextTurn = (prev.currentTurn + prev.direction * step + N * 10) % N;
        return {
          ...prev,
          currentTurn: nextTurn
        };
      });
    },
    [players.length]
  );

  // Draw card helper from draw pile with flying animation
  const drawCardsForPlayer = useCallback(
    (playerIdx: number, count: number): UnoCard[] => {
      let drawnCards: UnoCard[] = [];
      setGameState(prev => {
        let currentDeck = [...prev.deck];
        let currentDiscard = [...prev.discardPile];

        if (currentDeck.length < count) {
          const topCard = currentDiscard.pop()!;
          const recycled = shuffleUnoDeck(currentDiscard);
          currentDeck = [...currentDeck, ...recycled];
          currentDiscard = [topCard];
        }

        drawnCards = currentDeck.splice(0, count);

        return {
          ...prev,
          deck: currentDeck,
          discardPile: currentDiscard
        };
      });

      // Animate card flying from Deck to Player Hand
      const deckEl = deckRef.current;
      const handEl = playerHandRefs.current[playerIdx];

      if (deckEl && handEl && drawnCards.length > 0) {
        sound.playCardDeal();
        const dRect = deckEl.getBoundingClientRect();
        const hRect = handEl.getBoundingClientRect();

        drawnCards.forEach((c, i) => {
          window.setTimeout(() => {
            spawnFlyingUnoCard(c, dRect, hRect, {
              startFaceUp: false,
              endFaceUp: playerIdx === 0,
              duration: 360
            });
          }, i * 90);
        });
      }

      setPlayers(prev =>
        prev.map((p, idx) => {
          if (idx === playerIdx) {
            return {
              ...p,
              hand: [...p.hand, ...drawnCards],
              hasCalledUno: p.hand.length + drawnCards.length === 1 ? p.hasCalledUno : false
            };
          }
          return p;
        })
      );

      return drawnCards;
    },
    [spawnFlyingUnoCard]
  );

  // Handle Play Card with flying 3D arc animation & tactile stack physics!
  const executePlayCard = useCallback(
    (playerIdx: number, card: UnoCard, chosenColor?: UnoColor, sourceRect?: DOMRect) => {
      const actingPlayer = players[playerIdx];
      const discardEl = discardRef.current;
      const handEl = playerHandRefs.current[playerIdx];

      const startRect =
        sourceRect ||
        (handEl
          ? handEl.getBoundingClientRect()
          : { x: window.innerWidth / 2, y: window.innerHeight - 100 });
      const targetRect = discardEl
        ? discardEl.getBoundingClientRect()
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      const finalRotation = Math.random() * 22 - 11;
      const finalOffsetX = Math.random() * 10 - 5;
      const finalOffsetY = Math.random() * 10 - 5;

      sound.playCardPlay();

      spawnFlyingUnoCard(card, startRect, targetRect, {
        startFaceUp: true,
        endFaceUp: true,
        targetRotation: finalRotation,
        duration: 360,
        onFinish: () => {
          sound.playClick();
          setTablePulseKey(k => k + 1);

          setDiscardStack(prev => {
            const next = [
              {
                card,
                rotation: finalRotation,
                offsetX: finalOffsetX,
                offsetY: finalOffsetY
              },
              ...prev.slice(0, 4)
            ];
            return next;
          });
        }
      });

      // Remove card from player hand
      setPlayers(prev =>
        prev.map((p, idx) => {
          if (idx === playerIdx) {
            const nextHand = p.hand.filter(c => c.id !== card.id);
            return {
              ...p,
              hand: nextHand,
              hasCalledUno: nextHand.length === 1 ? p.hasCalledUno : false
            };
          }
          return p;
        })
      );

      // Determine next color
      const newActiveColor =
        card.color === 'wild' ? chosenColor || 'red' : card.color;

      // Check for round win (empty hand)
      const remainingHandCount = actingPlayer.hand.length - 1;

      if (remainingHandCount === 0) {
        sound.playUnoShout();
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });

        const totalRoundPoints = players.reduce((sum, p, idx) => {
          if (idx === playerIdx) return sum;
          return sum + calculateUnoHandPoints(p.hand);
        }, 0);

        const newPlayerScore = actingPlayer.score + totalRoundPoints;
        const isGameEnd = newPlayerScore >= targetScore;

        if (playerIdx === 0) {
          recordMatchStats(true, totalRoundPoints, 0, 0, true);
        } else {
          recordMatchStats(false, 0, 0, 0, true);
        }

        setPlayers(prev =>
          prev.map((p, idx) => (idx === playerIdx ? { ...p, score: newPlayerScore } : p))
        );

        setGameState(prev => ({
          ...prev,
          discardPile: [card, ...prev.discardPile],
          currentColor: newActiveColor,
          isRoundOver: true,
          isGameOver: isGameEnd,
          roundWinner: { ...actingPlayer, score: newPlayerScore },
          winner: isGameEnd ? { ...actingPlayer, score: newPlayerScore } : null,
          lastActionMessage: `🏆 ${actingPlayer.name} eli bitirdi ve +${totalRoundPoints} PUAN kazandı!`
        }));
        return;
      }

      // Special UNO Card Action Mechanics
      let nextStep = 1;
      let actionMsg = `${actingPlayer.name} ${card.value.toUpperCase()} kartı attı.`;

      if (card.value === 'reverse') {
        const newDirection = (gameState.direction * -1) as 1 | -1;
        setGameState(prev => ({ ...prev, direction: newDirection }));
        sound.playUnoReverse();

        if (players.length === 2) {
          // In 2 players, reverse acts like a skip
          nextStep = 2;
          actionMsg = `🔄 YÖN DEĞİŞTİ! (2 Kişide Pas Geçti)`;
        } else {
          actionMsg = `🔄 YÖN DEĞİŞTİ! (${newDirection === 1 ? 'Saat Yönü' : 'Ters Yön'})`;
        }
        triggerBanner(actionMsg, 'reverse');
      } else if (card.value === 'skip') {
        nextStep = 2;
        const skippedIdx =
          (playerIdx + gameState.direction + players.length) % players.length;
        sound.playUnoSkip();
        setSkippedPlayerIdx(skippedIdx);
        window.setTimeout(() => setSkippedPlayerIdx(null), 1800);
        actionMsg = `🚫 ${players[skippedIdx].name} PAS GEÇTİ!`;
        triggerBanner(actionMsg, 'skip');
      } else if (card.value === 'draw2') {
        const nextVictimIdx =
          (playerIdx + gameState.direction + players.length) % players.length;
        sound.playUnoDrawPenalty();
        drawCardsForPlayer(nextVictimIdx, 2);
        nextStep = 2;
        actionMsg = `💥 ${players[nextVictimIdx].name} 2 KART ÇEKTİ!`;
        triggerBanner(actionMsg, 'draw');
      } else if (card.value === 'wild_draw4') {
        const nextVictimIdx =
          (playerIdx + gameState.direction + players.length) % players.length;
        sound.playUnoDrawPenalty();
        sound.playUnoWild();
        drawCardsForPlayer(nextVictimIdx, 4);
        nextStep = 2;
        actionMsg = `🌈💥 +4 JOKER! ${players[nextVictimIdx].name} 4 Kart Çekti! Renk: ${COLOR_NAMES[newActiveColor]}`;
        triggerBanner(actionMsg, 'wild');
      } else if (card.value === 'wild') {
        sound.playUnoWild();
        actionMsg = `🌈 JOKER! Yeni Renk: ${COLOR_NAMES[newActiveColor]}`;
        triggerBanner(actionMsg, 'wild');
      }

      setGameState(prev => ({
        ...prev,
        discardPile: [card, ...prev.discardPile],
        currentColor: newActiveColor,
        lastActionMessage: actionMsg
      }));

      advanceTurn(nextStep);
    },
    [
      players,
      gameState.direction,
      targetScore,
      drawCardsForPlayer,
      advanceTurn,
      spawnFlyingUnoCard
    ]
  );

  // Listen to Multiplayer UNO events
  useEffect(() => {
    if (!isMultiplayer) return;

    const unsubscribe = multiplayerManager.onEvent(event => {
      if (event.type === 'MP_UNO_PLAY_CARD') {
        if (event.senderPeerId === multiplayerManager.instanceId) return;

        const N = players.length;
        const targetLocalIdx = (event.seatIndex - mySeatIndex + N) % N;
        const targetP = players[targetLocalIdx];
        if (!targetP) return;

        const foundCard = targetP.hand.find(c => c.id === event.cardId) || targetP.hand[0];
        if (foundCard) {
          executePlayCard(targetLocalIdx, foundCard, event.chosenColor as UnoColor);
        }
      } else if (event.type === 'MP_UNO_DRAW_CARD') {
        if (event.senderPeerId === multiplayerManager.instanceId) return;
        const N = players.length;
        const targetLocalIdx = (event.seatIndex - mySeatIndex + N) % N;
        drawCardsForPlayer(targetLocalIdx, event.count || 1);
      } else if (event.type === 'MP_UNO_CALL_UNO') {
        if (event.senderPeerId === multiplayerManager.instanceId) return;
        const N = players.length;
        const targetLocalIdx = (event.seatIndex - mySeatIndex + N) % N;
        setPlayers(prev =>
          prev.map((p, idx) => (idx === targetLocalIdx ? { ...p, hasCalledUno: true } : p))
        );
        sound.playUnoShout();
        triggerBanner(`🔥 ${players[targetLocalIdx]?.name || 'Rakip'} "UNO!" DEDİ!`, 'uno');
      } else if (event.type === 'MP_MATCH_ABORTED') {
        setMatchAbortedReason(
          event.reason === 'surrender'
            ? `${event.senderName || 'Rakip'} maçı terk etti.`
            : `${event.senderName || 'Rakip'} bağlantısı koptu.`
        );
      } else if (event.type === 'PEER_DISCONNECTED') {
        setMatchAbortedReason('Rakip masadan ayrıldı. Bağlantı koptu.');
      }
    });

    return unsubscribe;
  }, [isMultiplayer, mySeatIndex, players, executePlayCard, drawCardsForPlayer]);

  // Handle Tab Close / Unload in multiplayer
  useEffect(() => {
    if (!isMultiplayer) return;
    const handleBeforeUnload = () => {
      try {
        multiplayerManager.send({
          type: 'MP_MATCH_ABORTED',
          reason: 'disconnect',
          senderName: userProfile.name
        });
        multiplayerManager.leaveRoom();
      } catch {
        // Ignored
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isMultiplayer, userProfile.name]);

  // Human card click
  const handleHumanCardClick = (card: UnoCard, e?: React.MouseEvent) => {
    if (gameState.currentTurn !== 0 || gameState.isRoundOver) return;

    const topDiscard = gameState.discardPile[0];
    if (!canPlayUnoCard(card, topDiscard, gameState.currentColor)) return;

    const sourceRect = e ? (e.currentTarget as HTMLElement).getBoundingClientRect() : undefined;

    if (card.color === 'wild') {
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

  // Human draws a card
  const handleHumanDraw = () => {
    if (gameState.currentTurn !== 0 || gameState.isRoundOver) return;
    sound.playClick();
    const drawn = drawCardsForPlayer(0, 1);
    const topDiscard = gameState.discardPile[0];

    if (isMultiplayer) {
      multiplayerManager.send({
        type: 'MP_UNO_DRAW_CARD',
        seatIndex: mySeatIndex,
        count: 1,
        senderPeerId: multiplayerManager.instanceId
      });
    }

    if (drawn.length > 0 && canPlayUnoCard(drawn[0], topDiscard, gameState.currentColor)) {
      triggerBanner('Çektiğiniz kart oynanabilir!', 'wild', 1800);
    } else {
      advanceTurn(1);
    }
  };

  // Human calls "UNO!"
  const handleCallUno = () => {
    sound.playUnoShout();
    setPlayers(prev =>
      prev.map((p, idx) => (idx === 0 ? { ...p, hasCalledUno: true } : p))
    );
    if (isMultiplayer) {
      multiplayerManager.send({
        type: 'MP_UNO_CALL_UNO',
        seatIndex: mySeatIndex,
        senderPeerId: multiplayerManager.instanceId
      });
    }
    triggerBanner('🔥 "UNO!" DEDİNİZ!', 'uno');
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.8 } });
  };

  // Bot Turn Automation (AI plays with realistic flying cards)
  useEffect(() => {
    if (gameState.isRoundOver) return;

    const botIdx = gameState.currentTurn;
    const bot = players[botIdx];
    if (!bot || !bot.isAI) return;

    botTurnTimerRef.current = window.setTimeout(() => {
      const topDiscard = gameState.discardPile[0];
      const botDecision = getBotUnoPlay(bot.hand, topDiscard, gameState.currentColor);

      // Bot calls UNO if about to have 1 card
      if (bot.hand.length === 2 && !bot.hasCalledUno) {
        sound.playUnoShout();
        setPlayers(prev =>
          prev.map((p, idx) => (idx === botIdx ? { ...p, hasCalledUno: true } : p))
        );
        triggerBanner(`🔥 ${bot.name} "UNO!" DEDİ!`, 'uno');
      }

      if (botDecision.cardToPlay) {
        executePlayCard(
          botIdx,
          botDecision.cardToPlay,
          botDecision.chosenWildColor
        );
      } else {
        const drawn = drawCardsForPlayer(botIdx, 1);
        if (
          drawn.length > 0 &&
          canPlayUnoCard(drawn[0], topDiscard, gameState.currentColor)
        ) {
          executePlayCard(botIdx, drawn[0]);
        } else {
          advanceTurn(1);
        }
      }
    }, 1150);

    return () => {
      if (botTurnTimerRef.current) window.clearTimeout(botTurnTimerRef.current);
    };
  }, [
    gameState.currentTurn,
    gameState.isRoundOver,
    gameState.discardPile,
    gameState.currentColor,
    players,
    drawCardsForPlayer,
    executePlayCard,
    advanceTurn
  ]);

  // Exit button click handler (Surrender confirmation in multiplayer)
  const handleExitClick = () => {
    sound.playClick();
    if (isMultiplayer) {
      setIsSurrenderModalOpen(true);
    } else {
      onExitToMenu();
    }
  };

  // Confirm surrender in multiplayer
  const handleConfirmSurrender = () => {
    setIsSurrenderModalOpen(false);
    if (isMultiplayer) {
      try {
        multiplayerManager.send({
          type: 'MP_MATCH_ABORTED',
          reason: 'surrender',
          senderName: userProfile.name
        });
        multiplayerManager.leaveRoom();
      } catch (e) {
        console.warn(e);
      }
    }
    onExitToMenu();
  };

  const topDiscardCard = gameState.discardPile[0];
  const user = players[0];
  const isUserTurn = gameState.currentTurn === 0 && !gameState.isRoundOver;
  const currentTheme = COLOR_THEMES[gameState.currentColor];



  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-neutral-950 font-sans select-none p-2 sm:p-4 perspective-[1200px]">
      {/* Dynamic 3D Felt Stadium & Lighting Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Felt Texture Pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* Dynamic Stadium Color Ambient Wave */}
        <div
          key={tablePulseKey}
          className={`absolute inset-0 transition-all duration-700 opacity-25 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${currentTheme.tableAura} animate-in fade-in`}
        />

        {/* Outer Table Rim Glow */}
        <div
          className="absolute inset-4 sm:inset-10 rounded-[48px] border border-white/5 shadow-2xl pointer-events-none transition-colors duration-500"
          style={{
            boxShadow: `inset 0 0 100px ${currentTheme.glow}`
          }}
        />
      </div>

      {/* Zero-Teleportation Flying Uno Card Layer */}
      <UnoCardAnimationLayer flyingCards={flyingCards} />

      {/* HEADER HUD BAR */}
      <header className="relative z-30 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 shadow-xl">
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
            <span className="text-lg sm:text-xl font-black italic tracking-tighter text-amber-300 font-sans drop-shadow-md">
              UNO
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
              {isMultiplayer ? 'Online Çok Oyunculu' : 'Klasik 108 Kart'}
            </span>
          </div>
        </div>

        {/* Direction Indicator & Target Score */}
        <div className="flex items-center gap-2 sm:gap-3">
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
                <span className="hidden sm:inline">Saat Yönü</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />
                <span className="hidden sm:inline">Ters Yön</span>
              </>
            )}
          </div>

          <div className="text-xs font-bold text-slate-300 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10">
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
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-black border-2 shadow-2xl flex items-center gap-2.5 ${
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
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>{actionBanner.text}</span>
          </div>
        </div>
      )}

      {/* 3D CIRCULAR STADIUM ARENA */}
      <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto flex flex-col justify-between items-center py-2 sm:py-4">
        {/* TOP OPPONENT(S) */}
        <div className="w-full flex items-center justify-around px-2">
          {players.slice(1).map((bot, idx) => {
            const actualPlayerIdx = idx + 1;
            const isTurn = gameState.currentTurn === actualPlayerIdx;
            const isSkipped = skippedPlayerIdx === actualPlayerIdx;

            return (
              <div
                key={bot.id}
                ref={el => {
                  playerHandRefs.current[actualPlayerIdx] = el;
                }}
                className={`relative flex flex-col items-center transition-all duration-300 ${
                  isTurn ? 'scale-105 z-20' : 'opacity-85 z-10'
                }`}
              >
                {/* Skipped Laser Barrier Stamp */}
                {isSkipped && (
                  <div className="absolute -top-3 z-30 px-3 py-1 rounded-full bg-red-600/90 text-white font-black text-xs border border-white shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-bounce flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    PAS GEÇTİ!
                  </div>
                )}

                {/* Player Profile & Turn Spotlight */}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all ${
                    isTurn
                      ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/50'
                      : 'bg-black/40 border-white/10'
                  }`}
                >
                  <div className="relative">
                    <AvatarBadge
                      avatarId={bot.avatarId}
                      customAvatarUrl={bot.customAvatarUrl}
                      size="sm"
                    />
                    {isTurn && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white max-w-[110px] truncate">
                        {bot.name}
                      </span>
                      {bot.hasCalledUno && (
                        <span className="px-1.5 py-0.2 rounded bg-red-600 text-[9px] font-black text-white animate-pulse">
                          UNO
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-amber-300/80 font-mono">
                      {bot.score} Puan • {bot.hand.length} Kart
                    </span>
                  </div>
                </div>

                {/* Opponent's 3D Angled Card Fan (Backs) */}
                <div className="flex items-center justify-center -space-x-8 sm:-space-x-9 mt-1.5 min-h-[76px]">
                  {Array.from({ length: Math.min(bot.hand.length, 9) }).map((_, i) => {
                    const tilt = (i - (Math.min(bot.hand.length, 9) - 1) / 2) * 4;
                    return (
                      <div
                        key={i}
                        style={{
                          transform: `rotate(${tilt}deg) translateY(${Math.abs(tilt) * 0.4}px)`
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
          })}
        </div>

        {/* CENTER TABLE FELT: DRAW DECK & PHYSICAL DISCARD STACK */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
          {/* Active Color Aura Header Pill */}
          <div
            className={`mb-4 px-5 py-1.5 rounded-full text-xs font-black border flex items-center gap-2 uppercase tracking-wider backdrop-blur-md transition-all duration-300 ${
              gameState.currentColor === 'red'
                ? 'bg-red-500/20 text-red-300 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                : gameState.currentColor === 'blue'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                : gameState.currentColor === 'green'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : 'bg-amber-400/20 text-amber-300 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping" />
            <span>Aktif Renk: {COLOR_NAMES[gameState.currentColor]}</span>
          </div>

          {/* Stacks Container */}
          <div className="flex items-center justify-center gap-8 sm:gap-14">
            {/* Çekme Destesi (Draw Pile) */}
            <div ref={deckRef} className="flex flex-col items-center">
              <button
                onClick={handleHumanDraw}
                disabled={!isUserTurn}
                className={`relative group transition-all duration-200 active:scale-95 ${
                  isUserTurn
                    ? 'cursor-pointer hover:scale-105'
                    : 'cursor-not-allowed opacity-75'
                }`}
                title="Desteden Kart Çek"
              >
                {/* 3D Stack Depth (Simulating thick card pack) */}
                <div className="absolute inset-0 translate-y-1.5 translate-x-1.5 rounded-xl bg-black/60 shadow-lg pointer-events-none" />
                <div className="absolute inset-0 translate-y-1 translate-x-1 rounded-xl bg-zinc-800 border border-white/10 pointer-events-none" />
                <UnoCardBack size="md" />

                {isUserTurn && (
                  <div className="absolute inset-0 rounded-xl ring-2 ring-amber-400/80 animate-pulse pointer-events-none" />
                )}
              </button>
              <span className="text-[10px] font-bold text-slate-300 mt-2 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/10">
                Deste: {gameState.deck.length}
              </span>
            </div>

            {/* Atılan Kartlar (3D Physical Discard Pile Stack) */}
            <div ref={discardRef} className="relative flex flex-col items-center">
              <div className="relative w-20 h-[116px] sm:w-24 sm:h-[140px] flex items-center justify-center">
                {/* Render lower stack layers for true physical depth */}
                {discardStack.slice(1).map((item, idx) => (
                  <div
                    key={`${item.card.id}-sub-${idx}`}
                    style={{
                      transform: `rotate(${item.rotation}deg) translate(${item.offsetX}px, ${item.offsetY}px)`,
                      opacity: 0.85 - idx * 0.18
                    }}
                    className="absolute inset-0 pointer-events-none transition-transform"
                  >
                    <UnoCardView card={item.card} size="md" />
                  </div>
                ))}

                {/* Top active discard card */}
                {topDiscardCard ? (
                  <div
                    style={{
                      transform: `rotate(${discardStack[0]?.rotation ?? 0}deg)`
                    }}
                    className="relative z-10 transition-transform duration-200"
                  >
                    <UnoCardView card={topDiscardCard} size="md" />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-xs text-white/30">
                    Boş
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-300 mt-2 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/10">
                Ortadaki Kart
              </span>
            </div>
          </div>
        </div>

        {/* HUMAN PLAYER AREA (Dynamic Arc Curved Hand & Interactive Physics) */}
        <div
          ref={el => {
            playerHandRefs.current[0] = el;
          }}
          className="relative z-20 flex flex-col items-center w-full max-w-4xl mx-auto"
        >
          {/* Turn Status & UNO Shout Flame Button */}
          <div className="flex items-center justify-between w-full px-3 mb-2">
            {/* Player Info Badge */}
            <div className="flex items-center gap-2">
              <AvatarBadge
                avatarId={user.avatarId}
                customAvatarUrl={user.customAvatarUrl}
                size="sm"
              />
              <div>
                <span className="text-xs font-black text-white font-cyber">
                  {user.name} (Sen)
                </span>
                <span className="text-[10px] text-amber-300 ml-2 font-mono">
                  {user.score} Puan
                </span>
              </div>
            </div>

            {/* Turn Status Pill */}
            {isUserTurn ? (
              <span className="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/80 animate-pulse flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Senin Sıran — Kartını Seç veya Çek
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">
                {players[gameState.currentTurn]?.name || 'Rakip'} oynuyor...
              </span>
            )}

            {/* Fiery UNO Shout Button */}
            {user.hand.length <= 2 && (
              <button
                onClick={handleCallUno}
                className={`px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-black italic tracking-tighter uppercase transition-all duration-200 active:scale-95 cursor-pointer shadow-xl flex items-center gap-1.5 ${
                  user.hasCalledUno
                    ? 'bg-emerald-600 text-white border-2 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                    : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:brightness-110 text-white border-2 border-white animate-bounce shadow-[0_0_25px_rgba(239,68,68,0.8)]'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>{user.hasCalledUno ? 'UNO DEDİN!' : 'UNO DE!'}</span>
              </button>
            )}
          </div>

          {/* DYNAMIC 3D CURVED HAND FAN WITH TACTILE HOVER PHYSICS */}
          <div className="relative w-full flex items-center justify-center min-h-[145px] sm:min-h-[165px] px-2 py-1 overflow-visible">
            {(() => {
              const N = user.hand.length;
              const maxAngle = Math.min(50, Math.max(16, N * 4.5));
              const angleStep = N > 1 ? (maxAngle * 2) / (N - 1) : 0;
              const spacingStep = Math.min(42, Math.max(20, 520 / Math.max(1, N)));

              return user.hand.map((card, idx) => {
                const isPlayable =
                  isUserTurn && canPlayUnoCard(card, topDiscardCard, gameState.currentColor);
                const isHidden = hiddenCardIds.has(card.id);
                const isHovered = hoveredCardId === card.id;

                // Base Fan Arc Calculations
                const normalizedDist = (idx - (N - 1) / 2);
                const baseRot = normalizedDist * angleStep;
                const baseOffsetNorm = N > 1 ? normalizedDist / ((N - 1) / 2) : 0;
                const arcLiftY = Math.abs(baseOffsetNorm) * 14;

                // Dynamic spreading when neighbor is hovered
                let hoverDisplaceX = 0;
                if (hoveredCardId && !isHovered) {
                  const hoveredIdx = user.hand.findIndex(c => c.id === hoveredCardId);
                  if (hoveredIdx !== -1) {
                    if (idx < hoveredIdx) hoverDisplaceX = -14;
                    else if (idx > hoveredIdx) hoverDisplaceX = 14;
                  }
                }

                const finalRot = isHovered ? 0 : baseRot;
                const finalLiftY = isHovered ? -38 : arcLiftY;

                return (
                  <div
                    key={card.id}
                    onMouseEnter={() => setHoveredCardId(card.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    style={{
                      transform: `translateX(${hoverDisplaceX}px) translateY(${finalLiftY}px) rotate(${finalRot}deg) scale(${
                        isHovered ? 1.15 : 1
                      })`,
                      zIndex: isHovered ? 40 : idx,
                      marginLeft: idx === 0 ? 0 : `-${Math.max(16, 46 - spacingStep)}px`,
                      opacity: isHidden ? 0 : 1
                    }}
                    className="relative transition-all duration-200 ease-out origin-bottom shrink-0"
                  >
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

      {/* 3D GLOWING COLOR ORBITAL SELECTOR MODAL (When playing Wild / Wild +4) */}
      {wildPickerCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-center max-w-sm w-full">
            <div className="inline-flex p-3 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 mb-2">
              <Zap className="w-8 h-8 animate-pulse" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white font-cyber mb-1">
              JOKER RENK SEÇİMİ
            </h3>
            <p className="text-xs text-slate-300 mb-6">
              Oyuna hangi renkle devam etmek istiyorsunuz?
            </p>

            <div className="grid grid-cols-2 gap-3.5">
              {(['red', 'blue', 'green', 'yellow'] as UnoColor[]).map(color => (
                <button
                  key={color}
                  onClick={() => {
                    const c = wildPickerCard;
                    setWildPickerCard(null);
                    executePlayCard(0, c, color);
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
                  className={`py-4 rounded-2xl text-sm font-black text-white shadow-xl transition-all duration-150 active:scale-95 cursor-pointer border-2 hover:scale-105 ${
                    color === 'red'
                      ? 'bg-gradient-to-br from-red-500 to-rose-700 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                      : color === 'blue'
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-700 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                      : color === 'green'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                      : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                  }`}
                >
                  {COLOR_NAMES[color]}
                </button>
              ))}
            </div>
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
              Masadan ayrılırsanız devam eden online maç iptal edilecek ve diğer oyuncular bilgilendirilecektir.
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
                <button
                  onClick={() => {
                    sound.playClick();
                    startNewRound();
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95"
                >
                  Sonraki Eli Başlat →
                </button>
              ) : (
                <button
                  onClick={() => {
                    sound.playClick();
                    onExitToMenu();
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95"
                >
                  Ana Menüye Dön
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
