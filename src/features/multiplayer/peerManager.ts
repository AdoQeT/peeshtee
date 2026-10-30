/**
 * Project Pişti - Dual-Broker MQTT + BroadcastChannel + LocalStorage Multiplayer Engine
 * Taken directly from the proven "çalışan online" architecture:
 * Powered by dual public MQTT brokers (HiveMQ & EMQX) over WebSockets (WSS)
 * + Local BroadcastChannel & LocalStorage fast lanes for 0ms same-origin tabs.
 * Supports 2-player and 4-player lobbies and real-time game synchronization.
 */
import type { MqttClient } from 'mqtt';
import { Card, GameSettings, ShuffleStyle } from '../../types/game';
import { rtdb, ref, push, onChildAdded, off, set, get } from '../../core/firebase';

const BROKER_1 = 'wss://broker.emqx.io:8084/mqtt';
const BROKER_2 = 'wss://broker.hivemq.com:8884/mqtt';

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
      seedCards: any[];
      startingTurnSeat: number;
    }
  | {
      type: 'MP_NEXT_ROUND';
      seedDeck: Card[];
      shuffleStyle: ShuffleStyle;
      round: number;
      startingTurnSeat: number;
    }
  | {
      type: 'REQUEST_SEAT_CHANGE';
      targetSeatIndex: number;
      senderPeerId: string;
    }
  | {
      type: 'MP_ROUND_READY';
      seatIndex: number;
      senderPeerId: string;
      isReady: boolean;
    }
  | {
      type: 'MP_CHAT_MESSAGE';
      senderPeerId: string;
      senderName: string;
      senderAvatarId?: string;
      senderAvatar?: string;
      text: string;
      seatIndex: number;
      timestamp: number;
    }
  | {
      type: 'MP_EMOTE';
      emoji: string;
      seatIndex: number;
      senderPeerId?: string;
    }
  | {
      type: 'PEER_HEARTBEAT';
      role: 'host' | 'guest';
      peerId: string;
      timestamp: number;
    }
  | { type: 'PEER_RECONNECTING'; secondsLeft: number }
  | { type: 'PEER_RECONNECTED' }
  | { type: 'PEER_DISCONNECTED'; peerId?: string }
  | {
      type: 'REQUEST_RESYNC';
      seatIndex: number;
      senderPeerId?: string;
    }
  | {
      type: 'MP_MATCH_ABORTED';
      reason: string;
      senderPeerId?: string;
      senderName?: string;
      gameType?: 'pisti' | 'uno';
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

export function getCryptoRandomString(len: number = 8): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').slice(0, len);
  }
  return Math.random().toString(36).slice(2, 2 + len);
}

export class MultiplayerManager {
  public instanceId: string = `peer-${getCryptoRandomString(8)}-${Date.now()}`;
  public client: MqttClient | null = null;
  public clients: MqttClient[] = [];
  public broadcastChannel: BroadcastChannel | null = null;
  private eventListeners: ((event: MultiplayerEvent) => void)[] = [];
  private seenMsgIds: Set<string> = new Set();
  private lastSeenSeq: Map<string, number> = new Map();
  private storageListener: ((ev: StorageEvent) => void) | null = null;
  private firebaseEventsRef: any = null;
  private heartbeatTimer: number | null = null;
  private lastRemoteMessageTime: number = 0;
  private isPeerReconnecting: boolean = false;
  private seq: number = 0;

  public isHost: boolean = false;
  public roomCode: string = '';
  public roomToken: string = '';
  public isConnected: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.isConnected && this.roomCode) {
          this.send({ type: 'PEER_DISCONNECTED', peerId: this.instanceId });
        }
      });
    }
  }

  public onEvent(callback: (event: MultiplayerEvent) => void) {
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
        console.warn('Listener error in MultiplayerManager:', err);
      }
    });
  }

  public normalizeCode(code: string): string {
    const digits = code.trim().replace(/\D/g, '');
    if (digits.length >= 4) {
      return digits.slice(0, 6);
    }
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  public getTopic(code: string): string {
    return `pisti/room/${code.replace(/[^A-Z0-9]/g, '').toLowerCase()}/events`;
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
      console.warn('Firebase RTDB listener setup failed:', err);
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

  public async setupMqttClient(code: string): Promise<boolean> {
    const topic = this.getTopic(code);
    const mqttModule = await import('mqtt');
    const connectFn =
      (mqttModule as any)?.default?.connect ||
      (mqttModule as any)?.connect ||
      (mqttModule as any);

    this.clients = [BROKER_1, BROKER_2].map(brokerUrl => {
      const client = connectFn(brokerUrl, {
        keepalive: 30,
        clientId: `pisti-${this.instanceId}-${Math.random().toString(36).slice(2, 6)}`,
        clean: true,
        connectTimeout: 3500,
        reconnectPeriod: 2000
      });

      client.on('connect', () => {
        client.subscribe(topic, { qos: 0 }, (err: any) => {
          if (err) console.warn('MQTT sub error:', brokerUrl, err);
        });
      });

      client.on('message', (_t: string, payload: any) => {
        try {
          const envelope = JSON.parse(payload.toString());
          this.handleRawIncoming(envelope);
        } catch (e) {
          console.warn('Malformed MQTT packet:', e);
        }
      });

      client.on('error', (err: any) => {
        console.warn('MQTT broker error:', brokerUrl, err && err.message);
      });

      return client;
    });

    this.client = this.clients[0];
    const clients = this.clients;

    return new Promise<boolean>(resolve => {
      let resolved = false;
      const done = (val: boolean) => {
        if (!resolved) {
          resolved = true;
          window.clearInterval(checkInterval);
          window.clearTimeout(timeoutId);
          resolve(val);
        }
      };

      const checkInterval = window.setInterval(() => {
        if (clients.some(c => c.connected)) {
          done(true);
        }
      }, 100);

      const timeoutId = window.setTimeout(() => {
        done(clients.some(c => c.connected));
      }, 10000);
    });
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

    // Save room existence to Firebase Realtime Database
    try {
      set(ref(rtdb, `rooms/${this.roomCode}/meta`), {
        created: Date.now(),
        hostId: this.instanceId,
        active: true
      }).catch(() => {});
    } catch {}

    // Setup MQTT as auxiliary fallback in background without blocking
    this.setupMqttClient(this.roomCode).catch(() => {});
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

    // Start MQTT in background
    this.setupMqttClient(this.roomCode).catch(() => {});
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

      // Announce immediately
      announce();
      // Retry every 600ms until Host responds with HOST_LOBBY_SYNC
      pingInterval = window.setInterval(announce, 600);

      // Check if room meta exists in Firebase for instant feedback
      get(ref(rtdb, `rooms/${this.roomCode}/meta`)).then(snap => {
        if (!snap.exists()) {
          setTimeout(() => {
            if (!this.isConnected && !resolved) finish(false);
          }, 4500);
        }
      }).catch(() => {});

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
          // Fast Disconnect Detection: Grace Period if no packet for > 3.5s and <= 8.5s
          if (elapsed > 3500 && elapsed <= 8500) {
            this.isPeerReconnecting = true;
            const secondsLeft = Math.max(1, Math.ceil((8500 - elapsed) / 1000));
            this.dispatch({ type: 'PEER_RECONNECTING', secondsLeft });
          } else if (elapsed > 8500) {
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

    const str = JSON.stringify(envelope);
    const topic = this.getTopic(this.roomCode);

    // 1. Firebase Realtime Database Fast Cloud Lane
    if (this.firebaseEventsRef) {
      try {
        push(this.firebaseEventsRef, envelope).catch(() => {});
      } catch {}
    }

    // 2. Dual Public MQTT fallback
    this.clients.forEach(c => {
      if (c.connected) {
        try {
          c.publish(topic, str, { qos: 0 });
        } catch {}
      }
    });

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(envelope);
      } catch {}
    }

    // Do NOT write periodic heartbeats to localStorage (avoids disk I/O & storage event spam)
    if (typeof window !== 'undefined' && payload.type !== 'PEER_HEARTBEAT') {
      try {
        localStorage.setItem(`pisti-pkt-${this.roomCode}`, str);
      } catch {}
    }
  }

  public leaveRoom() {
    this.disconnect();
  }

  public disconnect() {
    this.cleanupFirebaseRoom();
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.clients.length) {
      this.clients.forEach(c => {
        try {
          c.end(true);
        } catch {}
      });
      this.clients = [];
      this.client = null;
    }
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
    this.seenMsgIds.clear();
    this.lastSeenSeq.clear();
    this.isConnected = false;
    this.isPeerReconnecting = false;
    this.roomCode = '';
    this.isHost = false;
  }
}

export const multiplayerManager = new MultiplayerManager();
