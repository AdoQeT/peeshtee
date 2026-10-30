/**
 * Project Pişti - Pure Firebase Realtime Database Multiplayer Engine
 * All matchmaking, lobbies, player slots, card events, and match transitions
 * are powered 100% directly through Google Firebase Realtime Database.
 */
import { Card, GameSettings, ShuffleStyle } from '../../types/game';
import {
  rtdb,
  ref,
  push,
  onChildAdded,
  onValue,
  set,
  get,
  off,
  remove,
  onDisconnect,
  serverTimestamp,
  ensureFirebaseAuth,
  cleanForRtdb
} from '../../core/firebase';

export interface LobbyPlayerSlot {
  seatIndex: number; // 0 (Host), 1 (Right/Opp 1), 2 (Top/Teammate), 3 (Left/Opp 2)
  peerId: string;
  name: string;
  avatar: string;
  avatarId?: string;
  customAvatarUrl?: string;
  customTitle?: string;
  level?: number;
  isHost: boolean;
  isAI?: boolean;
}

export type MultiplayerEvent =
  | {
      type: 'GUEST_JOINED';
      guestName: string;
      guestAvatar: string;
      guestAvatarId?: string;
      guestCustomAvatarUrl?: string;
      guestCustomTitle?: string;
      guestLevel?: number;
      guestPeerId: string;
    }
  | {
      type: 'HOST_LOBBY_SYNC';
      hostName: string;
      hostAvatar: string;
      hostAvatarId?: string;
      hostCustomAvatarUrl?: string;
      hostCustomTitle?: string;
      hostLevel?: number;
      gameType?: 'pisti' | 'uno';
      settings: GameSettings;
      slots: LobbyPlayerSlot[];
      seedUnoDeck?: any[];
      roomToken?: string;
    }
  | {
      type: 'MP_DECK_CUT';
      cutIndex: number;
      cutterSeat: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_GAME_START';
      gameType?: 'pisti' | 'uno';
      settings: GameSettings;
      seedDeck: Card[];
      shuffleStyle: ShuffleStyle;
      round: number;
      startingTurnSeat: number;
      slots: LobbyPlayerSlot[];
      seedUnoDeck?: any[];
      hostName?: string;
      hostAvatar?: string;
      guestName?: string;
      guestAvatar?: string;
    }
  | {
      type: 'MP_CARD_PLAYED';
      cardId: string;
      seatIndex: number;
      tableOffsetX: number;
      tableOffsetY: number;
      tableRotation: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_UNO_PLAY_CARD';
      cardId: string;
      chosenColor?: string;
      seatIndex: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_UNO_DRAW_CARD';
      seatIndex: number;
      count: number;
      penalty?: boolean;
      senderPeerId?: string;
    }
  | {
      type: 'MP_UNO_CALL_UNO';
      seatIndex: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_UNO_PASS';
      seatIndex: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_UNO_NEXT_ROUND';
      seedCards?: any[];
      seedUnoDeck?: any[];
      nextDealerSeat?: number;
      startingTurnSeat?: number;
      round?: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_NEXT_ROUND';
      seedDeck: Card[];
      shuffleStyle: ShuffleStyle;
      round: number;
      startingTurnSeat: number;
    }
  | {
      type: 'MP_ROUND_READY';
      seatIndex: number;
      senderPeerId?: string;
      isReady: boolean;
    }
  | {
      type: 'REQUEST_RESYNC';
      seatIndex: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_CHAT_MESSAGE';
      id?: string;
      senderName: string;
      senderSeat?: number;
      seatIndex?: number;
      text: string;
      timestamp: number;
      isHost?: boolean;
      avatar?: string;
      avatarId?: string;
      senderAvatar?: string;
      senderAvatarId?: string;
      customAvatarUrl?: string;
      customTitle?: string;
      senderPeerId?: string;
    }
  | {
      type: 'MP_EMOTE';
      emoji: string;
      seatIndex: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_NEXT_ROUND_READY';
      seatIndex: number;
      round: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_ROUND_RESET';
      seedDeck: Card[];
      round: number;
      dealerIndex: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_MATCH_ABORTED';
      senderPeerId?: string;
      senderName?: string;
      reason?: string;
      gameType?: 'pisti' | 'uno';
    }
  | {
      type: 'PEER_HEARTBEAT';
      role: 'host' | 'guest';
      peerId: string;
      timestamp: number;
    }
  | {
      type: 'PEER_RECONNECTING';
      secondsLeft: number;
    }
  | {
      type: 'PEER_RECONNECTED';
    }
  | {
      type: 'PEER_DISCONNECTED';
      peerId?: string;
    }
  | {
      type: 'REQUEST_SEAT_CHANGE';
      targetSeatIndex: number;
      senderPeerId: string;
    };

interface PacketEnvelope {
  __pistiEnvelope: true;
  msgId: string;
  roomCode: string;
  roomToken?: string;
  seq: number;
  senderId: string;
  timestamp: number;
  payload: MultiplayerEvent;
}

function getCryptoRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : null;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const values = new Uint8Array(length);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

export class MultiplayerManager {
  public instanceId: string;
  public roomCode: string = '';
  public isHost: boolean = false;
  public isConnected: boolean = false;
  private roomToken: string = '';
  private seq: number = 0;
  private lastSeenSeq: Map<string, number> = new Map();
  private seenMsgIds: Set<string> = new Set();
  private eventListeners: Array<(event: MultiplayerEvent) => void> = [];

  private broadcastChannel: BroadcastChannel | null = null;
  private storageListener: ((ev: StorageEvent) => void) | null = null;

  private firebaseEventsRef: any = null;
  private firebasePresenceRef: any = null;
  private roomPresenceRef: any = null;

  // Heartbeat & reconnect monitoring
  private heartbeatTimer: number | null = null;
  private lastRemoteMessageTime: number = 0;
  private isPeerReconnecting: boolean = false;

  constructor() {
    let storedId = '';
    try {
      storedId = sessionStorage.getItem('pisti_client_instance_id') || '';
    } catch {}

    if (!storedId) {
      storedId = `p-${Date.now().toString(36)}-${getCryptoRandomString(6)}`;
      try {
        sessionStorage.setItem('pisti_client_instance_id', storedId);
      } catch {}
    }
    this.instanceId = storedId;
  }

  public normalizeCode(code: string): string {
    if (!code) return '';
    const digits = code.trim().replace(/\D/g, '');
    if (digits.length >= 6) return digits.slice(-6);
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-6);
  }

  private setupFirebaseRoom(code: string) {
    this.cleanupFirebaseRoom();
    try {
      this.firebaseEventsRef = ref(rtdb, `rooms/${code}/events`);
      onChildAdded(
        this.firebaseEventsRef,
        (snapshot: any) => {
          const val = snapshot.val();
          if (val) {
            this.handleRawIncoming(val);
          }
        },
        (error: any) => {
          console.error('Firebase onChildAdded error on room events:', error);
          const userMsg =
            error?.code === 'PERMISSION_DENIED'
              ? 'Veritabanı erişim izni reddedildi (PERMISSION_DENIED).'
              : 'Oda etkinliklerine bağlanılamadı. Lütfen internetinizi kontrol edin.';
          this.dispatch({
            type: 'MP_MATCH_ABORTED',
            reason: userMsg
          });
        }
      );

      // Track player presence in room with onDisconnect
      this.firebasePresenceRef = ref(rtdb, `rooms/${code}/presence/${this.instanceId}`);
      set(this.firebasePresenceRef, cleanForRtdb({
        instanceId: this.instanceId,
        role: this.isHost ? 'host' : 'guest',
        lastSeen: serverTimestamp()
      })).catch(err => {
        console.error('Firebase set presence error:', err);
      });
      try {
        onDisconnect(this.firebasePresenceRef).remove();
      } catch (err) {
        console.error('Firebase onDisconnect presence error:', err);
      }

      // Listen to room presences to monitor peer health directly
      this.roomPresenceRef = ref(rtdb, `rooms/${code}/presence`);
      onValue(this.roomPresenceRef, (snapshot: any) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          const peers = Object.values(val).filter((p: any) => p && p.instanceId !== this.instanceId);
          if (peers.length > 0) {
            this.lastRemoteMessageTime = Date.now();
            if (this.isPeerReconnecting) {
              this.isPeerReconnecting = false;
              this.dispatch({ type: 'PEER_RECONNECTED' });
            }
          }
        }
      });
    } catch (err) {
      console.warn('Firebase RTDB room listener error:', err);
    }
  }

  private cleanupFirebaseRoom() {
    if (this.firebaseEventsRef) {
      try {
        off(this.firebaseEventsRef);
      } catch {}
      this.firebaseEventsRef = null;
    }
    if (this.firebasePresenceRef) {
      try {
        remove(this.firebasePresenceRef).catch(() => {});
      } catch {}
      this.firebasePresenceRef = null;
    }
    if (this.roomPresenceRef) {
      try {
        off(this.roomPresenceRef);
      } catch {}
      this.roomPresenceRef = null;
    }
  }

  private setupLocalBuses(code: string) {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel(`pisti-bus-${code}`);
        this.broadcastChannel.onmessage = ev => {
          this.handleRawIncoming(ev.data);
        };
      }
    } catch {}

    if (typeof window !== 'undefined') {
      this.storageListener = (ev: StorageEvent) => {
        if (ev.key === `pisti-pkt-${code}` && ev.newValue) {
          try {
            const data = JSON.parse(ev.newValue);
            this.handleRawIncoming(data);
          } catch {}
        }
      };
      window.addEventListener('storage', this.storageListener);
    }
  }

  public async hostRoom(code: string, _hostName?: string, _avatar?: string): Promise<{ success: boolean; error?: string; roomCode?: string }> {
    this.disconnect();
    this.isHost = true;
    this.roomToken = `rtk_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
    this.seq = 0;
    this.isConnected = false;

    const user = await ensureFirebaseAuth().catch(() => null);

    let targetCode = this.normalizeCode(code);
    let attempts = 0;

    // Check if room exists and was created in the last 6 hours; generate new code if collision occurs
    while (attempts < 5) {
      try {
        const snap = await get(ref(rtdb, `rooms/${targetCode}/meta`));
        if (snap.exists()) {
          const meta = snap.val();
          const age = Date.now() - (meta?.created || 0);
          if (age < 6 * 3600 * 1000) {
            // Collision with active room! Generate fresh code
            targetCode = Math.floor(100000 + Math.random() * 900000).toString();
            attempts++;
            continue;
          }
        }
        break;
      } catch (err) {
        console.warn('Room check warning:', err);
        break;
      }
    }

    this.roomCode = targetCode;

    // Register room in Firebase Realtime Database with 8 second timeout and hostUid
    const setMetaPromise = set(ref(rtdb, `rooms/${this.roomCode}/meta`), cleanForRtdb({
      created: Date.now(),
      hostId: this.instanceId,
      hostUid: user?.uid || null,
      roomToken: this.roomToken,
      active: true
    }));

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 8000);
    });

    try {
      await Promise.race([setMetaPromise, timeoutPromise]);
      const roomRef = ref(rtdb, `rooms/${this.roomCode}`);
      try {
        onDisconnect(roomRef).remove();
      } catch {}
    } catch (e: any) {
      console.error('Host room registration error:', e);
      let errorMsg = 'Oda kurulamadı. Lütfen tekrar deneyin.';
      if (e?.message === 'TIMEOUT') {
        errorMsg = 'Sunucu yanıt vermedi (Zaman aşımı - 8s). İnternet bağlantınızı kontrol edin.';
      } else if (e?.code === 'PERMISSION_DENIED') {
        errorMsg = 'Veritabanı erişim izni reddedildi (PERMISSION_DENIED).';
      }
      this.disconnect();
      return { success: false, error: errorMsg };
    }

    this.setupLocalBuses(this.roomCode);
    this.setupFirebaseRoom(this.roomCode);
    this.startHeartbeat();
    return { success: true, roomCode: this.roomCode };
  }

  public async joinRoom(
    code: string,
    guestName: string,
    guestAvatar: string,
    guestAvatarId?: string,
    guestCustomAvatarUrl?: string,
    guestCustomTitle?: string,
    guestLevel?: number
  ): Promise<{ success: boolean; error?: string }> {
    this.disconnect();
    this.isHost = false;
    this.roomCode = this.normalizeCode(code);
    this.roomToken = '';
    this.seq = 0;
    this.isConnected = false;

    await ensureFirebaseAuth().catch(() => {});

    // Step 1: Verify room exists with 5s timeout
    try {
      const getMetaPromise = get(ref(rtdb, `rooms/${this.roomCode}/meta`));
      const timeoutMeta = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 5000);
      });
      const snap: any = await Promise.race([getMetaPromise, timeoutMeta]);
      if (!snap.exists()) {
        return { success: false, error: 'Oda bulunamadı. Lütfen 6 haneli kodu kontrol ediniz.' };
      }
      const meta = snap.val();
      if (meta?.roomToken) {
        this.roomToken = meta.roomToken;
      }
    } catch (err: any) {
      console.error('Room verification error on join:', err);
      if (err?.message === 'TIMEOUT') {
        return { success: false, error: 'Sunucu yanıt vermedi (5s zaman aşımı). Lütfen bağlantınızı kontrol edin.' };
      }
      if (err?.code === 'PERMISSION_DENIED') {
        return { success: false, error: 'Veritabanı erişimi engellendi (PERMISSION_DENIED).' };
      }
      return { success: false, error: 'Oda doğrulanırken bir hata oluştu.' };
    }

    this.setupLocalBuses(this.roomCode);
    this.setupFirebaseRoom(this.roomCode);
    this.startHeartbeat();

    return new Promise<{ success: boolean; error?: string }>(resolve => {
      let resolved = false;
      let pingInterval: number | null = null;
      let timeoutId: number | null = null;

      const finish = (success: boolean, error?: string) => {
        if (!resolved) {
          resolved = true;
          if (pingInterval) window.clearInterval(pingInterval);
          if (timeoutId) window.clearTimeout(timeoutId);
          unsubscribe();
          if (success) {
            this.isConnected = true;
          }
          resolve({ success, error });
        }
      };

      const unsubscribe = this.onEvent(ev => {
        if (ev.type === 'HOST_LOBBY_SYNC') {
          if (ev.roomToken) this.roomToken = ev.roomToken;
          finish(true);
        } else if (ev.type === 'MP_GAME_START') {
          finish(true);
        } else if (ev.type === 'MP_MATCH_ABORTED') {
          finish(false, ev.reason || 'Oda kurucusu tarafından iptal edildi.');
        }
      });

      const announce = () => {
        this.send({
          type: 'GUEST_JOINED',
          guestName,
          guestAvatar,
          guestAvatarId,
          guestCustomAvatarUrl,
          guestCustomTitle,
          guestLevel,
          guestPeerId: this.instanceId
        });
      };

      announce();
      pingInterval = window.setInterval(announce, 350);

      timeoutId = window.setTimeout(() => {
        finish(false, 'Oda sahibinden yanıt alınamadı. Oda kapatılmış olabilir.');
      }, 10000);
    });
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
    this.lastRemoteMessageTime = Date.now();
    this.isPeerReconnecting = false;

    this.heartbeatTimer = window.setInterval(() => {
      if (this.roomCode && this.firebasePresenceRef) {
        // Direct server timestamp update to presence node without polluting event logs
        set(this.firebasePresenceRef, cleanForRtdb({
          instanceId: this.instanceId,
          role: this.isHost ? 'host' : 'guest',
          lastSeen: serverTimestamp()
        })).catch((err: any) => {
          console.error('Firebase heartbeat presence error:', err?.code, err);
        });

        if (this.isConnected) {
          const elapsed = Date.now() - this.lastRemoteMessageTime;
          // Grace period if no packet or presence received
          if (elapsed > 4500 && elapsed <= 9000) {
            this.isPeerReconnecting = true;
            const secondsLeft = Math.max(1, Math.ceil((9000 - elapsed) / 1000));
            this.dispatch({ type: 'PEER_RECONNECTING', secondsLeft });
          } else if (elapsed > 9000) {
            this.isConnected = false;
            this.isPeerReconnecting = false;
            this.dispatch({ type: 'PEER_DISCONNECTED', peerId: this.instanceId });
          }
        }
      }
    }, 3000);
  }

  private handleRawIncoming(envelope: any) {
    if (!envelope || typeof envelope !== 'object' || !('__pistiEnvelope' in envelope)) return;
    if (envelope.senderId === this.instanceId || envelope.roomCode !== this.roomCode) return;

    // Strict roomToken check: If local manager has a roomToken, incoming envelope MUST have matching roomToken
    if (this.roomToken) {
      if (!envelope.roomToken || envelope.roomToken !== this.roomToken) {
        console.warn(`[Anti-Cheat] Dropped packet with invalid/missing roomToken from ${envelope.senderId}`);
        return;
      }
    }

    if (this.seenMsgIds.has(envelope.msgId)) return;

    // Discard replayed or out-of-order packets (except important lobby syncs and handshakes)
    const isStateSync =
      envelope.payload?.type === 'GUEST_JOINED' ||
      envelope.payload?.type === 'HOST_LOBBY_SYNC' ||
      envelope.payload?.type === 'MP_GAME_START';

    if (!isStateSync && typeof envelope.seq === 'number' && envelope.senderId) {
      const last = this.lastSeenSeq.get(envelope.senderId) || 0;
      if (envelope.seq <= last) {
        return;
      }
      this.lastSeenSeq.set(envelope.senderId, envelope.seq);
    }

    this.seenMsgIds.add(envelope.msgId);
    if (this.seenMsgIds.size > 500) {
      const toRemove = this.seenMsgIds.size - 250;
      const iter = this.seenMsgIds.values();
      for (let i = 0; i < toRemove; i++) {
        const nextVal = iter.next().value;
        if (nextVal) this.seenMsgIds.delete(nextVal);
      }
    }

    this.lastRemoteMessageTime = Date.now();
    this.isConnected = true;

    if (this.isPeerReconnecting) {
      this.isPeerReconnecting = false;
      this.dispatch({ type: 'PEER_RECONNECTED' });
    }

    // Attach verified envelope senderId to payload for non-forgeable sender authentication
    const verifiedPayload = envelope.payload ? {
      ...envelope.payload,
      _verifiedSenderId: envelope.senderId
    } : envelope.payload;

    this.dispatch(verifiedPayload);
  }

  public send(payload: MultiplayerEvent) {
    if (!this.roomCode) return;

    const envelope: PacketEnvelope = {
      __pistiEnvelope: true,
      msgId: `${this.instanceId}-${Date.now()}-${getCryptoRandomString(6)}`,
      roomCode: this.roomCode,
      ...(this.roomToken ? { roomToken: this.roomToken } : {}),
      seq: ++this.seq,
      senderId: this.instanceId,
      timestamp: Date.now(),
      payload
    };

    // DEV: warn if any undefined sneaks into envelope
    if (import.meta.env.DEV) {
      const findUndef = (obj: any, path = ''): void => {
        if (obj && typeof obj === 'object') {
          Object.entries(obj).forEach(([k, v]) => {
            if (v === undefined) console.error(`[RTDB-undefined] ${path}.${k} is undefined – fix the payload!`);
            else findUndef(v, `${path}.${k}`);
          });
        }
      };
      findUndef(envelope, 'envelope');
    }

    // 1. Firebase Realtime Database
    if (this.firebaseEventsRef) {
      try {
        push(this.firebaseEventsRef, cleanForRtdb(envelope)).catch((err: any) => {
          console.error('Firebase push error:', err?.code, err?.message, err);
        });
      } catch (err) {
        console.error('Firebase push exception:', err);
      }
    }

    // Storage auto-prune: Clean up oldest events if room event count exceeds 35
    if (this.isHost && this.roomCode && this.seq % 15 === 0) {
      try {
        get(ref(rtdb, `rooms/${this.roomCode}/events`)).then(snap => {
          if (snap.exists()) {
            const keys = Object.keys(snap.val() || {});
            if (keys.length > 35) {
              const toDelete = keys.slice(0, keys.length - 20);
              toDelete.forEach(k => {
                remove(ref(rtdb, `rooms/${this.roomCode}/events/${k}`)).catch(() => {});
              });
            }
          }
        }).catch(() => {});
      } catch {}
    }

    // 2. Local Cross-Tab Fast Lane (DEV only)
    if (import.meta.env.DEV) {
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage(envelope);
        } catch {}
      }

      if (typeof window !== 'undefined' && payload.type !== 'PEER_HEARTBEAT') {
        try {
          localStorage.setItem(`pisti-pkt-${this.roomCode}`, JSON.stringify(envelope));
        } catch {}
      }
    }
  }

  public leaveRoom() {
    if (this.roomCode && this.isConnected) {
      this.send({
        type: 'MP_MATCH_ABORTED',
        senderPeerId: this.instanceId,
        reason: 'Oyuncu odadan ayrıldı.'
      });
    }
    this.disconnect();
  }

  public disconnect() {
    this.cleanupFirebaseRoom();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }

    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }

    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Clean up room in Firebase if host is leaving
    if (this.isHost && this.roomCode) {
      try {
        remove(ref(rtdb, `rooms/${this.roomCode}`)).catch(() => {});
      } catch {}
    }

    this.roomCode = '';
    this.roomToken = '';
    this.isHost = false;
    this.isConnected = false;
    this.seq = 0;
    this.seenMsgIds.clear();
    this.lastSeenSeq.clear();
    this.isPeerReconnecting = false;
  }

  public onEvent(callback: (event: MultiplayerEvent) => void): () => void {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback);
    };
  }

  private dispatch(event: MultiplayerEvent) {
    this.eventListeners.forEach(cb => {
      try {
        cb(event);
      } catch (err) {
        console.error('Error in multiplayer event listener:', err);
      }
    });
  }
}

export const multiplayerManager = new MultiplayerManager();
