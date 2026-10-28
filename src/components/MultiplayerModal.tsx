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
  Trash2,
  Clock
} from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import { multiplayerManager, LobbyPlayerSlot } from '../features/multiplayer/peerManager';
import { GameSettings } from '../types/game';
import { getUserProfile, addOrUpdateFriend, removeFriend, FriendContact } from '../features/profile/profileManager';
import { AvatarBadge } from './AvatarBadge';

interface MultiplayerModalProps {
  isOpen: boolean;
  initialSettings: GameSettings;
  userName: string;
  userAvatar: string;
  initialJoinCode?: string;
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
  const [activeTab, setActiveTab] = useState<'lobby' | 'friends'>('lobby');

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
    }
  }, [initialJoinCode]);

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
    setLobbyRole('none');
    setCreatedRoomCode(null);
    setSlots(createInitialSlots(playerCount, localName, localAvatar, localAvatarId, localCustomAvatarUrl));
    setErrorMsg(null);
    setIsConnecting(false);
  };

  const handleSelectPlayerCount = (count: 2 | 4) => {
    if (lobbyRole === 'guest') return;
    sound.playClick();
    setPlayerCount(count);
    const newSlots = createInitialSlots(count, localName, localAvatar, localAvatarId, localCustomAvatarUrl);

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
    const code = (gameType === 'uno' ? 'UNO-' : 'PST-') + Math.floor(1000 + Math.random() * 9000);
    setCreatedRoomCode(code);
    setLobbyRole('host');

    const freshSlots = createInitialSlots(playerCount, localName, localAvatar, localAvatarId, localCustomAvatarUrl);
    setSlots(freshSlots);

    await multiplayerManager.hostRoom(code, localName || 'Oda Sahibi', localAvatar);
    setIsConnecting(false);
  };

  const handleJoinRoomWithCode = async (codeToJoin: string) => {
    if (!codeToJoin.trim()) return;
    sound.playClick();
    setErrorMsg(null);
    setIsConnecting(true);

    const raw = codeToJoin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefix = raw.startsWith('UNO') ? 'UNO-' : raw.startsWith('PST') ? 'PST-' : (gameType === 'uno' ? 'UNO-' : 'PST-');
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

  const handleCopyCode = () => {
    if (!createdRoomCode) return;
    sound.playClick();
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!createdRoomCode) return;
    sound.playClick();
    const url = `${window.location.origin}${window.location.pathname}?oda=${createdRoomCode}`;
    navigator.clipboard.writeText(url);
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
                ÇOK OYUNCULU LOBİ
              </h2>
              <span className="text-[10px] text-cyan-400 font-medium">
                P2P & Çift MQTT Bulut Sunucusu
              </span>
            </div>
          </div>

          {/* Navigation Tabs (Lobi / Arkadaşlar) */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('lobby')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'lobby' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lobi
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                activeTab === 'friends' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Arkadaşlar</span>
              {profile.friends && profile.friends.length > 0 && (
                <span className="text-[9px] bg-amber-400 text-slate-950 px-1 rounded-full font-black">
                  {profile.friends.length}
                </span>
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-xs font-bold text-rose-200 flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {activeTab === 'friends' ? (
            /* FRIENDS & AUTO-INVITE TAB */
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Kayıtlı Arkadaşlar & Son Oyuncular
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Oynadığın oyuncular buraya kaydedilir, tek tıkla oda daveti atabilirsin.
                  </p>
                </div>
              </div>

              {(!profile.friends || profile.friends.length === 0) ? (
                <div className="p-8 text-center rounded-2xl bg-black/30 border border-dashed border-white/15">
                  <UserPlus className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
                  <p className="text-xs text-slate-400 font-bold">Henüz kayıtlı arkadaşınız yok.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Online maç yaptığınız gerçek oyuncular otomatik olarak buraya eklenir.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profile.friends.map((friend: FriendContact) => (
                    <div
                      key={friend.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarBadge
                          avatarId={friend.avatarId}
                          customAvatarUrl={friend.customAvatarDataUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-white block truncate">
                            {friend.name}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5" /> Son görülme aktif
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {createdRoomCode ? (
                          <button
                            onClick={() => {
                              handleShareWhatsApp();
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/30"
                          >
                            Odaya Çağır
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              handleCreateRoom();
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 hover:bg-cyan-500/30"
                          >
                            Masa Aç
                          </button>
                        )}
                        <button
                          onClick={() => {
                            sound.playClick();
                            setProfile(removeFriend(friend.id));
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                          title="Arkadaşı sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : lobbyRole === 'none' ? (
            /* SIMPLE & MODERN INITIAL CHOICE (CREATE OR JOIN) */
            <div className="space-y-4">
              {/* Profile Card & Game Mode Switcher */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AvatarBadge
                    avatarId={localAvatarId}
                    customAvatarUrl={localCustomAvatarUrl}
                    fallbackEmoji={localAvatar}
                    size="md"
                  />
                  <div>
                    <span className="text-xs font-black text-white block">
                      {localName}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Çevrimiçi
                    </span>
                  </div>
                </div>

                {/* Game Type Segmented Pill */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/15">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setGameType('pisti');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
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
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
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
                  <span className="text-xs font-bold text-slate-300">
                    Kişi Sayısı:
                  </span>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                    <button
                      onClick={() => handleSelectPlayerCount(2)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        playerCount === 2 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      👥 2 Kişilik
                    </button>
                    <button
                      onClick={() => handleSelectPlayerCount(4)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        playerCount === 4 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      👨‍👩‍👧‍👦 4 Kişilik (Eşli)
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={isConnecting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-cyber text-sm tracking-wide transition-transform active:scale-98 shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Gamepad2 className="w-4 h-4" />
                      <span>{playerCount === 4 ? '4 Kişilik Masa Kur' : '2 Kişilik Düello Kur'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 2. Join Lobby Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2.5">
                <span className="text-xs font-bold text-slate-300 block">
                  Arkadaşının Masasına Katıl
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Oda Kodu (örn: PST-1234 veya 1234)"
                    value={joinCodeInput}
                    onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleJoinRoomWithCode(joinCodeInput);
                    }}
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
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 flex items-center justify-between gap-3">
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
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Kopyalandı' : 'Kodu Al'}</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link className="w-3.5 h-3.5" />}
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
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold"
                  >
                    Çık
                  </button>
                </div>
              </div>

              {/* Minimalist Player Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {slots.map(slot => {
                  const isHostSlot = slot.seatIndex === 0;
                  const isOccupied = Boolean(slot.peerId && slot.peerId !== '');
                  const isMe = slot.peerId === multiplayerManager.instanceId || (isHostSlot && isHost);

                  return (
                    <div
                      key={slot.seatIndex}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                        isOccupied
                          ? 'bg-slate-950/80 border-cyan-500/40'
                          : 'bg-black/30 border-dashed border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarBadge
                          avatarId={slot.avatarId}
                          customAvatarUrl={slot.customAvatarUrl}
                          fallbackEmoji={isOccupied ? slot.avatar : '⏳'}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-xs text-white truncate block">
                              {slot.name}
                            </span>
                            {isMe && (
                              <span className="text-[9px] bg-cyan-500/30 text-cyan-300 px-1 rounded font-black">
                                SEN
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {isHostSlot
                              ? 'Oda Sahibi'
                              : playerCount === 4 && slot.seatIndex === 2
                              ? 'Ortağın'
                              : 'Rakip'}
                          </span>
                        </div>
                      </div>

                      {/* Seat switch for 4-player team balance */}
                      {playerCount === 4 && !isMe && isOccupied && (
                        <button
                          onClick={() => handleSwapSeats(0, slot.seatIndex)}
                          className="text-[10px] px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 font-bold"
                        >
                          ⇄ Değiş
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rules Pill (Simplified) */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Hedef Puan:</span>
                <div className="flex items-center gap-1">
                  {[51, 101, 151].map(pts => (
                    <button
                      key={pts}
                      disabled={!isHost}
                      onClick={() => setTargetScore(pts)}
                      className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
                        targetScore === pts ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Match CTA */}
              {isHost ? (
                <button
                  onClick={handleStartMatchAsHost}
                  disabled={connectedHumanCount < 2}
                  className={`w-full py-3.5 rounded-2xl font-black font-cyber text-sm tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 transition-all ${
                    connectedHumanCount >= 2
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {connectedHumanCount >= 2
                      ? `🔥 ${gameType.toUpperCase()} MAÇINI BAŞLAT`
                      : '⏳ ARKADAŞININ KATILMASI BEKLENİYOR...'}
                  </span>
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-xl bg-cyan-950/40 border border-cyan-400/30 text-center flex items-center justify-center gap-2 text-cyan-200 font-bold text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Oda Sahibinin Maçı Başlatması Bekleniyor...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
