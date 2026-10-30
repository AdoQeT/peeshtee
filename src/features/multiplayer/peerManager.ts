/**
 * Project Pişti - Pure Firebase Realtime Database Multiplayer Engine
 * All matchmaking, lobbies, player slots, card events, and match transitions
 * are powered 100% directly through Google Firebase Realtime Database.
 */
import { Card, GameSettings, ShuffleStyle } from '../../types/game';
import { rtdb, ref, push, onChildAdded, set, get, off, remove, onDisconnect } from '../../core/firebase';

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
      onChildAdded(this.firebaseEventsRef, (snapshot: any) => {
        const val = snapshot.val();
        if (val) {
          this.handleRawIncoming(val);
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

  public async hostRoom(code: string, _hostName?: string, _avatar?: string): Promise<string> {
    this.disconnect();
    this.isHost = true;
    this.roomCode = this.normalizeCode(code);
    this.roomToken = `rtk_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
    this.seq = 0;
    this.isConnected = false;

    this.setupLocalBuses(this.roomCode);
    this.setupFirebaseRoom(this.roomCode);

    // Register room in Firebase Realtime Database and set automatic cleanup on disconnect
    try {
      const roomRef = ref(rtdb, `rooms/${this.roomCode}`);
      await set(ref(rtdb, `rooms/${this.roomCode}/meta`), {
        created: Date.now(),
        hostId: this.instanceId,
        active: true
      });
      // Automatically purge room from Firebase if host disconnects or tab closes
      try {
        onDisconnect(roomRef).remove();
      } catch {}
    } catch (e) {
      console.warn('Host room registration warning:', e);
    }

    this.startHeartbeat();
    return this.roomCode;
  }

  public async joinRoom(
    code: string,
    guestName: string,
    guestAvatar: string,
    guestAvatarId?: string,
    guestCustomAvatarUrl?: string,
    guestCustomTitle?: string,
    guestLevel?: number
  ): Promise<boolean> {
    this.disconnect();
    this.isHost = false;
    this.roomCode = this.normalizeCode(code);
    this.roomToken = '';
    this.seq = 0;
    this.isConnected = false;

    this.setupLocalBuses(this.roomCode);
    this.setupFirebaseRoom(this.roomCode);
    this.startHeartbeat();

    return new Promise<boolean>(resolve => {
      let resolved = false;
      let pingInterval: number | null = null;
      let timeoutId: number | null = null;

      const finish = (success: boolean) => {
        if (!resolved) {
          resolved = true;
          if (pingInterval) window.clearInterval(pingInterval);
          if (timeoutId) window.clearTimeout(timeoutId);
          unsubscribe();
          if (success) {
            this.isConnected = true;
          }
          resolve(success);
        }
      };

      const unsubscribe = this.onEvent(ev => {
        if (ev.type === 'HOST_LOBBY_SYNC') {
          if (ev.roomToken) this.roomToken = ev.roomToken;
          finish(true);
        } else if (ev.type === 'MP_GAME_START') {
          finish(true);
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

      // Announce immediately to Firebase and local channels
      announce();
      // Retry every 350ms until Host responds
      pingInterval = window.setInterval(announce, 350);

      timeoutId = window.setTimeout(() => {
        finish(false);
      }, 7000);
    });
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
    this.lastRemoteMessageTime = Date.now();
    this.isPeerReconnecting = false;

    this.heartbeatTimer = window.setInterval(() => {
      if (this.roomCode) {
        this.send({
          type: 'PEER_HEARTBEAT',
          role: this.isHost ? 'host' : 'guest',
          peerId: this.instanceId,
          timestamp: Date.now()
        });

        if (this.isConnected) {
          const elapsed = Date.now() - this.lastRemoteMessageTime;
          // Grace period if no packet received
          if (elapsed > 4000 && elapsed <= 9000) {
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
    }, 1500);
  }

  private handleRawIncoming(envelope: any) {
    if (!envelope || typeof envelope !== 'object' || !('__pistiEnvelope' in envelope)) return;
    if (envelope.senderId === this.instanceId || envelope.roomCode !== this.roomCode) return;
    if (this.roomToken && envelope.roomToken && envelope.roomToken !== this.roomToken) return;
    if (this.seenMsgIds.has(envelope.msgId)) return;

    // Discard replayed or out-of-order packets
    if (typeof envelope.seq === 'number' && envelope.senderId) {
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

    this.dispatch(envelope.payload);
  }

  public send(payload: MultiplayerEvent) {
    if (!this.roomCode) return;

    const envelope: PacketEnvelope = {
      __pistiEnvelope: true,
      msgId: `${this.instanceId}-${Date.now()}-${getCryptoRandomString(6)}`,
      roomCode: this.roomCode,
      roomToken: this.roomToken || undefined,
      seq: ++this.seq,
      senderId: this.instanceId,
      timestamp: Date.now(),
      payload
    };

    // 1. Firebase Realtime Database
    if (this.firebaseEventsRef) {
      try {
        push(this.firebaseEventsRef, envelope).catch(() => {});
      } catch {}
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

    // 2. Local Cross-Tab Fast Lane
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(envelope);
      } catch {}
    }

    // LocalStorage fallback for multi-tab
    if (typeof window !== 'undefined' && payload.type !== 'PEER_HEARTBEAT') {
      try {
        localStorage.setItem(`pisti-pkt-${this.roomCode}`, JSON.stringify(envelope));
      } catch {}
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
