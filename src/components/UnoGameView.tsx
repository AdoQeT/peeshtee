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
  Trophy
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

const COLOR_PILL_STYLES: Record<UnoColor, string> = {
  red: 'bg-red-500/20 text-red-300 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.4)]',
  green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
  yellow: 'bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
  wild: 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
};

export const UnoGameView: React.FC<UnoGameViewProps> = ({
  onExitToMenu,
  playerCount = 4,
  targetScore = 250,
  isMultiplayer = false,
  mySeatIndex = 0,
  mpSlots
}) => {
  const userProfile = getUserProfile();

  // Players State
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

  const [wildPickerCard, setWildPickerCard] = useState<UnoCard | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  // Flying Card Animation Layer State
  const [flyingCards, setFlyingCards] = useState<FlyingUnoCardData[]>([]);
  const [hiddenCardIds, setHiddenCardIds] = useState<Set<string>>(new Set());

  // DOM Refs for tactile start/end coordinate calculation
  const deckRef = useRef<HTMLDivElement | null>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const playerHandRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);

  const botTurnTimerRef = useRef<number | null>(null);

  // Helper: Trigger Flying Card Animation
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
      const startH = startRect.height || 112;
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
        targetRotation: options.targetRotation ?? (Math.random() * 24 - 12),
        startFaceUp: options.startFaceUp ?? false,
        endFaceUp: options.endFaceUp ?? true,
        duration: options.duration ?? 400,
        arcHeight: 50,
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

  // Show action banner toast
  const triggerBanner = (msg: string) => {
    setActionBanner(msg);
    const t = window.setTimeout(() => setActionBanner(null), 2500);
    return () => window.clearTimeout(t);
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

    setGameState(prev => ({
      ...prev,
      deck: dealt.remainingDeck,
      discardPile: [dealt.initialDiscard],
      currentColor: dealt.initialColor,
      currentTurn: 0,
      direction: 1,
      roundWinner: null,
      isRoundOver: false,
      lastActionMessage: 'Yeni el dağıtıldı!'
    }));
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
              duration: 380
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

  // Handle Play Card with flying 3D arc animation!
  const executePlayCard = useCallback(
    (playerIdx: number, card: UnoCard, chosenColor?: UnoColor, sourceRect?: DOMRect) => {
      const actingPlayer = players[playerIdx];

      // Physical flying card animation from hand to discard pile
      const discardEl = discardRef.current;
      const handEl = playerHandRefs.current[playerIdx];

      const startRect = sourceRect || (handEl ? handEl.getBoundingClientRect() : { x: window.innerWidth / 2, y: window.innerHeight - 100 });
      const targetRect = discardEl ? discardEl.getBoundingClientRect() : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      sound.playCardPlay();

      spawnFlyingUnoCard(card, startRect, targetRect, {
        startFaceUp: true,
        endFaceUp: true,
        targetRotation: Math.random() * 20 - 10,
        duration: 380,
        onFinish: () => {
          sound.playClick();
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
        sound.playDoublePisti ? sound.playDoublePisti() : sound.playClick();
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });

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
        actionMsg = `🔄 YÖN DEĞİŞTİ! (${newDirection === 1 ? 'Saat Yönü' : 'Ters Yön'})`;
        triggerBanner(actionMsg);
      } else if (card.value === 'skip') {
        nextStep = 2;
        const skippedIdx =
          (playerIdx + gameState.direction + players.length) % players.length;
        actionMsg = `🚫 ${players[skippedIdx].name} PAS GEÇTİ!`;
        triggerBanner(actionMsg);
      } else if (card.value === 'draw2') {
        const nextVictimIdx =
          (playerIdx + gameState.direction + players.length) % players.length;
        drawCardsForPlayer(nextVictimIdx, 2);
        nextStep = 2;
        actionMsg = `💥 ${players[nextVictimIdx].name} 2 KART ÇEKTİ ve sırası geçti!`;
        triggerBanner(actionMsg);
      } else if (card.value === 'wild_draw4') {
        const nextVictimIdx =
          (playerIdx + gameState.direction + players.length) % players.length;
        drawCardsForPlayer(nextVictimIdx, 4);
        nextStep = 2;
        actionMsg = `🌈💥 +4 JOKER! ${players[nextVictimIdx].name} 4 KART ÇEKTİ! Yeni Renk: ${COLOR_NAMES[newActiveColor]}`;
        triggerBanner(actionMsg);
      } else if (card.value === 'wild') {
        actionMsg = `🌈 JOKER! Yeni Renk: ${COLOR_NAMES[newActiveColor]}`;
        triggerBanner(actionMsg);
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
        triggerBanner(`🔥 ${players[targetLocalIdx]?.name || 'Rakip'} "UNO!" DEDİ!`);
      }
    });

    return unsubscribe;
  }, [isMultiplayer, mySeatIndex, players, executePlayCard, drawCardsForPlayer]);

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
      triggerBanner('Çektiğiniz kart oynanabilir!');
    } else {
      advanceTurn(1);
    }
  };

  // Human calls "UNO!"
  const handleCallUno = () => {
    sound.playClick();
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
    triggerBanner('🔥 "UNO!" DEDİNİZ!');
  };

  // Bot Turn Automation (AI plays with flying cards)
  useEffect(() => {
    if (gameState.isRoundOver) return;

    const botIdx = gameState.currentTurn;
    const bot = players[botIdx];
    if (!bot || !bot.isAI) return;

    botTurnTimerRef.current = window.setTimeout(() => {
      const topDiscard = gameState.discardPile[0];
      const botDecision = getBotUnoPlay(bot.hand, topDiscard, gameState.currentColor);

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
    }, 1100);

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

  const topDiscardCard = gameState.discardPile[0];
  const user = players[0];
  const isUserTurn = gameState.currentTurn === 0 && !gameState.isRoundOver;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-950 font-sans select-none p-2 sm:p-4">
      {/* Background Felt Pattern with Dynamic Color Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #fff 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        />
        <div
          className={`absolute inset-0 transition-colors duration-700 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${
            gameState.currentColor === 'red'
              ? 'from-red-600 via-transparent to-transparent'
              : gameState.currentColor === 'blue'
              ? 'from-blue-600 via-transparent to-transparent'
              : gameState.currentColor === 'green'
              ? 'from-emerald-600 via-transparent to-transparent'
              : 'from-amber-400 via-transparent to-transparent'
          }`}
        />
      </div>

      {/* Zero-Teleportation Flying Uno Card Layer */}
      <UnoCardAnimationLayer flyingCards={flyingCards} />

      {/* Header HUD */}
      <header className="relative z-20 flex items-center justify-between px-3 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onExitToMenu();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Menü</span>
          </button>
          <div className="flex items-center gap-2 px-2">
            <span className="text-base sm:text-lg font-black italic tracking-tighter text-amber-300 font-sans">
              UNO
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
              {isMultiplayer ? 'Online Çok Oyunculu' : 'Klasik 108 Kart'}
            </span>
          </div>
        </div>

        {/* Direction & Target Score */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 text-xs font-bold text-slate-300">
            {gameState.direction === 1 ? (
              <>
                <RotateCw className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
                <span>Saat Yönü</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-rose-400 animate-spin-slow" />
                <span>Ters Yön</span>
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
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Floating Action Banner */}
      {actionBanner && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="px-5 py-2.5 rounded-full bg-slate-900/95 border-2 border-amber-400 text-amber-200 text-xs sm:text-sm font-black shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{actionBanner}</span>
          </div>
        </div>
      )}

      {/* TOP & SIDE OPPONENTS AREA */}
      <div className="relative z-10 w-full flex items-center justify-around py-1">
        {players.slice(1).map((bot, idx) => {
          const actualPlayerIdx = idx + 1;
          const isTurn = gameState.currentTurn === actualPlayerIdx;
          return (
            <div
              key={bot.id}
              ref={el => {
                playerHandRefs.current[actualPlayerIdx] = el;
              }}
              className={`flex flex-col items-center transition-all ${
                isTurn ? 'scale-105' : 'opacity-85'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <AvatarBadge
                  avatarId={bot.avatarId}
                  customAvatarUrl={bot.customAvatarUrl}
                  size="sm"
                />
                <div className="flex flex-col">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      isTurn
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-900/80 text-slate-300 border-white/10'
                    }`}
                  >
                    {bot.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono text-center">
                    {bot.score} Puan
                  </span>
                </div>
              </div>

              {/* Opponent Hand (Stacked Card Backs) */}
              <div className="flex items-center -space-x-8 sm:-space-x-10 min-h-[70px]">
                {Array.from({ length: Math.min(bot.hand.length, 8) }).map((_, i) => (
                  <UnoCardBack key={i} size="sm" />
                ))}
              </div>
              <span className="text-[10px] font-black text-amber-400 bg-black/60 px-2 py-0.5 rounded-full border border-white/10 mt-0.5">
                {bot.hand.length} Kart
              </span>
            </div>
          );
        })}
      </div>

      {/* CENTER PLAY AREA: DRAW PILE & TOP DISCARD */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        {/* Active Color Aura Banner */}
        <div
          className={`mb-3 px-4 py-1.5 rounded-full text-xs font-black border flex items-center gap-2 uppercase tracking-wider ${
            COLOR_PILL_STYLES[gameState.currentColor]
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping" />
          <span>Aktif Renk: {COLOR_NAMES[gameState.currentColor]}</span>
        </div>

        {/* Deck & Discard Center Stacks */}
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {/* Çekme Destesi (Draw Pile) */}
          <div ref={deckRef} className="flex flex-col items-center">
            <button
              onClick={handleHumanDraw}
              disabled={!isUserTurn}
              className={`relative group transition-transform active:scale-95 ${
                isUserTurn
                  ? 'cursor-pointer hover:scale-105'
                  : 'cursor-not-allowed opacity-80'
              }`}
              title="Kart Çek"
            >
              <UnoCardBack size="md" />
              {isUserTurn && (
                <div className="absolute inset-0 rounded-xl ring-2 ring-amber-400/80 animate-pulse pointer-events-none" />
              )}
            </button>
            <span className="text-[10px] font-bold text-slate-300 mt-1.5 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/10">
              Deste: {gameState.deck.length}
            </span>
          </div>

          {/* Atılan Kart (Top Discard Pile) */}
          <div ref={discardRef} className="flex flex-col items-center">
            {topDiscardCard ? (
              <div className="relative transform rotate-3">
                <UnoCardView card={topDiscardCard} size="md" />
              </div>
            ) : (
              <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-xs text-white/30">
                Boş
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-300 mt-1.5 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/10">
              Son Atılan
            </span>
          </div>
        </div>
      </div>

      {/* HUMAN PLAYER HAND AREA & CONTROLS */}
      <div
        ref={el => {
          playerHandRefs.current[0] = el;
        }}
        className="relative z-20 flex flex-col items-center w-full max-w-4xl mx-auto pb-1"
      >
        {/* Turn Status & UNO Shout Button */}
        <div className="flex items-center justify-between w-full px-4 mb-2">
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
              <span className="text-[10px] text-slate-400 ml-2 font-mono">
                {user.score} Puan
              </span>
            </div>
          </div>

          {isUserTurn ? (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Senin Sıran — Kartını Seç veya Çek
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-400">
              {players[gameState.currentTurn]?.name || 'Rakip'} oynuyor...
            </span>
          )}

          {/* Big UNO Shout Button */}
          {user.hand.length <= 2 && (
            <button
              onClick={handleCallUno}
              className={`px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-black italic tracking-tighter uppercase transition-transform active:scale-95 cursor-pointer shadow-lg ${
                user.hasCalledUno
                  ? 'bg-emerald-600 text-white border-2 border-emerald-300'
                  : 'bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white border-2 border-white animate-bounce shadow-[0_0_20px_rgba(239,68,68,0.7)]'
              }`}
            >
              {user.hasCalledUno ? '✅ UNO DEDİN!' : '🔥 UNO DE!'}
            </button>
          )}
        </div>

        {/* Human Hand Cards Fan with Zero-Teleportation Flight Support */}
        <div className="flex items-center justify-center -space-x-6 sm:-space-x-8 px-2 py-2 overflow-x-auto max-w-full no-scrollbar">
          {user.hand.map((card, idx) => {
            const isPlayable =
              isUserTurn && canPlayUnoCard(card, topDiscardCard, gameState.currentColor);
            const tilt = (idx - (user.hand.length - 1) / 2) * 3;
            const isHidden = hiddenCardIds.has(card.id);

            return (
              <div
                key={card.id}
                style={{
                  transform: `rotate(${tilt}deg)`,
                  opacity: isHidden ? 0 : 1
                }}
                className="transition-transform duration-150"
              >
                <UnoCardView
                  card={card}
                  isPlayable={isPlayable && !isHidden}
                  size="md"
                  onClick={e => handleHumanCardClick(card, e)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* WILD COLOR PICKER MODAL (Pops up when playing Wild or Wild +4) */}
      {wildPickerCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center max-w-sm w-full">
            <h3 className="text-base sm:text-lg font-black text-white font-cyber mb-1">
              JOKER RENK SEÇİMİ
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Oyuna devam edilecek rengi belirleyin:
            </p>

            <div className="grid grid-cols-2 gap-3">
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
                  className={`py-3.5 rounded-2xl text-sm font-black text-white shadow-lg transition-transform active:scale-95 cursor-pointer border-2 ${
                    color === 'red'
                      ? 'bg-red-600 hover:bg-red-500 border-red-300'
                      : color === 'blue'
                      ? 'bg-blue-600 hover:bg-blue-500 border-blue-300'
                      : color === 'green'
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-200'
                  }`}
                >
                  {COLOR_NAMES[color]}
                </button>
              ))}
            </div>
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
                  className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-slate-900/60"
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
