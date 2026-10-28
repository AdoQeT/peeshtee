import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  Sparkles,
  Wifi,
  Play,
  ArrowRight,
  Flame,
  Target,
  Loader2,
  Link,
  MessageCircle,
  Bot,
  Gamepad2
} from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import { multiplayerManager, LobbyPlayerSlot } from '../features/multiplayer/peerManager';
import { GameSettings } from '../types/game';
import { getUserProfile } from '../features/profile/profileManager';
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
  const userProfile = getUserProfile();
  const [localName, setLocalName] = useState(userProfile.name || (userName === 'Oyuncu (Sen)' ? 'Usta Oyuncu' : userName));
  const localAvatarId = userProfile.avatarId || 'wolf';
  const localCustomAvatarUrl = userProfile.customAvatarDataUrl;
  const localAvatar = userAvatar || '😎';

  // Game Type: Pişti or UNO (Requested by user)
  const [gameType, setGameType] = useState<'pisti' | 'uno'>('pisti');

  const [lobbyRole, setLobbyRole] = useState<'none' | 'host' | 'guest'>('none');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode || '');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 2 or 4 Player option (Requested by user)
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

    const unsubscribe = multiplayerManager.onEvent(event => {
      if (event.type === 'GUEST_JOINED') {
        sound.playMatchSweep();
        if (multiplayerManager.isHost) {
          setSlots(prev => {
            const next = [...prev];
            // Check if already present in slots
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
              // Find first empty slot (seatIndex 1, 2, or 3)
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
                  avatar: '⏳'
                };
              }
              return s;
            });
            multiplayerManager.send({
              type: 'HOST_LOBBY_SYNC',
              hostName: localNameRef.current || 'Oda Kurucu',
              hostAvatar: localAvatarRef.current,
              settings: settingsRef.current,
              slots: next
            });
            return next;
          });
        } else if (!multiplayerManager.isHost) {
          setErrorMsg('Oda sahibi veya diğer oyuncunun bağlantısı koptu.');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  // Host sync when rules/targetScore/fiveRule changes
  useEffect(() => {
    if (lobbyRole === 'host' && multiplayerManager.isHost) {
      multiplayerManager.send({
        type: 'HOST_LOBBY_SYNC',
        hostName: localName || 'Oda Kurucu',
        hostAvatar: localAvatar,
        settings: {
          ...initialSettings,
          targetScore,
          fiveRuleEnabled,
          playerCount
        },
        slots
      });
    }
  }, [targetScore, fiveRuleEnabled, playerCount, lobbyRole, localName, localAvatar, initialSettings, slots]);

  if (!isOpen) return null;

  const handleClose = () => {
    sound.playClick();
    onClose();
  };

  const handleResetLobby = () => {
    sound.playClick();
    multiplayerManager.disconnect();
    setLobbyRole('none');
    setCreatedRoomCode(null);
    setSlots(createInitialSlots(playerCount, localName, localAvatar));
    setErrorMsg(null);
    setIsConnecting(false);
  };

  const handleSelectPlayerCount = (count: 2 | 4) => {
    if (lobbyRole === 'guest') return;
    sound.playClick();
    setPlayerCount(count);
    const newSlots = createInitialSlots(count, localName, localAvatar, localAvatarId, localCustomAvatarUrl);

    // Keep any already connected guests in order
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

  const handleQuickSwitchTeam = () => {
    const currentMySlot =
      slots.find(s => s.peerId === multiplayerManager.instanceId) ||
      (multiplayerManager.isHost ? slots[0] : null);
    if (!currentMySlot) return;

    const mySeat = currentMySlot.seatIndex;
    const isTeamA = mySeat === 0 || mySeat === 2;
    const targetTeamSeats = isTeamA ? [1, 3] : [0, 2];

    // Prefer an empty slot in target team
    const emptyTarget = slots.find(
      s => targetTeamSeats.includes(s.seatIndex) && (!s.peerId || s.peerId === '')
    );
    if (emptyTarget) {
      handleSwapSeats(mySeat, emptyTarget.seatIndex);
    } else {
      handleSwapSeats(mySeat, targetTeamSeats[0]);
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

  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) return;
    sound.playClick();
    setErrorMsg(null);
    setIsConnecting(true);

    const raw = joinCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
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
      // Broadcast our custom avatar & avatarId immediately to host
      multiplayerManager.send({
        type: 'GUEST_JOINED',
        guestName: localName || 'Misafir Oyuncu',
        guestAvatar: localAvatar,
        guestAvatarId: localAvatarId,
        guestCustomAvatarUrl: localCustomAvatarUrl,
        guestPeerId: multiplayerManager.instanceId
      });
    } else {
      setErrorMsg('Odaya bağlanılamadı. Oda kodunu kontrol edip tekrar deneyin.');
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

    // If 4-player and some seats are empty, fill them with friendly bots!
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
    const modeText = playerCount === 4 ? '4 Kişilik Eşli Pişti' : 'Teke Tek Pişti';
    const text = `🔥 ${modeText} maçına davet edildin! 🎴 Tek tıkla odaya katıl:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const connectedHumanCount = slots.filter(s => s.peerId && s.peerId !== '').length;
  const isHost = lobbyRole === 'host';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto glass-panel-glow rounded-3xl p-5 sm:p-7 text-slate-100 shadow-2xl border-cyan-500/40">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black font-cyber text-white">
                ONLINE ÇOK OYUNCULU LOBİ
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-mono uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                MQTT BULUT RÖLESİ
              </span>
            </div>
            <p className="text-xs text-cyan-400 font-medium">
              HiveMQ & EMQX Çift Broker • 2 veya 4 Kişilik Gerçek Zamanlı Pişti Odası
            </p>
          </div>
        </div>

        {/* Player Profile Setup (Name & Avatar Preview) */}
        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 mb-4">
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            <AvatarBadge
              avatarId={localAvatarId}
              customAvatarUrl={localCustomAvatarUrl}
              fallbackEmoji={localAvatar}
              size="lg"
            />
            <div className="flex-1 w-full">
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                Senin Oyuncu Profilin (İsim & PP)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={18}
                  value={localName}
                  onChange={e => setLocalName(e.target.value)}
                  placeholder="Adını yaz..."
                  className="flex-1 bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Profil fotoğrafını veya sabit karakterini Ana Menüdeki "Oyuncu Profili" butonundan dilediğin zaman değiştirebilirsin.
              </p>
            </div>
          </div>
        </div>

        {/* Game Mode Selection (Pişti vs UNO) */}
        <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/30 rounded-2xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs font-black text-white font-cyber uppercase tracking-wider block">
                Oynanacak Oyun Türü:
              </span>
              <span className="text-[10px] text-slate-300">
                {gameType === 'pisti' ? 'Klasik 52 Kart Pişti Düellosu' : 'Klasik 108 Kart Uno Maçı'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              disabled={lobbyRole === 'guest'}
              onClick={() => {
                sound.playClick();
                setGameType('pisti');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black font-cyber transition-all ${
                gameType === 'pisti'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'text-slate-400 hover:text-white'
              } ${lobbyRole === 'guest' ? 'cursor-default' : 'cursor-pointer'}`}
            >
              🎴 PİŞTİ
            </button>
            <button
              type="button"
              disabled={lobbyRole === 'guest'}
              onClick={() => {
                sound.playClick();
                setGameType('uno');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black font-cyber transition-all ${
                gameType === 'uno'
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                  : 'text-slate-400 hover:text-white'
              } ${lobbyRole === 'guest' ? 'cursor-default' : 'cursor-pointer'}`}
            >
              🔥 UNO
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs font-bold text-rose-200 flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* VIEW A: INITIAL CHOICE (Create or Join) */}
        {lobbyRole === 'none' && (
          <div className="space-y-4">
            {/* 1. Create Room */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <span>1. Yeni Masa / Lobi Kur (Oda Sahibi)</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>

                {/* 2 or 4 Players Selector Before Creating */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleSelectPlayerCount(2)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      playerCount === 2
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👥 2 Kişi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPlayerCount(4)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      playerCount === 4
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👨‍👩‍👧‍👦 4 Kişi
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-3">
                {playerCount === 4
                  ? '4 Kişilik eşli masa açılır. Arkadaşların bağlandığında maçı sen başlatırsın (Eksik koltuklar botla tamamlanabilir).'
                  : 'Teke tek 2 kişilik düello odası açılır. Arkadaşın bağlandığında maçı sen başlatırsın.'}
              </p>

              <button
                onClick={handleCreateRoom}
                disabled={isConnecting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black font-cyber text-sm tracking-wider hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ODA AÇILIYOR...</span>
                  </>
                ) : (
                  <span>{playerCount === 4 ? '4 KİŞİLİK ODA AÇ' : '2 KİŞİLİK ODA AÇ'} & KOD AL</span>
                )}
              </button>
            </div>

            {/* 2. Join Existing Room */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="font-bold text-white text-sm mb-1">2. Arkadaşının Odasına Katıl</h3>
              <p className="text-xs text-slate-400 mb-3">
                Arkadaşından aldığın 4 haneli kodu (örn:{' '}
                <span className="text-amber-300 font-mono">PST-4821</span> veya sadece{' '}
                <span className="text-amber-300 font-mono">4821</span>) gir:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Örn: PST-4821"
                  value={joinCodeInput}
                  onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleJoinRoom();
                  }}
                  className="flex-1 bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-cyber uppercase tracking-wider text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!joinCodeInput.trim() || isConnecting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-40 text-slate-950 font-black font-cyber text-xs uppercase tracking-wider hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>KATIL</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW B: ACTIVE LOBBY (Host or Guest Connected/Waiting) */}
        {lobbyRole !== 'none' && (
          <div className="space-y-4">
            {/* Room Code & Mode Banner */}
            <div className="p-3.5 bg-slate-900 rounded-2xl border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    Oda Kodu:
                  </span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.2 rounded border border-cyan-500/40">
                    {playerCount === 4 ? '👨‍👩‍👧‍👦 4 KİŞİLİK EŞLİ' : '👥 2 KİŞİLİK'}
                  </span>
                </div>
                <span className="text-2xl sm:text-3xl font-black font-cyber text-amber-400 tracking-wider">
                  {createdRoomCode}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={handleCopyCode}
                  title="Oda kodunu panoya kopyala"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  title="Doğrudan odaya giriş bağlantısını kopyala"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Link className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLink ? 'Link Alındı!' : 'Davet Linki'}</span>
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  title="WhatsApp üzerinden arkadaşına davet gönder"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/45 text-emerald-300 text-xs font-bold border border-emerald-500/50 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={handleResetLobby}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold border border-white/10"
                >
                  Çık
                </button>
              </div>
            </div>

            {/* Mode Switcher inside Lobby (Available to Host) */}
            {isHost && (
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Oyun Modu:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPlayerCount(2)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                      playerCount === 2
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    👥 2 Kişilik (Teke Tek)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPlayerCount(4)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                      playerCount === 4
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    👨‍👩‍👧‍👦 4 Kişilik (Eşli Takım)
                  </button>
                </div>
              </div>
            )}

            {/* Player Slots Grid (2 or 4 Slots with Team Swapping) */}
            {(() => {
              const mySlot =
                slots.find(s => s.peerId === multiplayerManager.instanceId) ||
                (multiplayerManager.isHost ? slots[0] : null);

              const renderSlot = (slot: LobbyPlayerSlot) => {
                if (!slot) return null;
                const isHostSlot = slot.seatIndex === 0;
                const isTeammateSlot = playerCount === 4 && slot.seatIndex === 2;
                const isOccupied = Boolean(slot.peerId && slot.peerId !== '');
                const isMe = mySlot?.seatIndex === slot.seatIndex;

                let roleBadge = 'Rakip';
                let borderStyle = 'border-white/15 bg-slate-900/60 text-slate-400';

                if (isHostSlot) {
                  roleBadge = '👑 Oda Sahibi (Host)';
                  borderStyle =
                    'border-emerald-500/40 bg-emerald-950/40 text-emerald-200 shadow-sm';
                } else if (isTeammateSlot) {
                  roleBadge = '🤝 Ortak (Senin Takımın)';
                  borderStyle = isOccupied
                    ? 'border-indigo-400/50 bg-indigo-950/40 text-indigo-200'
                    : 'border-dashed border-indigo-500/30 bg-slate-900/40 text-slate-400';
                } else {
                  roleBadge = slot.seatIndex === 1 ? '🦊 1. Rakip' : '🐺 2. Rakip';
                  borderStyle = isOccupied
                    ? 'border-cyan-400/50 bg-cyan-950/40 text-cyan-100'
                    : 'border-dashed border-white/20 bg-slate-900/40 text-slate-400';
                }

                return (
                  <div
                    key={slot.seatIndex}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${borderStyle}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarBadge
                        avatarId={slot.avatarId}
                        customAvatarUrl={slot.customAvatarUrl}
                        fallbackEmoji={isOccupied ? slot.avatar : '⏳'}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs sm:text-sm text-white truncate">
                            {slot.name}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-cyan-500/30 text-cyan-300 font-bold px-1.5 py-0.2 rounded">
                              SEN
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Koltuk {slot.seatIndex} • {roleBadge}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      {playerCount === 4 && isMe && (
                        <button
                          type="button"
                          onClick={handleQuickSwitchTeam}
                          title="Karşı takımdaki açık koltuğa veya oyuncuya geç"
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/25 hover:bg-purple-500/40 border border-purple-400/60 text-purple-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>⇄</span>
                          <span>Takım Değiş</span>
                        </button>
                      )}

                      {playerCount === 4 && !isMe && mySlot && (
                        <button
                          type="button"
                          onClick={() => handleSwapSeats(mySlot.seatIndex, slot.seatIndex)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border ${
                            isOccupied
                              ? 'bg-white/10 hover:bg-white/20 border-white/20 text-slate-200'
                              : 'bg-emerald-500/25 hover:bg-emerald-500/40 border-emerald-400/50 text-emerald-300'
                          }`}
                        >
                          {isOccupied ? '⇄ Değiş' : '🏃 Buraya Geç'}
                        </button>
                      )}

                      {isOccupied && (!isMe || playerCount === 2) && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                          ✅ Hazır
                        </span>
                      )}

                      {!isOccupied && (!mySlot || playerCount === 2) && (
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                          {playerCount === 4 && isHost ? (
                            <span className="text-amber-400/80 font-bold flex items-center gap-0.5">
                              <Bot className="w-3 h-3" /> Bot ile dolabilir
                            </span>
                          ) : (
                            <span>Bekleniyor...</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              };

              if (playerCount === 4) {
                return (
                  <div className="space-y-3">
                    {/* Team A (Bizim Takım / Eşler) */}
                    <div className="p-3 bg-indigo-950/25 border border-indigo-500/30 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-indigo-300">
                        <span className="flex items-center gap-1.5">
                          🔵 A TAKIMI (BİZİM TAKIM - EŞLER)
                        </span>
                        <span className="text-[10px] text-indigo-400 font-semibold">
                          Koltuk 0 & Koltuk 2
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slots[0] && renderSlot(slots[0])}
                        {slots[2] && renderSlot(slots[2])}
                      </div>
                    </div>

                    {/* Team B (Rakip Takım) */}
                    <div className="p-3 bg-rose-950/25 border border-rose-500/30 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-rose-300">
                        <span className="flex items-center gap-1.5">
                          🔴 B TAKIMI (RAKİP TAKIM - RAKİPLER)
                        </span>
                        <span className="text-[10px] text-rose-400 font-semibold">
                          Koltuk 1 & Koltuk 3
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slots[1] && renderSlot(slots[1])}
                        {slots[3] && renderSlot(slots[3])}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {slots[0] && renderSlot(slots[0])}
                  {slots[1] && renderSlot(slots[1])}
                </div>
              );
            })()}

            {/* Room Match Rules (Editable by Host, Live Preview for Guest) */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-400" />
                  Hedef Puan:
                </span>
                <div className="flex items-center gap-1.5">
                  {[51, 101, 151, 201].map(pts => (
                    <button
                      key={pts}
                      type="button"
                      disabled={lobbyRole !== 'host'}
                      onClick={() => {
                        sound.playClick();
                        setTargetScore(pts);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-cyber font-bold border transition-all ${
                        targetScore === pts
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                          : 'bg-black/30 border-white/10 text-slate-400'
                      } ${lobbyRole === 'host' ? 'cursor-pointer hover:text-white' : 'cursor-default'}`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-400 fill-red-400" />
                  5'e Basmalı Kuralı (Anında Galibiyet):
                </span>
                <button
                  type="button"
                  disabled={lobbyRole !== 'host'}
                  onClick={() => {
                    sound.playClick();
                    setFiveRuleEnabled(!fiveRuleEnabled);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    fiveRuleEnabled
                      ? 'bg-red-500/25 border-red-400 text-red-300'
                      : 'bg-slate-800 border-white/10 text-slate-400'
                  } ${lobbyRole === 'host' ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {fiveRuleEnabled ? '🔥 AÇIK' : 'KAPALI'}
                </button>
              </div>
            </div>

            {/* Launch Button (Host) or Waiting Status (Guest) */}
            {isHost ? (
              <button
                onClick={handleStartMatchAsHost}
                disabled={connectedHumanCount < 2}
                className={`w-full py-4 rounded-2xl font-black font-cyber text-sm sm:text-base tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 transition-all ${
                  connectedHumanCount >= 2
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 hover:scale-[1.01] cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                    : 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {connectedHumanCount >= 2
                    ? playerCount === 4 && connectedHumanCount < 4
                      ? `🔥 MAÇI BAŞLAT (${connectedHumanCount} Oyuncu + ${4 - connectedHumanCount} Bot)`
                      : `🔥 ${playerCount} KİŞİLİK MAÇI BAŞLAT`
                    : '⏳ ARKADAŞININ KATILMASI BEKLENİYOR...'}
                </span>
              </button>
            ) : (
              <div className="w-full py-4 px-4 rounded-2xl bg-cyan-950/50 border border-cyan-400/40 text-center flex items-center justify-center gap-2.5 text-cyan-200 font-bold text-xs sm:text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>
                  Lobiye Bağlandın! Oda Sahibinin ({slots[0]?.name || 'Host'}) Maçı Başlatması
                  Bekleniyor...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            HiveMQ & EMQX Çift Broker + Local Fast Lanes
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 text-slate-300 font-semibold hover:text-white"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
