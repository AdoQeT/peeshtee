import { logger } from '../utils/logger';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  GameSettings,
  GameSetupConfig,
  Player,
  SlamEvent,
  ShuffleStyle,
  PistiPair,
  OnTableCountState
} from '../types/game';
import { createDeck, shuffleDeck, dealInitialGame } from '../core/deck';
import { evaluatePlay, calculateRoundBreakdown } from '../core/rules';
import { chooseAICard, getBotContextualReaction } from '../core/ai/bot';
import { getLanguage, getRandomBotNames } from '../utils/i18n';
import { sound } from '../core/audio/soundEngine';
import { particleEngine } from '../core/particles/particleEngine';
import { multiplayerManager, LobbyPlayerSlot } from '../features/multiplayer/peerManager';
import { friendNetwork } from '../features/friends/friendNetwork';
import type { TableDomRefs, SlotReadinessInfo } from '../components/TableSurface';
import { MatchIntroPlayer } from '../components/MatchIntroOverlay';
import { UserProfile, getUserProfile, getAvatarPreset, recordMatchStats } from '../features/profile/profileManager';
import { useCardFlightState, getCenter, cardDomElements } from './useCardFlightState';
import { FlyingCardData } from '../components/CardAnimationLayer';
import { RoundScoresState } from './useMultiplayerRoom';
import confetti from 'canvas-confetti';

export const SHUFFLE_STYLES: ShuffleStyle[] = [
  'riffle_bridge',
  'triple_cut',
  'table_wash',
  'farot_wave'
];

export const getShuffleDuration = (_style: ShuffleStyle): number => {
  return 2200;
};

export function orientHandsForPerspective(
  hands: Card[][],
  mySeatIdx: number = 0
): Card[][] {
  const count = hands.length;
  if (count <= 1) return hands;
  const rotated: Card[][] = [];
  for (let j = 0; j < count; j++) {
    const originalIdx = (j + mySeatIdx) % count;
    rotated.push(
      hands[originalIdx].map(c => ({
        ...c,
        faceUp: j === 0
      }))
    );
  }
  return rotated;
}

export interface DeckCutState {
  isActive: boolean;
  cutterSeat: number;
  cutterName: string;
  isHumanCutter: boolean;
  step: 'waiting_cut' | 'splitting' | 'dealing_pot' | 'merging' | 'stowing';
  cutIndex?: number;
  pileACount: number;
  pileBCount: number;
  revealedJackCards?: Card[];
}

export interface PendingDealContext {
  seedDeck: Card[];
  configuredSettings: GameSettings;
  isMp: boolean;
  mySeat: number;
  startingTurn: number;
}

export interface UsePistiGameProps {
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  settingsRef: React.MutableRefObject<GameSettings>;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  screen: 'menu' | 'game' | 'uno';
  setScreen: (screen: 'menu' | 'game' | 'uno') => void;
  playersRef: React.MutableRefObject<Player[]>;
  // Multiplayer session link
  isMultiplayerGame: boolean;
  isMultiplayerGameRef: React.MutableRefObject<boolean>;
  isMultiplayerHost: boolean;
  isMultiplayerHostRef: React.MutableRefObject<boolean>;
  myMultiplayerSeat: number;
  myMultiplayerSeatRef: React.MutableRefObject<number>;
  activeMultiplayerSlots: LobbyPlayerSlot[];
  activeMultiplayerSlotsRef: React.MutableRefObject<LobbyPlayerSlot[]>;
  readySeatsForNextRound: Set<number>;
  setReadySeatsForNextRound: React.Dispatch<React.SetStateAction<Set<number>>>;
  setIsMultiplayerGame: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMultiplayerHost: React.Dispatch<React.SetStateAction<boolean>>;
  setMyMultiplayerSeat: React.Dispatch<React.SetStateAction<number>>;
  setActiveMultiplayerSlots: React.Dispatch<React.SetStateAction<LobbyPlayerSlot[]>>;
  setIsMultiplayerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setChatMessages: React.Dispatch<React.SetStateAction<any[]>>;
  resetMultiplayerState: () => void;
  // Visual / Overlay hooks
  setIsSetupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  runWithIntro: (
    info: { players: MatchIntroPlayer[]; label: string; gameType?: 'pisti' | 'uno' },
    start: () => void
  ) => void;
  showDevToast: (msg: string) => void;
  onBotReaction?: (playerIdx: number, emoji: string, text?: string) => void;
}

export function usePistiGame({
  settings,
  setSettings,
  settingsRef,
  userProfile,
  setUserProfile,
  screen,
  setScreen,
  playersRef,
  isMultiplayerGame,
  isMultiplayerGameRef,
  isMultiplayerHost,
  isMultiplayerHostRef,
  myMultiplayerSeat,
  myMultiplayerSeatRef,
  activeMultiplayerSlots,
  activeMultiplayerSlotsRef,
  readySeatsForNextRound,
  setReadySeatsForNextRound,
  setIsMultiplayerGame,
  setIsMultiplayerHost,
  setMyMultiplayerSeat,
  setActiveMultiplayerSlots,
  setIsMultiplayerOpen,
  setChatMessages,
  resetMultiplayerState,
  setIsSetupOpen,
  runWithIntro,
  showDevToast,
  onBotReaction
}: UsePistiGameProps) {
  // Animation & Zero-Teleportation States
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleStyle, setShuffleStyle] = useState<ShuffleStyle>('riffle_bridge');
  const [isDealingAnimation, setIsDealingAnimation] = useState(false);
  const isDealingAnimationRef = useRef(false);
  isDealingAnimationRef.current = isDealingAnimation;

  const [isActionLocked, setIsActionLocked] = useState(false);
  const isActionLockedRef = useRef(false);
  isActionLockedRef.current = isActionLocked;

  const isShufflingRef = useRef(false);
  isShufflingRef.current = isShuffling;

  const [isShaking, setIsShaking] = useState(false);
  const [deckCutState, setDeckCutState] = useState<DeckCutState | null>(null);
  const [pendingDealContext, setPendingDealContext] = useState<PendingDealContext | null>(null);
  const pendingDealContextRef = useRef<PendingDealContext | null>(null);

  // Turn Timer (Used strictly in multiplayer mode)
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number>(15);

  // Setup Players based on count & difficulty
  const createInitialPlayers = useCallback(
    (
      count: 2 | 4,
      difficulty: string,
      localName: string = 'Oyuncu (Sen)',
      localAvatar: string = '😎',
      customOpponentName?: string,
      customOpponentAvatar?: string,
      mpSlots?: LobbyPlayerSlot[],
      mySeatIdx: number = 0
    ): Player[] => {
      const curProfile = getUserProfile();

      if (mpSlots && mpSlots.length >= count) {
        const playersList: Player[] = [];
        for (let j = 0; j < count; j++) {
          const originalSeat = (j + mySeatIdx) % count;
          const slot = mpSlots[originalSeat];
          const isMe = j === 0;
          playersList.push({
            id: isMe ? 'user' : `player-${originalSeat}`,
            name: isMe ? `${slot.name} (Sen)` : slot.name,
            isAI: Boolean(slot.isAI),
            avatar: slot.avatar,
            avatarId: isMe ? curProfile.avatarId : slot.avatarId || 'wolf',
            customAvatarUrl: isMe ? curProfile.customAvatarDataUrl : slot.customAvatarUrl,
            customTitle: isMe
              ? (curProfile.customTitle || getAvatarPreset(curProfile.avatarId || 'wolf').title)
              : (slot.customTitle || getAvatarPreset(slot.avatarId || 'wolf').title),
            hand: [],
            collectedCards: [],
            pistiPairs: [],
            pistiCount: 0,
            doublePistiCount: 0,
            bonusPoints: 0,
            score: 0,
            roundScore: 0,
            level: 1
          });
        }
        return playersList;
      }

      const botNames = getRandomBotNames(3, getLanguage());
      const p1Name = customOpponentName
        ? customOpponentName
        : botNames[0] || 'Alex';

      const bot1Personality =
        difficulty === 'hard'
          ? 'tactician'
          : difficulty === 'easy'
          ? 'aggressive'
          : 'balanced';

      const basePlayers: Player[] = [
        {
          id: 'user',
          name: curProfile.name || localName,
          isAI: false,
          avatar: localAvatar,
          avatarId: curProfile.avatarId || 'wolf',
          customAvatarUrl: curProfile.customAvatarDataUrl,
          customTitle: curProfile.customTitle || getAvatarPreset(curProfile.avatarId || 'wolf').title,
          hand: [],
          collectedCards: [],
          pistiPairs: [],
          pistiCount: 0,
          doublePistiCount: 0,
          score: 0,
          roundScore: 0,
          level: 1
        },
        {
          id: 'bot-1',
          name: p1Name,
          isAI: !customOpponentName,
          personality: bot1Personality,
          avatar: customOpponentAvatar || '🤖',
          avatarId: 'lion',
          customTitle:
            bot1Personality === 'tactician'
              ? '🧠 Tactician'
              : bot1Personality === 'aggressive'
              ? '🔥 Aggressive'
              : '🃏 Balanced',
          hand: [],
          collectedCards: [],
          pistiPairs: [],
          pistiCount: 0,
          doublePistiCount: 0,
          score: 0,
          roundScore: 0,
          level: 1
        }
      ];

      if (count === 4) {
        basePlayers.push(
          {
            id: 'bot-2',
            name: botNames[1] || 'Leo',
            isAI: true,
            personality: 'aggressive',
            avatar: '👴',
            avatarId: 'dayi',
            customTitle: '🔥 Aggressive',
            hand: [],
            collectedCards: [],
            pistiPairs: [],
            pistiCount: 0,
            doublePistiCount: 0,
            bonusPoints: 0,
            score: 0,
            roundScore: 0,
            level: 1
          },
          {
            id: 'bot-3',
            name: botNames[2] || 'Max',
            isAI: true,
            personality: 'tactician',
            avatar: '🧔',
            avatarId: 'muhtar',
            customTitle: '🧠 Tactician',
            hand: [],
            collectedCards: [],
            pistiPairs: [],
            pistiCount: 0,
            doublePistiCount: 0,
            bonusPoints: 0,
            score: 0,
            roundScore: 0,
            level: 1
          }
        );
      }

      return basePlayers;
    },
    []
  );

  // On-Table Live Card Counting Ceremony State
  const [onTableCount, setOnTableCount] = useState<OnTableCountState>({
    isActive: false,
    userCountedIndex: 0,
    oppCountedIndex: 0,
    userTotal: 0,
    oppTotal: 0,
    userPointCards: [],
    oppPointCards: [],
    userCardPoints: 0,
    oppCardPoints: 0,
    userPistiPoints: 0,
    oppPistiPoints: 0,
    userMajority: false,
    oppMajority: false,
    isDone: false,
    isFast: false
  });

  // Refs for DOM elements on table
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const countTimerRef = useRef<number | null>(null);
  const tableRefs = useRef<TableDomRefs>({
    deckEl: null,
    potEl: null,
    handEls: [null, null, null, null],
    collectedEls: [null, null, null, null],
    pistiEls: [null, null, null, null]
  });

  // Game Core State
  const [deck, setDeck] = useState<Card[]>([]);
  const [tableCards, setTableCards] = useState<Card[]>([]);
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'user',
      name: 'Oyuncu (Sen)',
      isAI: false,
      avatar: '😎',
      avatarId: 'wolf',
      hand: [],
      collectedCards: [],
      pistiPairs: [],
      pistiCount: 0,
      doublePistiCount: 0,
      score: 0,
      roundScore: 0,
      level: 1
    },
    {
      id: 'bot-1',
      name: 'Kurnaz Bot',
      isAI: true,
      avatar: '🤖',
      avatarId: 'lion',
      hand: [],
      collectedCards: [],
      pistiPairs: [],
      pistiCount: 0,
      doublePistiCount: 0,
      score: 0,
      roundScore: 0,
      level: 1
    }
  ]);

  // Live state refs
  const tableCardsRef = useRef<Card[]>(tableCards);
  tableCardsRef.current = tableCards;
  playersRef.current = players;
  const dealTimersRef = useRef<number[]>([]);

  const {
    flyingCards,
    setFlyingCards,
    hiddenCardIds,
    setHiddenCardIds,
    recentCapture,
    setRecentCapture,
    getHandCardFallbackTarget,
    clearFlights,
    animateSweepToCollector
  } = useCardFlightState(tableRefs, playersRef, dealTimersRef, setTableCards);

  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const currentTurnRef = useRef<number>(currentTurn);
  currentTurnRef.current = currentTurn;
  const [round, setRound] = useState<number>(1);
  const [dealerIndex, setDealerIndex] = useState<number>(1);
  const [lastCollectorIndex, setLastCollectorIndex] = useState<number | null>(null);
  const [activeSlam, setActiveSlam] = useState<SlamEvent | null>(null);
  const [seenCards, setSeenCards] = useState<Card[]>([]);

  // Round summary breakdowns
  const [roundScores, setRoundScores] = useState<RoundScoresState | null>(null);

  // Card counting overlay card lists (produced alongside onTableCount)
  const [countingUserCards, setCountingUserCards] = useState<Card[]>([]);
  const [countingOppCards, setCountingOppCards] = useState<Card[]>([]);

  const clearScheduledTimers = useCallback(() => {
    dealTimersRef.current.forEach(id => window.clearTimeout(id));
    dealTimersRef.current = [];
    if (countTimerRef.current) {
      window.clearInterval(countTimerRef.current);
      countTimerRef.current = null;
    }
  }, []);

  const triggerShake = useCallback(() => {
    if (!settingsRef.current.screenShake) return;
    setIsShaking(true);
    window.setTimeout(() => setIsShaking(false), 500);
  }, [settingsRef]);

  /**
   * Run synchronized card flight dealing choreography
   */
  const runDealChoreography = useCallback(
    (
      tableToDeal: Card[],
      handsToDeal: Card[][],
      finalRemainingDeck: Card[],
      totalPlayers: number,
      firstPlayerIdx: number = 0,
      keepCurrentTurn: boolean = false
    ) => {
      clearScheduledTimers();
      setIsDealingAnimation(true);
      setIsActionLocked(true);

      const speedMode = settingsRef.current.dealSpeed || 'normal';
      const speedFactor = speedMode === 'fast' ? 0.65 : speedMode === 'cinematic' ? 1.4 : 1.0;

      // Prepare deterministic pot offsets for initial 4 table cards
      const preparedTableCards: Card[] = tableToDeal.map((rawCard, idx) => ({
        ...rawCard,
        tableOffsetX: (idx - 1.5) * 6,
        tableOffsetY: (idx - 1.5) * 4,
        tableRotation: (idx - 1.5) * 6
      }));

      // Collect all card IDs that will be dealt in this batch and hide them in DOM slots initially
      const idsToHide = new Set<string>();
      preparedTableCards.forEach(c => idsToHide.add(c.id));
      handsToDeal.forEach(h => h.forEach(c => idsToHide.add(c.id)));

      setHiddenCardIds(idsToHide);
      if (preparedTableCards.length > 0) {
        setTableCards(preparedTableCards);
      }
      setPlayers(prev =>
        prev.map((p, idx) => ({
          ...p,
          hand: handsToDeal[idx] ? [...handsToDeal[idx]] : p.hand
        }))
      );

      interface DealStep {
        kind: 'table' | 'hand';
        card: Card;
        playerIdx?: number;
        cardIdxInHand?: number;
        delay: number;
        pitch: number;
        isLastOfBatch?: boolean;
      }

      const steps: DealStep[] = [];
      let currentDelay = Math.round(70 * speedFactor);
      const cardStepInterval = Math.round((totalPlayers === 4 ? 60 : 70) * speedFactor);
      const playerPauseInterval = Math.round(220 * speedFactor);

      // 1. Initial 4 table cards (first 3 face-down, 4th face-up flip)
      preparedTableCards.forEach((cardWithOffset, cIdx) => {
        steps.push({
          kind: 'table',
          card: cardWithOffset,
          delay: currentDelay,
          pitch: 0.95 + cIdx * 0.04
        });
        currentDelay += cardStepInterval;
      });

      if (preparedTableCards.length > 0) {
        currentDelay += playerPauseInterval;
      }

      // 2. Player hands dealt sequentially in 4-card packets round-robin
      for (let offset = 0; offset < totalPlayers; offset++) {
        const pIdx = (firstPlayerIdx + offset) % totalPlayers;
        const playerHand = handsToDeal[pIdx] || [];
        playerHand.forEach((c, cIdx) => {
          const isLast = cIdx === playerHand.length - 1;
          steps.push({
            kind: 'hand',
            card: c,
            playerIdx: pIdx,
            cardIdxInHand: cIdx,
            delay: currentDelay,
            pitch: 1.0 + cIdx * 0.05,
            isLastOfBatch: isLast
          });
          currentDelay += cardStepInterval;
        });
        currentDelay += playerPauseInterval;
      }

      const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
      const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
      const deckPos = getCenter(tableRefs.current.deckEl, centerX, centerY);
      const potPos = getCenter(tableRefs.current.potEl, centerX, centerY);

      const totalSteps = steps.length;
      let completedCount = 0;

      const finishAllDealing = () => {
        setFlyingCards([]);
        setHiddenCardIds(new Set());
        setDeck(finalRemainingDeck);
        if (!keepCurrentTurn) {
          setCurrentTurn(firstPlayerIdx);
        }
        setTurnTimeRemaining(15);
        setIsDealingAnimation(false);
        setIsActionLocked(false);
      };

      if (totalSteps === 0) {
        finishAllDealing();
        return;
      }

      steps.forEach((step, sIdx) => {
        const timerId = window.setTimeout(() => {
          sound.playCardDeal(step.pitch);
          setDeck(prev => (prev.length > 0 ? prev.slice(0, -1) : prev));

          if (step.kind === 'table') {
            const isFourthCard = sIdx === 3;
            const flyId = `fly-table-deal-${step.card.id}-${Date.now()}`;
            const targetX = potPos.x + (step.card.tableOffsetX || 0);
            const targetY = potPos.y + (step.card.tableOffsetY || 0);
            const targetRot = step.card.tableRotation || 0;

            const flyItem: FlyingCardData = {
              id: flyId,
              card: step.card,
              startX: deckPos.x,
              startY: deckPos.y,
              targetX,
              targetY,
              startRotation: 0,
              targetRotation: targetRot,
              startFaceUp: false,
              endFaceUp: isFourthCard,
              startScale: 1,
              targetScale: 1,
              duration: Math.round(360 * speedFactor),
              arcHeight: 50,
              size: 'md',
              zIndex: 50 + sIdx,
              onComplete: () => {
                setHiddenCardIds(prev => {
                  const next = new Set(prev);
                  next.delete(step.card.id);
                  return next;
                });
                setFlyingCards(prev => prev.filter(f => f.id !== flyId));

                if (isFourthCard) {
                  sound.playCardPlay();
                }

                completedCount++;
                if (completedCount >= totalSteps) {
                  finishAllDealing();
                }
              }
            };

            setFlyingCards(prev => [...prev, flyItem]);
          } else if (step.kind === 'hand' && step.playerIdx !== undefined) {
            const pIdx = step.playerIdx;
            const isHuman = pIdx === 0;
            const fallback = getHandCardFallbackTarget(pIdx, step.cardIdxInHand || 0, totalPlayers);

            let targetX = fallback.x;
            let targetY = fallback.y;

            const cardEl = cardDomElements.get(step.card.id);
            if (cardEl) {
              const rect = cardEl.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                targetX = rect.left + rect.width / 2;
                targetY = rect.top + rect.height / 2;
              }
            }

            const flyId = `fly-hand-deal-${step.card.id}-${Date.now()}`;
            const arc = isHuman ? 75 : 45;

            const flyItem: FlyingCardData = {
              id: flyId,
              card: step.card,
              startX: deckPos.x,
              startY: deckPos.y,
              targetX,
              targetY,
              startRotation: 0,
              targetRotation: fallback.rotation,
              startFaceUp: false,
              endFaceUp: isHuman,
              startScale: 1,
              targetScale: 1,
              duration: Math.round(380 * speedFactor),
              arcHeight: arc,
              size: fallback.size,
              zIndex: 60 + sIdx,
              onComplete: () => {
                setHiddenCardIds(prev => {
                  const next = new Set(prev);
                  next.delete(step.card.id);
                  return next;
                });
                setFlyingCards(prev => prev.filter(f => f.id !== flyId));

                if (step.isLastOfBatch) {
                  sound.playCardFan();
                }

                completedCount++;
                if (completedCount >= totalSteps) {
                  finishAllDealing();
                }
              }
            };

            setFlyingCards(prev => [...prev, flyItem]);
          }
        }, step.delay);

        dealTimersRef.current.push(timerId);
      });

      // Master safety timer so deals can never get stuck
      const masterFinishTimer = window.setTimeout(() => {
        finishAllDealing();
      }, currentDelay + Math.round(500 * speedFactor));
      dealTimersRef.current.push(masterFinishTimer);
    },
    [clearScheduledTimers, getHandCardFallbackTarget, settingsRef, setHiddenCardIds, setFlyingCards]
  );

  /**
   * Launch a Singleplayer or Synchronized Multiplayer Match
   */
  const startMatchWithDeck = useCallback(
    (
      configuredSettings: GameSettings,
      seedDeck: Card[],
      chosenShuffle: ShuffleStyle,
      mpOptions?: {
        isMultiplayer: boolean;
        isHost: boolean;
        mySeatIndex: number;
        slots: LobbyPlayerSlot[];
      }
    ) => {
      clearScheduledTimers();
      setSettings(configuredSettings);
      setIsSetupOpen(false);
      setIsMultiplayerOpen(false);

      const isMp = Boolean(mpOptions?.isMultiplayer);
      const isHost = mpOptions ? mpOptions.isHost : true;
      const mySeat = mpOptions ? mpOptions.mySeatIndex : 0;
      setMyMultiplayerSeat(mySeat);
      myMultiplayerSeatRef.current = mySeat;
      if (mpOptions?.slots) {
        setActiveMultiplayerSlots(mpOptions.slots);
        activeMultiplayerSlotsRef.current = mpOptions.slots;
      }

      setIsMultiplayerGame(isMp);
      setIsMultiplayerHost(isHost);
      setScreen('game');
      setShuffleStyle(chosenShuffle);
      setChatMessages([]);

      const newPlayers = createInitialPlayers(
        configuredSettings.playerCount as 2 | 4,
        configuredSettings.aiDifficulty,
        'Oyuncu (Sen)',
        '😎',
        undefined,
        undefined,
        mpOptions?.slots,
        mySeat
      );

      setPlayers(newPlayers);
      setTableCards([]);
      setDeck(seedDeck);
      setFlyingCards([]);
      setHiddenCardIds(new Set());
      setRecentCapture(null);
      setRound(1);
      // In Multiplayer: Seat 0 always starts first in Round 1
      const startingTurn = isMp
        ? (0 - mySeat + configuredSettings.playerCount) % configuredSettings.playerCount
        : 0;
      setCurrentTurn(startingTurn);
      setDealerIndex(configuredSettings.playerCount - 1);
      setLastCollectorIndex(null);
      setActiveSlam(null);
      setRoundScores(null);
      setOnTableCount({
        isActive: false,
        userCountedIndex: 0,
        oppCountedIndex: 0,
        userTotal: 0,
        oppTotal: 0,
        userPointCards: [],
        oppPointCards: [],
        userCardPoints: 0,
        oppCardPoints: 0,
        userPistiPoints: 0,
        oppPistiPoints: 0,
        userMajority: false,
        oppMajority: false,
        isDone: false,
        isFast: false
      });
      setTurnTimeRemaining(15);

      setIsShuffling(true);
      setIsActionLocked(true);
      if (chosenShuffle === 'table_wash') {
        sound.playWashScramble();
      } else if (chosenShuffle === 'triple_cut') {
        sound.playTripleCut();
      } else {
        sound.playRiffleShuffle();
      }

      const shuffleDuration = getShuffleDuration(chosenShuffle);
      const timer = window.setTimeout(() => {
        setIsShuffling(false);
        const ctx: PendingDealContext = {
          seedDeck,
          configuredSettings,
          isMp: Boolean(isMp),
          mySeat,
          startingTurn
        };
        pendingDealContextRef.current = ctx;
        setPendingDealContext(ctx);

        const isHuman = isMp ? (startingTurn === 0) : true;
        const cutterSeatIdx = startingTurn;
        const cName = newPlayers[cutterSeatIdx]?.name || 'Oyuncu';
        sound.playWashScramble();

        setDeckCutState({
          isActive: true,
          cutterSeat: cutterSeatIdx,
          cutterName: cName,
          isHumanCutter: isHuman,
          step: 'waiting_cut',
          cutIndex: 26,
          pileACount: 26,
          pileBCount: 26,
          revealedJackCards: []
        });

        const isAiSlot = isMp ? (activeMultiplayerSlotsRef.current?.[cutterSeatIdx]?.isAI || false) : !isHuman;
        const shouldAutoCut = (!isMp && !isHuman) || (isMp && multiplayerManager.isHost && isAiSlot);
        if (shouldAutoCut) {
          const botTimer = window.setTimeout(() => {
            const botCut = Math.floor(16 + Math.random() * 20);
            handleCutDeckAndProceed(botCut);
          }, 1200);
          dealTimersRef.current.push(botTimer);
        }
      }, shuffleDuration);

      dealTimersRef.current.push(timer);
    },
    [
      clearScheduledTimers,
      createInitialPlayers,
      setSettings,
      setIsSetupOpen,
      setIsMultiplayerOpen,
      setMyMultiplayerSeat,
      myMultiplayerSeatRef,
      setActiveMultiplayerSlots,
      activeMultiplayerSlotsRef,
      setIsMultiplayerGame,
      setIsMultiplayerHost,
      setScreen,
      setChatMessages,
      setFlyingCards,
      setHiddenCardIds,
      setRecentCapture
    ]
  );

  const handleCutDeckAndProceed = useCallback(
    (cutIndex: number) => {
      const activeCtx = pendingDealContextRef.current || pendingDealContext;
      if (!activeCtx) return;
      const { seedDeck, configuredSettings, isMp, mySeat, startingTurn } = activeCtx;

      // Slices and cuts the deck at the chosen position!
      const validIndex = Math.max(8, Math.min(cutIndex, seedDeck.length - 8));
      const cutDeck = [...seedDeck.slice(validIndex), ...seedDeck.slice(0, validIndex)];

      // In Multiplayer: If local cutter clicked or host acting for AI, broadcast MP_DECK_CUT to peers!
      if (isMp && multiplayerManager.isConnected && (deckCutState?.isHumanCutter || multiplayerManager.isHost)) {
        multiplayerManager.send({
          type: 'MP_DECK_CUT',
          cutIndex: validIndex,
          cutterSeat: mySeat,
          senderPeerId: multiplayerManager.instanceId
        });
      }

      // Step 1: Splitting animation on the felt
      sound.playTripleCut();
      setDeckCutState(prev =>
        prev
          ? {
              ...prev,
              step: 'splitting',
              cutIndex: validIndex,
              pileACount: validIndex,
              pileBCount: seedDeck.length - validIndex
            }
          : null
      );

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      const pileOffsetX = isMobile ? 105 : 140;
      const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
      const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
      const pileAPos = {
        x: centerX - pileOffsetX,
        y: centerY
      };

      // Step 2: Dealing pot cards from Pile A into Pot (starts after 650ms split animation)
      const timerPot = window.setTimeout(() => {
        setDeckCutState(prev => (prev ? { ...prev, step: 'dealing_pot' } : null));

        const N = configuredSettings.playerCount;
        const absStartingTurn = isMp ? (startingTurn + mySeat) % N : startingTurn;
        const initialDeal = dealInitialGame(
          cutDeck,
          configuredSettings.playerCount,
          true,
          absStartingTurn
        );
        const orientedHands = orientHandsForPerspective(
          initialDeal.playerHands,
          isMp ? mySeat : 0
        );

        setSeenCards([
          ...initialDeal.tableCards.filter(c => c.faceUp),
          ...orientedHands[0]
        ]);

        const potPos = getCenter(tableRefs.current.potEl, centerX, centerY);

        // Prepare table card offsets
        const preparedTableCards: Card[] = initialDeal.tableCards.map((rawCard, idx) => ({
          ...rawCard,
          tableOffsetX: (idx - 1.5) * 6,
          tableOffsetY: (idx - 1.5) * 4,
          tableRotation: (idx - 1.5) * 6
        }));

        interface PotStep {
          card: Card;
          faceUp: boolean;
          isJackAward?: boolean;
          delay: number;
        }

        const potSteps: PotStep[] = [];
        let currentDelay = 40;

        // 3 face-down cards to pot
        for (let i = 0; i < 3; i++) {
          potSteps.push({
            card: preparedTableCards[i],
            faceUp: false,
            delay: currentDelay
          });
          currentDelay += 220;
        }

        // Awarded Jacks (if any, "Vale Kesene Yarar")
        const jacks = initialDeal.jacksAwardedToCutter || [];
        jacks.forEach(jackCard => {
          potSteps.push({
            card: jackCard,
            faceUp: true,
            isJackAward: true,
            delay: currentDelay
          });
          currentDelay += 850;
        });

        // 4th top face-up card to pot
        potSteps.push({
          card: preparedTableCards[3],
          faceUp: true,
          delay: currentDelay
        });
        currentDelay += 500;

        // Execute pot deal flights
        potSteps.forEach((pStep, sIdx) => {
          const tFlight = window.setTimeout(() => {
            sound.playCardDeal();
            setDeck(prev => (prev.length > 0 ? prev.slice(0, -1) : prev));

            if (pStep.isJackAward) {
              const flyToPotId = `pot-jack-${sIdx}-${Date.now()}`;
              setFlyingCards(prev => [
                ...prev,
                {
                  id: flyToPotId,
                  card: pStep.card,
                  startX: pileAPos.x,
                  startY: pileAPos.y,
                  targetX: potPos.x,
                  targetY: potPos.y,
                  startRotation: 0,
                  targetRotation: 0,
                  startFaceUp: false,
                  endFaceUp: true,
                  duration: 400,
                  arcHeight: 50,
                  size: 'md',
                  zIndex: 70 + sIdx,
                  onComplete: () => {
                    setFlyingCards(prev => prev.filter(f => f.id !== flyToPotId));
                    sound.playJackSweep();
                    const cutterName = playersRef.current[startingTurn]?.name || 'Kesen Oyuncu';
                    showDevToast(
                      `✂️ VALE KESENE YARAR! Masadaki Vale (${pStep.card.suit === 'hearts' || pStep.card.suit === 'diamonds' ? 'Kırmızı' : 'Siyah'} J) ${cutterName}'e verildi!`
                    );

                    const cutterEl =
                      tableRefs.current.collectedEls[startingTurn] ||
                      tableRefs.current.handEls[startingTurn];
                    let cutterPos = { x: centerX, y: window.innerHeight - 80 };
                    if (cutterEl) {
                      const r = cutterEl.getBoundingClientRect();
                      if (r.width > 0 && r.height > 0) {
                        cutterPos = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                      }
                    } else if (startingTurn !== 0) {
                      cutterPos = { x: centerX, y: 80 };
                    }

                    const flyToCutterId = `jack-sweep-${Date.now()}`;
                    setFlyingCards(prev => [
                      ...prev,
                      {
                        id: flyToCutterId,
                        card: pStep.card,
                        startX: potPos.x,
                        startY: potPos.y,
                        targetX: cutterPos.x,
                        targetY: cutterPos.y,
                        startRotation: 0,
                        targetRotation: 360,
                        startFaceUp: true,
                        endFaceUp: true,
                        duration: 700,
                        arcHeight: 130,
                        motionType: 'jack',
                        size: 'md',
                        zIndex: 90,
                        onComplete: () => {
                          setFlyingCards(prev => prev.filter(f => f.id !== flyToCutterId));
                          setPlayers(prev =>
                            prev.map((p, idx) => {
                              if (idx === startingTurn) {
                                return {
                                  ...p,
                                  collectedCards: [...p.collectedCards, pStep.card],
                                  bonusPoints: (p.bonusPoints || 0) + 1
                                };
                              }
                              return p;
                            })
                          );
                        }
                      }
                    ]);
                  }
                }
              ]);
            } else {
              const flyId = `pot-card-${sIdx}-${Date.now()}`;
              setFlyingCards(prev => [
                ...prev,
                {
                  id: flyId,
                  card: pStep.card,
                  startX: pileAPos.x,
                  startY: pileAPos.y,
                  targetX: potPos.x + (pStep.card.tableOffsetX ?? 0),
                  targetY: potPos.y + (pStep.card.tableOffsetY ?? 0),
                  startRotation: 0,
                  targetRotation: pStep.card.tableRotation ?? 0,
                  startFaceUp: false,
                  endFaceUp: pStep.faceUp,
                  duration: 420,
                  arcHeight: 55,
                  size: 'md',
                  zIndex: 70 + sIdx,
                  onComplete: () => {
                    setFlyingCards(prev => prev.filter(f => f.id !== flyId));
                    setTableCards(prev => [...prev, pStep.card]);
                  }
                }
              ]);
            }
          }, pStep.delay);
          dealTimersRef.current.push(tFlight);
        });

        // Merging remaining cut portions back into main deck
        const timerMerge = window.setTimeout(() => {
          sound.playSweepGather();
          setDeckCutState(prev => (prev ? { ...prev, step: 'merging' } : null));

          const timerStow = window.setTimeout(() => {
            sound.playTripleCut();
            setDeckCutState(prev => (prev ? { ...prev, step: 'stowing' } : null));

            const timerComplete = window.setTimeout(() => {
              setDeckCutState(null);
              pendingDealContextRef.current = null;
              setPendingDealContext(null);

              runDealChoreography(
                [],
                orientedHands,
                initialDeal.remainingDeck,
                configuredSettings.playerCount,
                startingTurn
              );
            }, 550);
            dealTimersRef.current.push(timerComplete);
          }, 600);
          dealTimersRef.current.push(timerStow);
        }, currentDelay + 400);

        dealTimersRef.current.push(timerMerge);
      }, 650);

      dealTimersRef.current.push(timerPot);
    },
    [pendingDealContext, deckCutState, runDealChoreography, showDevToast, setFlyingCards]
  );

  // Standard Singleplayer Start
  const handleStartGame = useCallback(
    (configuredSettings: GameSettings) => {
      const randomStyle = SHUFFLE_STYLES[Math.floor(Math.random() * SHUFFLE_STYLES.length)];
      const freshDeck = shuffleDeck(createDeck());

      const is4Player = configuredSettings.playerCount === 4;
      const playersList: MatchIntroPlayer[] = [];
      const introBotNames = getRandomBotNames(3, getLanguage());

      if (is4Player) {
        playersList.push({
          name: userProfile.name,
          avatar: userProfile.avatarId || '🦁',
          avatarId: userProfile.avatarId,
          customAvatarUrl: userProfile.customAvatarDataUrl,
          isMe: true,
          team: 0
        });
        playersList.push({
          name: introBotNames[1] || 'Leo',
          avatar: '🤖',
          avatarId: 'wolf',
          isMe: false,
          team: 0
        });
        playersList.push({
          name: introBotNames[0] || 'Alex',
          avatar: '🤖',
          avatarId: 'lion',
          isMe: false,
          team: 1
        });
        playersList.push({
          name: introBotNames[2] || 'Max',
          avatar: '🤖',
          avatarId: 'eagle',
          isMe: false,
          team: 1
        });
      } else {
        playersList.push({
          name: userProfile.name,
          avatar: userProfile.avatarId || '🦁',
          avatarId: userProfile.avatarId,
          customAvatarUrl: userProfile.customAvatarDataUrl,
          isMe: true,
          team: 0
        });
        playersList.push({
          name: introBotNames[0] || 'Alex',
          avatar: '🤖',
          avatarId: 'wolf',
          isMe: false,
          team: 1
        });
      }

      runWithIntro(
        {
          players: playersList,
          label: 'Tek Kişilik Maç',
          gameType: 'pisti'
        },
        () => {
          startMatchWithDeck(configuredSettings, freshDeck, randomStyle);
        }
      );
    },
    [startMatchWithDeck, userProfile, runWithIntro]
  );

  // Quick Start from MainMenu Cards
  const handleQuickStartFromMenu = useCallback(
    (quickConfig: GameSetupConfig) => {
      const merged: GameSettings = {
        ...settings,
        playerCount: quickConfig.playerCount,
        targetScore: quickConfig.targetScore,
        fiveRuleEnabled: quickConfig.fiveRuleEnabled,
        aiDifficulty: quickConfig.botDifficulty
      };
      handleStartGame(merged);
    },
    [settings, handleStartGame]
  );

  // Start Next Round (Supports both Singleplayer and Synchronized Multiplayer)
  const startNextRoundWithDeck = useCallback(
    (seedDeck: Card[], chosenShuffle: ShuffleStyle, nextStartingTurn: number) => {
      clearScheduledTimers();
      sound.playClick();
      setRoundScores(null);
      setReadySeatsForNextRound(new Set());
      setOnTableCount({
        isActive: false,
        userCountedIndex: 0,
        oppCountedIndex: 0,
        userTotal: 0,
        oppTotal: 0,
        userPointCards: [],
        oppPointCards: [],
        userCardPoints: 0,
        oppCardPoints: 0,
        userPistiPoints: 0,
        oppPistiPoints: 0,
        userMajority: false,
        oppMajority: false,
        isDone: false,
        isFast: false
      });
      setRound(r => r + 1);
      setCurrentTurn(nextStartingTurn);
      setLastCollectorIndex(null);
      setActiveSlam(null);
      setRecentCapture(null);
      setTurnTimeRemaining(15);
      setShuffleStyle(chosenShuffle);

      setDeck(seedDeck);
      setTableCards([]);
      setFlyingCards([]);
      setHiddenCardIds(new Set());

      setPlayers(prev =>
        prev.map(p => ({
          ...p,
          hand: [],
          pistiPairs: [],
          pistiCount: 0,
          doublePistiCount: 0,
          bonusPoints: 0,
          collectedCards: []
        }))
      );

      setIsShuffling(true);
      setIsActionLocked(true);
      if (chosenShuffle === 'table_wash') {
        sound.playWashScramble();
      } else if (chosenShuffle === 'triple_cut') {
        sound.playTripleCut();
      } else {
        sound.playRiffleShuffle();
      }

      const currentSettings = settingsRef.current;
      const isMp = isMultiplayerGameRef.current;

      const shuffleDuration = getShuffleDuration(chosenShuffle);
      const t = window.setTimeout(() => {
        setIsShuffling(false);
        const ctx: PendingDealContext = {
          seedDeck,
          configuredSettings: currentSettings,
          isMp: Boolean(isMp),
          mySeat: isMp ? myMultiplayerSeatRef.current : 0,
          startingTurn: nextStartingTurn
        };
        pendingDealContextRef.current = ctx;
        setPendingDealContext(ctx);

        const isHuman = isMp ? (nextStartingTurn === 0) : (nextStartingTurn === 0);
        const cutterSeatIdx = nextStartingTurn;
        const cName = playersRef.current[cutterSeatIdx]?.name || 'Oyuncu';
        sound.playWashScramble();

        setDeckCutState({
          isActive: true,
          cutterSeat: cutterSeatIdx,
          cutterName: cName,
          isHumanCutter: isHuman,
          step: 'waiting_cut',
          cutIndex: 26,
          pileACount: 26,
          pileBCount: 26,
          revealedJackCards: []
        });

        const isAiSlot = isMp ? (activeMultiplayerSlotsRef.current?.[cutterSeatIdx]?.isAI || false) : !isHuman;
        const shouldAutoCut = (!isMp && !isHuman) || (isMp && multiplayerManager.isHost && isAiSlot);
        if (shouldAutoCut) {
          const botTimer = window.setTimeout(() => {
            const botCut = Math.floor(16 + Math.random() * 20);
            handleCutDeckAndProceed(botCut);
          }, 1200);
          dealTimersRef.current.push(botTimer);
        }
      }, shuffleDuration);
      dealTimersRef.current.push(t);
    },
    [
      clearScheduledTimers,
      handleCutDeckAndProceed,
      setReadySeatsForNextRound,
      settingsRef,
      isMultiplayerGameRef,
      myMultiplayerSeatRef,
      activeMultiplayerSlotsRef,
      setFlyingCards,
      setHiddenCardIds,
      setRecentCapture
    ]
  );

  const handleNextRound = useCallback(() => {
    setReadySeatsForNextRound(new Set());
    setRoundScores(null);
    const N = players.length;
    const nextDealer = (dealerIndex + 1) % N;
    setDealerIndex(nextDealer);
    const hostTurn = (nextDealer + 1) % N;

    const randomStyle = SHUFFLE_STYLES[Math.floor(Math.random() * SHUFFLE_STYLES.length)];
    const freshDeck = shuffleDeck(createDeck());

    if (isMultiplayerGame && multiplayerManager.isConnected) {
      const nextDealerAbs = (nextDealer + myMultiplayerSeatRef.current) % N;
      const startingTurnSeat = (nextDealerAbs + 1) % N;
      multiplayerManager.send({
        type: 'MP_NEXT_ROUND',
        seedDeck: freshDeck,
        shuffleStyle: randomStyle,
        round: round + 1,
        startingTurnSeat
      });
      startNextRoundWithDeck(freshDeck, randomStyle, hostTurn);
    } else {
      startNextRoundWithDeck(freshDeck, randomStyle, hostTurn);
    }
  }, [
    dealerIndex,
    players.length,
    round,
    isMultiplayerGame,
    myMultiplayerSeatRef,
    startNextRoundWithDeck,
    setReadySeatsForNextRound
  ]);

  /**
   * Play a card from Human, Bot, or Remote Multiplayer Opponent with zero-teleportation flight
   */
  const handlePlayCardWithAnimation = useCallback(
    (
      playerIndex: number,
      card: Card,
      sourceRect?: DOMRect,
      initialTilt: number = 0,
      isRemoteMultiplayerMove: boolean = false
    ) => {
      // Guard against click spam while dealing, shuffling, busy, already action-locked, out-of-turn, or card not in hand
      if (
        isBusyRef.current ||
        isDealingAnimationRef.current ||
        isShufflingRef.current ||
        isActionLockedRef.current ||
        currentTurnRef.current !== playerIndex ||
        !playersRef.current[playerIndex]?.hand.some(c => c.id === card.id)
      ) {
        return;
      }
      isActionLockedRef.current = true;
      isBusyRef.current = true;
      setIsActionLocked(true);

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const isHuman = playerIndex === 0;

      // Deterministic offset based on card ID
      const hashNum = card.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const tableOffsetX = (hashNum % 15) - 7;
      const tableOffsetY = ((hashNum * 3) % 13) - 6;
      const tableRotation = ((hashNum * 7) % 19) - 9;

      // Broadcast move if local player in Multiplayer OR if host simulating bot in Multiplayer
      const N = settingsRef.current.playerCount;
      const absSeat = (playerIndex + myMultiplayerSeatRef.current) % N;
      const targetPlayerObj = playersRef.current[playerIndex];
      const shouldBroadcast =
        !isRemoteMultiplayerMove &&
        multiplayerManager.isConnected &&
        isMultiplayerGameRef.current &&
        (isHuman || (isMultiplayerHostRef.current && targetPlayerObj?.isAI));

      if (shouldBroadcast) {
        multiplayerManager.send({
          type: 'MP_CARD_PLAYED',
          cardId: card.id,
          seatIndex: absSeat,
          tableOffsetX,
          tableOffsetY,
          tableRotation,
          senderPeerId: multiplayerManager.instanceId
        });
      }

      const totalPlayers = settingsRef.current.playerCount;
      const cardIdx = targetPlayerObj ? targetPlayerObj.hand.findIndex(c => c.id === card.id) : 0;
      const safeCardIdx = cardIdx >= 0 ? cardIdx : 1;
      const fallbackTarget = getHandCardFallbackTarget(playerIndex, safeCardIdx, totalPlayers);

      let startX = fallbackTarget.x;
      let startY = fallbackTarget.y;
      const startRot = initialTilt !== 0 ? initialTilt : fallbackTarget.rotation;
      const isSideSeat = totalPlayers === 4 && (playerIndex === 1 || playerIndex === 3 || playerIndex === 2);
      const startScale = isSideSeat ? 0.78 : 1;

      if (sourceRect && sourceRect.width > 0 && sourceRect.height > 0) {
        startX = sourceRect.left + sourceRect.width / 2;
        startY = sourceRect.top + sourceRect.height / 2;
      } else {
        const cardDom = cardDomElements.get(card.id) || (document.querySelector(
          `[data-card-id="${card.id}"]`
        ) as HTMLElement | null);
        if (cardDom) {
          const r = cardDom.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            startX = r.left + r.width / 2;
            startY = r.top + r.height / 2;
          }
        }
      }

      const potPos = getCenter(tableRefs.current.potEl, centerX + 40, centerY);

      const placedCard: Card = {
        ...card,
        faceUp: true,
        tableOffsetX,
        tableOffsetY,
        tableRotation
      };

      const flyId = `play-${card.id}-${Date.now()}`;

      setHiddenCardIds(prev => new Set(prev).add(card.id));

      const currentTablePile = tableCardsRef.current;
      const isPistiImpending =
        currentTablePile.length === 1 &&
        currentTablePile[0].faceUp &&
        card.value === currentTablePile[0].value;
      const isFiveSlamImpending =
        settingsRef.current.fiveRuleEnabled &&
        currentTablePile.length === 1 &&
        card.value === 5 &&
        currentTablePile[0].value === 5;
      const isSlamStrike = isPistiImpending || isFiveSlamImpending;

      const flyData: FlyingCardData = {
        id: flyId,
        card: placedCard,
        startX,
        startY,
        targetX: potPos.x + tableOffsetX,
        targetY: potPos.y + tableOffsetY,
        startRotation: startRot,
        targetRotation: tableRotation,
        startFaceUp: isHuman,
        endFaceUp: true,
        startScale,
        targetScale: 1,
        duration: isSlamStrike ? 680 : (isHuman ? 490 : 460),
        arcHeight: isSlamStrike ? 160 : 96,
        motionType: isSlamStrike ? 'pisti_slam' : 'play',
        size: 'md',
        zIndex: isSlamStrike ? 95 : 85,
        onComplete: () => {
          setPlayers(prev =>
            prev.map((p, idx) =>
              idx === playerIndex
                ? { ...p, hand: p.hand.filter(c => c.id !== card.id) }
                : p
            )
          );
          setHiddenCardIds(prev => {
            const next = new Set(prev);
            next.delete(card.id);
            return next;
          });

          const currentTable = tableCardsRef.current;
          const currentPlayers = playersRef.current;
          const actingPlayer = currentPlayers[playerIndex];

          sound.playCardPlay();
          particleEngine.triggerCardPlace(
            potPos.x + tableOffsetX,
            potPos.y + tableOffsetY
          );

          const updatedPile = [...currentTable, placedCard];

          setFlyingCards(prev => prev.filter(f => f.id !== flyId));
          setTableCards(updatedPile);
          setSeenCards(prev => [...prev, placedCard]);

          const evaluation = evaluatePlay(
            currentTable,
            placedCard,
            settingsRef.current.fiveRuleEnabled
          );

          // Special Case: 5'e Basmalı Instant Win!
          if (evaluation.isFiveSlamInstantWin) {
            triggerShake();
            sound.playDoublePisti();
            particleEngine.triggerPistiExplosion(potPos.x, potPos.y, true);
            confetti({ particleCount: 220, spread: 130, origin: { y: 0.4 } });

            setActiveSlam({
              id: `slam-five-${Date.now()}`,
              type: 'five_slam_instant_win',
              card: placedCard,
              playerId: actingPlayer.id,
              playerName: actingPlayer.name,
              pointsAwarded: 0,
              timestamp: Date.now()
            });

            const winTimer = window.setTimeout(() => {
              const latestPlayers = playersRef.current;
              const uBreakdown = calculateRoundBreakdown(latestPlayers[0], true);
              const oBreakdown = calculateRoundBreakdown(latestPlayers[1], false);
              const isUserWin = actingPlayer.id === latestPlayers[0].id;
              recordMatchStats(isUserWin, isUserWin ? 50 : 0, isUserWin ? 1 : 0, 0, false);
              setRoundScores({
                user: uBreakdown,
                opp: oBreakdown,
                winner: actingPlayer,
                isGameOver: true
              });
              setIsActionLocked(false);
            }, 1600);
            dealTimersRef.current.push(winTimer);
            return;
          }

          // Case A: Card does NOT sweep
          if (!evaluation.isSweep) {
            setCurrentTurn(curr => (curr + 1) % currentPlayers.length);
            setTurnTimeRemaining(15);
            setIsActionLocked(false);
            return;
          }

          // Case B: Sweep (Pişti, Double Pişti, Jack, Match)
          setLastCollectorIndex(playerIndex);

          setSeenCards(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newlyRevealed = evaluation.capturedCards.filter(
              c => !existingIds.has(c.id)
            );
            return [...prev, ...newlyRevealed];
          });

          const isPisti = evaluation.isPisti;
          const isDouble = evaluation.isDoublePisti;

          let captureLabel = `+${evaluation.capturedCards.length} KART`;

          if (isDouble) {
            captureLabel = '🔥 +20P ÇİFTE PİŞTİ!';
            triggerShake();
            sound.playDoublePisti();
            particleEngine.triggerPistiExplosion(potPos.x, potPos.y, true);
            confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 } });

            setActiveSlam({
              id: `slam-${Date.now()}`,
              type: 'double_pisti',
              card: placedCard,
              playerId: actingPlayer.id,
              playerName: actingPlayer.name,
              pointsAwarded: 20,
              timestamp: Date.now()
            });
          } else if (isPisti) {
            captureLabel = '🌸 +10P PİŞTİ!';
            triggerShake();
            sound.playPistiSlam();
            particleEngine.triggerPistiExplosion(potPos.x, potPos.y, false);
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

            setActiveSlam({
              id: `slam-${Date.now()}`,
              type: 'pisti',
              card: placedCard,
              playerId: actingPlayer.id,
              playerName: actingPlayer.name,
              pointsAwarded: 10,
              timestamp: Date.now()
            });
          } else if (evaluation.isJackSweep) {
            captureLabel = `🃏 VALE SÜPÜRDÜ (${evaluation.capturedCards.length})`;
            sound.playJackSweep();
            particleEngine.triggerJackVortex(potPos.x, potPos.y);

            setActiveSlam({
              id: `slam-${Date.now()}`,
              type: 'jack_sweep',
              card: placedCard,
              playerId: actingPlayer.id,
              playerName: actingPlayer.name,
              pointsAwarded: 0,
              timestamp: Date.now()
            });
          } else {
            sound.playMatchSweep();
          }

          // Contextual AI speech & emote reactions
          if (onBotReaction) {
            const curLang = getLanguage();
            if (isPisti || isDouble) {
              if (actingPlayer.isAI) {
                const r = getBotContextualReaction('pisti_scored', actingPlayer.personality, curLang);
                onBotReaction(playerIndex, r.emoji, r.text);
              } else {
                const oppBotIdx = currentPlayers.findIndex((p, i) => i !== playerIndex && p.isAI);
                if (oppBotIdx !== -1) {
                  const oppBot = currentPlayers[oppBotIdx];
                  const r = getBotContextualReaction('pisti_suffered', oppBot.personality, curLang);
                  const botReactTimer = window.setTimeout(() => onBotReaction(oppBotIdx, r.emoji, r.text), 500);
                  dealTimersRef.current.push(botReactTimer);
                }
              }
            } else if (placedCard.value === 11) {
              if (actingPlayer.isAI) {
                const r = getBotContextualReaction('jack_sweep', actingPlayer.personality, curLang);
                onBotReaction(playerIndex, r.emoji, r.text);
              } else {
                const oppBotIdx = currentPlayers.findIndex((p, i) => i !== playerIndex && p.isAI);
                if (oppBotIdx !== -1) {
                  const oppBot = currentPlayers[oppBotIdx];
                  const r = getBotContextualReaction('opponent_jack', oppBot.personality, curLang);
                  const botReactTimer = window.setTimeout(() => onBotReaction(oppBotIdx, r.emoji, r.text), 500);
                  dealTimersRef.current.push(botReactTimer);
                }
              }
            }
          }

          const sweepTimer = window.setTimeout(() => {
            animateSweepToCollector(
              updatedPile,
              playerIndex,
              isPisti || isDouble,
              captureLabel,
              () => {
                setPlayers(prev =>
                  prev.map((p, idx) => {
                    if (idx !== playerIndex) return p;

                    const pistiPair: PistiPair | null =
                      isPisti || isDouble
                        ? {
                            bottomCard: { ...updatedPile[0], faceUp: false },
                            topCard: { ...placedCard, faceUp: true },
                            isDouble: Boolean(isDouble)
                          }
                        : null;

                    return {
                      ...p,
                      pistiPairs: pistiPair ? [...p.pistiPairs, pistiPair] : p.pistiPairs,
                      pistiCount: isPisti ? p.pistiCount + 1 : p.pistiCount,
                      doublePistiCount: isDouble ? p.doublePistiCount + 1 : p.doublePistiCount,
                      bonusPoints: p.bonusPoints || 0,
                      collectedCards:
                        isPisti || isDouble
                          ? [...p.collectedCards, updatedPile[0]]
                          : [...p.collectedCards, ...evaluation.capturedCards]
                    };
                  })
                );

                setCurrentTurn(curr => (curr + 1) % playersRef.current.length);
                setTurnTimeRemaining(15);
                setIsActionLocked(false);
              }
            );
          }, 340);
          dealTimersRef.current.push(sweepTimer);
        }
      };

      setFlyingCards(prev => [...prev, flyData]);
    },
    [triggerShake, animateSweepToCollector, settingsRef, myMultiplayerSeatRef, isMultiplayerGameRef, isMultiplayerHostRef, setHiddenCardIds, setFlyingCards]
  );

  const startOnTableCounting = useCallback(
    (finalPlayersState: Player[]) => {
      const isFourP = finalPlayersState.length === 4;

      const userSideAggregate: Player = isFourP
        ? {
            ...finalPlayersState[0],
            name: 'Bizim Takım (Sen & Dayı)',
            pistiCount: finalPlayersState[0].pistiCount + finalPlayersState[2].pistiCount,
            doublePistiCount:
              finalPlayersState[0].doublePistiCount + finalPlayersState[2].doublePistiCount,
            bonusPoints:
              (finalPlayersState[0].bonusPoints || 0) + (finalPlayersState[2].bonusPoints || 0),
            pistiPairs: [
              ...finalPlayersState[0].pistiPairs,
              ...finalPlayersState[2].pistiPairs
            ],
            collectedCards: [
              ...finalPlayersState[0].collectedCards,
              ...finalPlayersState[2].collectedCards
            ]
          }
        : finalPlayersState[0];

      const oppSideAggregate: Player = isFourP
        ? {
            ...finalPlayersState[1],
            name: 'Rakip Takım (Bot & Muhtar)',
            pistiCount: finalPlayersState[1].pistiCount + finalPlayersState[3].pistiCount,
            doublePistiCount:
              finalPlayersState[1].doublePistiCount + finalPlayersState[3].doublePistiCount,
            bonusPoints:
              (finalPlayersState[1].bonusPoints || 0) + (finalPlayersState[3].bonusPoints || 0),
            pistiPairs: [
              ...finalPlayersState[1].pistiPairs,
              ...finalPlayersState[3].pistiPairs
            ],
            collectedCards: [
              ...finalPlayersState[1].collectedCards,
              ...finalPlayersState[3].collectedCards
            ]
          }
        : finalPlayersState[1];

      const rawUserCards = [
        ...userSideAggregate.collectedCards,
        ...(userSideAggregate.pistiPairs || []).flatMap(p => [p.bottomCard, p.topCard])
      ];
      const userCards = Array.from(new Map(rawUserCards.map(c => [c.id, c])).values());

      const rawOppCards = [
        ...oppSideAggregate.collectedCards,
        ...(oppSideAggregate.pistiPairs || []).flatMap(p => [p.bottomCard, p.topCard])
      ];
      const oppCards = Array.from(new Map(rawOppCards.map(c => [c.id, c])).values());

      const userHasMajority = userCards.length > oppCards.length;
      const oppHasMajority = oppCards.length > userCards.length;

      const uBreakdown = calculateRoundBreakdown(userSideAggregate, userHasMajority);
      const oBreakdown = calculateRoundBreakdown(oppSideAggregate, oppHasMajority);

      const newUserScore = finalPlayersState[0].score + uBreakdown.totalRoundPoints;
      const newOppScore = finalPlayersState[1].score + oBreakdown.totalRoundPoints;

      const target = settingsRef.current.targetScore;
      const isSingleRound = target <= 25 || target === 1;
      const gameOver =
        isSingleRound ||
        ((newUserScore >= target || newOppScore >= target) && newUserScore !== newOppScore);

      let matchWinner: Player | null = null;
      if (gameOver) {
        matchWinner = newUserScore > newOppScore ? userSideAggregate : oppSideAggregate;
        const isUserWin = newUserScore > newOppScore;
        const oppName = oppSideAggregate.name || 'Rakip';
        const xpRes = recordMatchStats(
          isUserWin,
          newUserScore,
          userSideAggregate.pistiCount,
          userSideAggregate.doublePistiCount,
          false,
          oppName
        );
        setUserProfile(getUserProfile());
        friendNetwork.announcePresence();
        if (xpRes.leveledUp) {
          showDevToast(`🎉 SEVİYE ATLADIN! Yeni Seviye: Level ${xpRes.newLevel} (+${xpRes.xpEarned} XP)`);
        }
      }

      setRoundScores({
        user: uBreakdown,
        opp: oBreakdown,
        winner: matchWinner,
        isGameOver: gameOver
      });

      setPlayers(prev =>
        prev.map((p, idx) => {
          if (idx === 0 || idx === 2) {
            return {
              ...p,
              score: newUserScore,
              collectedCards: finalPlayersState[idx].collectedCards,
              pistiPairs: finalPlayersState[idx].pistiPairs
            };
          }
          return {
            ...p,
            score: newOppScore,
            collectedCards: finalPlayersState[idx].collectedCards,
            pistiPairs: finalPlayersState[idx].pistiPairs
          };
        })
      );

      const uPistiPts =
        userSideAggregate.pistiCount * 10 + userSideAggregate.doublePistiCount * 20;
      const oPistiPts =
        oppSideAggregate.pistiCount * 10 + oppSideAggregate.doublePistiCount * 20;

      setCountingUserCards([...userCards]);
      setCountingOppCards([...oppCards]);

      setOnTableCount({
        isActive: true,
        userCountedIndex: 0,
        oppCountedIndex: 0,
        userTotal: userCards.length,
        oppTotal: oppCards.length,
        userCurrentCard: userCards[0],
        oppCurrentCard: oppCards[0],
        userPointCards: [],
        oppPointCards: [],
        userCardPoints: 0,
        oppCardPoints: 0,
        userPistiPoints: uPistiPts,
        oppPistiPoints: oPistiPts,
        userMajority: userHasMajority,
        oppMajority: oppHasMajority,
        isDone: false,
        isFast: false
      });

      if (countTimerRef.current) {
        window.clearInterval(countTimerRef.current);
        countTimerRef.current = null;
      }
    },
    [settingsRef, setUserProfile, showDevToast]
  );

  const handleUpdateCountingProgress = useCallback(
    (userCountedIndex: number, oppCountedIndex: number) => {
      setOnTableCount(prev => {
        if (
          prev.userCountedIndex === userCountedIndex &&
          prev.oppCountedIndex === oppCountedIndex
        ) {
          return prev;
        }
        return {
          ...prev,
          userCountedIndex,
          oppCountedIndex
        };
      });
    },
    []
  );

  const handleSkipCounting = useCallback(() => {
    if (countTimerRef.current) {
      window.clearInterval(countTimerRef.current);
      countTimerRef.current = null;
    }
    setOnTableCount(prev => ({
      ...prev,
      userCountedIndex: prev.userTotal,
      oppCountedIndex: prev.oppTotal,
      userCardPoints: roundScores?.user.specialCardPoints ?? prev.userCardPoints,
      oppCardPoints: roundScores?.opp.specialCardPoints ?? prev.oppCardPoints,
      isDone: true
    }));
  }, [roundScores]);

  const handleToggleFastCounting = useCallback(() => {
    handleSkipCounting();
  }, [handleSkipCounting]);

  const handleFinishCounting = useCallback(() => {
    if (countTimerRef.current) {
      window.clearInterval(countTimerRef.current);
      countTimerRef.current = null;
    }
    setOnTableCount(prev => ({
      ...prev,
      userCountedIndex: prev.userTotal,
      oppCountedIndex: prev.oppTotal,
      isActive: false,
      isDone: true
    }));
  }, []);

  // Turn Countdown Timer: ONLY active in Multiplayer mode!
  useEffect(() => {
    if (
      !isMultiplayerGame ||
      screen !== 'game' ||
      isDealingAnimation ||
      isShuffling ||
      isActionLocked ||
      onTableCount.isActive ||
      onTableCount.isDone ||
      roundScores?.isGameOver
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setTurnTimeRemaining(prev => {
        if (prev <= 1) {
          if (currentTurn === 0) {
            const userPlayer = playersRef.current[0];
            if (userPlayer.hand.length > 0) {
              const randomCard =
                userPlayer.hand[Math.floor(Math.random() * userPlayer.hand.length)];
              handlePlayCardWithAnimation(0, randomCard);
            }
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    isMultiplayerGame,
    screen,
    isDealingAnimation,
    isShuffling,
    isActionLocked,
    onTableCount.isActive,
    onTableCount.isDone,
    roundScores?.isGameOver,
    currentTurn,
    handlePlayCardWithAnimation
  ]);

  // Deal Next 4 Cards or Conclude Round when all hands are empty
  useEffect(() => {
    if (
      screen !== 'game' ||
      isDealingAnimation ||
      isShuffling ||
      isActionLocked ||
      flyingCards.length > 0 ||
      onTableCount.isActive ||
      onTableCount.isDone ||
      roundScores?.isGameOver
    ) {
      return;
    }

    const allHandsEmpty = players.every(p => p.hand.length === 0);
    if (!allHandsEmpty) return;

    if (deck.length > 0) {
      const timer = window.setTimeout(() => {
        const N = settings.playerCount;
        const currentDeck = [...deck];
        const absoluteHands: Card[][] = Array.from({ length: N }, () => []);
        for (let seat = 0; seat < N; seat++) {
          const hand: Card[] = [];
          for (let i = 0; i < 4; i++) {
            const c = currentDeck.pop();
            if (c) hand.push(c);
          }
          absoluteHands[seat] = hand;
        }

        const orientedHands = orientHandsForPerspective(
          absoluteHands,
          isMultiplayerGame ? myMultiplayerSeatRef.current : 0
        );
        setSeenCards(prev => [...prev, ...orientedHands[0]]);

        runDealChoreography(
          [],
          orientedHands,
          currentDeck,
          settings.playerCount,
          currentTurnRef.current,
          true
        );
      }, 280);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      if (tableCards.length > 0 && lastCollectorIndex !== null) {
        setIsActionLocked(true);
        const leftover = tableCards.map(c => ({ ...c, faceUp: true }));
        animateSweepToCollector(
          leftover,
          lastCollectorIndex,
          false,
          `SON EL (+${leftover.length} KART)`,
          () => {
            const updatedPlayers = playersRef.current.map((p, idx) =>
              idx === lastCollectorIndex
                ? { ...p, collectedCards: [...p.collectedCards, ...leftover] }
                : p
            );
            setIsActionLocked(false);
            startOnTableCounting(updatedPlayers);
          }
        );
      } else {
        startOnTableCounting(playersRef.current);
      }
    }, 380);

    return () => window.clearTimeout(timer);
  }, [
    players,
    deck,
    screen,
    tableCards,
    lastCollectorIndex,
    dealerIndex,
    settings.playerCount,
    isMultiplayerGame,
    isDealingAnimation,
    isShuffling,
    isActionLocked,
    flyingCards.length,
    onTableCount.isActive,
    onTableCount.isDone,
    roundScores?.isGameOver,
    myMultiplayerSeatRef,
    runDealChoreography,
    animateSweepToCollector,
    startOnTableCounting
  ]);

  // AI Turn Automator
  useEffect(() => {
    if (
      screen !== 'game' ||
      currentTurn === 0 ||
      isDealingAnimation ||
      isShuffling ||
      isActionLocked ||
      flyingCards.length > 0 ||
      onTableCount.isActive ||
      onTableCount.isDone ||
      roundScores?.isGameOver
    ) {
      return;
    }

    if (isMultiplayerGame && !isMultiplayerHost) return;

    const currentBot = players[currentTurn];
    if (!currentBot || currentBot.hand.length === 0 || !currentBot.isAI) return;

    const delay = Math.floor(Math.random() * 280) + 520;
    const timer = window.setTimeout(() => {
      const chosenCard = chooseAICard(
        currentBot.hand,
        tableCards,
        seenCards,
        settings.aiDifficulty,
        currentBot.personality || 'balanced'
      );
      handlePlayCardWithAnimation(currentTurn, chosenCard);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    currentTurn,
    screen,
    players,
    tableCards,
    seenCards,
    settings.aiDifficulty,
    isDealingAnimation,
    isShuffling,
    isActionLocked,
    flyingCards.length,
    onTableCount.isActive,
    onTableCount.isDone,
    roundScores?.isGameOver,
    isMultiplayerGame,
    isMultiplayerHost,
    handlePlayCardWithAnimation
  ]);

  const getDeckTargetPos = useCallback(() => {
    if (tableRefs.current.deckEl) {
      const rect = tableRefs.current.deckEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    }
    const isSm = window.innerWidth >= 640;
    const deckW = isSm ? 96 : 80;
    const gap = isSm ? 48 : 24;
    const halfSpan = gap / 2 + deckW / 2;
    return {
      x: window.innerWidth / 2 - halfSpan,
      y: window.innerHeight / 2
    };
  }, []);

  const isBusy =
    isShuffling || isDealingAnimation || isActionLocked || flyingCards.length > 0;
  const isBusyRef = useRef(false);
  isBusyRef.current = isBusy;

  // Synchronous Ready-Check calculation for Multiplayer Next Round
  const slotsReadiness = useMemo<SlotReadinessInfo[]>(() => {
    if (!isMultiplayerGame) return [];
    const count = settings.playerCount;
    const slots =
      activeMultiplayerSlots.length >= count
        ? activeMultiplayerSlots.slice(0, count)
        : Array.from({ length: count }, (_, i) => ({
            seatIndex: i,
            name: i === 0 ? 'Sen' : `Oyuncu ${i + 1}`,
            avatar: '👤',
            peerId: i === 0 ? multiplayerManager.instanceId : 'peer',
            isHost: i === 0,
            isAI: false,
            team: (i % 2 === 0 ? 'A' : 'B') as 'A' | 'B'
          }));

    return slots.map(slot => ({
      seatIndex: slot.seatIndex,
      name: slot.name,
      isReady: slot.isAI ? true : readySeatsForNextRound.has(slot.seatIndex),
      isAI: Boolean(slot.isAI)
    }));
  }, [isMultiplayerGame, settings.playerCount, activeMultiplayerSlots, readySeatsForNextRound]);

  const humanSlots = useMemo<SlotReadinessInfo[]>(() => {
    return slotsReadiness.filter((s: SlotReadinessInfo) => !s.isAI);
  }, [slotsReadiness]);

  const readySeatsCount = useMemo(() => {
    return humanSlots.filter((s: SlotReadinessInfo) => s.isReady).length;
  }, [humanSlots]);

  const totalHumanPlayersCount = humanSlots.length;

  const isReadyForNextRound = readySeatsForNextRound.has(myMultiplayerSeat);

  const handleToggleReady = useCallback(() => {
    sound.playClick();
    const mySeat = myMultiplayerSeatRef.current;
    const isCurrentlyReady = readySeatsForNextRound.has(mySeat);
    const newReady = !isCurrentlyReady;

    setReadySeatsForNextRound(prev => {
      const next = new Set(prev);
      if (newReady) {
        next.add(mySeat);
      } else {
        next.delete(mySeat);
      }
      return next;
    });

    if (isMultiplayerGame && multiplayerManager.isConnected) {
      multiplayerManager.send({
        type: 'MP_ROUND_READY',
        seatIndex: mySeat,
        senderPeerId: multiplayerManager.instanceId,
        isReady: newReady
      });
    }
  }, [readySeatsForNextRound, isMultiplayerGame, myMultiplayerSeatRef, setReadySeatsForNextRound]);

  // Host Synchronous Auto-Start
  useEffect(() => {
    if (
      !isMultiplayerGame ||
      !multiplayerManager.isHost ||
      !onTableCount.isDone ||
      roundScores?.isGameOver ||
      humanSlots.length === 0
    ) {
      return;
    }

    const allReady = humanSlots.every((s: SlotReadinessInfo) => s.isReady);
    if (allReady) {
      const t = window.setTimeout(() => {
        handleNextRound();
      }, 500);
      return () => window.clearTimeout(t);
    }
  }, [
    isMultiplayerGame,
    onTableCount.isDone,
    roundScores?.isGameOver,
    humanSlots,
    handleNextRound
  ]);

  const handleRestartGame = useCallback(() => {
    setOnTableCount(prev => ({ ...prev, isActive: false, isDone: false }));
    setRoundScores(null);
    setReadySeatsForNextRound(new Set());
    setChatMessages([]);
    if (isMultiplayerGame) {
      setIsMultiplayerOpen(true);
    } else {
      setIsSetupOpen(true);
    }
  }, [isMultiplayerGame, setIsMultiplayerOpen, setIsSetupOpen, setReadySeatsForNextRound, setChatMessages]);

  const handleExitToMenu = useCallback(() => {
    if (isMultiplayerGameRef.current) {
      if (roundScores && !roundScores.isGameOver && playersRef.current.length >= 2) {
        const uScore = playersRef.current[0].score;
        const oScore = playersRef.current[1].score;
        const isWin = uScore > oScore;
        const oppName = playersRef.current[1].name || 'Online Rakip';
        recordMatchStats(
          isWin,
          uScore,
          playersRef.current[0].pistiCount || 0,
          playersRef.current[0].doublePistiCount || 0,
          false,
          oppName
        );
        setUserProfile(getUserProfile());
        friendNetwork.announcePresence();
      }
      try {
        multiplayerManager.send({
          type: 'MP_MATCH_ABORTED',
          reason: 'surrender',
          senderName: userProfile.name
        });
        multiplayerManager.leaveRoom();
      } catch (e) {
        logger.warn(e);
      }
      setIsMultiplayerGame(false);
      setMyMultiplayerSeat(0);
      myMultiplayerSeatRef.current = 0;
    }
    friendNetwork.setStatus('menu', undefined);
    resetMultiplayerState();
    setOnTableCount(prev => ({ ...prev, isActive: false, isDone: false }));
    setRoundScores(null);
    setReadySeatsForNextRound(new Set());
    setChatMessages([]);
    setScreen('menu');
  }, [
    userProfile.name,
    roundScores,
    isMultiplayerGameRef,
    playersRef,
    setUserProfile,
    setIsMultiplayerGame,
    setMyMultiplayerSeat,
    myMultiplayerSeatRef,
    resetMultiplayerState,
    setReadySeatsForNextRound,
    setChatMessages,
    setScreen
  ]);

  return {
    canvasRef,
    tableRefs,
    dealTimersRef,
    // Game Core State
    deck,
    setDeck,
    tableCards,
    setTableCards,
    tableCardsRef,
    players,
    setPlayers,
    playersRef,
    currentTurn,
    setCurrentTurn,
    currentTurnRef,
    round,
    dealerIndex,
    lastCollectorIndex,
    activeSlam,
    setActiveSlam,
    seenCards,
    roundScores,
    setRoundScores,
    countingUserCards,
    countingOppCards,
    onTableCount,
    setOnTableCount,
    // Animations & Flight
    isShuffling,
    setIsShuffling,
    shuffleStyle,
    isDealingAnimation,
    setIsDealingAnimation,
    isDealingAnimationRef,
    isActionLocked,
    setIsActionLocked,
    isActionLockedRef,
    isShaking,
    deckCutState,
    turnTimeRemaining,
    flyingCards,
    setFlyingCards,
    hiddenCardIds,
    setHiddenCardIds,
    recentCapture,
    setRecentCapture,
    clearFlights,
    clearScheduledTimers,
    triggerShake,
    getDeckTargetPos,
    // Flow Actions
    createInitialPlayers,
    startMatchWithDeck,
    handleCutDeckAndProceed,
    handleStartGame,
    handleQuickStartFromMenu,
    startNextRoundWithDeck,
    handleNextRound,
    handlePlayCardWithAnimation,
    startOnTableCounting,
    handleUpdateCountingProgress,
    handleSkipCounting,
    handleToggleFastCounting,
    handleFinishCounting,
    handleRestartGame,
    handleExitToMenu,
    handleToggleReady,
    // Readiness
    isBusy,
    isBusyRef,
    slotsReadiness,
    humanSlots,
    readySeatsCount,
    totalHumanPlayersCount,
    isReadyForNextRound
  };
}
