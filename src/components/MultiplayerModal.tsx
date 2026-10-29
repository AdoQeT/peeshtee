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
  Send
} from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import { multiplayerManager, LobbyPlayerSlot } from '../features/multiplayer/peerManager';
import { GameSettings } from '../types/game';
import { getUserProfile, addOrUpdateFriend } from '../features/profile/profileManager';
import { friendNetwork } from '../features/friends/friendNetwork';
import { AvatarBadge } from './AvatarBadge';

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
  const localName = profile.name || (userName === 'Oyuncu (Sen)' ? 'Usta Oyuncu' : userName);
  const localAvatarId = profile.avatarId || 'wolf';
  const localCustomAvatarUrl = profile.customAvatarDataUrl;
  const localAvatar = userAvatar || '😎';

  // Game Type: Pişti or UNO
  const [gameType, setGameType] = useState<'pisti' | 'uno'>('pisti');

  // Lobby Role: none -> lobby view
  const [lobbyRole, setLobbyRole] = useState<'none' | 'host' | 'guest'>('none');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode || '');
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
        name: hName || 'Oda Sahibi',
        avatar: hAvatar || '😎',
        avatarId: hAvatarId || 'wolf',
        customAvatarUrl: hCustomUrl,
        isHost: true
      },
      {
        seatIndex: 1,
        peerId: '',
        name: count === 4 ? '1. Rakip Bekleniyor' : '2. Oyuncu Bekleniyor',
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
          name: 'Ortağın Bekleniyor',
          avatar: '⏳',
          avatarId: 'dayi',
          isHost: false
        },
        {
          seatIndex: 3,
          peerId: '',
          name: '2. Rakip Bekleniyor',
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
  const [targetScore, setTargetScore] = useState<number>(initialSettings.targetScore || 101);
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
    if (initialJoinCode) {
      setJoinCodeInput(initialJoinCode);
      if (isOpen && lobbyRole === 'none') {
        handleJoinRoomWithCode(initialJoinCode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJoinCode, isOpen]);

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
          activeCode =
            (targetFriend.gameType === 'uno' ? 'UNO-' : 'PST-') +
            Math.floor(1000 + Math.random() * 9000);
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
          await multiplayerManager.hostRoom(activeCode, localName || 'Oda Sahibi', localAvatar);
          setIsConnecting(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        sound.playMatchSweep();
        if (multiplayerManager.isHost) {
          setSlots(prev => {
            const next = [...prev];
            const existingIdx = next.findIndex(s => s.peerId === event.guestPeerId);
            if (existingIdx !== -1) {
              next[existingIdx] = {
                ...next[existingIdx],
                name: event.guestName,
                avatar: event.guestAvatar,
                avatarId: event.guestAvatarId || next[existingIdx].avatarId || 'wolf',
                customAvatarUrl: event.guestCustomAvatarUrl
              };
            } else {
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
                  isHost: false
                };
              }
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
            return next;
          });
        }
      } else if (event.type === 'REQUEST_SEAT_CHANGE') {
        if (multiplayerManager.isHost) {
          sound.playClick();
          setSlots(prev => {
            const next = [...prev];
            const senderIdx = next.findIndex(s => s.peerId === event.senderPeerId);
            const targetIdx = next.findIndex(s => s.seatIndex === event.targetSeatIndex);
            if (senderIdx === -1 || targetIdx === -1) return prev;

            const senderSlot = { ...next[senderIdx], seatIndex: event.targetSeatIndex };
            const targetSlot = { ...next[targetIdx], seatIndex: next[senderIdx].seatIndex };

            next[senderIdx] = targetSlot;
            next[targetIdx] = senderSlot;
            next.sort((a, b) => a.seatIndex - b.seatIndex);

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
            return next;
          });
        }
      } else if (event.type === 'HOST_LOBBY_SYNC') {
        sound.playMatchSweep();
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
      } else if (event.type === 'PEER_DISCONNECTED') {
        if (multiplayerManager.isHost && event.peerId) {
          setSlots(prev => {
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
                  customAvatarUrl: undefined
                };
              }
              return s;
            });
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
            return next;
          });
        }
      }
    });

    return unsubscribe;
  }, [isOpen]);

  const handleClose = () => {
    sound.playClick();
    onClose();
  };

  const handleResetLobby = () => {
    sound.playClick();
    multiplayerManager.leaveRoom();
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
    const code =
      (gameType === 'uno' ? 'UNO-' : 'PST-') + Math.floor(1000 + Math.random() * 9000);
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

    await multiplayerManager.hostRoom(code, localName || 'Oda Sahibi', localAvatar);
    friendNetwork.setStatus('lobby', code, gameType);
    setIsConnecting(false);
  };

  const handleJoinRoomWithCode = async (codeToJoin: string) => {
    if (!codeToJoin.trim()) return;
    sound.playClick();
    setErrorMsg(null);
    setIsConnecting(true);

    const raw = codeToJoin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefix = raw.startsWith('UNO')
      ? 'UNO-'
      : raw.startsWith('PST')
      ? 'PST-'
      : gameType === 'uno'
      ? 'UNO-'
      : 'PST-';
    const digits = raw.replace(/^(UNO|PST)/, '');
    const normalized = `${prefix}${digits}`;
    setCreatedRoomCode(normalized);

    const ok = await multiplayerManager.joinRoom(
      normalized,
      localName || 'Misafir Oyuncu',
      localAvatar
    );

    setIsConnecting(false);
    if (ok) {
      setLobbyRole('guest');
      friendNetwork.setStatus('lobby', normalized, gameType);
      multiplayerManager.send({
        type: 'GUEST_JOINED',
        guestName: localName || 'Misafir Oyuncu',
        guestAvatar: localAvatar,
        guestAvatarId: localAvatarId,
        guestCustomAvatarUrl: localCustomAvatarUrl,
        guestPeerId: multiplayerManager.instanceId
      });
    } else {
      setErrorMsg('Odaya bağlanılamadı. Kodu kontrol ediniz.');
    }
  };

  const handleStartMatchAsHost = () => {
    if (!createdRoomCode) return;
    const connectedGuests = slots.filter(s => s.seatIndex > 0 && s.peerId);
    if (connectedGuests.length === 0) {
      setErrorMsg('Maçı başlatmak için en az 1 arkadaşının odaya katılması gerekiyor!');
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

    const finalSlots = slots.map(s => {
      if (s.seatIndex > 0 && (!s.peerId || s.peerId === '')) {
        const botName =
          s.seatIndex === 2
            ? 'Dayı (Ortak)'
            : s.seatIndex === 1
            ? 'Kurnaz Bot'
            : 'Muhtar';
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
    const modeName = gameType === 'uno' ? 'UNO' : 'Pişti';
    const text = `🔥 ${modeName} maçına davet edildin! Tek tıkla odaya katıl:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleQuickPingFriend = (friend: { friendCode?: string; name: string }) => {
    if (!createdRoomCode) return;
    sound.playClick();
    friendNetwork.sendGameInvite(friend, createdRoomCode, gameType);
    setInviteSentBanner(`📨 ${friend.name} oyuncusuna canlı oda daveti gönderildi!`);
    window.setTimeout(() => setInviteSentBanner(null), 4000);
  };

  const connectedHumanCount = slots.filter(s => s.peerId && s.peerId !== '').length;
  const isHost = lobbyRole === 'host';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-black">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white font-cyber tracking-wide">
                ONLINE ÇOK OYUNCULU LOBİ
              </h2>
              <span className="text-[10px] text-cyan-400 font-medium">
                Senin ID: #{profile.friendCode} • Hızlı Oda & Canlı Bağlantı
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
                <span>Arkadaşlar</span>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-white text-xs ml-2"
              >
                Kapat
              </button>
            </div>
          )}

          {inviteSentBanner && (
            <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-400/60 text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <span>{inviteSentBanner}</span>
            </div>
          )}

          {lobbyRole === 'none' ? (
            /* SIMPLE & MODERN LOBBY ENTRY VIEW */
            <div className="space-y-4">
              {/* Game Selector Bar */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-cyan-400" />
                  <span>Oyun Modu:</span>
                </span>
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setGameType('pisti');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      gameType === 'pisti'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎴 Pişti
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setGameType('uno');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      gameType === 'uno'
                        ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔥 UNO
                  </button>
                </div>
              </div>

              {/* 1. Create Lobby Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Kişi Sayısı:</span>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                    <button
                      onClick={() => handleSelectPlayerCount(2)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        playerCount === 2
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      👥 2 Kişilik
                    </button>
                    <button
                      onClick={() => handleSelectPlayerCount(4)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        playerCount === 4
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      👨‍👩‍👧‍👦 4 Kişilik
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={isConnecting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm font-cyber tracking-wide shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ODA KURULUYOR...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>YENİ ODA OLUŞTUR</span>
                    </>
                  )}
                </button>
              </div>

              {/* 2. Join Lobby Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2.5">
                <span className="text-xs font-bold text-slate-300 block">
                  Arkadaşının Odasına Katıl:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="Örn: PST-4821 veya 4821"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => handleJoinRoomWithCode(joinCodeInput)}
                    disabled={!joinCodeInput.trim() || isConnecting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs font-cyber flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>KATIL</span>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* SIMPLE & MODERN ACTIVE LOBBY VIEW */
            <div className="space-y-3.5">
              {/* Minimal Room Code Header */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    {gameType === 'uno' ? '🔥 UNO ODASI' : '🎴 PİŞTİ ODASI'} • {playerCount} KİŞİLİK
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
                    <span>{copied ? 'Kopyalandı' : 'Kodu Al'}</span>
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
                    <span>{copiedLink ? 'Link Alındı' : 'Linki Al'}</span>
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
                    Çık
                  </button>
                </div>
              </div>

              {/* Quick 1-Click Friend Invite Bar inside Active Lobby */}
              {profile.friends && profile.friends.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    Arkadaşlarını Tek Tıkla Bu Odaya Çağır:
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
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-950/80 border border-white/10 hover:border-emerald-400/50 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                        title={`${fr.name} oyuncusuna canlı oda daveti gönder`}
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
                          : 'bg-slate-950/60 border-white/10 border-dashed'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isOccupied ? (
                          <AvatarBadge
                            avatarId={slot.avatarId || 'wolf'}
                            customAvatarUrl={slot.customAvatarUrl}
                            size="sm"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-sm">
                            ⏳
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">
                            {slot.name} {isMe ? '(Sen)' : ''}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {playerCount === 4
                              ? slot.seatIndex === 0 || slot.seatIndex === 2
                                ? '🟢 A Takımı'
                                : '🟠 B Takımı'
                              : slot.seatIndex === 0
                              ? 'Kurucu'
                              : 'Rakip'}
                          </div>
                        </div>
                      </div>

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
                          Buraya Geç
                        </button>
                      )}
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
                      ? 'ARKADAŞININ KATILMASI BEKLENİYOR...'
                      : `MAÇI BAŞLAT (${connectedHumanCount}/${playerCount} OYUNCU)`}
                  </span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 text-center text-xs text-cyan-300 font-bold flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Oda sahibinin maçı başlatması bekleniyor...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
