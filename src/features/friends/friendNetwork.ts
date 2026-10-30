import type { MqttClient } from 'mqtt';
import { rtdb, ref, push, onChildAdded, set, onValue } from '../../core/firebase';
import {
  getUserProfile,
  addOrUpdateFriend,
  addIncomingFriendRequest,
  removeFriend,
  calculateLevel,
  type UserProfile,
  type MatchRecord
} from '../profile/profileManager';

const BROKER_1 = 'wss://broker.emqx.io:8084/mqtt';
const BROKER_2 = 'wss://broker.hivemq.com:8884/mqtt';
const SOCIAL_TOPIC = 'pisti/global/social/v1';

export interface OnlinePlayerPresence {
  id: string;
  friendCode: string;
  name: string;
  avatarId: string;
  customAvatarUrl?: string;
  customTitle?: string;
  level?: number;
  status: 'menu' | 'lobby' | 'playing';
  roomCode?: string;
  gameType?: 'pisti' | 'uno';
  stats?: UserProfile['stats'];
  matchHistory?: MatchRecord[];
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
      type: 'FRIEND_REQUEST';
      request: {
        id: string;
        fromId: string;
        fromFriendCode: string;
        fromName: string;
        fromAvatarId: string;
        fromCustomAvatarUrl?: string;
        fromCustomTitle?: string;
        targetFriendCode?: string;
        timestamp: number;
      };
    }
  | {
      type: 'FRIEND_ACCEPT';
      notice: IncomingFriendNotice;
    }
  | {
      type: 'FRIEND_DECLINE';
      fromFriendCode: string;
      targetFriendCode?: string;
    }
  | {
      type: 'FRIEND_ADDED_NOTICE';
      notice: IncomingFriendNotice;
    }
  | {
      type: 'FRIEND_REMOVED_NOTICE';
      notice: IncomingFriendNotice;
    };

class FriendNetworkManager {
  private clients: MqttClient[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private onlinePlayers: Map<string, OnlinePlayerPresence> = new Map();
  private listeners: (() => void)[] = [];
  private inviteListeners: ((invite: IncomingGameInvite) => void)[] = [];
  private noticeListeners: ((notice: IncomingFriendNotice) => void)[] = [];
  private requestListeners: ((req: any) => void)[] = [];
  private seenPacketIds: Set<string> = new Set();
  private currentStatus: 'menu' | 'lobby' | 'playing' = 'menu';
  private currentRoomCode: string | undefined = undefined;
  private currentGameType: 'pisti' | 'uno' = 'pisti';
  private heartbeatInterval: number | null = null;
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
      // Ignore
    }

    window.addEventListener('storage', ev => {
      if (ev.key === 'pisti-social-pkt' && ev.newValue) {
        try {
          this.handleIncomingRaw(JSON.parse(ev.newValue));
        } catch {}
      }
    });

    const myProfile = getUserProfile();
    const myCode = myProfile.friendCode;

    // 1. Firebase Cloud: Listen for Incoming Game Invites
    if (myCode) {
      try {
        onChildAdded(ref(rtdb, `invites/${myCode}`), (snapshot: any) => {
          const inv = snapshot.val() as IncomingGameInvite;
          if (inv && inv.fromId !== getUserProfile().id) {
            this.inviteListeners.forEach(cb => cb(inv));
          }
        });
      } catch (err) {
        console.warn('Firebase invite listener error:', err);
      }

      // 2. Firebase Cloud: Listen for Incoming Friend Requests
      try {
        onChildAdded(ref(rtdb, `requests/${myCode}`), (snapshot: any) => {
          const req = snapshot.val();
          if (req && req.fromId !== getUserProfile().id) {
            addIncomingFriendRequest({
              id: req.fromId,
              friendCode: req.fromFriendCode,
              name: req.fromName,
              avatarId: req.fromAvatarId,
              customAvatarDataUrl: req.fromCustomAvatarUrl,
              customTitle: req.fromCustomTitle,
              lastPlayedAt: Date.now()
            });
            this.requestListeners.forEach(cb => cb(req));
            this.notifyListeners();
          }
        });
      } catch (err) {
        console.warn('Firebase friend request listener error:', err);
      }

      // 3. Firebase Cloud: Listen for Social Notices (Accept / Remove)
      try {
        onChildAdded(ref(rtdb, `notices/${myCode}`), (snapshot: any) => {
          const notice = snapshot.val();
          if (!notice) return;
          if (notice.type === 'accept') {
            addOrUpdateFriend({
              id: notice.fromId,
              friendCode: notice.fromFriendCode,
              name: notice.fromName,
              avatarId: notice.fromAvatarId,
              customAvatarDataUrl: notice.fromCustomAvatarUrl
            });
            this.noticeListeners.forEach(cb => cb(notice));
            this.notifyListeners();
          } else if (notice.type === 'remove') {
            removeFriend(notice.fromId, notice.fromFriendCode, notice.fromName);
            this.noticeListeners.forEach(cb => cb(notice));
            this.notifyListeners();
          }
        });
      } catch (err) {
        console.warn('Firebase notice listener error:', err);
      }

      // 4. Firebase Cloud: Listen for Global Presence of other players
      try {
        onValue(ref(rtdb, 'presence'), (snapshot: any) => {
          const data = snapshot.val();
          if (data && typeof data === 'object') {
            const now = Date.now();
            Object.values(data).forEach((p: any) => {
              if (p && p.friendCode && p.friendCode !== myCode) {
                // If last seen within 30 seconds
                if (now - (p.lastSeen || 0) < 30000) {
                  this.onlinePlayers.set(p.friendCode, p);
                }
              }
            });
            this.notifyListeners();
          }
        });
      } catch (err) {
        console.warn('Firebase presence listener error:', err);
      }
    }

    // Secondary MQTT fallback
    import('mqtt').then(mqttModule => {
      const connectFn =
        (mqttModule as any)?.default?.connect ||
        (mqttModule as any)?.connect ||
        (mqttModule as any);

      [BROKER_1, BROKER_2].forEach(url => {
        try {
          const client = connectFn(url, {
            clientId: `pisti-soc-${Math.random().toString(16).slice(2, 10)}`,
            clean: true,
            connectTimeout: 3500,
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

          client.on('message', (_topic: string, payload: any) => {
            try {
              const parsed = JSON.parse(payload.toString());
              this.handleIncomingRaw(parsed);
            } catch {}
          });

          this.clients.push(client);
        } catch {}
      });
    }).catch(err => {
      console.warn('Dynamic mqtt import failed for social network:', err);
    });

    // Periodic heartbeat every 8 seconds
    this.heartbeatInterval = window.setInterval(() => {
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
    const lvlInfo = calculateLevel(profile.xp || 0);
    const presence: OnlinePlayerPresence = {
      id: profile.id,
      friendCode: profile.friendCode,
      name: profile.name,
      avatarId: profile.avatarId,
      customAvatarUrl: profile.customAvatarDataUrl && !profile.customAvatarDataUrl.startsWith('data:') ? profile.customAvatarDataUrl : undefined,
      customTitle: profile.customTitle,
      level: lvlInfo.level,
      status: this.currentStatus,
      roomCode: this.currentRoomCode,
      gameType: this.currentGameType,
      stats: profile.stats,
      matchHistory: undefined,
      lastSeen: Date.now()
    };

    // Firebase presence update
    if (profile.friendCode) {
      try {
        set(ref(rtdb, `presence/${profile.friendCode}`), presence).catch(() => {});
      } catch {}
    }

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
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    const invite: IncomingGameInvite = {
      inviteId: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      fromCustomAvatarUrl: profile.customAvatarDataUrl,
      targetFriendCode: cleanTargetCode,
      targetName: target.name?.trim(),
      roomCode,
      gameType,
      timestamp: Date.now()
    };

    if (cleanTargetCode) {
      try {
        push(ref(rtdb, `invites/${cleanTargetCode}`), invite).catch(() => {});
      } catch {}
    }

    this.sendPacket({
      type: 'GAME_INVITE',
      invite
    });
  }

  public sendFriendRequest(target: { friendCode?: string; name?: string }) {
    const profile = getUserProfile();
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    const req = {
      id: `freq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      fromCustomAvatarUrl: profile.customAvatarDataUrl,
      fromCustomTitle: profile.customTitle,
      targetFriendCode: cleanTargetCode,
      timestamp: Date.now()
    };

    if (cleanTargetCode) {
      try {
        push(ref(rtdb, `requests/${cleanTargetCode}`), req).catch(() => {});
      } catch {}
    }

    this.sendPacket({
      type: 'FRIEND_REQUEST',
      request: req
    });
  }

  public sendFriendAccept(target: { friendCode?: string; name?: string }) {
    const profile = getUserProfile();
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    const notice: IncomingFriendNotice = {
      id: `fr-acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      fromCustomAvatarUrl: profile.customAvatarDataUrl,
      targetFriendCode: cleanTargetCode,
      targetName: target.name?.trim(),
      timestamp: Date.now()
    };

    if (cleanTargetCode) {
      try {
        push(ref(rtdb, `notices/${cleanTargetCode}`), {
          ...notice,
          type: 'accept'
        }).catch(() => {});
      } catch {}
    }

    this.sendPacket({
      type: 'FRIEND_ACCEPT',
      notice
    });
  }

  public sendFriendDecline(targetFriendCode: string) {
    const profile = getUserProfile();
    const cleanTargetCode = targetFriendCode?.replace(/[^0-9A-Za-z]/g, '');
    this.sendPacket({
      type: 'FRIEND_DECLINE',
      fromFriendCode: profile.friendCode,
      targetFriendCode: cleanTargetCode
    });
  }

  public sendFriendRemovedNotice(target: { friendCode?: string; name?: string }) {
    const profile = getUserProfile();
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    const notice: IncomingFriendNotice = {
      id: `fr-rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      targetFriendCode: cleanTargetCode,
      targetName: target.name?.trim(),
      timestamp: Date.now()
    };

    if (cleanTargetCode) {
      try {
        push(ref(rtdb, `notices/${cleanTargetCode}`), {
          ...notice,
          type: 'remove'
        }).catch(() => {});
      } catch {}
    }

    this.sendPacket({
      type: 'FRIEND_REMOVED_NOTICE',
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
        } catch {}
      }
    });

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(wrapper);
      } catch {}
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pisti-social-pkt', raw);
      } catch {}
    }
  }

  private handleIncomingRaw(wrapper: any) {
    if (!wrapper || !wrapper.__pistiSocial || !wrapper.packet) return;
    if (this.seenPacketIds.has(wrapper.pktId)) return;
    this.seenPacketIds.add(wrapper.pktId);
    if (this.seenPacketIds.size > 400) {
      const toRemove = this.seenPacketIds.size - 200;
      const iter = this.seenPacketIds.values();
      for (let i = 0; i < toRemove; i++) {
        const val = iter.next().value;
        if (val) this.seenPacketIds.delete(val);
      }
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
          customAvatarDataUrl: pkt.player.customAvatarUrl || existingFriend.customAvatarDataUrl,
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
    } else if (pkt.type === 'FRIEND_REQUEST') {
      const req = pkt.request;
      if (req.fromId === myProfile.id) return;
      if (req.targetFriendCode && req.targetFriendCode.toLowerCase() === myProfile.friendCode.toLowerCase()) {
        addIncomingFriendRequest({
          id: req.fromId,
          friendCode: req.fromFriendCode,
          name: req.fromName,
          avatarId: req.fromAvatarId,
          customAvatarDataUrl: req.fromCustomAvatarUrl,
          customTitle: req.fromCustomTitle,
          lastPlayedAt: Date.now()
        });
        this.requestListeners.forEach(cb => cb(req));
        this.notifyListeners();
      }
    } else if (pkt.type === 'FRIEND_ACCEPT') {
      const notice = pkt.notice;
      if (notice.fromId === myProfile.id) return;
      if (notice.targetFriendCode && notice.targetFriendCode.toLowerCase() === myProfile.friendCode.toLowerCase()) {
        addOrUpdateFriend({
          id: notice.fromId,
          friendCode: notice.fromFriendCode,
          name: notice.fromName,
          avatarId: notice.fromAvatarId,
          customAvatarDataUrl: notice.fromCustomAvatarUrl
        });
        this.noticeListeners.forEach(cb => cb(notice));
        this.notifyListeners();
      }
    } else if (pkt.type === 'FRIEND_DECLINE') {
      this.notifyListeners();
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
          avatarId: notice.fromAvatarId,
          customAvatarDataUrl: notice.fromCustomAvatarUrl
        });
        this.noticeListeners.forEach(cb => cb(notice));
        this.notifyListeners();
      }
    } else if (pkt.type === 'FRIEND_REMOVED_NOTICE') {
      const notice = pkt.notice;
      if (notice.fromId === myProfile.id) return;

      const isForMeByCode =
        notice.targetFriendCode &&
        notice.targetFriendCode.toLowerCase() === myProfile.friendCode.toLowerCase();
      const isForMeByName =
        notice.targetName && notice.targetName.toLowerCase() === myProfile.name.toLowerCase();

      if (isForMeByCode || isForMeByName) {
        removeFriend(notice.fromId, notice.fromFriendCode, notice.fromName);
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

  public onFriendRequest(cb: (req: any) => void) {
    this.requestListeners.push(cb);
    return () => {
      this.requestListeners = this.requestListeners.filter(l => l !== cb);
    };
  }

  public destroy() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clients.forEach(c => {
      try {
        c.end(true);
      } catch {}
    });
    this.clients = [];
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
    this.onlinePlayers.clear();
    this.seenPacketIds.clear();
    this.listeners = [];
    this.inviteListeners = [];
    this.noticeListeners = [];
    this.initialized = false;
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb());
  }
}

export const friendNetwork = new FriendNetworkManager();
