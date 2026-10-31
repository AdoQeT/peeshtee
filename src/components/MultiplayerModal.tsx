import { logger } from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  Play,
  Loader2,
  Link,
  MessageCircle,
  Gamepad2,
  UserPlus,
  Send,
  Zap
} from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import { multiplayerManager, LobbyPlayerSlot } from '../features/multiplayer/peerManager';
import { GameSettings } from '../types/game';
import {
  getUserProfile,
  addOrUpdateFriend,
  getAvatarPreset
} from '../features/profile/profileManager';
import { friendNetwork } from '../features/friends/friendNetwork';
import { AvatarBadge } from './AvatarBadge';
import { getLanguage, onLanguageChange, translations, Language, getRandomBotNames } from '../utils/i18n';

interface MultiplayerModalProps {
  isOpen: boolean;
  initialSettings: GameSettings;
  userName: string;
  userAvatar: string;
  initialJoinCode?: string;
  pendingFriendInvite?: {
    friendCode?: string;
    name: string;
    gameType: 'pisti' | 'uno';
  } | null;
  onClearPendingInvite?: () => void;
  onOpenFriendsModal?: () => void;
  onClose: () => void;
  onHostLaunchMatch: (
    roomCode: string,
    lobbySettings: GameSettings,
    slots: LobbyPlayerSlot[],
    gameType?: 'pisti' | 'uno'
  ) => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  initialSettings,
  userName,
  userAvatar,
  initialJoinCode,
  pendingFriendInvite,
  onClearPendingInvite,
  onOpenFriendsModal,
  onClose,
  onHostLaunchMatch
}) => {
  const [profile, setProfile] = useState(getUserProfile);
  const [lang, setLang] = useState<Language>(getLanguage());
  const t = translations[lang];

  useEffect(() => {
    return onLanguageChange(setLang);
  }, []);

  const localName = profile.name || (userName === 'Oyuncu (Sen)' ? 'Player' : userName);
  const localAvatarId = profile.avatarId || 'wolf';
  const localCustomAvatarUrl = profile.customAvatarDataUrl;
  const localAvatar = userAvatar || '😎';

  // Game Type: Pişti or UNO
  const [gameType, setGameType] = useState<'pisti' | 'uno'>('pisti');

  // Lobby Role: none -> lobby view
  const [lobbyRole, setLobbyRole] = useState<'none' | 'host' | 'guest'>('none');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode || '');
  const [invitedRoomCode, setInvitedRoomCode] = useState<string | null>(initialJoinCode || null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteSentBanner, setInviteSentBanner] = useState<string | null>(null);

  // 2 or 4 Player option
  const [playerCount, setPlayerCount] = useState<2 | 4>(
    initialSettings.playerCount === 4 ? 4 : 2
  );

  const createInitialSlots = (
    count: 2 | 4,
    hName: string,
    hAvatar: string,
    hAvatarId?: string,
    hCustomUrl?: string
  ): LobbyPlayerSlot[] => {
    const list: LobbyPlayerSlot[] = [
      {
        seatIndex: 0,
        peerId: multiplayerManager.instanceId,
        name: hName || t.mpHostRole,
        avatar: hAvatar || '😎',
        avatarId: hAvatarId || 'wolf',
        customAvatarUrl: hCustomUrl,
        customTitle: profile.customTitle || getAvatarPreset(hAvatarId || 'wolf').title,
        level: profile.level || 1,
        isHost: true
      },
      {
        seatIndex: 1,
        peerId: '',
        name: t.mpWaitOpponent,
        avatar: '⏳',
        avatarId: 'lion',
        isHost: false
      }
    ];

    if (count === 4) {
      list.push(
        {
          seatIndex: 2,
          peerId: '',
          name: t.mpWaitPartner,
          avatar: '⏳',
          avatarId: 'dayi',
          isHost: false
        },
        {
          seatIndex: 3,
          peerId: '',
          name: t.mpWaitOpponent,
          avatar: '⏳',
          avatarId: 'muhtar',
          isHost: false
        }
      );
    }
    return list;
  };

  const [slots, setSlots] = useState<LobbyPlayerSlot[]>(() =>
    createInitialSlots(2, localName, localAvatar, localAvatarId, localCustomAvatarUrl)
  );

  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Host configurable lobby settings
  const [targetScore, setTargetScore] = useState<number>(initialSettings.targetScore || 1);
  const [fiveRuleEnabled, setFiveRuleEnabled] = useState<boolean>(
    initialSettings.fiveRuleEnabled || false
  );

  const localNameRef = useRef(localName);
  localNameRef.current = localName;
  const localAvatarRef = useRef(localAvatar);
  localAvatarRef.current = localAvatar;
  const localAvatarIdRef = useRef(localAvatarId);
  localAvatarIdRef.current = localAvatarId;
  const localCustomAvatarUrlRef = useRef(localCustomAvatarUrl);
  localCustomAvatarUrlRef.current = localCustomAvatarUrl;
  const gameTypeRef = useRef(gameType);
  gameTypeRef.current = gameType;
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const playerCountRef = useRef(playerCount);
  playerCountRef.current = playerCount;
  const lobbyRoleRef = useRef(lobbyRole);
  lobbyRoleRef.current = lobbyRole;

  const settingsRef = useRef<GameSettings>({
    ...initialSettings,
    targetScore,
    fiveRuleEnabled,
    playerCount
  });
  settingsRef.current = {
    ...initialSettings,
    targetScore,
    fiveRuleEnabled,
    playerCount
  };

  useEffect(() => {
    if (!isOpen) {
      setCreatedRoomCode(null);
      setInvitedRoomCode(null);
      setJoinCodeInput('');
      setLobbyRole('none');
      setErrorMsg(null);
      setSlots(createInitialSlots(playerCount, localName, localAvatar, localAvatarId, localCustomAvatarUrl));
    }
  }, [isOpen, playerCount, localName, localAvatar, localAvatarId, localCustomAvatarUrl]);

  useEffect(() => {
    if (initialJoinCode) {
      const cleanDigits =
        initialJoinCode.trim().replace(/\D/g, '').slice(0, 6) || initialJoinCode.trim();
      setJoinCodeInput(cleanDigits);
      setInvitedRoomCode(cleanDigits);
    } else {
      setJoinCodeInput('');
      setInvitedRoomCode(null);
    }
  }, [initialJoinCode]);

  // Auto-host & dispatch real-time invite when triggered from FriendsModal
  useEffect(() => {
    if (isOpen && pendingFriendInvite) {
      const targetFriend = pendingFriendInvite;
      onClearPendingInvite?.();
      setGameType(targetFriend.gameType);

      const launchAndInvite = async () => {
        let activeCode = createdRoomCode;
        if (lobbyRole !== 'host' || !activeCode) {
          setErrorMsg(null);
          setIsConnecting(true);
          activeCode = Math.floor(100000 + Math.random() * 900000).toString();
          setCreatedRoomCode(activeCode);
          setLobbyRole('host');

          const freshSlots = createInitialSlots(
            playerCount,
            localName,
            localAvatar,
            localAvatarId,
            localCustomAvatarUrl
          );
          setSlots(freshSlots);
          const res = await multiplayerManager.hostRoom(activeCode, localName || 'Oda Sahibi', localAvatar);
          setIsConnecting(false);
          if (!res.success) {
            setErrorMsg(res.error || 'Oda kurulamadı.');
            setLobbyRole('none');
            return;
          }
          if (res.roomCode && res.roomCode !== activeCode) {
            activeCode = res.roomCode;
            setCreatedRoomCode(activeCode);
          }
        }

        friendNetwork.setStatus('lobby', activeCode, targetFriend.gameType);
        friendNetwork.sendGameInvite(
          { friendCode: targetFriend.friendCode, name: targetFriend.name },
          activeCode,
          targetFriend.gameType
        );
        setInviteSentBanner(
          `📨 ${targetFriend.name}${
            targetFriend.friendCode ? ` (#${targetFriend.friendCode})` : ''
          } oyuncusuna canlı oda daveti gönderildi!`
        );
        window.setTimeout(() => setInviteSentBanner(null), 5000);
      };

      launchAndInvite();
    }
  }, [isOpen, pendingFriendInvite]);

  useEffect(() => {
    if (!isOpen) {
      setIsConnecting(false);
      setErrorMsg(null);
      return;
    }

    setProfile(getUserProfile());

    const unsubscribe = multiplayerManager.onEvent(event => {
      if (event.type === 'GUEST_JOINED') {
        if (import.meta.env.DEV) {
          logger.log('[MP] GUEST_JOINED alındı:', event.guestName, event.guestPeerId);
        }
        if (multiplayerManager.isHost) {
          let isNewPlayer = false;
          const prev = slotsRef.current;
          const next = [...prev];
          const existingIdx = next.findIndex(s => s.peerId === event.guestPeerId);
          if (existingIdx !== -1) {
            next[existingIdx] = {
              ...next[existingIdx],
              name: event.guestName,
              avatar: event.guestAvatar,
              avatarId: event.guestAvatarId || next[existingIdx].avatarId || 'wolf',
              customAvatarUrl: event.guestCustomAvatarUrl || next[existingIdx].customAvatarUrl,
              customTitle: event.guestCustomTitle || next[existingIdx].customTitle,
              level: event.guestLevel || next[existingIdx].level || 1
            };
          } else {
            isNewPlayer = true;
            const emptyIdx = next.findIndex(
              s => s.seatIndex > 0 && (!s.peerId || s.peerId === '')
            );
            if (emptyIdx !== -1) {
              next[emptyIdx] = {
                ...next[emptyIdx],
                peerId: event.guestPeerId,
                name: event.guestName,
                avatar: event.guestAvatar,
                avatarId: event.guestAvatarId || 'wolf',
                customAvatarUrl: event.guestCustomAvatarUrl,
                customTitle: event.guestCustomTitle,
                level: event.guestLevel || 1,
                isHost: false
              };
            }
          }

          slotsRef.current = next;
          setSlots(next);

          // Perform side effects outside of the setState updater
          if (isNewPlayer) {
            sound.playMatchSweep();
          }

          if (import.meta.env.DEV) {
            logger.log('[MP] HOST_LOBBY_SYNC gönderildi:', next);
          }
          multiplayerManager.send({
            type: 'HOST_LOBBY_SYNC',
            hostName: localNameRef.current || 'Oda Kurucu',
            hostAvatar: localAvatarRef.current,
            hostAvatarId: localAvatarIdRef.current,
            hostCustomAvatarUrl: localCustomAvatarUrlRef.current,
            gameType: gameTypeRef.current,
            settings: {
              ...settingsRef.current,
              playerCount: playerCountRef.current
            },
            slots: next
          });
        }
      } else if (event.type === 'REQUEST_SEAT_CHANGE') {
        if (multiplayerManager.isHost) {
          sound.playClick();
          const prev = slotsRef.current;
          const next = [...prev];
          const senderIdx = next.findIndex(s => s.peerId === event.senderPeerId);
          const targetIdx = next.findIndex(s => s.seatIndex === event.targetSeatIndex);
          if (senderIdx !== -1 && targetIdx !== -1) {
            const senderSlot = { ...next[senderIdx], seatIndex: event.targetSeatIndex };
            const targetSlot = { ...next[targetIdx], seatIndex: next[senderIdx].seatIndex };

            next[senderIdx] = targetSlot;
            next[targetIdx] = senderSlot;
            next.sort((a, b) => a.seatIndex - b.seatIndex);

            slotsRef.current = next;
            setSlots(next);

            if (import.meta.env.DEV) {
              logger.log('[MP] HOST_LOBBY_SYNC gönderildi (seat change):', next);
            }
            multiplayerManager.send({
              type: 'HOST_LOBBY_SYNC',
              hostName: localNameRef.current || 'Oda Kurucu',
              hostAvatar: localAvatarRef.current,
              hostAvatarId: localAvatarIdRef.current,
              hostCustomAvatarUrl: localCustomAvatarUrlRef.current,
              gameType: gameTypeRef.current,
              settings: {
                ...settingsRef.current,
                playerCount: playerCountRef.current
              },
              slots: next
            });
          }
        }
      } else if (event.type === 'HOST_LOBBY_SYNC') {
        if (import.meta.env.DEV) {
          logger.log('[MP] HOST_LOBBY_SYNC alındı:', event.slots);
        }
        sound.playMatchSweep();
        slotsRef.current = event.slots;
        setSlots(event.slots);
        if (event.gameType) {
          setGameType(event.gameType);
        }
        setTargetScore(event.settings.targetScore);
        setFiveRuleEnabled(event.settings.fiveRuleEnabled);
        setPlayerCount(event.settings.playerCount === 4 ? 4 : 2);
        setLobbyRole('guest');
        setIsConnecting(false);
        setErrorMsg(null);
      } else if (event.type === 'MP_GAME_START') {
        // Automatically close lobby modal when host launches the game
        onClose();
      } else if (event.type === 'MP_MATCH_ABORTED') {
        if (lobbyRoleRef.current === 'guest') {
          const hostSlot = slotsRef.current.find(s => s.seatIndex === 0);
          const isFromHost = !event.senderPeerId || (hostSlot && hostSlot.peerId === event.senderPeerId);
          if (isFromHost) {
            setErrorMsg(event.reason || 'Oda kurucusu lobiden ayrıldı.');
            setLobbyRole('none');
            setIsConnecting(false);
          }
        }
      } else if (event.type === 'GUEST_LEFT') {
        if (multiplayerManager.isHost && event.guestPeerId) {
          const prev = slotsRef.current;
          const next = prev.map(s => {
            if (s.peerId === event.guestPeerId) {
              return {
                ...s,
                peerId: '',
                name:
                  s.seatIndex === 2 && playerCountRef.current === 4
                    ? 'Ortağın Bekleniyor'
                    : 'Oyuncu Bekleniyor',
                avatar: '⏳',
                avatarId: 'wolf',
                customAvatarUrl: undefined,
                customTitle: undefined,
                level: undefined
              };
            }
            return s;
          });

          slotsRef.current = next;
          setSlots(next);

          multiplayerManager.send({
            type: 'HOST_LOBBY_SYNC',
            hostName: localNameRef.current || 'Oda Kurucu',
            hostAvatar: localAvatarRef.current,
            hostAvatarId: localAvatarIdRef.current,
            hostCustomAvatarUrl: localCustomAvatarUrlRef.current,
            gameType: gameTypeRef.current,
            settings: {
              ...settingsRef.current,
              playerCount: playerCountRef.current
            },
            slots: next
          });
        }
      } else if (event.type === 'PEER_DISCONNECTED') {
        if (multiplayerManager.isHost && event.peerId) {
          const prev = slotsRef.current;
          const next = prev.map(s => {
            if (s.peerId === event.peerId) {
              return {
                ...s,
                peerId: '',
                name:
                  s.seatIndex === 2 && playerCountRef.current === 4
                    ? 'Ortağın Bekleniyor'
                    : 'Oyuncu Bekleniyor',
                avatar: '⏳',
                avatarId: 'wolf',
                customAvatarUrl: undefined,
                customTitle: undefined,
                level: undefined
              };
            }
            return s;
          });

          slotsRef.current = next;
          setSlots(next);

          if (import.meta.env.DEV) {
            logger.log('[MP] HOST_LOBBY_SYNC gönderildi (peer disconnected):', next);
          }
          multiplayerManager.send({
            type: 'HOST_LOBBY_SYNC',
            hostName: localNameRef.current || 'Oda Kurucu',
            hostAvatar: localAvatarRef.current,
            hostAvatarId: localAvatarIdRef.current,
            hostCustomAvatarUrl: localCustomAvatarUrlRef.current,
            gameType: gameTypeRef.current,
            settings: {
              ...settingsRef.current,
              playerCount: playerCountRef.current
            },
            slots: next
          });
        } else if (!multiplayerManager.isHost) {
          // Only abort if host was the disconnected peer
          const hostSlot = slotsRef.current.find(s => s.seatIndex === 0);
          if (hostSlot && hostSlot.peerId && event.peerId === hostSlot.peerId) {
            setErrorMsg('Oda kurucusu ile bağlantı kesildi.');
            setLobbyRole('none');
          }
        }
      }
    });

    return unsubscribe;
  }, [isOpen]);

  const handleClose = () => {
    sound.playClick();
    handleResetLobby();
    onClose();
  };

  const handleResetLobby = () => {
    sound.playClick();
    multiplayerManager.leaveRoom(false);
    friendNetwork.setStatus('menu');
    setLobbyRole('none');
    setCreatedRoomCode(null);
    setSlots(
      createInitialSlots(playerCount, localName, localAvatar, localAvatarId, localCustomAvatarUrl)
    );
    setErrorMsg(null);
    setIsConnecting(false);
  };

  const handleSelectPlayerCount = (count: 2 | 4) => {
    if (lobbyRole === 'guest') return;
    sound.playClick();
    setPlayerCount(count);
    const newSlots = createInitialSlots(
      count,
      localName,
      localAvatar,
      localAvatarId,
      localCustomAvatarUrl
    );

    let guestCursor = 1;
    slots
      .filter(s => s.seatIndex > 0 && s.peerId)
      .forEach(g => {
        if (guestCursor < count) {
          newSlots[guestCursor] = {
            ...newSlots[guestCursor],
            peerId: g.peerId,
            name: g.name,
            avatar: g.avatar,
            avatarId: g.avatarId,
            customAvatarUrl: g.customAvatarUrl
          };
          guestCursor++;
        }
      });

    setSlots(newSlots);
    if (lobbyRole === 'host' && multiplayerManager.isHost) {
      multiplayerManager.send({
        type: 'HOST_LOBBY_SYNC',
        hostName: localName,
        hostAvatar: localAvatar,
        hostAvatarId: localAvatarId,
        hostCustomAvatarUrl: localCustomAvatarUrl,
        gameType: gameType,
        settings: {
          ...initialSettings,
          targetScore,
          fiveRuleEnabled,
          playerCount: count
        },
        slots: newSlots
      });
    }
  };

  const handleSwapSeats = (seatA: number, seatB: number) => {
    if (seatA === seatB) return;
    sound.playClick();

    if (multiplayerManager.isHost) {
      setSlots(prev => {
        const next = [...prev];
        const idxA = next.findIndex(s => s.seatIndex === seatA);
        const idxB = next.findIndex(s => s.seatIndex === seatB);
        if (idxA === -1 || idxB === -1) return prev;

        const slotA = { ...next[idxA], seatIndex: seatB };
        const slotB = { ...next[idxB], seatIndex: seatA };
        next[idxA] = slotB;
        next[idxB] = slotA;
        next.sort((a, b) => a.seatIndex - b.seatIndex);

        multiplayerManager.send({
          type: 'HOST_LOBBY_SYNC',
          hostName: localNameRef.current,
          hostAvatar: localAvatarRef.current,
          hostAvatarId: localAvatarIdRef.current,
          hostCustomAvatarUrl: localCustomAvatarUrlRef.current,
          gameType: gameTypeRef.current,
          settings: {
            ...settingsRef.current,
            playerCount: playerCountRef.current
          },
          slots: next
        });
        return next;
      });
    } else {
      multiplayerManager.send({
        type: 'REQUEST_SEAT_CHANGE',
        targetSeatIndex: seatB,
        senderPeerId: multiplayerManager.instanceId
      });
    }
  };

  const handleCreateRoom = async () => {
    sound.playClick();
    setErrorMsg(null);
    setIsConnecting(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setCreatedRoomCode(code);
    setLobbyRole('host');

    const freshSlots = createInitialSlots(
      playerCount,
      localName,
      localAvatar,
      localAvatarId,
      localCustomAvatarUrl
    );
    setSlots(freshSlots);

    const res = await multiplayerManager.hostRoom(code, localName || 'Oda Sahibi', localAvatar);
    setIsConnecting(false);
    if (res.success) {
      const finalCode = res.roomCode || code;
      setCreatedRoomCode(finalCode);
      friendNetwork.setStatus('lobby', finalCode, gameType);
    } else {
      setErrorMsg(res.error || 'Oda oluşturulamadı.');
      setLobbyRole('none');
    }
  };

  const handleJoinRoomWithCode = async (codeToJoin: string) => {
    if (!codeToJoin.trim()) return;
    sound.playClick();
    setErrorMsg(null);
    setIsConnecting(true);

    const normalized = multiplayerManager.normalizeCode(codeToJoin);
    setCreatedRoomCode(normalized);

    const res = await multiplayerManager.joinRoom(
      normalized,
      localName || 'Misafir Oyuncu',
      localAvatar,
      localAvatarId,
      undefined, // Stripped big customAvatarUrl from handshake packets
      profile.customTitle || getAvatarPreset(localAvatarId).title,
      profile.level || 1
    );

    setIsConnecting(false);
    if (res.success) {
      setLobbyRole('guest');
      friendNetwork.setStatus('lobby', normalized, gameType);
    } else {
      setErrorMsg(res.error || 'Odaya bağlanılamadı. Kodu kontrol ediniz.');
    }
  };

  const handleQuickMatch = async () => {
    sound.playClick();
    setErrorMsg(null);
    setIsConnecting(true);

    try {
      const onlinePlayers = friendNetwork.getOnlinePlayers();
      const openLobbyPlayer = onlinePlayers.find(
        p => p.status === 'lobby' && p.roomCode && p.roomCode.length >= 4 && p.gameType === gameType
      );

      if (openLobbyPlayer && openLobbyPlayer.roomCode) {
        await handleJoinRoomWithCode(openLobbyPlayer.roomCode);
        return;
      }
    } catch {}

    // No open lobby found -> Host fresh room automatically!
    await handleCreateRoom();
  };

  const handleStartMatchAsHost = () => {
    if (!createdRoomCode) return;
    const connectedGuests = slots.filter(s => s.seatIndex > 0 && s.peerId);
    if (connectedGuests.length === 0) {
      setErrorMsg(t.mpWaitFriendsBtn);
      return;
    }

    sound.playClick();

    // Auto-save connected players as friends!
    connectedGuests.forEach(g => {
      if (g.name && !g.isAI) {
        addOrUpdateFriend({
          id: g.peerId || g.name,
          name: g.name,
          avatarId: g.avatarId || 'wolf',
          customAvatarDataUrl: g.customAvatarUrl,
          roomCode: createdRoomCode
        });
      }
    });

    const botNames = getRandomBotNames(3, lang);
    const finalSlots = slots.map(s => {
      if (s.seatIndex > 0 && (!s.peerId || s.peerId === '')) {
        const botName =
          s.seatIndex === 2
            ? botNames[1] || 'Leo'
            : s.seatIndex === 1
            ? botNames[0] || 'Alex'
            : botNames[2] || 'Max';
        const botAvatar = s.seatIndex === 2 ? '👴' : s.seatIndex === 1 ? '🤖' : '🧔';
        const botAvatarId = s.seatIndex === 2 ? 'dayi' : s.seatIndex === 1 ? 'lion' : 'muhtar';
        return {
          ...s,
          name: botName,
          avatar: botAvatar,
          avatarId: botAvatarId,
          isAI: true
        };
      }
      return s;
    });

    friendNetwork.setStatus('playing', createdRoomCode, gameType);

    onClose();

    onHostLaunchMatch(
      createdRoomCode,
      {
        ...initialSettings,
        playerCount,
        targetScore,
        fiveRuleEnabled
      },
      finalSlots,
      gameType
    );
  };

  const fallbackCopyText = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {}
  };

  const handleCopyCode = () => {
    if (!createdRoomCode) return;
    sound.playClick();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(createdRoomCode).catch(() => fallbackCopyText(createdRoomCode));
    } else {
      fallbackCopyText(createdRoomCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!createdRoomCode) return;
    sound.playClick();
    const url = `${window.location.origin}${window.location.pathname}?oda=${createdRoomCode}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).catch(() => fallbackCopyText(url));
    } else {
      fallbackCopyText(url);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!createdRoomCode) return;
    sound.playClick();
    const url = `${window.location.origin}${window.location.pathname}?oda=${createdRoomCode}`;
    const modeName = gameType === 'uno' ? 'RENQ' : 'Pişti';
    const text = `🔥 ${modeName} maçına davet edildin! Tek tıkla odaya katıl:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleQuickPingFriend = async (friend: { friendCode?: string; name: string }) => {
    if (!createdRoomCode) return;
    sound.playClick();
    const success = await friendNetwork.sendGameInvite(friend, createdRoomCode, gameType);
    if (success) {
      setInviteSentBanner(`📨 ${friend.name} oyuncusuna canlı oda daveti gönderildi!`);
    } else {
      setInviteSentBanner(`⚠️ ${friend.name} oyuncusuna davet ulaştırılamadı.`);
    }
    window.setTimeout(() => setInviteSentBanner(null), 4000);
  };

  const connectedHumanCount = slots.filter(s => s.peerId && s.peerId !== '').length;
  const isHost = lobbyRole === 'host';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-950/95 backdrop-blur-xl border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-black shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-cyber tracking-wide">
                {t.mpModalTitle}
              </h2>
              <span className="text-[11px] text-cyan-400 font-medium">
                {t.mpYourId} #{profile.friendCode} • {t.mpSubHeader}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenFriendsModal && (
              <button
                onClick={() => {
                  sound.playClick();
                  onOpenFriendsModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{t.mpFriendsBtn}</span>
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-white text-xs ml-2 cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          )}

          {inviteSentBanner && (
            <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-400/60 text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <span>{inviteSentBanner}</span>
            </div>
          )}

          {lobbyRole === 'none' ? (
            /* HIGH-CRAFT ARCADE LOBBY ENTRY VIEW */
            <div className="space-y-4">
              {/* Visual Arcade Game Mode Selector Cards */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.mpSelectGameTitle}</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setGameType('pisti');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      gameType === 'pisti'
                        ? 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border-amber-400 ring-1 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-slate-900/70 border-white/10 opacity-75 hover:opacity-100 hover:border-white/25'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-base shadow-md shrink-0">
                      🎴
                    </div>
                    <div className="min-w-0">
                      <div className="font-cyber font-black text-xs sm:text-sm text-white truncate">
                        PİŞTİ
                      </div>
                      <div className="text-[10px] text-amber-300/90 truncate">
                        {t.mpPistiSub}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setGameType('uno');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      gameType === 'uno'
                        ? 'bg-gradient-to-br from-rose-500/20 via-slate-900 to-slate-950 border-rose-400 ring-1 ring-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                        : 'bg-slate-900/70 border-white/10 opacity-75 hover:opacity-100 hover:border-white/25'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-amber-500 to-emerald-500 text-slate-950 flex items-center justify-center font-black italic text-xs shadow-md shrink-0">
                      RENQ
                    </div>
                    <div className="min-w-0">
                      <div className="font-cyber font-black text-xs sm:text-sm text-white truncate">
                        RENQ
                      </div>
                      <div className="text-[10px] text-rose-300/90 truncate">
                        {t.mpRenqSub}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {invitedRoomCode ? (
                /* INVITATION LINK VIEW: Direct 1-click join with existing profile */
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 space-y-4 shadow-xl">
                  <div className="text-center space-y-1">
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      {t.mpPrivateInviteBadge}
                    </span>
                    <h3 className="text-lg font-black text-white font-cyber tracking-tight">
                      {gameType === 'uno' ? t.mpJoinRenqTable : t.mpJoinPistiTable}
                    </h3>
                    <div className="text-xs text-slate-400">
                      {t.mpRoomCodeLabel}{' '}
                      <span className="font-mono font-black text-amber-400 text-base tracking-widest">
                        {invitedRoomCode}
                      </span>
                    </div>
                  </div>

                  {/* Profile Preview Card */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AvatarBadge
                        avatarId={localAvatarId}
                        customAvatarUrl={localCustomAvatarUrl}
                        fallbackEmoji={localAvatar}
                        size="md"
                        isOwner={profile.isOwner}
                      />
                      <div>
                        <div className="text-xs text-slate-400 font-semibold">{t.mpLoggedInProfile}</div>
                        <div className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>{localName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                            #{profile.friendCode}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
                      {t.mpReadyBadge}
                    </span>
                  </div>

                  <button
                    onClick={() => handleJoinRoomWithCode(invitedRoomCode)}
                    disabled={isConnecting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm font-cyber flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t.mpConnectingRoom}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>{t.mpJoinWithCodeBtn} ({invitedRoomCode})</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      onClick={() => {
                        sound.playClick();
                        setInvitedRoomCode(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      {t.mpWantNewRoomLink}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 0. Quick Matchmaking Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-yellow-500/20 border border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.18)] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-black text-amber-300 font-cyber flex items-center gap-1.5">
                        <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{t.mpQuickMatchTitle}</span>
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                        {t.mpQuickMatchDesc}
                      </p>
                    </div>
                    <button
                      onClick={handleQuickMatch}
                      disabled={isConnecting}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs font-cyber shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                    >
                      {isConnecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{t.mpQuickMatchBtn}</span>
                    </button>
                  </div>

                  {/* 1. Create Lobby Card */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">{t.mpPlayerCount}</span>
                      <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => handleSelectPlayerCount(2)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            playerCount === 2
                              ? 'bg-cyan-400 text-slate-950 shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          👥 {t.mp2Players}
                        </button>
                        <button
                          onClick={() => handleSelectPlayerCount(4)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            playerCount === 4
                              ? 'bg-cyan-400 text-slate-950 shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          👨‍👩‍👧‍👦 {t.mp4Players}
                        </button>
                      </div>
                    </div>

                    {gameType === 'pisti' && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-slate-300">{t.mpTargetScore}</span>
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
                          <button
                            onClick={() => {
                              sound.playClick();
                              setTargetScore(1);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              targetScore === 1
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {t.mpSingleHand}
                          </button>
                          <button
                            onClick={() => {
                              sound.playClick();
                              setTargetScore(51);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              targetScore === 51
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            51P
                          </button>
                          <button
                            onClick={() => {
                              sound.playClick();
                              setTargetScore(101);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              targetScore === 101
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            101P
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleCreateRoom}
                      disabled={isConnecting}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm font-cyber tracking-wide shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t.mpCreatingRoom}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-slate-950" />
                          <span>{t.mpCreateRoomBtn}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 2. Join Lobby Card */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-slate-300 block">
                      {t.mpJoinRoomSection}
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                        placeholder={t.mpJoinPlaceholder}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => handleJoinRoomWithCode(joinCodeInput)}
                        disabled={!joinCodeInput.trim() || isConnecting}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs font-cyber flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        {isConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>{t.mpJoinBtn}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* SIMPLE & MODERN ACTIVE LOBBY VIEW */
            <div className="space-y-3.5">
              {/* Minimal Room Code Header */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    {gameType === 'uno' ? t.mpRoomHeaderRenq : t.mpRoomHeaderPisti} • {playerCount === 4 ? t.mp4Players : t.mp2Players}
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-cyber text-amber-400 tracking-wider">
                    {createdRoomCode}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? t.mpCopied : t.mpCopyCode}</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Link className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedLink ? t.mpLinkCopied : t.mpCopyLink}</span>
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={handleResetLobby}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    {t.mpLeaveRoom}
                  </button>
                </div>
              </div>

              {/* Quick 1-Click Friend Invite Bar inside Active Lobby */}
              {profile.friends && profile.friends.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-900/70 border border-white/10 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    {t.mpQuickInviteFriends}
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {profile.friends.map(fr => (
                      <button
                        key={fr.id}
                        onClick={() =>
                          handleQuickPingFriend({
                            friendCode: fr.friendCode,
                            name: fr.name
                          })
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-emerald-950/80 border border-white/10 hover:border-emerald-400/50 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                        title={fr.name}
                      >
                        <AvatarBadge
                          avatarId={fr.avatarId}
                          customAvatarUrl={fr.customAvatarDataUrl}
                          size="xs"
                        />
                        <span className="text-xs font-bold text-white">{fr.name}</span>
                        <Send className="w-3 h-3 text-emerald-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Minimalist Player Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {slots.map(slot => {
                  const isHostSlot = slot.seatIndex === 0;
                  const isOccupied = Boolean(slot.peerId && slot.peerId !== '');
                  const isMe =
                    slot.peerId === multiplayerManager.instanceId || (isHostSlot && isHost);

                  return (
                    <div
                      key={slot.seatIndex}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                        isOccupied
                          ? isMe
                            ? 'bg-cyan-950/30 border-cyan-400/60'
                            : 'bg-emerald-950/25 border-emerald-400/50'
                          : 'bg-slate-900/60 border-white/10 border-dashed'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isOccupied ? (
                          <AvatarBadge
                            avatarId={slot.avatarId || 'wolf'}
                            customAvatarUrl={slot.customAvatarUrl}
                            customTitle={slot.customTitle}
                            isOwner={slot.isHost}
                            size="md"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-sm">
                            ⏳
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
                            <span>{slot.name} {isMe ? `(${t.youLabel})` : ''}</span>
                            {slot.level && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono">
                                Lvl.{slot.level}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {slot.customTitle ? (
                              <span className="text-cyan-300/80">{slot.customTitle} • </span>
                            ) : null}
                            {playerCount === 4
                              ? slot.seatIndex === 0 || slot.seatIndex === 2
                                ? t.mpTeamA
                                : t.mpTeamB
                              : slot.seatIndex === 0
                              ? t.mpHostRole
                              : t.opponent}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOccupied && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{t.mpReadyBadge}</span>
                          </span>
                        )}

                        {/* In 4-player mode, allow switching seats */}
                        {playerCount === 4 && !isMe && (
                          <button
                            onClick={() => {
                              const myCurrentSeat =
                                slots.find(s => s.peerId === multiplayerManager.instanceId)
                                  ?.seatIndex ?? 0;
                              handleSwapSeats(myCurrentSeat, slot.seatIndex);
                            }}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] font-bold text-cyan-300 border border-cyan-500/30 shrink-0 cursor-pointer"
                          >
                            {t.mpSeatSwitch}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Host Launch Button or Guest Waiting Message */}
              {isHost ? (
                <button
                  onClick={handleStartMatchAsHost}
                  disabled={connectedHumanCount < 2}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm font-cyber shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>
                    {connectedHumanCount < 2
                      ? t.mpWaitFriendsBtn
                      : `${t.mpStartMatchHostBtn} (${connectedHumanCount}/${playerCount})`}
                  </span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-cyan-500/30 text-center text-xs text-cyan-300 font-bold flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.mpWaitHostStart}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
