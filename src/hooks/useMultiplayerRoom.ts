import { logger } from '../utils/logger';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, GameSettings, Player, ShuffleStyle } from '../types/game';
import { DetailedRoundScore } from '../core/rules';
import { multiplayerManager, MultiplayerEvent, LobbyPlayerSlot, VerifiedMultiplayerEvent } from '../features/multiplayer/peerManager';
import type { UnoCard } from '../features/uno/unoTypes';
import { friendNetwork } from '../features/friends/friendNetwork';
import { ChatMessage } from '../components/InGameChat';
import { MatchIntroPlayer } from '../components/MatchIntroOverlay';
import { UserProfile, getUserProfile, recordMatchStats } from '../features/profile/profileManager';

export interface RoundScoresState {
  user: DetailedRoundScore;
  opp: DetailedRoundScore;
  winner: Player | null;
  isGameOver: boolean;
}

export interface UseMultiplayerRoomStateProps {
  userProfile: UserProfile;
  screen: 'menu' | 'game' | 'uno';
  playersRef: React.MutableRefObject<Player[]>;
}

export function useMultiplayerRoom({ userProfile, screen, playersRef }: UseMultiplayerRoomStateProps) {
  // Multiplayer session states
  const [isMultiplayerGame, setIsMultiplayerGame] = useState<boolean>(false);
  const isMultiplayerGameRef = useRef<boolean>(false);
  isMultiplayerGameRef.current = isMultiplayerGame;

  const [isMultiplayerHost, setIsMultiplayerHost] = useState<boolean>(true);
  const isMultiplayerHostRef = useRef<boolean>(true);
  isMultiplayerHostRef.current = isMultiplayerHost;

  const [myMultiplayerSeat, setMyMultiplayerSeat] = useState<number>(0);
  const myMultiplayerSeatRef = useRef<number>(0);
  myMultiplayerSeatRef.current = myMultiplayerSeat;

  const [isSpectator, setIsSpectator] = useState<boolean>(false);
  const isSpectatorRef = useRef<boolean>(false);
  isSpectatorRef.current = isSpectator;
  const [initialSpectateMode, setInitialSpectateMode] = useState<boolean>(false);

  const [activeMultiplayerSlots, setActiveMultiplayerSlots] = useState<LobbyPlayerSlot[]>([]);
  const activeMultiplayerSlotsRef = useRef<LobbyPlayerSlot[]>(activeMultiplayerSlots);
  activeMultiplayerSlotsRef.current = activeMultiplayerSlots;

  const [multiplayerSeedUnoDeck, setMultiplayerSeedUnoDeck] = useState<UnoCard[] | null>(null);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');

  // In-Game Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Synchronous Ready-Check for Multiplayer Next Round
  const [readySeatsForNextRound, setReadySeatsForNextRound] = useState<Set<number>>(new Set());

  // Queued network card events during match intro
  const queuedMpEventsRef = useRef<MultiplayerEvent[]>([]);

  // Surrender & Reconnection modals/toast
  const [isSurrenderModalOpen, setIsSurrenderModalOpen] = useState(false);
  const [matchAbortedInfo, setMatchAbortedInfo] = useState<{
    senderName: string;
    reason: 'surrender' | 'disconnect';
  } | null>(null);
  const [peerReconnectingSeconds, setPeerReconnectingSeconds] = useState<number | null>(null);

  // Instant room join via URL query params (?oda=... or ?room=...)
  const initialDeepLinkHandledRef = useRef(false);
  const deepLinkConsumedRef = useRef(false);

  const cleanUrlDeepLink = useCallback(() => {
    deepLinkConsumedRef.current = true;
    try {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', window.location.pathname);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || initialDeepLinkHandledRef.current) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('oda') || urlParams.get('room') || urlParams.get('kod');
      if (roomParam) {
        initialDeepLinkHandledRef.current = true;
        const normalized = multiplayerManager.normalizeCode(roomParam);
        if (normalized) {
          setInitialJoinCode(normalized);
          setIsMultiplayerOpen(true);
        }
      }
    } catch (err) {
      logger.error('URL parse error:', err);
    }
  }, []);

  // Persist active multiplayer match state for recovery (sessionStorage + localStorage)
  useEffect(() => {
    try {
      if (
        (screen === 'game' || screen === 'uno') &&
        isMultiplayerGame &&
        multiplayerManager.roomCode
      ) {
        const snapshot = JSON.stringify({
          roomCode: multiplayerManager.roomCode,
          screen,
          seatIndex: myMultiplayerSeatRef.current,
          isHost: isMultiplayerHostRef.current,
          timestamp: Date.now()
        });
        localStorage.setItem('project_p_active_match', snapshot);
        sessionStorage.setItem('project_p_active_match', snapshot);
      } else if (screen === 'menu') {
        localStorage.removeItem('project_p_active_match');
        sessionStorage.removeItem('project_p_active_match');
      }
    } catch {}
  }, [screen, isMultiplayerGame]);

  // Synchronize browser URL on match start/exit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (screen === 'game') {
        const code = multiplayerManager.roomCode;
        if (isMultiplayerGame && code) {
          window.history.pushState(null, '', `?oda=${code}`);
        } else {
          window.history.pushState(null, '', '?mode=pisti');
        }
      } else if (screen === 'uno') {
        const code = multiplayerManager.roomCode;
        if (isMultiplayerGame && code) {
          window.history.pushState(null, '', `?oda=${code}&mode=renq`);
        } else {
          window.history.pushState(null, '', '?mode=renq');
        }
      } else if (screen === 'menu') {
        window.history.pushState(null, '', window.location.pathname);
      }
    } catch (err) {
      logger.error('URL sync error:', err);
    }
  }, [screen, isMultiplayerGame]);

  const botChatTimerRef = useRef<number | null>(null);

  // Send in-game chat message
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
          const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];
          const botName = playersRef.current[1]?.name || 'Kurnaz Bot';
          if (botChatTimerRef.current !== null) {
            window.clearTimeout(botChatTimerRef.current);
          }
          botChatTimerRef.current = window.setTimeout(() => {
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
            botChatTimerRef.current = null;
          }, 1100);
        }
      }
    },
    [isMultiplayerGame, userProfile, playersRef]
  );

  useEffect(() => {
    return () => {
      if (botChatTimerRef.current !== null) {
        window.clearTimeout(botChatTimerRef.current);
      }
    };
  }, []);

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
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userProfile.name]);

  const resetMultiplayerState = useCallback(() => {
    setIsMultiplayerGame(false);
    isMultiplayerGameRef.current = false;
    setMyMultiplayerSeat(0);
    myMultiplayerSeatRef.current = 0;
    setIsSpectator(false);
    isSpectatorRef.current = false;
    setInitialSpectateMode(false);
    setInitialJoinCode('');
    setActiveMultiplayerSlots([]);
    activeMultiplayerSlotsRef.current = [];
    setMultiplayerSeedUnoDeck(null);
    setReadySeatsForNextRound(new Set());
    setChatMessages([]);
  }, []);

  return {
    isMultiplayerGame,
    setIsMultiplayerGame,
    isMultiplayerGameRef,
    isMultiplayerHost,
    setIsMultiplayerHost,
    isMultiplayerHostRef,
    myMultiplayerSeat,
    setMyMultiplayerSeat,
    myMultiplayerSeatRef,
    isSpectator,
    setIsSpectator,
    isSpectatorRef,
    initialSpectateMode,
    setInitialSpectateMode,
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
  };
}

export interface UseMultiplayerEventsProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  playersRef: React.MutableRefObject<Player[]>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  tableCardsRef: React.MutableRefObject<Card[]>;
  setTableCards: React.Dispatch<React.SetStateAction<Card[]>>;
  setDeck?: React.Dispatch<React.SetStateAction<Card[]>>;
  currentTurnRef: React.MutableRefObject<number>;
  settingsRef: React.MutableRefObject<GameSettings>;
  matchIntroRef: React.MutableRefObject<unknown>;
  setScreen: (screen: 'menu' | 'game' | 'uno') => void;
  setRoundScores: React.Dispatch<React.SetStateAction<RoundScoresState | null>>;
  // State setters from useMultiplayerRoom
  setIsMultiplayerGame: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMultiplayerHost: React.Dispatch<React.SetStateAction<boolean>>;
  setMyMultiplayerSeat: React.Dispatch<React.SetStateAction<number>>;
  myMultiplayerSeatRef: React.MutableRefObject<number>;
  setIsSpectator: React.Dispatch<React.SetStateAction<boolean>>;
  isSpectatorRef: React.MutableRefObject<boolean>;
  setActiveMultiplayerSlots: React.Dispatch<React.SetStateAction<LobbyPlayerSlot[]>>;
  activeMultiplayerSlotsRef: React.MutableRefObject<LobbyPlayerSlot[]>;
  setIsMultiplayerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setInitialJoinCode: React.Dispatch<React.SetStateAction<string>>;
  setMultiplayerSeedUnoDeck: React.Dispatch<React.SetStateAction<UnoCard[] | null>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setReadySeatsForNextRound: React.Dispatch<React.SetStateAction<Set<number>>>;
  queuedMpEventsRef: React.MutableRefObject<MultiplayerEvent[]>;
  setMatchAbortedInfo: React.Dispatch<
    React.SetStateAction<{ senderName: string; reason: 'surrender' | 'disconnect' } | null>
  >;
  setPeerReconnectingSeconds: React.Dispatch<React.SetStateAction<number | null>>;
  isMultiplayerGameRef: React.MutableRefObject<boolean>;
  // Action callbacks
  onPlayRemoteCard: (targetLocalIdx: number, card: Card) => void;
  onCutDeckAndProceed: (cutIndex: number, overrideCutDeck?: Card[]) => void;
  onTriggerEmote: (targetLocalIdx: number, emoji: string) => void;
  onStartMatchWithDeck: (
    settings: GameSettings,
    seedDeck: Card[],
    shuffleStyle: ShuffleStyle,
    mpOptions: {
      isMultiplayer: boolean;
      isHost: boolean;
      mySeatIndex: number;
      slots: LobbyPlayerSlot[];
    }
  ) => void;
  onStartNextRoundWithDeck: (
    seedDeck: Card[],
    shuffleStyle: ShuffleStyle,
    startingTurn: number
  ) => void;
  onRunWithIntro: (
    intro: {
      players: MatchIntroPlayer[];
      label: string;
      gameType: 'pisti' | 'uno';
    },
    onDone: () => void
  ) => void;
}

export function useMultiplayerEvents({
  userProfile,
  setUserProfile,
  playersRef,
  setPlayers,
  tableCardsRef,
  setTableCards,
  setDeck,
  currentTurnRef,
  settingsRef,
  matchIntroRef,
  setScreen,
  setRoundScores,
  setIsMultiplayerGame,
  setIsMultiplayerHost,
  setMyMultiplayerSeat,
  myMultiplayerSeatRef,
  setIsSpectator,
  isSpectatorRef,
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
  onPlayRemoteCard,
  onCutDeckAndProceed,
  onTriggerEmote,
  onStartMatchWithDeck,
  onStartNextRoundWithDeck,
  onRunWithIntro
}: UseMultiplayerEventsProps) {
  useEffect(() => {
    const unsubscribe = multiplayerManager.onEvent((msg: MultiplayerEvent) => {
      if (msg.type === 'MP_GAME_START') {
        if (!multiplayerManager.isHost) {
          const mySlot = msg.slots.find(s => s.peerId === multiplayerManager.instanceId);
          const amSpectator = !mySlot;
          const mySeatIdx = mySlot ? mySlot.seatIndex : 0;
          setIsSpectator(amSpectator);
          isSpectatorRef.current = amSpectator;
          setInitialJoinCode('');
          setChatMessages([]);

          const activeSlots = msg.slots.filter(s => s && s.peerId);
          const introPlayers: MatchIntroPlayer[] = activeSlots.map(s => ({
            name: s.name,
            avatar: s.avatar,
            avatarId: s.avatarId,
            customAvatarUrl: s.customAvatarUrl,
            isMe: s.peerId === multiplayerManager.instanceId,
            team: (s.seatIndex % 2 === mySeatIdx % 2 ? 0 : 1)
          }));

          if (msg.gameType === 'uno') {
            if (msg.seedUnoDeck && msg.seedUnoDeck.length > 0) {
              setMultiplayerSeedUnoDeck(msg.seedUnoDeck);
            }
            setIsMultiplayerGame(true);
            setIsMultiplayerHost(false);
            setMyMultiplayerSeat(mySeatIdx);
            myMultiplayerSeatRef.current = mySeatIdx;
            setActiveMultiplayerSlots(msg.slots);
            activeMultiplayerSlotsRef.current = msg.slots;
            setIsMultiplayerOpen(false);

            onRunWithIntro(
              {
                players: introPlayers,
                label: 'Canlı Çok Oyunculu',
                gameType: 'uno'
              },
              () => {
                setScreen('uno');
              }
            );
          } else {
            onRunWithIntro(
              {
                players: introPlayers,
                label: 'Canlı Çok Oyunculu',
                gameType: 'pisti'
              },
              () => {
                onStartMatchWithDeck(msg.settings, msg.seedDeck, msg.shuffleStyle, {
                  isMultiplayer: true,
                  isHost: false,
                  mySeatIndex: mySeatIdx,
                  slots: msg.slots
                });
              }
            );
          }
        }
      } else if (msg.type === 'MP_CARD_PLAYED') {
        const envelopeSender = (msg as VerifiedMultiplayerEvent)._verifiedSenderId || msg.senderPeerId;
        if (envelopeSender === multiplayerManager.instanceId) return;

        if (matchIntroRef.current) {
          queuedMpEventsRef.current.push(msg);
          return;
        }

        const senderSlot = activeMultiplayerSlotsRef.current?.find(s => s.seatIndex === msg.seatIndex);
        const hostSlot = activeMultiplayerSlotsRef.current?.find(s => s.seatIndex === 0 || s.isHost);
        const expectedPeerId = senderSlot?.isAI ? hostSlot?.peerId : senderSlot?.peerId;
        const isHostAssistedTimeout = Boolean(hostSlot?.peerId && envelopeSender === hostSlot.peerId);
        if (
          !senderSlot ||
          !envelopeSender ||
          (!isHostAssistedTimeout && (!expectedPeerId || expectedPeerId !== envelopeSender))
        ) {
          logger.warn(
            `[Anti-Cheat] Unauthorized card play rejected: verified sender "${envelopeSender}" is not registered in seat ${msg.seatIndex} (slot peerId: "${senderSlot?.peerId}")!`
          );
          return;
        }

        const N = settingsRef.current.playerCount;
        const targetLocalIdx = (msg.seatIndex - myMultiplayerSeatRef.current + N) % N;

        const targetPlayer = playersRef.current[targetLocalIdx];
        if (!targetPlayer) return;

        const foundCard = targetPlayer.hand.find((c: Card) => c.id === msg.cardId);
        if (foundCard) {
          // Host anti-cheat check: verify guest did not forge a different suit/value than their dealt card
          if (
            multiplayerManager.isHost &&
            msg.card &&
            (foundCard.suit !== msg.card.suit || foundCard.value !== msg.card.value)
          ) {
            logger.warn(
              `[Anti-Cheat] Card face mismatch from seat ${msg.seatIndex}: claimed ${msg.card.suit}-${msg.card.value} vs authoritative ${foundCard.suit}-${foundCard.value}. Using authoritative card.`
            );
          }

          // For guests holding a masked placeholder for the opponent's card, patch the revealed face before playing
          const resolvedCard: Card =
            !multiplayerManager.isHost && msg.card
              ? { ...foundCard, ...msg.card, id: foundCard.id, faceUp: true }
              : foundCard;

          if (!multiplayerManager.isHost && msg.card) {
            const nextPlayers = playersRef.current.map((p, idx) =>
              idx === targetLocalIdx
                ? {
                    ...p,
                    hand: p.hand.map(c => (c.id === foundCard.id ? resolvedCard : c))
                  }
                : p
            );
            playersRef.current = nextPlayers;
            setPlayers(nextPlayers);
          }

          if (currentTurnRef.current !== targetLocalIdx) {
            logger.warn(
              `Turn auto-alignment: seat ${msg.seatIndex} played valid card ${msg.cardId} while local turn was ${currentTurnRef.current}. Syncing turn.`
            );
          }
          onPlayRemoteCard(targetLocalIdx, resolvedCard);
        } else {
          logger.warn(
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
      } else if (msg.type === 'REQUEST_RESYNC') {
        if (multiplayerManager.isHost && msg.senderPeerId) {
          const seatIdx = msg.seatIndex;
          const N = settingsRef.current.playerCount;
          const targetLocalIdx = (seatIdx - myMultiplayerSeatRef.current + N) % N;
          const seatHand = playersRef.current[targetLocalIdx]?.hand || [];
          const visibleTable = tableCardsRef.current.filter(c => c.faceUp);
          const cardsToReveal = [...seatHand, ...visibleTable];
          if (cardsToReveal.length > 0) {
            multiplayerManager.sendPrivate(msg.senderPeerId, {
              type: 'MP_CARD_REVEAL',
              cards: cardsToReveal
            });
          }
        }
      } else if (msg.type === 'MP_NEXT_ROUND') {
        if (!multiplayerManager.isHost) {
          setReadySeatsForNextRound(new Set());
          setRoundScores(null);
          const N = settingsRef.current.playerCount;
          const guestStartingTurn = (msg.startingTurnSeat - myMultiplayerSeatRef.current + N) % N;
          onStartNextRoundWithDeck(msg.seedDeck, msg.shuffleStyle, guestStartingTurn);
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
        onTriggerEmote(targetLocalIdx, msg.emoji);
      } else if (msg.type === 'PEER_RECONNECTING') {
        setPeerReconnectingSeconds(msg.secondsLeft);
      } else if (msg.type === 'PEER_RECONNECTED') {
        setPeerReconnectingSeconds(null);
      } else if (msg.type === 'PEER_DISCONNECTED') {
        setPeerReconnectingSeconds(null);
        if (!isMultiplayerGameRef.current) return;

        const slots = activeMultiplayerSlotsRef.current || [];
        const disconnectedPeerId = msg.peerId;
        const hostSlot = slots.find(s => s.seatIndex === 0 || s.isHost);

        // If the Host disconnected, the room cannot continue
        if (!multiplayerManager.isHost && hostSlot && disconnectedPeerId === hostSlot.peerId) {
          setMatchAbortedInfo({
            senderName: hostSlot.name || 'Oda Kurucu',
            reason: 'disconnect'
          });
          return;
        }

        // If a Guest disconnected in a 4-player match (or if Host handles takeover while other humans remain)
        if (multiplayerManager.isHost && disconnectedPeerId) {
          const droppedSlot = slots.find(s => s.peerId === disconnectedPeerId && !s.isHost && !s.isAI);
          if (droppedSlot) {
            const remainingHumans = slots.filter(
              s => s.peerId !== disconnectedPeerId && !s.isAI && s.peerId && s.peerId !== ''
            );
            // In 4-player mode with at least 2 humans left (Host + at least 1 Guest), convert seat to Bot instead of aborting!
            if (slots.length === 4 && remainingHumans.length >= 2) {
              const botName = `${droppedSlot.name} (Bot)`;
              const botAvatar = '🤖';
              const botAvatarId = droppedSlot.avatarId || 'lion';
              const nextSlots = slots.map(s =>
                s.seatIndex === droppedSlot.seatIndex
                  ? { ...s, isAI: true, name: botName, avatar: botAvatar, avatarId: botAvatarId }
                  : s
              );
              activeMultiplayerSlotsRef.current = nextSlots;
              setActiveMultiplayerSlots(nextSlots);

              const N = settingsRef.current.playerCount;
              const localIdx = (droppedSlot.seatIndex - myMultiplayerSeatRef.current + N) % N;
              const nextPlayers = playersRef.current.map((p, idx) =>
                idx === localIdx ? { ...p, isAI: true, name: botName, avatar: botAvatar } : p
              );
              playersRef.current = nextPlayers;
              setPlayers(nextPlayers);

              multiplayerManager.send({
                type: 'MP_BOT_TAKEOVER',
                seatIndex: droppedSlot.seatIndex,
                botName,
                botAvatar,
                botAvatarId,
                senderPeerId: multiplayerManager.instanceId
              });
              return;
            }
          }
        }

        // Default fallback for 1v1 disconnect
        if (multiplayerManager.isHost) {
          setMatchAbortedInfo({
            senderName: 'Rakip',
            reason: 'disconnect'
          });
        }
      } else if (msg.type === 'MP_BOT_TAKEOVER') {
        const nextSlots = (activeMultiplayerSlotsRef.current || []).map(s =>
          s.seatIndex === msg.seatIndex
            ? {
                ...s,
                isAI: true,
                name: msg.botName,
                avatar: msg.botAvatar,
                avatarId: msg.botAvatarId
              }
            : s
        );
        activeMultiplayerSlotsRef.current = nextSlots;
        setActiveMultiplayerSlots(nextSlots);

        const N = settingsRef.current.playerCount;
        const localIdx = (msg.seatIndex - myMultiplayerSeatRef.current + N) % N;
        const nextPlayers = playersRef.current.map((p, idx) =>
          idx === localIdx
            ? { ...p, isAI: true, name: msg.botName, avatar: msg.botAvatar, avatarId: msg.botAvatarId }
            : p
        );
        playersRef.current = nextPlayers;
        setPlayers(nextPlayers);
      } else if (msg.type === 'MP_REMATCH_START') {
        if (!multiplayerManager.isHost) {
          setReadySeatsForNextRound(new Set());
          setRoundScores(null);
          const resetScores = playersRef.current.map(p => ({
            ...p,
            score: 0,
            roundScore: 0,
            pistiCount: 0,
            doublePistiCount: 0,
            collectedCards: [],
            pistiPairs: []
          }));
          playersRef.current = resetScores;
          setPlayers(resetScores);
          const N = settingsRef.current.playerCount;
          const guestStartingTurn = (msg.startingTurnSeat - myMultiplayerSeatRef.current + N) % N;
          onStartNextRoundWithDeck(msg.seedDeck, msg.shuffleStyle, guestStartingTurn);
        }
      } else if (msg.type === 'MP_DECK_CUT') {
        if (msg.senderPeerId === multiplayerManager.instanceId) return;
        // Host and Spectators process MP_DECK_CUT directly; seated Guests wait for their private MP_PRIVATE_DEAL_VIEW
        if (multiplayerManager.isHost || isSpectatorRef.current) {
          onCutDeckAndProceed(msg.cutIndex);
        }
      } else if (msg.type === 'MP_PRIVATE_DEAL_VIEW') {
        if (!multiplayerManager.isHost) {
          onCutDeckAndProceed(msg.cutIndex, msg.maskedCutDeck);
        }
      } else if (msg.type === 'MP_CARD_REVEAL') {
        if (!multiplayerManager.isHost && Array.isArray(msg.cards) && msg.cards.length > 0) {
          const revealMap = new Map<string, Card>(msg.cards.map(c => [c.id, c]));
          const patchCard = (c: Card): Card => {
            const rev = revealMap.get(c.id);
            return rev ? { ...c, ...rev, id: c.id } : c;
          };

          const patchedTable = tableCardsRef.current.map(patchCard);
          tableCardsRef.current = patchedTable;
          setTableCards(patchedTable);

          if (setDeck) {
            setDeck(prevDeck => prevDeck.map(patchCard));
          }

          const patchedPlayers = playersRef.current.map((p, idx) => ({
            ...p,
            hand: p.hand.map(c => {
              const patched = patchCard(c);
              return idx === 0 && !isSpectatorRef.current ? { ...patched, faceUp: true } : patched;
            }),
            collectedCards: p.collectedCards.map(patchCard),
            pistiPairs: p.pistiPairs.map(pair => ({
              ...pair,
              bottomCard: patchCard(pair.bottomCard),
              topCard: patchCard(pair.topCard)
            }))
          }));
          playersRef.current = patchedPlayers;
          setPlayers(patchedPlayers);
        }
      } else if (msg.type === 'MP_UNO_PRIVATE_DEAL') {
        if (!multiplayerManager.isHost && Array.isArray(msg.maskedDeck)) {
          setMultiplayerSeedUnoDeck(msg.maskedDeck);
        }
      } else if (msg.type === 'MP_MATCH_ABORTED') {
        if (!isMultiplayerGameRef.current) return;
        if (msg.gameType && msg.gameType !== 'pisti') return;
        setPeerReconnectingSeconds(null);
        const reason: 'surrender' | 'disconnect' = msg.reason === 'disconnect' ? 'disconnect' : 'surrender';
        setMatchAbortedInfo({
          senderName: msg.senderName || 'Rakip oyuncu',
          reason
        });
        recordMatchStats(true, 50, 0, 0, false, msg.senderName || 'Online Rakip');
        setUserProfile(getUserProfile());
        friendNetwork.announcePresence();
      }
    });

    return unsubscribe;
  }, [
    onStartMatchWithDeck,
    onPlayRemoteCard,
    onStartNextRoundWithDeck,
    onTriggerEmote,
    onCutDeckAndProceed,
    onRunWithIntro,
    userProfile,
    matchIntroRef,
    playersRef,
    setPlayers,
    tableCardsRef,
    setTableCards,
    currentTurnRef,
    settingsRef,
    setRoundScores,
    setScreen,
    setUserProfile,
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
    isMultiplayerGameRef
  ]);
}
