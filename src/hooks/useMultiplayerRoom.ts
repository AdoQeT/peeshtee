import { logger } from '../utils/logger';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, GameSettings, Player, ShuffleStyle } from '../types/game';
import { DetailedRoundScore } from '../core/rules';
import { multiplayerManager, MultiplayerEvent, LobbyPlayerSlot } from '../features/multiplayer/peerManager';
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

  const [activeMultiplayerSlots, setActiveMultiplayerSlots] = useState<LobbyPlayerSlot[]>([]);
  const activeMultiplayerSlotsRef = useRef<LobbyPlayerSlot[]>(activeMultiplayerSlots);
  activeMultiplayerSlotsRef.current = activeMultiplayerSlots;

  const [multiplayerSeedUnoDeck, setMultiplayerSeedUnoDeck] = useState<any[] | null>(null);
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
  currentTurnRef: React.MutableRefObject<number>;
  settingsRef: React.MutableRefObject<GameSettings>;
  matchIntroRef: React.MutableRefObject<any>;
  setScreen: (screen: 'menu' | 'game' | 'uno') => void;
  setRoundScores: React.Dispatch<React.SetStateAction<RoundScoresState | null>>;
  // State setters from useMultiplayerRoom
  setIsMultiplayerGame: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMultiplayerHost: React.Dispatch<React.SetStateAction<boolean>>;
  setMyMultiplayerSeat: React.Dispatch<React.SetStateAction<number>>;
  myMultiplayerSeatRef: React.MutableRefObject<number>;
  setActiveMultiplayerSlots: React.Dispatch<React.SetStateAction<LobbyPlayerSlot[]>>;
  activeMultiplayerSlotsRef: React.MutableRefObject<LobbyPlayerSlot[]>;
  setIsMultiplayerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setInitialJoinCode: React.Dispatch<React.SetStateAction<string>>;
  setMultiplayerSeedUnoDeck: React.Dispatch<React.SetStateAction<any[] | null>>;
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
  onCutDeckAndProceed: (cutIndex: number) => void;
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
          const mySeatIdx = mySlot ? mySlot.seatIndex : 1;
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
            setMultiplayerSeedUnoDeck(msg.seedUnoDeck || null);
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
        const envelopeSender = (msg as any)._verifiedSenderId || msg.senderPeerId;
        if (envelopeSender === multiplayerManager.instanceId) return;

        if (matchIntroRef.current) {
          queuedMpEventsRef.current.push(msg);
          return;
        }

        const senderSlot = activeMultiplayerSlotsRef.current?.find(s => s.seatIndex === msg.seatIndex);
        if (!senderSlot || !senderSlot.peerId || !envelopeSender || senderSlot.peerId !== envelopeSender) {
          logger.warn(
            `[Anti-Cheat] Unauthorized card play rejected: verified sender "${envelopeSender}" is not registered in seat ${msg.seatIndex} (slot peerId: "${senderSlot?.peerId}")!`
          );
          return;
        }

        const N = settingsRef.current.playerCount;
        const targetLocalIdx = (msg.seatIndex - myMultiplayerSeatRef.current + N) % N;

        if (currentTurnRef.current !== targetLocalIdx) {
          logger.warn(
            `Out-of-turn card play attempt: seat ${msg.seatIndex} played but turn is ${currentTurnRef.current}!`
          );
          return;
        }

        const targetPlayer = playersRef.current[targetLocalIdx];
        if (!targetPlayer) return;

        const foundCard = targetPlayer.hand.find((c: Card) => c.id === msg.cardId);
        if (foundCard) {
          onPlayRemoteCard(targetLocalIdx, foundCard);
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
        if (isMultiplayerGameRef.current) {
          setMatchAbortedInfo({
            senderName: 'Rakip',
            reason: 'disconnect'
          });
        }
      } else if (msg.type === 'MP_DECK_CUT') {
        if (msg.senderPeerId === multiplayerManager.instanceId) return;
        onCutDeckAndProceed(msg.cutIndex);
      } else if (msg.type === 'MP_MATCH_ABORTED') {
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
