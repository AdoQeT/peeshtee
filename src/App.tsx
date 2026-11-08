import { logger } from './utils/logger';
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { X } from 'lucide-react';
import {
  GameSettings,
  Player,
  ShuffleStyle
} from './types/game';
import { createDeck, shuffleDeck, assignOpaqueDeckIds, createMaskedCard } from './core/deck';
import { sound } from './core/audio/soundEngine';
import { particleEngine } from './core/particles/particleEngine';
import { multiplayerManager } from './features/multiplayer/peerManager';
import { MainMenu } from './components/MainMenu';
import type { ActiveEmote } from './components/TableSurface';
const TableSurface = lazy(() =>
  import('./components/TableSurface').then(m => ({ default: m.TableSurface }))
);
import { ScoreBoard } from './components/ScoreBoard';
import { PistiOverlay } from './components/PistiOverlay';
import { AchievementToast } from './components/AchievementToast';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { GameSetupModal } from './components/GameSetupModal';
import { ProfileModal } from './components/ProfileModal';
import { FriendsModal } from './components/FriendsModal';
import { WelcomeModal } from './components/WelcomeModal';
import { InGameChat } from './components/InGameChat';
const UnoGameView = lazy(() =>
  import('./components/UnoGameView').then(m => ({ default: m.UnoGameView }))
);
import {
  getUserProfile,
  UserProfile,
  recordMatchStats,
  isDefaultPlayerName,
  claimUniqueFriendCode
} from './features/profile/profileManager';
import { MatchIntroOverlay, MatchIntroPlayer } from './components/MatchIntroOverlay';
import { CardCountingOverlay } from './components/CardCountingOverlay';
import {
  createUnoDeck,
  shuffleUnoDeck,
  assignOpaqueUnoDeckIds,
  buildMaskedUnoDeckForSeat
} from './features/uno/unoDeck';
import { friendNetwork, IncomingGameInvite } from './features/friends/friendNetwork';
import { CardAnimationLayer } from './components/CardAnimationLayer';
import { GlobalNotificationsLayer } from './components/GlobalNotificationsLayer';
import { useMultiplayerRoom, useMultiplayerEvents } from './hooks/useMultiplayerRoom';
import { usePistiGame } from './hooks/usePistiGame';

const INITIAL_SETTINGS: GameSettings = {
  soundEnabled: true,
  sfxVolume: 0.5,
  ambience: 'none',
  ambienceVolume: 0.25,
  screenShake: true,
  particlesEnabled: true,
  theme: 'traditional',
  cardBack: 'classic_blue',
  targetScore: 101,
  aiDifficulty: 'medium',
  playerCount: 2,
  fiveRuleEnabled: false,
  dealSpeed: 'normal'
};

const SHUFFLE_STYLES: ShuffleStyle[] = [
  'riffle_bridge',
  'hindu_slide',
  'triple_cut',
  'table_wash',
  'farot_wave'
];

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
  // User Profile & Sabit PP System
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile);

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [inspectedProfile, setInspectedProfile] = useState<UserProfile | null>(null);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [activeMatchRecovery, setActiveMatchRecovery] = useState<string | null>(null);
  const [pendingFriendInvite, setPendingFriendInvite] = useState<{
    friendCode?: string;
    name: string;
    gameType: 'pisti' | 'uno';
  } | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<IncomingGameInvite | null>(null);

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

  // Match Intro Animation Overlay State (v1.17.0)
  const [matchIntro, setMatchIntro] = useState<{
    players: MatchIntroPlayer[];
    label: string;
    gameType?: 'pisti' | 'uno';
  } | null>(null);
  const matchIntroRef = useRef(matchIntro);
  matchIntroRef.current = matchIntro;
  const introStartRef = useRef<(() => void) | null>(null);

  const runWithIntro = useCallback(
    (
      info: { players: MatchIntroPlayer[]; label: string; gameType?: 'pisti' | 'uno' },
      start: () => void
    ) => {
      setMatchIntro(info);
      introStartRef.current = start;
    },
    []
  );

  // Active Emotes System
  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);

  const settingsRef = useRef<GameSettings>(settings);
  settingsRef.current = settings;
  const playersRef = useRef<Player[]>([]);

  // Multiplayer Room & Session Hook (v1.22.0)
  const {
    isMultiplayerGame,
    setIsMultiplayerGame,
    isMultiplayerGameRef,
    isMultiplayerHost,
    setIsMultiplayerHost,
    isMultiplayerHostRef,
    myMultiplayerSeat,
    setMyMultiplayerSeat,
    myMultiplayerSeatRef,
    activeMultiplayerSlots,
    setActiveMultiplayerSlots,
    activeMultiplayerSlotsRef,
    multiplayerSeedUnoDeck,
    setMultiplayerSeedUnoDeck,
    isMultiplayerOpen,
    setIsMultiplayerOpen,
    initialJoinCode,
    setInitialJoinCode,
    chatMessages,
    setChatMessages,
    readySeatsForNextRound,
    setReadySeatsForNextRound,
    queuedMpEventsRef,
    isSurrenderModalOpen,
    setIsSurrenderModalOpen,
    matchAbortedInfo,
    setMatchAbortedInfo,
    peerReconnectingSeconds,
    setPeerReconnectingSeconds,
    cleanUrlDeepLink,
    handleSendChatMessage,
    resetMultiplayerState
  } = useMultiplayerRoom({ userProfile, screen, playersRef });

  // Pişti Core Game Hook (v1.22.0)
  const {
    canvasRef,
    tableRefs,
    dealTimersRef,
    deck,
    tableCards,
    setTableCards,
    tableCardsRef,
    players,
    setPlayers,
    currentTurn,
    currentTurnRef,
    round,
    dealerIndex,
    activeSlam,
    setActiveSlam,
    roundScores,
    setRoundScores,
    countingUserCards,
    countingOppCards,
    onTableCount,
    setOnTableCount,
    isShuffling,
    setIsShuffling,
    shuffleStyle,
    setIsDealingAnimation,
    setIsActionLocked,
    isShaking,
    deckCutState,
    turnTimeRemaining,
    flyingCards,
    setFlyingCards,
    hiddenCardIds,
    setHiddenCardIds,
    recentCapture,
    clearFlights,
    clearScheduledTimers,
    getDeckTargetPos,
    startMatchWithDeck,
    handleCutDeckAndProceed,
    handleStartGame,
    handleQuickStartFromMenu,
    startNextRoundWithDeck,
    handleNextRound,
    handlePlayCardWithAnimation,
    handleUpdateCountingProgress,
    handleSkipCounting,
    handleToggleFastCounting,
    handleFinishCounting,
    handleRestartGame,
    handleExitToMenu,
    handleToggleReady,
    isBusy,
    slotsReadiness,
    readySeatsCount,
    totalHumanPlayersCount,
    isReadyForNextRound
  } = usePistiGame({
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
    onBotReaction: (playerIdx, emoji, text) => {
      triggerEmote(playerIdx, emoji);
      if (text) {
        showDevToast(`${playersRef.current[playerIdx]?.name || 'Bot'}: "${text}"`);
      }
    }
  });

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

  // First-time visitor onboarding check & unique friend code claim
  useEffect(() => {
    try {
      const completed = localStorage.getItem('project_p_onboarding_completed');
      if (!completed && isDefaultPlayerName(userProfile.name)) {
        setIsWelcomeOpen(true);
      }
    } catch {}

    // Asynchronously claim unique friend code via RTDB transaction
    claimUniqueFriendCode(userProfile).then((claimed) => {
      if (claimed && claimed !== userProfile.friendCode) {
        setUserProfile(prev => ({ ...prev, friendCode: claimed }));
      }
    }).catch(() => {});
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

  // Close drawers when leaving menu
  useEffect(() => {
    if (screen === 'game' || screen === 'uno') {
      setIsFriendsOpen(false);
    }
  }, [screen]);

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
      if (notice.id?.startsWith('fr-rem')) {
        showDevToast(`👋 ${notice.fromName} (#${notice.fromFriendCode}) seni arkadaş listesinden çıkardı.`);
      } else {
        showDevToast(`🤝 ${notice.fromName} (#${notice.fromFriendCode}) ile artık arkadaşsınız!`);
      }
    });

    const unsubReq = friendNetwork.onFriendRequest(req => {
      sound.playMatchSweep();
      setUserProfile(getUserProfile());
      showDevToast(`📨 ${req.fromName} (#${req.fromFriendCode}) sana arkadaşlık isteği gönderdi!`);
    });

    return () => {
      unsubInvite();
      unsubNotice();
      unsubReq();
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
  useMultiplayerEvents({
    userProfile,
    setUserProfile,
    playersRef,
    setPlayers,
    tableCardsRef,
    setTableCards,
    currentTurnRef,
    settingsRef,
    matchIntroRef,
    setScreen,
    setRoundScores,
    setIsMultiplayerGame,
    setIsMultiplayerHost,
    setMyMultiplayerSeat,
    myMultiplayerSeatRef,
    setActiveMultiplayerSlots,
    activeMultiplayerSlotsRef,
    setIsMultiplayerOpen,
    setInitialJoinCode,
    setMultiplayerSeedUnoDeck,
    setChatMessages,
    setReadySeatsForNextRound,
    queuedMpEventsRef,
    setMatchAbortedInfo,
    setPeerReconnectingSeconds,
    isMultiplayerGameRef,
    onPlayRemoteCard: (targetLocalIdx, card) => {
      handlePlayCardWithAnimation(targetLocalIdx, card, undefined, 0, true);
    },
    onCutDeckAndProceed: handleCutDeckAndProceed,
    onTriggerEmote: triggerEmote,
    onStartMatchWithDeck: startMatchWithDeck,
    onStartNextRoundWithDeck: startNextRoundWithDeck,
    onRunWithIntro: runWithIntro
  });

  // Surrender Confirmation Action in Multiplayer
  const handleConfirmSurrender = useCallback(() => {
    setIsSurrenderModalOpen(false);
    if (isMultiplayerGameRef.current) {
      const uScore = playersRef.current[0]?.score || 0;
      const oppName = playersRef.current[1]?.name || 'Online Rakip';
      recordMatchStats(
        false,
        uScore,
        playersRef.current[0]?.pistiCount || 0,
        playersRef.current[0]?.doublePistiCount || 0,
        false,
        oppName
      );
      setUserProfile(getUserProfile());
      friendNetwork.announcePresence();
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
    }
    friendNetwork.setStatus('menu', undefined);
    resetMultiplayerState();
    clearScheduledTimers();
    sound.playClick();
    clearFlights();
    setIsShuffling(false);
    setIsDealingAnimation(false);
    setIsActionLocked(false);
    setOnTableCount(prev => ({ ...prev, isActive: false, isDone: false }));
    setRoundScores(null);
    setScreen('menu');
  }, [userProfile.name, clearScheduledTimers, clearFlights, resetMultiplayerState]);

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
      prev.map((p, idx) =>
        idx === 0
          ? {
              ...p,
              name: newProfile.name,
              avatarId: newProfile.avatarId,
              customAvatarUrl: newProfile.customAvatarDataUrl
            }
          : p
      )
    );
    friendNetwork.announcePresence();
  }, []);

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
          onUpdateProfile={handleUpdateProfile}
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
          onOpenProfile={() => { setUserProfile(getUserProfile()); setIsProfileOpen(true); }}
          onOpenFriends={() => setIsFriendsOpen(prev => !prev)}
          isFriendsOpen={isFriendsOpen}
          onStartUnoGame={() => setScreen('uno')}
        />
      ) : screen === 'uno' ? (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center text-amber-400 font-cyber">
              RENQ Yükleniyor...
            </div>
          }
        >
          <UnoGameView
            onExitToMenu={() => {
              try {
                multiplayerManager.leaveRoom();
              } catch {}
              friendNetwork.setStatus('menu', undefined);
              setIsMultiplayerGame(false);
              setMyMultiplayerSeat(0);
              myMultiplayerSeatRef.current = 0;
              setMultiplayerSeedUnoDeck(null);
              setInitialJoinCode('');
              setActiveMultiplayerSlots([]);
              setUserProfile(getUserProfile());
              friendNetwork.announcePresence();
              setScreen('menu');
            }}
            playerCount={isMultiplayerGame ? (activeMultiplayerSlots?.length || settings.playerCount || 4) : 4}
            targetScore={250}
            isMultiplayer={isMultiplayerGame}
            isHost={isMultiplayerHost}
            mySeatIndex={myMultiplayerSeat}
            mpSlots={activeMultiplayerSlots}
            seedCards={multiplayerSeedUnoDeck || undefined}
          />
        </Suspense>
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
          <Suspense fallback={<div className="flex-1 bg-slate-950" />}>
            <TableSurface
              theme={settings.theme}
              cardBack={settings.cardBack}
              tableCards={tableCards}
              players={players}
              currentTurn={currentTurn}
              deckCount={deck.length}
              dealerIndex={dealerIndex}
              cutterIndex={(dealerIndex + 1) % settings.playerCount}
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
              deckCutState={deckCutState}
              onCutDeck={handleCutDeckAndProceed}
            />
          </Suspense>

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

      {/* Global Achievement Unlock Toast */}
      <AchievementToast />

      {/* Card Counting Overlay (el sonu kart sayma animasyonu) */}
      <CardCountingOverlay
        isActive={onTableCount.isActive || onTableCount.isDone}
        countState={onTableCount}
        userCards={countingUserCards}
        oppCards={countingOppCards}
        roundScores={roundScores}
        players={players}
        tableRefs={tableRefs}
        theme={settings.theme}
        cardBack={settings.cardBack}
        dealSpeed={settings.dealSpeed}
        targetScore={settings.targetScore}
        isMultiplayer={isMultiplayerGame}
        isReadyForNextRound={isReadyForNextRound}
        readySeatsCount={readySeatsCount}
        totalHumanPlayersCount={totalHumanPlayersCount}
        slotsReadiness={slotsReadiness}
        onNextRound={handleNextRound}
        onRestartGame={handleRestartGame}
        onToggleReady={handleToggleReady}
        onSkipCounting={handleSkipCounting}
        onCountProgress={handleUpdateCountingProgress}
        onCountingDone={handleFinishCounting}
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
        onClose={() => {
          setIsMultiplayerOpen(false);
          cleanUrlDeepLink();
        }}
        onHostLaunchMatch={(
          _roomCode,
          lobbySettings,
          finalSlots,
          chosenGameType = 'pisti'
        ) => {
          cleanUrlDeepLink();
          setInitialJoinCode('');

          const activeSlots = finalSlots.filter(s => s && s.peerId);
          const introPlayers: MatchIntroPlayer[] = activeSlots.map(s => ({
            name: s.name,
            avatar: s.avatar,
            avatarId: s.avatarId,
            customAvatarUrl: s.customAvatarUrl,
            isMe: s.seatIndex === 0 || s.peerId === multiplayerManager.instanceId,
            team: (s.seatIndex % 2 === 0 ? 0 : 1)
          }));

          if (chosenGameType === 'uno') {
            const seedUno = assignOpaqueUnoDeckIds(shuffleUnoDeck(createUnoDeck()));
            setMultiplayerSeedUnoDeck(seedUno);
            const activePlayerCount = Math.max(2, finalSlots.length);
            // Send private masked deck to each guest seat so no client sees opponent cards or draw pile
            finalSlots.forEach(slot => {
              if (!slot.isHost && !slot.isAI && slot.peerId) {
                const guestMasked = buildMaskedUnoDeckForSeat(seedUno, slot.seatIndex, activePlayerCount);
                multiplayerManager.sendPrivate(slot.peerId, {
                  type: 'MP_UNO_PRIVATE_DEAL',
                  round: 1,
                  maskedDeck: guestMasked
                });
              }
            });
            // Host sends public MP_GAME_START without exposing the full unmasked Uno deck
            multiplayerManager.send({
              type: 'MP_GAME_START',
              gameType: 'uno',
              settings: lobbySettings,
              seedDeck: [],
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
            setChatMessages([]);

            runWithIntro(
              {
                players: introPlayers,
                label: 'Canlı Çok Oyunculu',
                gameType: 'uno'
              },
              () => {
                setScreen('uno');
              }
            );
            return;
          }

          const randomStyle =
            SHUFFLE_STYLES[Math.floor(Math.random() * SHUFFLE_STYLES.length)];
          const sharedSeedDeck = assignOpaqueDeckIds(shuffleDeck(createDeck()));
          const publicMaskedSeedDeck = sharedSeedDeck.map(c => createMaskedCard(c.id));

          // Broadcast MP_GAME_START to all Guests with masked placeholder deck (real cards arrive privately after cut)
          multiplayerManager.send({
            type: 'MP_GAME_START',
            gameType: 'pisti',
            settings: lobbySettings,
            seedDeck: publicMaskedSeedDeck,
            shuffleStyle: randomStyle,
            round: 1,
            startingTurnSeat: 0,
            slots: finalSlots
          });

          setIsMultiplayerOpen(false);

          runWithIntro(
            {
              players: introPlayers,
              label: 'Canlı Çok Oyunculu',
              gameType: 'pisti'
            },
            () => {
              startMatchWithDeck(lobbySettings, sharedSeedDeck, randomStyle, {
                isMultiplayer: true,
                isHost: true,
                mySeatIndex: 0,
                slots: finalSlots
              });
            }
          );
        }}
      />



      {/* Standalone Friends & Global Player Network Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        hideBackdrop={false}
        userProfile={userProfile}
        onUpdateProfile={updated => setUserProfile(updated)}
        onJoinFriendRoom={(code: string, _isSpectator?: boolean) => {
          const trimmed = code.trim().toUpperCase();
          const clean = trimmed.replace(/[^A-Z0-9]/g, '');
          let formatted: string;
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
        onInspectProfile={inspected => {
          setInspectedProfile(inspected);
          setIsProfileOpen(true);
        }}
        onClose={() => {
          setUserProfile(getUserProfile());
          setIsFriendsOpen(false);
        }}
      />

      {/* Player Profile & Preset PP Selector Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        profile={userProfile}
        inspectedProfile={inspectedProfile}
        onUpdateProfile={handleUpdateProfile}
        onClose={() => {
          setIsProfileOpen(false);
          setInspectedProfile(null);
        }}
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

      <GlobalNotificationsLayer
        incomingInvite={incomingInvite}
        onDismissInvite={() => setIncomingInvite(null)}
        onAcceptInvite={inv => {
          const code = inv.roomCode.trim().toUpperCase();
          const formatted = code.startsWith('PST-') ? code : `PST-${code}`;
          setIncomingInvite(null);
          setInitialJoinCode(formatted);
          setIsMultiplayerOpen(true);
        }}
        devToast={devToast}
        onDismissDevToast={() => setDevToast(null)}
        devSeeAllHands={devSeeAllHands}
        isMultiplayerGame={isMultiplayerGame}
        onDisableDevPeek={() => {
          setDevSeeAllHands(false);
          sound.playClick();
          showDevToast('🔒 DEV TEST MODU: NORMAL GÖRÜNÜM');
        }}
        isSurrenderModalOpen={isSurrenderModalOpen}
        onCloseSurrenderModal={() => setIsSurrenderModalOpen(false)}
        onConfirmSurrender={handleConfirmSurrender}
        matchAbortedInfo={matchAbortedInfo}
        onConfirmMatchAborted={() => {
          setMatchAbortedInfo(null);
          resetMultiplayerState();
          clearScheduledTimers();
          clearFlights();
          setIsShuffling(false);
          setIsDealingAnimation(false);
          setIsActionLocked(false);
          setOnTableCount(prev => ({ ...prev, isActive: false, isDone: false }));
          setRoundScores(null);
          setScreen('menu');
        }}
      />
      {/* Match Preparation & Card Fan Intro Overlay (v1.17.0) */}
      {matchIntro && (
        <MatchIntroOverlay
          label={matchIntro.label}
          gameType={matchIntro.gameType}
          players={matchIntro.players}
          theme={settings.theme}
          cardBack={settings.cardBack}
          onReveal={() => {
            introStartRef.current?.();
            introStartRef.current = null;
            if (queuedMpEventsRef.current.length > 0) {
              const pending = [...queuedMpEventsRef.current];
              queuedMpEventsRef.current = [];
              pending.forEach(p => {
                if (p.type === 'MP_CARD_PLAYED') {
                  const N = settingsRef.current.playerCount;
                  const targetLocalIdx = (p.seatIndex - myMultiplayerSeatRef.current + N) % N;
                  const targetPlayer = playersRef.current[targetLocalIdx];
                  if (targetPlayer) {
                    const foundCard = targetPlayer.hand.find(c => c.id === p.cardId);
                    if (foundCard) {
                      handlePlayCardWithAnimation(targetLocalIdx, foundCard, undefined, 0, true);
                    }
                  }
                }
              });
            }
          }}
          onDone={() => {
            setMatchIntro(null);
          }}
        />
      )}
    </div>
  );
}
