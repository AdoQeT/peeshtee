import mqtt, { MqttClient } from 'mqtt';
import { getUserProfile, addOrUpdateFriend } from '../profile/profileManager';

const BROKER_1 = 'wss://broker.hivemq.com:8884/mqtt';
const BROKER_2 = 'wss://broker.emqx.io:8084/mqtt';
const SOCIAL_TOPIC = 'pisti/global/social/v1';

export interface OnlinePlayerPresence {
  id: string;
  friendCode: string;
  name: string;
  avatarId: string;
  customAvatarUrl?: string;
  status: 'menu' | 'lobby' | 'playing';
  roomCode?: string;
  gameType?: 'pisti' | 'uno';
  lastSeen: number;
}

export interface IncomingGameInvite {
  inviteId: string;
  fromId: string;
  fromFriendCode: string;
  fromName: string;
  fromAvatarId: string;
  fromCustomAvatarUrl?: string;
  targetFriendCode?: string;
  targetName?: string;
  roomCode: string;
  gameType: 'pisti' | 'uno';
  timestamp: number;
}

export interface IncomingFriendNotice {
  id: string;
  fromId: string;
  fromFriendCode: string;
  fromName: string;
  fromAvatarId: string;
  fromCustomAvatarUrl?: string;
  targetFriendCode?: string;
  targetName?: string;
  timestamp: number;
}

type SocialPacket =
  | {
      type: 'PRESENCE_HEARTBEAT';
      player: OnlinePlayerPresence;
    }
  | {
      type: 'PRESENCE_QUERY';
      requesterCode: string;
    }
  | {
      type: 'GAME_INVITE';
      invite: IncomingGameInvite;
    }
  | {
      type: 'FRIEND_ADDED_NOTICE';
      notice: IncomingFriendNotice;
    };

class FriendNetworkManager {
  private clients: MqttClient[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private onlinePlayers: Map<string, OnlinePlayerPresence> = new Map();
  private listeners: (() => void)[] = [];
  private inviteListeners: ((invite: IncomingGameInvite) => void)[] = [];
  private noticeListeners: ((notice: IncomingFriendNotice) => void)[] = [];
  private seenPacketIds: Set<string> = new Set();
  private currentStatus: 'menu' | 'lobby' | 'playing' = 'menu';
  private currentRoomCode: string | undefined = undefined;
  private currentGameType: 'pisti' | 'uno' = 'pisti';
  private initialized = false;

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    try {
      this.broadcastChannel = new BroadcastChannel('pisti_social_bus_v1');
      this.broadcastChannel.onmessage = ev => {
        this.handleIncomingRaw(ev.data);
      };
    } catch {
      // Ignore if BroadcastChannel unsupported
    }

    window.addEventListener('storage', ev => {
      if (ev.key === 'pisti-social-pkt' && ev.newValue) {
        try {
          this.handleIncomingRaw(JSON.parse(ev.newValue));
        } catch {
          // Ignore
        }
      }
    });

    [BROKER_1, BROKER_2].forEach(url => {
      try {
        const client = mqtt.connect(url, {
          clientId: `pisti-soc-${Math.random().toString(16).slice(2, 10)}`,
          clean: true,
          connectTimeout: 8000,
          reconnectPeriod: 4000
        });

        client.on('connect', () => {
          client.subscribe(SOCIAL_TOPIC, { qos: 0 }, () => {
            this.announcePresence();
            this.sendPacket({
              type: 'PRESENCE_QUERY',
              requesterCode: getUserProfile().friendCode
            });
          });
        });

        client.on('message', (_topic, payload) => {
          try {
            const parsed = JSON.parse(payload.toString());
            this.handleIncomingRaw(parsed);
          } catch {
            // Ignore malformed
          }
        });

        this.clients.push(client);
      } catch {
        // Ignore broker init failure
      }
    });

    // Periodic heartbeat every 8 seconds + prune stale players
    window.setInterval(() => {
      this.announcePresence();
      const now = Date.now();
      let changed = false;
      this.onlinePlayers.forEach((val, key) => {
        if (now - val.lastSeen > 28000) {
          this.onlinePlayers.delete(key);
          changed = true;
        }
      });
      if (changed) this.notifyListeners();
    }, 8000);
  }

  public setStatus(
    status: 'menu' | 'lobby' | 'playing',
    roomCode?: string,
    gameType: 'pisti' | 'uno' = 'pisti'
  ) {
    this.currentStatus = status;
    this.currentRoomCode = roomCode;
    this.currentGameType = gameType;
    this.announcePresence();
  }

  public announcePresence() {
    const profile = getUserProfile();
    const presence: OnlinePlayerPresence = {
      id: profile.id,
      friendCode: profile.friendCode,
      name: profile.name,
      avatarId: profile.avatarId,
      // Avoid sending huge base64 strings over public MQTT heartbeat if > 12KB
      customAvatarUrl:
        profile.customAvatarDataUrl && profile.customAvatarDataUrl.length < 12000
          ? profile.customAvatarDataUrl
          : undefined,
      status: this.currentStatus,
      roomCode: this.currentRoomCode,
      gameType: this.currentGameType,
      lastSeen: Date.now()
    };

    this.sendPacket({
      type: 'PRESENCE_HEARTBEAT',
      player: presence
    });
  }

  public sendGameInvite(
    target: { friendCode?: string; name?: string },
    roomCode: string,
    gameType: 'pisti' | 'uno' = 'pisti'
  ) {
    const profile = getUserProfile();
    const invite: IncomingGameInvite = {
      inviteId: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      targetFriendCode: target.friendCode?.replace(/[^0-9A-Za-z]/g, ''),
      targetName: target.name?.trim(),
      roomCode,
      gameType,
      timestamp: Date.now()
    };

    this.sendPacket({
      type: 'GAME_INVITE',
      invite
    });
  }

  public sendFriendAddedNotice(target: { friendCode?: string; name?: string }) {
    const profile = getUserProfile();
    const notice: IncomingFriendNotice = {
      id: `fr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      targetFriendCode: target.friendCode?.replace(/[^0-9A-Za-z]/g, ''),
      targetName: target.name?.trim(),
      timestamp: Date.now()
    };

    this.sendPacket({
      type: 'FRIEND_ADDED_NOTICE',
      notice
    });
  }

  private sendPacket(packet: SocialPacket) {
    const wrapper = {
      __pistiSocial: true,
      pktId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: getUserProfile().id,
      packet
    };

    const raw = JSON.stringify(wrapper);

    this.clients.forEach(c => {
      if (c.connected) {
        try {
          c.publish(SOCIAL_TOPIC, raw, { qos: 0 });
        } catch {
          // Ignore
        }
      }
    });

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(wrapper);
      } catch {
        // Ignore
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pisti-social-pkt', raw);
      } catch {
        // Ignore
      }
    }
  }

  private handleIncomingRaw(wrapper: any) {
    if (!wrapper || !wrapper.__pistiSocial || !wrapper.packet) return;
    if (this.seenPacketIds.has(wrapper.pktId)) return;
    this.seenPacketIds.add(wrapper.pktId);
    if (this.seenPacketIds.size > 400) {
      const first = this.seenPacketIds.values().next().value;
      if (first) this.seenPacketIds.delete(first);
    }

    const myProfile = getUserProfile();
    const pkt: SocialPacket = wrapper.packet;

    if (pkt.type === 'PRESENCE_HEARTBEAT') {
      if (pkt.player.id === myProfile.id && pkt.player.friendCode === myProfile.friendCode) {
        return;
      }
      this.onlinePlayers.set(pkt.player.friendCode, {
        ...pkt.player,
        lastSeen: Date.now()
      });

      // Also auto-update friendCode or roomCode if this person is already in our friends list
      const existingFriend = (myProfile.friends || []).find(
        f =>
          (f.friendCode && f.friendCode === pkt.player.friendCode) ||
          f.name.toLowerCase() === pkt.player.name.toLowerCase()
      );
      if (existingFriend) {
        addOrUpdateFriend({
          id: pkt.player.id,
          friendCode: pkt.player.friendCode,
          name: pkt.player.name,
          avatarId: pkt.player.avatarId,
          customAvatarDataUrl: existingFriend.customAvatarDataUrl || pkt.player.customAvatarUrl,
          roomCode: pkt.player.roomCode
        });
      }

      this.notifyListeners();
    } else if (pkt.type === 'PRESENCE_QUERY') {
      if (pkt.requesterCode !== myProfile.friendCode) {
        this.announcePresence();
      }
    } else if (pkt.type === 'GAME_INVITE') {
      const inv = pkt.invite;
      if (inv.fromId === myProfile.id) return;

      const isForMeByCode =
        inv.targetFriendCode &&
        inv.targetFriendCode.toLowerCase() === myProfile.friendCode.toLowerCase();
      const isForMeByName =
        inv.targetName && inv.targetName.toLowerCase() === myProfile.name.toLowerCase();

      if (isForMeByCode || isForMeByName) {
        this.inviteListeners.forEach(cb => cb(inv));
      }
    } else if (pkt.type === 'FRIEND_ADDED_NOTICE') {
      const notice = pkt.notice;
      if (notice.fromId === myProfile.id) return;

      const isForMeByCode =
        notice.targetFriendCode &&
        notice.targetFriendCode.toLowerCase() === myProfile.friendCode.toLowerCase();
      const isForMeByName =
        notice.targetName && notice.targetName.toLowerCase() === myProfile.name.toLowerCase();

      if (isForMeByCode || isForMeByName) {
        addOrUpdateFriend({
          id: notice.fromId,
          friendCode: notice.fromFriendCode,
          name: notice.fromName,
          avatarId: notice.fromAvatarId
        });
        this.noticeListeners.forEach(cb => cb(notice));
        this.notifyListeners();
      }
    }
  }

  public getOnlinePlayers(): OnlinePlayerPresence[] {
    return Array.from(this.onlinePlayers.values());
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  public onGameInvite(cb: (invite: IncomingGameInvite) => void) {
    this.inviteListeners.push(cb);
    return () => {
      this.inviteListeners = this.inviteListeners.filter(l => l !== cb);
    };
  }

  public onFriendNotice(cb: (notice: IncomingFriendNotice) => void) {
    this.noticeListeners.push(cb);
    return () => {
      this.noticeListeners = this.noticeListeners.filter(l => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb());
  }
}

export const friendNetwork = new FriendNetworkManager();
