import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  GameSettings,
  GameSetupConfig,
  Player,
  SlamEvent,
  ShuffleStyle,
  PistiPair,
  OnTableCountState
} from './types/game';
import { createDeck, shuffleDeck, dealInitialGame, dealHand } from './core/deck';
import { evaluatePlay, calculateRoundBreakdown, DetailedRoundScore } from './core/rules';
import { chooseAICard } from './core/ai/bot';
import { sound } from './core/audio/soundEngine';
import { particleEngine } from './core/particles/particleEngine';
import { multiplayerManager, MultiplayerEvent, LobbyPlayerSlot } from './features/multiplayer/peerManager';
import { MainMenu } from './components/MainMenu';
import { TableSurface, TableDomRefs, RecentCaptureFeedback, ActiveEmote, SlotReadinessInfo, cardDomElements } from './components/TableSurface';
import { ScoreBoard } from './components/ScoreBoard';
import { PistiOverlay } from './components/PistiOverlay';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { GameSetupModal } from './components/GameSetupModal';
import { ProfileModal } from './components/ProfileModal';
import { FriendsModal } from './components/FriendsModal';
import { WelcomeModal } from './components/WelcomeModal';
import { InGameChat, ChatMessage } from './components/InGameChat';
import { UnoGameView } from './components/UnoGameView';
import {
  getUserProfile,
  UserProfile,
  recordMatchStats,
  isDefaultPlayerName
} from './features/profile/profileManager';
import { createUnoDeck, shuffleUnoDeck } from './features/uno/unoDeck';
import { friendNetwork, IncomingGameInvite } from './features/friends/friendNetwork';
import { CardAnimationLayer, FlyingCardData } from './components/CardAnimationLayer';
import confetti from 'canvas-confetti';
import { AlertTriangle, Bell, Play, X } from 'lucide-react';

const INITIAL_SETTINGS: GameSettings = {
  soundEnabled: true,
  sfxVolume: 0.8,
  ambience: 'none',
  ambienceVolume: 0.25,
  screenShake: true,
  particlesEnabled: true,
  theme: 'traditional',
  cardBack: 'classic_blue',
  targetScore: 101,
  aiDifficulty: 'medium',
  playerCount: 2,
  fiveRuleEnabled: true
};

const SHUFFLE_STYLES: ShuffleStyle[] = [
  'riffle_bridge',
  'hindu_slide',
  'triple_cut',
  'table_wash',
  'farot_wave'
];

const getShuffleDuration = (_style: ShuffleStyle): number => {
  return 2200;
};

function getCenter(el: HTMLElement | null, fallbackX: number, fallbackY: number) {
  if (!el) return { x: fallbackX, y: fallbackY };
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return { x: fallbackX, y: fallbackY };
  }
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function orientHandsForPerspective(
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

const SETTINGS_STORAGE_KEY = 'project_p_settings';

function loadSavedSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_SETTINGS, ...parsed };
    }
  } catch {}
  return INITIAL_SETTINGS;
}

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(loadSavedSettings);
  const [screen, setScreen] = useState<'menu' | 'game' | 'uno'>('menu');
  const [isMultiplayerGame, setIsMultiplayerGame] = useState<boolean>(false);
  const [isMultiplayerHost, setIsMultiplayerHost] = useState<boolean>(true);
  const [multiplayerSeedUnoDeck, setMultiplayerSeedUnoDeck] = useState<any[] | null>(null);

  // Persist settings changes
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Modals & Overlays
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [activeMatchRecovery, setActiveMatchRecovery] = useState<string | null>(null);
  const [pendingFriendInvite, setPendingFriendInvite] = useState<{
    friendCode?: string;
    name: string;
    gameType: 'pisti' | 'uno';
  } | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<IncomingGameInvite | null>(null);
  const [isSurrenderModalOpen, setIsSurrenderModalOpen] = useState(false);
  const [matchAbortedInfo, setMatchAbortedInfo] = useState<{ senderName: string; reason?: string } | null>(null);

  // User Profile & Sabit PP System
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile);

  // In-Game Chat System
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Dev Test Macro: Reveal all players' hands exclusively on this client (Ctrl+Shift+X or Alt+X)
  const [devSeeAllHands, setDevSeeAllHands] = useState(false);
  const [devToast, setDevToast] = useState<string | null>(null);
  const devToastTimerRef = useRef<number | null>(null);

  const showDevToast = useCallback((msg: string) => {
    if (devToastTimerRef.current !== null) {
      window.clearTimeout(devToastTimerRef.current);
    }
    setDevToast(msg);
    devToastTimerRef.current = window.setTimeout(() => {
      setDevToast(null);
      devToastTimerRef.current = null;
    }, 3000);
  }, []);

  // Synchronous Ready-Check for Multiplayer Next Round
  const [readySeatsForNextRound, setReadySeatsForNextRound] = useState<Set<number>>(new Set());

  // Animation & Zero-Teleportation States
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleStyle, setShuffleStyle] = useState<ShuffleStyle>('riffle_bridge');
  const [isDealingAnimation, setIsDealingAnimation] = useState(false);
  const [isActionLocked, setIsActionLocked] = useState(false);
  const [flyingCards, setFlyingCards] = useState<FlyingCardData[]>([]);
  const [hiddenCardIds, setHiddenCardIds] = useState<Set<string>>(new Set());
  const [recentCapture, setRecentCapture] = useState<RecentCaptureFeedback | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Turn Timer (Used strictly in multiplayer mode)
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number>(15);

  // Social & Deep Linking States
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');
  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);
  const [peerReconnectingSeconds, setPeerReconnectingSeconds] = useState<number | null>(null);
  const [myMultiplayerSeat, setMyMultiplayerSeat] = useState<number>(0);
  const myMultiplayerSeatRef = useRef<number>(0);
  myMultiplayerSeatRef.current = myMultiplayerSeat;
  const [activeMultiplayerSlots, setActiveMultiplayerSlots] = useState<LobbyPlayerSlot[]>([]);
  const activeMultiplayerSlotsRef = useRef<LobbyPlayerSlot[]>(activeMultiplayerSlots);
  activeMultiplayerSlotsRef.current = activeMultiplayerSlots;

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
  const playersRef = useRef<Player[]>(players);
  playersRef.current = players;
  const settingsRef = useRef<GameSettings>(settings);
  settingsRef.current = settings;
  const isMultiplayerGameRef = useRef<boolean>(isMultiplayerGame);
  isMultiplayerGameRef.current = isMultiplayerGame;
  const isMultiplayerHostRef = useRef<boolean>(isMultiplayerHost);
  isMultiplayerHostRef.current = isMultiplayerHost;
  const dealTimersRef = useRef<number[]>([]);

  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const currentTurnRef = useRef<number>(currentTurn);
  currentTurnRef.current = currentTurn;
  const [round, setRound] = useState<number>(1);
  const [dealerIndex, setDealerIndex] = useState<number>(1);
  const [lastCollectorIndex, setLastCollectorIndex] = useState<number | null>(null);
  const [activeSlam, setActiveSlam] = useState<SlamEvent | null>(null);
  const [seenCards, setSeenCards] = useState<Card[]>([]);

  // Round summary breakdowns
  const [roundScores, setRoundScores] = useState<{
    user: DetailedRoundScore;
    opp: DetailedRoundScore;
    winner: Player | null;
    isGameOver: boolean;
  } | null>(null);

  const clearScheduledTimers = useCallback(() => {
    dealTimersRef.current.forEach(id => window.clearTimeout(id));
    dealTimersRef.current = [];
    if (countTimerRef.current) {
      window.clearInterval(countTimerRef.current);
      countTimerRef.current = null;
    }
  }, []);

  // Initialize Canvas Particle Engine
  useEffect(() => {
    if (canvasRef.current) {
      particleEngine.init(canvasRef.current);
      particleEngine.setTheme(INITIAL_SETTINGS.theme);
    }
    return () => {
      clearScheduledTimers();
      particleEngine.destroy();
    };
  }, [clearScheduledTimers]);

  // Sync theme & particle settings with ParticleEngine
  useEffect(() => {
    particleEngine.setTheme(settings.theme);
    particleEngine.setEnabled(settings.particlesEnabled);
  }, [settings.theme, settings.particlesEnabled]);

  // Sync Audio Settings & Procedural Foley Ambience
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
    sound.setVolume(settings.sfxVolume);
    sound.setAmbience(settings.ambience);
    sound.setAmbienceVolume(settings.ambienceVolume);
  }, [settings.soundEnabled, settings.sfxVolume, settings.ambience, settings.ambienceVolume]);

  // First-time visitor onboarding check
  useEffect(() => {
    try {
      const completed = localStorage.getItem('project_p_onboarding_completed');
      if (!completed && isDefaultPlayerName(userProfile.name)) {
        setIsWelcomeOpen(true);
      }
    } catch {}
  }, []);

  // Active match disconnect/crash recovery check
  useEffect(() => {
    try {
      const raw = localStorage.getItem('project_p_active_match');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.roomCode && Date.now() - parsed.timestamp < 180000) {
          setActiveMatchRecovery(parsed.roomCode);
        }
      }
    } catch {}
  }, []);

  // Persist active multiplayer match state for recovery
  useEffect(() => {
    try {
      if (
        (screen === 'game' || screen === 'uno') &&
        isMultiplayerGame &&
        multiplayerManager.roomCode
      ) {
        localStorage.setItem(
          'project_p_active_match',
          JSON.stringify({
            roomCode: multiplayerManager.roomCode,
            screen,
            timestamp: Date.now()
          })
        );
      } else if (screen === 'menu') {
        localStorage.removeItem('project_p_active_match');
      }
    } catch {}
  }, [screen, isMultiplayerGame]);

  // Instant room join via URL query params (?oda=... or ?room=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('oda') || urlParams.get('room') || urlParams.get('kod');
      if (roomParam) {
        const digits =
          roomParam.trim().replace(/\D/g, '').slice(0, 6) || roomParam.trim().slice(0, 6);
        if (digits) {
          setInitialJoinCode(digits);
          setIsMultiplayerOpen(true);
        }
      }
    } catch (err) {
      console.error('URL parse error:', err);
    }
  }, []);

  // Initialize Global Friend & Presence Network
  useEffect(() => {
    friendNetwork.init();

    const unsubInvite = friendNetwork.onGameInvite(inv => {
      sound.playClick();
      setIncomingInvite(inv);
    });

    const unsubNotice = friendNetwork.onFriendNotice(notice => {
      sound.playClick();
      setUserProfile(getUserProfile());
      setDevToast(`🤝 ${notice.fromName} (#${notice.fromFriendCode}) seni arkadaş ekledi!`);
    });

    return () => {
      unsubInvite();
      unsubNotice();
    };
  }, []);

  // Sync live presence status with friendNetwork
  useEffect(() => {
    const status =
      screen === 'game' || screen === 'uno'
        ? 'playing'
        : isMultiplayerOpen
        ? 'lobby'
        : 'menu';
    friendNetwork.setStatus(
      status,
      multiplayerManager.roomCode || undefined,
      screen === 'uno' ? 'uno' : 'pisti'
    );
  }, [screen, isMultiplayerOpen]);

  const triggerShake = useCallback(() => {
    if (!settings.screenShake) return;
    setIsShaking(true);
    const t = window.setTimeout(() => setIsShaking(false), 450);
    dealTimersRef.current.push(t);
  }, [settings.screenShake]);

  // Fallback target geometry if DOM node is not yet measured
  const getHandCardFallbackTarget = useCallback(
    (playerIdx: number, cardIdx: number, totalPlayers: number) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const handEl = tableRefs.current.handEls[playerIdx];
      const base = getCenter(
        handEl,
        playerIdx === 0 || playerIdx === 2
          ? centerX
          : playerIdx === 1
          ? window.innerWidth - 90
          : 90,
        playerIdx === 0
          ? window.innerHeight - 95
          : playerIdx === 2 || (totalPlayers === 2 && playerIdx === 1)
          ? 110
          : centerY
      );

      const isTopOrBottom =
        playerIdx === 0 ||
        (totalPlayers === 2 && playerIdx === 1) ||
        playerIdx === 2;

      if (isTopOrBottom) {
        const spread = playerIdx === 0 ? 74 : 58;
        const centeredIdx = cardIdx - 1.5;
        const tilt = centeredIdx * 5;
        return {
          x: base.x + centeredIdx * spread,
          y: base.y,
          rotation: tilt,
          size: (totalPlayers === 4 && playerIdx === 2 ? 'sm' : 'md') as 'sm' | 'md'
        };
      }

      const centeredIdx = cardIdx - 1.5;
      const baseRot = playerIdx === 1 ? -90 : 90;
      return {
        x: base.x,
        y: base.y + centeredIdx * 34,
        rotation: baseRot + centeredIdx * 4,
        size: 'sm' as const
      };
    },
    []
  );

  /**
   * ZERO-TELEPORTATION DEAL CHOREOGRAPHY:
   * 1. Pre-populates `tableCards` and `players[i].hand` in the DOM with `hiddenCardIds` (`opacity: 0`)
   *    so every card already occupies its exact final flexbox slot without shifting existing cards!
   * 2. Measures each card's exact `[data-card-id="${card.id}"]` `getBoundingClientRect()` when launching flight.
   * 3. Reveals the DOM slot (`hiddenCardIds.delete(card.id)`) in the exact same frame the flying card finishes!
   */
  const runDealChoreography = useCallback(
    (
      tableToDeal: Card[],
      handsToDeal: Card[][],
      finalRemainingDeck: Card[],
      totalPlayers: number
    ) => {
      clearScheduledTimers();
      setIsDealingAnimation(true);
      setIsActionLocked(true);

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
      }

      const steps: DealStep[] = [];
      let currentDelay = 70;
      const stepInterval = 115;

      // 1. Initial 4 table cards (first 3 face-down, 4th face-up)
      preparedTableCards.forEach(cardWithOffset => {
        steps.push({
          kind: 'table',
          card: cardWithOffset,
          delay: currentDelay
        });
        currentDelay += stepInterval;
      });

      if (preparedTableCards.length > 0) {
        currentDelay += 140;
      }

      // 2. Deal 4 cards to each player round-robin
      for (let cIdx = 0; cIdx < 4; cIdx++) {
        for (let pIdx = 0; pIdx < totalPlayers; pIdx++) {
          const card = handsToDeal[pIdx]?.[cIdx];
          if (!card) continue;
          steps.push({
            kind: 'hand',
            card,
            playerIdx: pIdx,
            cardIdxInHand: cIdx,
            delay: currentDelay
          });
          currentDelay += totalPlayers === 4 ? 90 : 110;
        }
      }

      let completedCount = 0;
      const totalSteps = steps.length;

      const finishAllDealing = () => {
        setHiddenCardIds(new Set());
        setFlyingCards([]);
        setDeck(finalRemainingDeck);
        setIsDealingAnimation(false);
        setIsActionLocked(false);
        setTurnTimeRemaining(15);
      };

      steps.forEach((step, sIdx) => {
        const timerId = window.setTimeout(() => {
          sound.playCardDeal();

          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          const deckPos = getCenter(tableRefs.current.deckEl, centerX - 130, centerY);
          const potPos = getCenter(tableRefs.current.potEl, centerX + 40, centerY);

          const flyId = `deal-${step.card.id}-${sIdx}-${Date.now()}`;

          if (step.kind === 'table') {
            const ox = step.card.tableOffsetX ?? 0;
            const oy = step.card.tableOffsetY ?? 0;
            const rot = step.card.tableRotation ?? 0;

            const domSlot = cardDomElements.get(step.card.id) || (document.querySelector(
              `[data-card-id="${step.card.id}"]`
            ) as HTMLElement | null);
            let targetX = potPos.x + ox;
            let targetY = potPos.y + oy;
            if (domSlot) {
              const r = domSlot.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                targetX = r.left + r.width / 2;
                targetY = r.top + r.height / 2;
              }
            }

            const flyItem: FlyingCardData = {
              id: flyId,
              card: step.card,
              startX: deckPos.x,
              startY: deckPos.y,
              targetX,
              targetY,
              startRotation: 0,
              targetRotation: rot,
              startFaceUp: false,
              endFaceUp: step.card.faceUp,
              startScale: 1,
              targetScale: 1,
              duration: 450,
              arcHeight: 88,
              size: 'md',
              zIndex: 60 + sIdx,
              onComplete: () => {
                setHiddenCardIds(prev => {
                  const next = new Set(prev);
                  next.delete(step.card.id);
                  return next;
                });
                setFlyingCards(prev => prev.filter(f => f.id !== flyId));

                completedCount++;
                if (completedCount >= totalSteps) {
                  finishAllDealing();
                }
              }
            };

            setFlyingCards(prev => [...prev, flyItem]);
          } else {
            const pIdx = step.playerIdx!;
            const cIdx = step.cardIdxInHand!;
            const isHuman = pIdx === 0;
            const fallback = getHandCardFallbackTarget(pIdx, cIdx, totalPlayers);

            // Measure exact pre-rendered DOM slot for 0px jump!
            const domSlot = cardDomElements.get(step.card.id) || (document.querySelector(
              `[data-card-id="${step.card.id}"]`
            ) as HTMLElement | null);
            let targetX = fallback.x;
            let targetY = fallback.y;
            if (domSlot) {
              const r = domSlot.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                targetX = r.left + r.width / 2;
                targetY = r.top + r.height / 2;
              }
            }

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
              duration: 460,
              arcHeight: 92,
              size: fallback.size,
              zIndex: 60 + sIdx,
              onComplete: () => {
                setHiddenCardIds(prev => {
                  const next = new Set(prev);
                  next.delete(step.card.id);
                  return next;
                });
                setFlyingCards(prev => prev.filter(f => f.id !== flyId));

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

      // Master safety timer so 2P or 4P deals can never get stuck
      const masterFinishTimer = window.setTimeout(() => {
        finishAllDealing();
      }, currentDelay + 550);
      dealTimersRef.current.push(masterFinishTimer);
    },
    [clearScheduledTimers, getHandCardFallbackTarget]
  );

  // Setup Players based on count & difficulty
  const createInitialPlayers = (
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
          hand: [],
          collectedCards: [],
          pistiPairs: [],
          pistiCount: 0,
          doublePistiCount: 0,
          score: 0,
          roundScore: 0,
          level: 1
        });
      }
      return playersList;
    }

    const p1Name = customOpponentName
      ? customOpponentName
      : difficulty === 'easy'
      ? 'Acemi Bot'
      : difficulty === 'hard'
      ? 'Şampiyon AI'
      : 'Kurnaz Bot';

    const basePlayers: Player[] = [
      {
        id: 'user',
        name: curProfile.name || localName,
        isAI: false,
        avatar: localAvatar,
        avatarId: curProfile.avatarId || 'wolf',
        customAvatarUrl: curProfile.customAvatarDataUrl,
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
        avatar: customOpponentAvatar || '🤖',
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
    ];

    if (count === 4) {
      basePlayers.push(
        {
          id: 'bot-2',
          name: 'Dayı (Ortak)',
          isAI: true,
          avatar: '👴',
          avatarId: 'dayi',
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
          id: 'bot-3',
          name: 'Muhtar',
          isAI: true,
          avatar: '🧔',
          avatarId: 'muhtar',
          hand: [],
          collectedCards: [],
          pistiPairs: [],
          pistiCount: 0,
          doublePistiCount: 0,
          score: 0,
          roundScore: 0,
          level: 1
        }
      );
    }

    return basePlayers;
  };

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
      const t = window.setTimeout(() => {
        setIsShuffling(false);
        const initialDeal = dealInitialGame(seedDeck, configuredSettings.playerCount);
        const orientedHands = orientHandsForPerspective(
          initialDeal.playerHands,
          isMp ? mySeat : 0
        );

        setSeenCards([
          ...initialDeal.tableCards.filter(c => c.faceUp),
          ...orientedHands[0]
        ]);

        runDealChoreography(
          initialDeal.tableCards,
          orientedHands,
          initialDeal.remainingDeck,
          configuredSettings.playerCount
        );
      }, shuffleDuration);
      dealTimersRef.current.push(t);
    },
    [clearScheduledTimers, runDealChoreography]
  );

  // Standard Singleplayer Start
  const handleStartGame = useCallback(
    (configuredSettings: GameSettings) => {
      const randomStyle = SHUFFLE_STYLES[Math.floor(Math.random() * SHUFFLE_STYLES.length)];
      const freshDeck = shuffleDeck(createDeck());
      startMatchWithDeck(configuredSettings, freshDeck, randomStyle);
    },
    [startMatchWithDeck]
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
        const initialDeal = dealInitialGame(seedDeck, currentSettings.playerCount);
        const orientedHands = orientHandsForPerspective(
          initialDeal.playerHands,
          isMp ? myMultiplayerSeatRef.current : 0
        );

        setSeenCards([
          ...initialDeal.tableCards.filter(c => c.faceUp),
          ...orientedHands[0]
        ]);

        runDealChoreography(
          initialDeal.tableCards,
          orientedHands,
          initialDeal.remainingDeck,
          currentSettings.playerCount
        );
      }, shuffleDuration);
      dealTimersRef.current.push(t);
    },
    [clearScheduledTimers, runDealChoreography]
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
    startNextRoundWithDeck
  ]);

  /**
   * 2-PHASE MAGNETIC SWEEP & PİŞTİ 90° CROSS CHOREOGRAPHY:
   * - Phase 1 (Waypoint above Pot):
   *   - If Pişti: Bottom card flips face-down (0°) while top card stays face-up and locks into 90° cross in mid-air!
   *   - If Regular Sweep: Scattered pot cards magnetically gather into a tight stack above the pot.
   * - Phase 2:
   *   - Cards arc along a curved ribbon stream into the winner's Pişti stack or Collected stack,
   *     triggering an elastic pile bounce and floating capture badge!
   */
  const animateSweepToCollector = useCallback(
    (
      cardsToSweep: Card[],
      winnerIdx: number,
      isPistiSweep: boolean,
      captureLabel: string,
      onSweepComplete: () => void
    ) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const potPos = getCenter(tableRefs.current.potEl, centerX + 40, centerY);

      const targetEl = isPistiSweep
        ? tableRefs.current.pistiEls[winnerIdx] ||
          tableRefs.current.collectedEls[winnerIdx] ||
          tableRefs.current.handEls[winnerIdx]
        : tableRefs.current.collectedEls[winnerIdx] ||
          tableRefs.current.handEls[winnerIdx];

      const targetPos = getCenter(
        targetEl,
        centerX - 180,
        winnerIdx === 0 ? window.innerHeight - 100 : 100
      );

      sound.playSweepGather();
      setTableCards([]);

      const visibleToFly = cardsToSweep.slice(-12);
      if (visibleToFly.length === 0) {
        onSweepComplete();
        return;
      }

      let finishedCount = 0;

      const sweepFlying: FlyingCardData[] = visibleToFly.map((c, idx) => {
        const ox = c.tableOffsetX ?? 0;
        const oy = c.tableOffsetY ?? 0;
        const rot = c.tableRotation ?? 0;
        const flyId = `sweep-${c.id}-${idx}-${Date.now()}`;

        const isTopCardOfPair = idx === visibleToFly.length - 1;
        // Pişti: bottom card 0° face-down, top card 90° face-up!
        const targetRot =
          isPistiSweep && isTopCardOfPair ? 90 : isPistiSweep ? 0 : (idx % 2 === 0 ? 1 : -1) * 3;
        const endFaceUp = isPistiSweep ? isTopCardOfPair : false;

        return {
          id: flyId,
          card: c,
          startX: potPos.x + ox,
          startY: potPos.y + oy,
          waypointX: potPos.x,
          waypointY: potPos.y - (isPistiSweep ? 22 : 12),
          waypointRotation: targetRot,
          waypointScale: isPistiSweep ? 1.12 : 1.04,
          waypointOffset: isPistiSweep ? 0.38 : 0.30,
          targetX: targetPos.x,
          targetY: targetPos.y,
          startRotation: rot,
          targetRotation: targetRot,
          startFaceUp: c.faceUp,
          endFaceUp,
          startScale: 1,
          targetScale: 0.76,
          duration: isPistiSweep ? 540 : 440 + idx * 22,
          arcHeight: 78,
          size: 'md',
          zIndex: 75 + idx,
          onComplete: () => {
            setFlyingCards(prev => prev.filter(f => f.id !== flyId));
            finishedCount++;
            if (finishedCount >= visibleToFly.length) {
              setRecentCapture({
                id: `cap-${Date.now()}`,
                playerIdx: winnerIdx,
                isPisti: isPistiSweep,
                label: captureLabel
              });
              const clearCapTimer = window.setTimeout(() => {
                setRecentCapture(null);
              }, 1500);
              dealTimersRef.current.push(clearCapTimer);

              onSweepComplete();
            }
          }
        };
      });

      setFlyingCards(prev => [...prev, ...sweepFlying]);
    },
    []
  );

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
      setIsActionLocked(true);

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const isHuman = playerIndex === 0;

      // Deterministic offset based on card ID so Host and Guest pot stacks look clean
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

      let startX = centerX;
      let startY = isHuman ? window.innerHeight - 110 : 110;
      const startRot = initialTilt;

      if (sourceRect) {
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
        } else {
          const handCenter = getCenter(
            tableRefs.current.handEls[playerIndex],
            centerX,
            startY
          );
          startX = handCenter.x;
          startY = handCenter.y;
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

      // Instantly mark card hidden in hand to prevent abrupt hand layout jumps while flying
      setHiddenCardIds(prev => new Set(prev).add(card.id));

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
        startScale: 1,
        targetScale: 1,
        duration: isHuman ? 490 : 460,
        arcHeight: 96,
        size: 'md',
        zIndex: 85,
        onComplete: () => {
          // Remove played card from player's hand now that flight is complete
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
              pointsAwarded: 50,
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

          // Sweep into winner's pile (separate 90° crossed "tersli düzlü" Pişti pile if Pişti!)
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
                            bottomCard: { ...updatedPile[0], faceUp: false }, // ters (arkası dönük)
                            topCard: { ...placedCard, faceUp: true }, // düz (bize bakıyor, 90° açıyla)
                            isDouble: Boolean(isDouble)
                          }
                        : null;

                    return {
                      ...p,
                      pistiPairs: pistiPair ? [...p.pistiPairs, pistiPair] : p.pistiPairs,
                      pistiCount: isPisti ? p.pistiCount + 1 : p.pistiCount,
                      doublePistiCount: isDouble ? p.doublePistiCount + 1 : p.doublePistiCount,
                      bonusPoints:
                        (p.bonusPoints || 0) + (evaluation.pointsAwarded || 0),
                      collectedCards:
                        isPisti || isDouble
                          ? p.collectedCards
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
    [triggerShake, animateSweepToCollector]
  );

  const triggerEmote = useCallback((playerIdx: number, emoji: string) => {
    sound.playClick();
    const emoteId = `emote-${Date.now()}-${Math.random()}`;
    setActiveEmotes(prev => [...prev.filter(e => e.playerIdx !== playerIdx), { playerIdx, emoji, id: emoteId }]);
    const timer = window.setTimeout(() => {
      setActiveEmotes(prev => prev.filter(e => e.id !== emoteId));
    }, 2000);
    dealTimersRef.current.push(timer);
  }, []);

  const handleSendEmote = useCallback(
    (emoji: string) => {
      triggerEmote(0, emoji);
      if (isMultiplayerGame && multiplayerManager.isConnected) {
        multiplayerManager.send({
          type: 'MP_EMOTE',
          emoji,
          seatIndex: myMultiplayerSeatRef.current,
          senderPeerId: multiplayerManager.instanceId
        });
      } else if (!isMultiplayerGame) {
        // Playful AI counter-reaction in singleplayer
        const botReactions = ['☕', '👏', '🔥', '😅', '🃏', '😎'];
        const reply = botReactions[Math.floor(Math.random() * botReactions.length)];
        const delay = 650 + Math.random() * 800;
        const timer = window.setTimeout(() => {
          triggerEmote(1, reply);
        }, delay);
        dealTimersRef.current.push(timer);
      }
    },
    [isMultiplayerGame, triggerEmote]
  );

  // Listen to Online Multiplayer Events (Host & Guest Synchronization)
  useEffect(() => {
    const unsubscribe = multiplayerManager.onEvent((msg: MultiplayerEvent) => {
      if (msg.type === 'MP_GAME_START') {
        // Guest receives synchronized match launch from Host!
        if (!multiplayerManager.isHost) {
          const mySlot = msg.slots.find(s => s.peerId === multiplayerManager.instanceId);
          const mySeatIdx = mySlot ? mySlot.seatIndex : 1;

          if (msg.gameType === 'uno') {
            setMultiplayerSeedUnoDeck(msg.seedUnoDeck || null);
            setIsMultiplayerGame(true);
            setIsMultiplayerHost(false);
            setMyMultiplayerSeat(mySeatIdx);
            setActiveMultiplayerSlots(msg.slots);
            setIsMultiplayerOpen(false);
            setScreen('uno');
          } else {
            startMatchWithDeck(msg.settings, msg.seedDeck, msg.shuffleStyle, {
              isMultiplayer: true,
              isHost: false,
              mySeatIndex: mySeatIdx,
              slots: msg.slots
            });
          }
        }
      } else if (msg.type === 'MP_CARD_PLAYED') {
        if (msg.senderPeerId === multiplayerManager.instanceId) return;

        // 1. Validate that msg.senderPeerId matches the assigned seat
        const senderSlot = activeMultiplayerSlotsRef.current?.find(s => s.seatIndex === msg.seatIndex);
        if (
          senderSlot &&
          senderSlot.peerId &&
          msg.senderPeerId &&
          senderSlot.peerId !== msg.senderPeerId
        ) {
          console.warn(
            `Unauthorized card play: peer ${msg.senderPeerId} attempted play for seat ${msg.seatIndex}!`
          );
          return;
        }

        const N = settingsRef.current.playerCount;
        const targetLocalIdx = (msg.seatIndex - myMultiplayerSeatRef.current + N) % N;

        // 2. Validate that it is currently this player's turn
        if (currentTurnRef.current !== targetLocalIdx) {
          console.warn(
            `Out-of-turn card play attempt: seat ${msg.seatIndex} played but turn is ${currentTurnRef.current}!`
          );
          return;
        }

        const targetPlayer = playersRef.current[targetLocalIdx];
        if (!targetPlayer) return;

        const foundCard = targetPlayer.hand.find(c => c.id === msg.cardId);
        if (foundCard) {
          handlePlayCardWithAnimation(targetLocalIdx, foundCard, undefined, 0, true);
        } else {
          console.warn(
            `Card desync: player seat ${msg.seatIndex} played ${msg.cardId} but not in local hand!`
          );
          if (!multiplayerManager.isHost) {
            multiplayerManager.send({
              type: 'REQUEST_RESYNC',
              seatIndex: myMultiplayerSeatRef.current,
              senderPeerId: multiplayerManager.instanceId
            });
          }
        }
      } else if (msg.type === 'MP_NEXT_ROUND') {
        if (!multiplayerManager.isHost) {
          setReadySeatsForNextRound(new Set());
          setRoundScores(null);
          const N = settingsRef.current.playerCount;
          const guestStartingTurn = (msg.startingTurnSeat - myMultiplayerSeatRef.current + N) % N;
          startNextRoundWithDeck(msg.seedDeck, msg.shuffleStyle, guestStartingTurn);
        }
      } else if (msg.type === 'MP_ROUND_READY') {
        setReadySeatsForNextRound(prev => {
          const next = new Set(prev);
          if (msg.isReady) {
            next.add(msg.seatIndex);
          } else {
            next.delete(msg.seatIndex);
          }
          return next;
        });
      } else if (msg.type === 'MP_CHAT_MESSAGE') {
        if (msg.senderPeerId === multiplayerManager.instanceId) return;
        const safeText = typeof msg.text === 'string' ? msg.text.trim().slice(0, 80) : '';
        if (!safeText) return;
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            senderName: msg.senderName.slice(0, 20),
            senderAvatarId: msg.senderAvatarId,
            senderAvatarEmoji: msg.senderAvatar,
            text: safeText,
            timestamp: msg.timestamp,
            isMe: false
          }
        ]);
      } else if (msg.type === 'MP_EMOTE') {
        if (msg.senderPeerId === multiplayerManager.instanceId) return;
        const N = settingsRef.current.playerCount;
        const targetLocalIdx = (msg.seatIndex - myMultiplayerSeatRef.current + N) % N;
        triggerEmote(targetLocalIdx, msg.emoji);
      } else if (msg.type === 'PEER_RECONNECTING') {
        setPeerReconnectingSeconds(msg.secondsLeft);
      } else if (msg.type === 'PEER_RECONNECTED') {
        setPeerReconnectingSeconds(null);
      } else if (msg.type === 'PEER_DISCONNECTED') {
        setPeerReconnectingSeconds(null);
        if (isMultiplayerGameRef.current) {
          setMatchAbortedInfo({
            senderName: 'Rakip',
            reason: 'disconnect'
          });
        }
      } else if (msg.type === 'MP_MATCH_ABORTED') {
        if (msg.gameType && msg.gameType !== 'pisti') return;
        setPeerReconnectingSeconds(null);
        setMatchAbortedInfo({
          senderName: msg.senderName || 'Rakip oyuncu',
          reason: msg.reason || 'surrender'
        });
      }
    });

    return unsubscribe;
  }, [startMatchWithDeck, handlePlayCardWithAnimation, startNextRoundWithDeck, triggerEmote]);

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
    currentTurn,
    isDealingAnimation,
    isShuffling,
    isActionLocked,
    onTableCount.isActive,
    onTableCount.isDone,
    roundScores?.isGameOver,
    handlePlayCardWithAnimation
  ]);

  /**
   * Start Live On-Table Counting Ceremony directly on the table felt!
   */
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

      const userCards = [
        ...userSideAggregate.collectedCards,
        ...(userSideAggregate.pistiPairs || []).flatMap(p => [p.bottomCard, p.topCard])
      ];
      const oppCards = [
        ...oppSideAggregate.collectedCards,
        ...(oppSideAggregate.pistiPairs || []).flatMap(p => [p.bottomCard, p.topCard])
      ];

      const userHasMajority = userCards.length > oppCards.length;
      const oppHasMajority = oppCards.length > userCards.length;

      const uBreakdown = calculateRoundBreakdown(userSideAggregate, userHasMajority);
      const oBreakdown = calculateRoundBreakdown(oppSideAggregate, oppHasMajority);

      const newUserScore = finalPlayersState[0].score + uBreakdown.totalRoundPoints;
      const newOppScore = finalPlayersState[1].score + oBreakdown.totalRoundPoints;

      const target = settingsRef.current.targetScore;
      const gameOver =
        (newUserScore >= target || newOppScore >= target) && newUserScore !== newOppScore;

      let matchWinner: Player | null = null;
      if (gameOver) {
        matchWinner = newUserScore > newOppScore ? userSideAggregate : oppSideAggregate;
        const isUserWin = newUserScore > newOppScore;
        recordMatchStats(
          isUserWin,
          newUserScore,
          userSideAggregate.pistiCount,
          userSideAggregate.doublePistiCount,
          false
        );
        if (newUserScore > newOppScore) {
          confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } });
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

      let uIdx = 0;
      let oIdx = 0;
      const userPointList: Card[] = [];
      const oppPointList: Card[] = [];
      let userPts = 0;
      let oppPts = 0;

      if (countTimerRef.current) {
        window.clearInterval(countTimerRef.current);
      }

      const startCountLoop = (intervalMs: number) => {
        if (countTimerRef.current) {
          window.clearInterval(countTimerRef.current);
        }
        countTimerRef.current = window.setInterval(() => {
          const userDone = uIdx >= userCards.length;
          const oppDone = oIdx >= oppCards.length;

          if (userDone && oppDone) {
            if (countTimerRef.current) {
              window.clearInterval(countTimerRef.current);
              countTimerRef.current = null;
            }
            sound.playMatchSweep();

            setOnTableCount(prev => ({
              ...prev,
              userCountedIndex: userCards.length,
              oppCountedIndex: oppCards.length,
              isDone: true
            }));

            if (userHasMajority) {
              sound.playDoublePisti();
              confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
            }

            return;
          }

          if (!userDone) {
            const c = userCards[uIdx];
            sound.playCountTick(1 + (uIdx % 8) * 0.05);

            const isSpecialCard =
              c.value === 1 ||
              c.value === 11 ||
              (c.suit === 'diamonds' && c.value === 10) ||
              (c.suit === 'clubs' && c.value === 2);

            if (isSpecialCard) {
              const pts =
                c.suit === 'diamonds' && c.value === 10
                  ? 3
                  : c.suit === 'clubs' && c.value === 2
                  ? 2
                  : 1;
              sound.playPointCardChime(pts);
              userPointList.push(c);
              userPts += pts;
            }

            uIdx++;
          }

          if (!oppDone) {
            const c = oppCards[oIdx];
            if (userDone) {
              sound.playCountTick(1 + (oIdx % 8) * 0.05);
            }
            const isSpecialCard =
              c.value === 1 ||
              c.value === 11 ||
              (c.suit === 'diamonds' && c.value === 10) ||
              (c.suit === 'clubs' && c.value === 2);

            if (isSpecialCard) {
              const pts =
                c.suit === 'diamonds' && c.value === 10
                  ? 3
                  : c.suit === 'clubs' && c.value === 2
                  ? 2
                  : 1;
              oppPointList.push(c);
              oppPts += pts;
            }

            oIdx++;
          }

          setOnTableCount(prev => ({
            ...prev,
            userCountedIndex: uIdx,
            oppCountedIndex: oIdx,
            userCurrentCard: userCards[Math.min(uIdx, Math.max(0, userCards.length - 1))],
            oppCurrentCard: oppCards[Math.min(oIdx, Math.max(0, oppCards.length - 1))],
            userPointCards: [...userPointList],
            oppPointCards: [...oppPointList],
            userCardPoints: userPts,
            oppCardPoints: oppPts
          }));
        }, intervalMs);
      };

      // 175ms per card gives a crisp, tactile "tık-tık-tık" live counting rhythm
      startCountLoop(175);
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
    setOnTableCount(prev => ({ ...prev, isActive: false, isDone: true }));
  }, []);

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
        const nextDeal = dealHand(deck, settings.playerCount);
        const orientedHands = orientHandsForPerspective(
          nextDeal.playerHands,
          isMultiplayerGame ? myMultiplayerSeatRef.current : 0
        );
        setSeenCards(prev => [...prev, ...orientedHands[0]]);

        runDealChoreography(
          [],
          orientedHands,
          nextDeal.remainingDeck,
          settings.playerCount
        );
      }, 280);
      return () => window.clearTimeout(timer);
    }

    // All 52 cards played -> Sweep remaining table cards to last collector & start Live On-Table Counting!
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
    settings.playerCount,
    isMultiplayerGame,
    isMultiplayerHost,
    isDealingAnimation,
    isShuffling,
    isActionLocked,
    flyingCards.length,
    onTableCount.isActive,
    onTableCount.isDone,
    roundScores?.isGameOver,
    runDealChoreography,
    animateSweepToCollector,
    startOnTableCounting
  ]);

  // AI Turn Automator (Works for 2-player and 4-player bots!)
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

    // In Multiplayer mode, only the room Host runs bot AI decisions
    if (isMultiplayerGame && !isMultiplayerHost) return;

    const currentBot = players[currentTurn];
    if (!currentBot || currentBot.hand.length === 0 || !currentBot.isAI) return;

    const delay = Math.floor(Math.random() * 280) + 520;
    const timer = window.setTimeout(() => {
      const chosenCard = chooseAICard(
        currentBot.hand,
        tableCards,
        seenCards,
        settings.aiDifficulty
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
  }, [readySeatsForNextRound, isMultiplayerGame]);

  // Host Synchronous Auto-Start: when all human players click ready, advance to next round
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
    if (isMultiplayerGame) {
      setIsMultiplayerOpen(true);
    } else {
      setIsSetupOpen(true);
    }
  }, [isMultiplayerGame]);

  const handleExitToMenu = useCallback(() => {
    setOnTableCount(prev => ({ ...prev, isActive: false, isDone: false }));
    setRoundScores(null);
    setReadySeatsForNextRound(new Set());
    setScreen('menu');
  }, []);

  // Surrender Confirmation Action in Multiplayer
  const handleConfirmSurrender = useCallback(() => {
    setIsSurrenderModalOpen(false);
    if (isMultiplayerGameRef.current) {
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
      setIsMultiplayerGame(false);
      setMyMultiplayerSeat(0);
      myMultiplayerSeatRef.current = 0;
    }
    clearScheduledTimers();
    sound.playClick();
    setFlyingCards([]);
    setHiddenCardIds(new Set());
    setIsShuffling(false);
    setIsDealingAnimation(false);
    setIsActionLocked(false);
    setOnTableCount(prev => ({ ...prev, isActive: false, isDone: false }));
    setRoundScores(null);
    setReadySeatsForNextRound(new Set());
    setScreen('menu');
  }, [userProfile.name, clearScheduledTimers]);

  // Notify peer on tab close / reload in multiplayer
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isMultiplayerGameRef.current) {
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
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userProfile.name]);

  // Dev Test Macro: Reveal all hands exclusively on local client (Ctrl+Shift+X or Alt+X)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!import.meta.env.DEV) return;
      const isCtrlShiftX = e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x');
      const isAltX = e.altKey && (e.key === 'x' || e.key === 'X');

      if (isCtrlShiftX || isAltX) {
        e.preventDefault();
        if (isMultiplayerGameRef.current) {
          sound.playClick();
          showDevToast('🔒 Çok oyunculu modda elleri görme hilesi engellenmiştir');
          return;
        }
        setDevSeeAllHands(prev => {
          const next = !prev;
          sound.playClick();
          showDevToast(next ? '👁️ DEV TEST MODU: TÜM ELLER AÇIK' : '🔒 DEV TEST MODU: NORMAL GÖRÜNÜM');
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDevToast]);

  const handleUpdateProfile = useCallback((newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setPlayers(prev =>
      prev.map((p, idx) => (idx === 0 ? { ...p, name: newProfile.name } : p))
    );
  }, []);

  const handleSendChatMessage = useCallback(
    (text: string) => {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        senderName: userProfile.name,
        senderAvatarId: userProfile.avatarId,
        text,
        timestamp: Date.now(),
        isMe: true
      };

      setChatMessages(prev => [...prev, newMsg]);

      if (isMultiplayerGame && multiplayerManager.isConnected) {
        multiplayerManager.send({
          type: 'MP_CHAT_MESSAGE',
          senderPeerId: multiplayerManager.instanceId,
          senderName: userProfile.name,
          senderAvatarId: userProfile.avatarId,
          text,
          seatIndex: myMultiplayerSeatRef.current,
          timestamp: Date.now()
        });
      } else if (!isMultiplayerGame) {
        // Singleplayer Bot Banter
        if (Math.random() < 0.7) {
          const botReplies = [
            'Attığın karta dikkat et!',
            'Bu pişti senin sonun olacak :)',
            'Şansın yaver gitti bu el...',
            'İyi oynadın ama ben buradayım!',
            'Kıraathane reisi affetmez!'
          ];
          const randomReply =
            botReplies[Math.floor(Math.random() * botReplies.length)];
          const botName = playersRef.current[1]?.name || 'Kurnaz Bot';
          const t = window.setTimeout(() => {
            setChatMessages(prev => [
              ...prev,
              {
                id: `bot-msg-${Date.now()}`,
                senderName: botName,
                senderAvatarId: 'lion',
                text: randomReply,
                timestamp: Date.now(),
                isMe: false
              }
            ]);
          }, 1100);
          dealTimersRef.current.push(t);
        }
      }
    },
    [isMultiplayerGame, userProfile]
  );

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-950 font-sans transition-transform duration-100 ${
        isShaking ? 'animate-shake' : ''
      }`}
    >
      {/* Background High-FPS Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-30 w-full h-full"
      />

      {/* Card Flying & 5 Distinct Deck Shuffle Animations Layer */}
      <CardAnimationLayer
        isShuffling={isShuffling}
        shuffleStyle={shuffleStyle}
        getDeckTargetPos={getDeckTargetPos}
        flyingCards={flyingCards}
        cardBack={settings.cardBack}
        theme={settings.theme}
      />

      {/* Active Match Disconnect Recovery Top Banner */}
      {screen === 'menu' && activeMatchRecovery && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-amber-400 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top">
          <span className="text-xs font-bold text-amber-300">
            ⚡ Kesintiye uğrayan bir maçın var (#{activeMatchRecovery})
          </span>
          <button
            onClick={() => {
              sound.playClick();
              setInitialJoinCode(activeMatchRecovery);
              setIsMultiplayerOpen(true);
              setActiveMatchRecovery(null);
            }}
            className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow"
          >
            Yeniden Bağlan
          </button>
          <button
            onClick={() => {
              sound.playClick();
              localStorage.removeItem('project_p_active_match');
              setActiveMatchRecovery(null);
            }}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
            title="Kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Screen View */}
      {screen === 'menu' ? (
        <MainMenu
          theme={settings.theme}
          cardBack={settings.cardBack}
          soundEnabled={settings.soundEnabled}
          defaultSetup={{
            playerCount: settings.playerCount,
            targetScore: settings.targetScore,
            fiveRuleEnabled: settings.fiveRuleEnabled,
            botDifficulty: settings.aiDifficulty
          }}
          userProfile={userProfile}
          onSelectTheme={(newTheme, matchingBack) => {
            setSettings(prev => ({
              ...prev,
              theme: newTheme,
              cardBack: matchingBack || prev.cardBack
            }));
          }}
          onToggleSound={() => {
            const val = !settings.soundEnabled;
            sound.setEnabled(val);
            if (val) sound.playClick();
            setSettings(s => ({ ...s, soundEnabled: val }));
          }}
          onQuickStartGame={handleQuickStartFromMenu}
          onStartSinglePlayer={() => setIsSetupOpen(true)}
          onOpenMultiplayer={() => setIsMultiplayerOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenFriends={() => setIsFriendsOpen(true)}
          onStartUnoGame={() => setScreen('uno')}
        />
      ) : screen === 'uno' ? (
        <UnoGameView
          onExitToMenu={() => {
            setIsMultiplayerGame(false);
            setMyMultiplayerSeat(0);
            myMultiplayerSeatRef.current = 0;
            setMultiplayerSeedUnoDeck(null);
            setScreen('menu');
          }}
          playerCount={isMultiplayerGame ? (settings.playerCount || 4) : 4}
          targetScore={250}
          isMultiplayer={isMultiplayerGame}
          isHost={isMultiplayerHost}
          mySeatIndex={myMultiplayerSeat}
          mpSlots={activeMultiplayerSlots}
          seedCards={multiplayerSeedUnoDeck || undefined}
        />
      ) : (
        <main className="relative z-10 flex-1 flex flex-col justify-between p-2 sm:p-4 max-w-7xl mx-auto w-full h-screen max-h-screen overflow-hidden">
          {/* Header Score HUD */}
          <ScoreBoard
            players={players}
            currentTurn={currentTurn}
            remainingDeckCount={deck.length}
            targetScore={settings.targetScore}
            round={round}
            soundEnabled={settings.soundEnabled}
            theme={settings.theme}
            fiveRuleEnabled={settings.fiveRuleEnabled}
            onToggleSound={() => {
              const val = !settings.soundEnabled;
              sound.setEnabled(val);
              if (val) sound.playClick();
              setSettings(s => ({ ...s, soundEnabled: val }));
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onExitToMenu={() => {
              if (isMultiplayerGame) {
                setIsSurrenderModalOpen(true);
                return;
              }
              clearScheduledTimers();
              sound.playClick();
              setFlyingCards([]);
              setHiddenCardIds(new Set());
              setIsShuffling(false);
              setIsDealingAnimation(false);
              setIsActionLocked(false);
              setOnTableCount(prev => ({ ...prev, isActive: false, isDone: false }));
              setScreen('menu');
            }}
          />

          {/* Table Surface with Zero-Teleportation Cards, Pişti 90° Stack & Live On-Table Count */}
          <TableSurface
            theme={settings.theme}
            cardBack={settings.cardBack}
            tableCards={tableCards}
            players={players}
            currentTurn={currentTurn}
            deckCount={deck.length}
            isBusy={isBusy}
            isShuffling={isShuffling}
            hiddenCardIds={hiddenCardIds}
            recentCapture={recentCapture}
            turnTimeRemaining={turnTimeRemaining}
            isMultiplayer={isMultiplayerGame}
            activeEmotes={activeEmotes}
            onSendEmote={handleSendEmote}
            onTableCountState={onTableCount}
            onSkipCounting={handleSkipCounting}
            onToggleFastCounting={handleToggleFastCounting}
            onFinishCounting={handleFinishCounting}
            tableRefs={tableRefs}
            onPlayCard={(card, rect, tilt) =>
              handlePlayCardWithAnimation(0, card, rect, tilt)
            }
            devSeeAllHands={devSeeAllHands && !isMultiplayerGame}
            isGameOver={Boolean(roundScores?.isGameOver)}
            gameOverWinner={roundScores?.winner ?? null}
            roundScores={roundScores}
            onNextRound={handleNextRound}
            onRestartGame={handleRestartGame}
            onExitToMenu={() => {
              if (isMultiplayerGame && !roundScores?.isGameOver) {
                setIsSurrenderModalOpen(true);
                return;
              }
              handleExitToMenu();
            }}
            isReadyForNextRound={isReadyForNextRound}
            readySeatsCount={readySeatsCount}
            totalHumanPlayersCount={totalHumanPlayersCount}
            slotsReadiness={slotsReadiness}
            onToggleReady={handleToggleReady}
          />

          {/* Semi-Transparent Floating In-Game Chat */}
          <InGameChat
            messages={chatMessages}
            onSendMessage={handleSendChatMessage}
            isMultiplayer={isMultiplayerGame}
          />
        </main>
      )}

      {/* Game Setup / Match Config Modal */}
      <GameSetupModal
        isOpen={isSetupOpen}
        initialSettings={settings}
        onStartGame={handleStartGame}
        onClose={() => setIsSetupOpen(false)}
      />

      {/* Multiplayer Peer Reconnecting Grace Period Toast */}
      {peerReconnectingSeconds !== null && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-950/95 border border-amber-500/70 text-amber-200 px-5 py-2.5 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.7)] backdrop-blur-md flex items-center gap-3 animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-semibold text-xs sm:text-sm tracking-wide">
            Rakip bağlantısı zayıfladı, bekleniyor... ({peerReconnectingSeconds}s)
          </span>
        </div>
      )}

      {/* Pişti & Jack Slam Floating Banner Overlay */}
      <PistiOverlay
        slam={activeSlam}
        onComplete={() => setActiveSlam(null)}
      />

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={newS => setSettings(prev => ({ ...prev, ...newS }))}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Multiplayer Lobby Modal (Supports both Same-PC Multi-Tab & Global Cross-Network WebRTC) */}
      <MultiplayerModal
        isOpen={isMultiplayerOpen}
        userName={players[0].name}
        userAvatar={players[0].avatar}
        initialJoinCode={initialJoinCode}
        initialSettings={settings}
        pendingFriendInvite={pendingFriendInvite}
        onClearPendingInvite={() => setPendingFriendInvite(null)}
        onOpenFriendsModal={() => setIsFriendsOpen(true)}
        onClose={() => setIsMultiplayerOpen(false)}
        onHostLaunchMatch={(
          _roomCode,
          lobbySettings,
          finalSlots,
          chosenGameType = 'pisti'
        ) => {
          if (chosenGameType === 'uno') {
            const seedUno = shuffleUnoDeck(createUnoDeck());
            setMultiplayerSeedUnoDeck(seedUno);
            multiplayerManager.send({
              type: 'MP_GAME_START',
              gameType: 'uno',
              settings: lobbySettings,
              seedDeck: [],
              seedUnoDeck: seedUno,
              shuffleStyle: 'riffle_bridge',
              round: 1,
              startingTurnSeat: 0,
              slots: finalSlots
            });

            setIsMultiplayerGame(true);
            setIsMultiplayerHost(true);
            setMyMultiplayerSeat(0);
            setActiveMultiplayerSlots(finalSlots);
            setIsMultiplayerOpen(false);
            setScreen('uno');
            return;
          }

          const randomStyle =
            SHUFFLE_STYLES[Math.floor(Math.random() * SHUFFLE_STYLES.length)];
          const sharedSeedDeck = shuffleDeck(createDeck());

          // Broadcast MP_GAME_START with deterministic seedDeck to all Guests
          multiplayerManager.send({
            type: 'MP_GAME_START',
            gameType: 'pisti',
            settings: lobbySettings,
            seedDeck: sharedSeedDeck,
            shuffleStyle: randomStyle,
            round: 1,
            startingTurnSeat: 0,
            slots: finalSlots
          });

          startMatchWithDeck(lobbySettings, sharedSeedDeck, randomStyle, {
            isMultiplayer: true,
            isHost: true,
            mySeatIndex: 0,
            slots: finalSlots
          });
        }}
      />

      {/* Standalone Friends & Global Player Network Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        onJoinFriendRoom={(code: string) => {
          const trimmed = code.trim().toUpperCase();
          const clean = trimmed.replace(/[^A-Z0-9]/g, '');
          let formatted = trimmed;
          if (clean.startsWith('UNO')) {
            formatted = `UNO-${clean.slice(3)}`;
          } else if (clean.startsWith('PST')) {
            formatted = `PST-${clean.slice(3)}`;
          } else {
            formatted = `PST-${clean}`;
          }
          setInitialJoinCode(formatted);
          setIsFriendsOpen(false);
          setIsMultiplayerOpen(true);
        }}
        onInviteFriendToMatch={friend => {
          setPendingFriendInvite({
            friendCode: friend.friendCode,
            name: friend.name,
            gameType: screen === 'uno' ? 'uno' : 'pisti'
          });
          setIsFriendsOpen(false);
          setIsMultiplayerOpen(true);
        }}
        onClose={() => {
          setUserProfile(getUserProfile());
          setIsFriendsOpen(false);
        }}
      />

      {/* Real-Time Incoming Friend Game Invite Banner */}
      {incomingInvite && (
        <div className="fixed top-4 right-4 z-[60] max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-emerald-400/90 shadow-[0_15px_45px_rgba(16,185,129,0.45)] backdrop-blur-xl flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">
                      {incomingInvite.fromName}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                      #{incomingInvite.fromFriendCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-300 font-bold mt-0.5">
                    Seni {incomingInvite.gameType === 'uno' ? 'UNO!' : 'PİŞTİ'} masasına davet ediyor!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIncomingInvite(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIncomingInvite(null)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Reddet
              </button>
              <button
                onClick={() => {
                  const code = incomingInvite.roomCode.trim().toUpperCase();
                  const formatted = code.startsWith('PST-') ? code : `PST-${code}`;
                  setIncomingInvite(null);
                  setInitialJoinCode(formatted);
                  setIsMultiplayerOpen(true);
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Odaya Katıl ({incomingInvite.roomCode})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile & Preset PP Selector Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        profile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* First-time Visitor Onboarding Welcome Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        profile={userProfile}
        onComplete={updated => {
          setUserProfile(updated);
          setIsWelcomeOpen(false);
        }}
      />

      {/* Dev Macro Notification Toast */}
      {devToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-4 py-2 rounded-full bg-slate-900/95 border-2 border-cyan-400 text-cyan-300 font-mono text-xs font-black shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            {devToast}
          </div>
        </div>
      )}

      {/* Dev Peek Active Indicator Pill (Clickable to deactivate) */}
      {devSeeAllHands && !isMultiplayerGame && (
        <button
          onClick={() => {
            setDevSeeAllHands(false);
            sound.playClick();
            showDevToast('🔒 DEV TEST MODU: NORMAL GÖRÜNÜM');
          }}
          title="Kapatmak için tıkla (veya Ctrl+Shift+X / Alt+X)"
          className="fixed bottom-3 right-3 z-40 px-3 py-1.5 rounded-lg bg-cyan-950/90 border border-cyan-400/70 text-cyan-300 font-mono text-[10px] sm:text-xs font-black shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-900 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>👁️ DEV PEEK AKTİF (Alt+X)</span>
        </button>
      )}

      {/* Surrender Confirmation Modal for Online Multiplayer */}
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
              Masadan ayrılırsanız devam eden online maç iptal edilecek ve rakip oyuncu bilgilendirilecektir.
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

      {/* Match Aborted Overlay (When Opponent Surrenders or Disconnects) */}
      {matchAbortedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-center max-w-sm w-full">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-300 mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              Maç İptal Edildi
            </h3>
            <p className="text-xs text-slate-300 mb-6">
              {matchAbortedInfo.senderName}{' '}
              {matchAbortedInfo.reason === 'surrender'
                ? 'maçı terk etti.'
                : 'masadan ayrıldı veya bağlantısı koptu.'}
            </p>
            <button
              onClick={() => {
                setMatchAbortedInfo(null);
                setIsMultiplayerGame(false);
      setMyMultiplayerSeat(0);
      myMultiplayerSeatRef.current = 0;
                clearScheduledTimers();
                setFlyingCards([]);
                setHiddenCardIds(new Set());
                setIsShuffling(false);
                setIsDealingAnimation(false);
                setIsActionLocked(false);
                setOnTableCount(prev => ({ ...prev, isActive: false, isDone: false }));
                setRoundScores(null);
                setReadySeatsForNextRound(new Set());
                setScreen('menu');
              }}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg cursor-pointer"
            >
              Ana Menüye Dön
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
