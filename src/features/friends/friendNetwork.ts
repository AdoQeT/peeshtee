/**
 * Project Pişti - Pure Firebase Realtime Database Friend & Social Network
 * Completely 100% powered by Firebase RTDB:
 * - Real-time Friend Requests: /requests/{friendCode}
 * - Real-time Social Notices: /notices/{friendCode}
 * - Real-time Online Presence: /presence/{friendCode}
 * - Real-time Match Invites: /invites/{friendCode}
 */
import {
  rtdb,
  ref,
  push,
  set,
  get,
  remove,
  onChildAdded,
  onValue,
  off,
  onDisconnect
} from '../../core/firebase';
import {
  getUserProfile,
  addOrUpdateFriend,
  addIncomingFriendRequest,
  removeFriend,
  calculateLevel,
  type UserProfile,
  type MatchRecord
} from '../profile/profileManager';

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

export class FriendNetwork {
  private onlinePlayers: Map<string, OnlinePlayerPresence> = new Map();
  private listeners: Array<() => void> = [];
  private inviteListeners: Array<(invite: IncomingGameInvite) => void> = [];
  private noticeListeners: Array<(notice: IncomingFriendNotice) => void> = [];
  private requestListeners: Array<(req: any) => void> = [];
  private currentStatus: 'menu' | 'lobby' | 'playing' = 'menu';
  private currentRoomCode?: string;
  private currentGameType: 'pisti' | 'uno' = 'pisti';
  private heartbeatInterval: number | null = null;
  private initialized = false;

  private invitesRef: any = null;
  private requestsRef: any = null;
  private noticesRef: any = null;
  private presenceRef: any = null;

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const myProfile = getUserProfile();
    const myCode = myProfile.friendCode;

    if (myCode) {
      // 1. Firebase Cloud: Listen for Incoming Game Invites
      try {
        this.invitesRef = ref(rtdb, `invites/${myCode}`);
        onChildAdded(this.invitesRef, (snapshot: any) => {
          const inv = snapshot.val() as IncomingGameInvite;
          if (inv && inv.fromId !== getUserProfile().id) {
            this.inviteListeners.forEach(cb => cb(inv));
            // Remove handled invite
            try {
              remove(snapshot.ref).catch(() => {});
            } catch {}
          }
        });
      } catch (err) {
        console.warn('Firebase invite listener error:', err);
      }

      // 2. Firebase Cloud: Listen for Incoming Friend Requests
      try {
        this.requestsRef = ref(rtdb, `requests/${myCode}`);
        onChildAdded(this.requestsRef, (snapshot: any) => {
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
        this.noticesRef = ref(rtdb, `notices/${myCode}`);
        onChildAdded(this.noticesRef, (snapshot: any) => {
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
          // Remove handled notice
          try {
            remove(snapshot.ref).catch(() => {});
          } catch {}
        });
      } catch (err) {
        console.warn('Firebase notice listener error:', err);
      }

      // 4. Firebase Cloud: Global Live Presence Listener
      try {
        this.presenceRef = ref(rtdb, 'presence');
        onValue(this.presenceRef, (snapshot: any) => {
          const data = snapshot.val();
          if (data && typeof data === 'object') {
            const now = Date.now();
            this.onlinePlayers.clear();
            const cleanMyCode = (myCode || '').replace(/\D/g, '');
            Object.values(data).forEach((p: any) => {
              const pClean = (p?.friendCode || '').replace(/\D/g, '');
              if (p && pClean && pClean !== cleanMyCode) {
                // Online if heartbeat received within last 60 seconds
                if (now - (p.lastSeen || 0) < 60000) {
                  this.onlinePlayers.set(pClean, p);
                  if (p.friendCode) {
                    this.onlinePlayers.set(p.friendCode, p);
                  }
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

    // Publish initial presence immediately
    this.announcePresence();

    // Re-announce immediately when tab becomes visible or focused
    window.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.announcePresence();
      }
    });
    window.addEventListener('focus', () => {
      this.announcePresence();
    });

    // Heartbeat every 10 seconds to keep presence fresh in Firebase
    this.heartbeatInterval = window.setInterval(() => {
      this.announcePresence();
    }, 10000);
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
    if (!profile.friendCode) return;

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
      matchHistory: profile.matchHistory?.slice(0, 10),
      lastSeen: Date.now()
    };

    try {
      const myPresenceRef = ref(rtdb, `presence/${profile.friendCode}`);
      set(myPresenceRef, presence).catch(() => {});
      try {
        onDisconnect(myPresenceRef).remove();
      } catch {}
    } catch {}
  }

  public getOnlinePlayers(): OnlinePlayerPresence[] {
    return Array.from(this.onlinePlayers.values());
  }

  public sendGameInvite(
    target: string | { friendCode?: string; name?: string },
    roomCode: string,
    gameType: 'pisti' | 'uno' = 'pisti'
  ) {
    const profile = getUserProfile();
    const rawCode = typeof target === 'string' ? target : target.friendCode;
    const cleanTargetCode = rawCode?.replace(/[^0-9A-Za-z]/g, '');
    if (!cleanTargetCode) return;

    const invite: IncomingGameInvite = {
      inviteId: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      fromCustomAvatarUrl: profile.customAvatarDataUrl,
      targetFriendCode: cleanTargetCode,
      roomCode,
      gameType,
      timestamp: Date.now()
    };

    try {
      push(ref(rtdb, `invites/${cleanTargetCode}`), invite).catch(() => {});
    } catch (e) {
      console.warn('Send game invite error:', e);
    }
  }

  public sendFriendRequest(target: { friendCode?: string; name?: string }) {
    const profile = getUserProfile();
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    if (!cleanTargetCode || cleanTargetCode === profile.friendCode) return;

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

    try {
      push(ref(rtdb, `requests/${cleanTargetCode}`), req).catch(() => {});
    } catch (e) {
      console.warn('Send friend request error:', e);
    }
  }

  public sendFriendAccept(target: { friendCode?: string; name?: string }) {
    const profile = getUserProfile();
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    if (!cleanTargetCode) return;

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

    try {
      push(ref(rtdb, `notices/${cleanTargetCode}`), {
        ...notice,
        type: 'accept'
      }).catch(() => {});
    } catch (e) {
      console.warn('Send friend accept error:', e);
    }
  }

  public sendFriendDecline(targetFriendCode: string) {
    const profile = getUserProfile();
    const cleanTargetCode = targetFriendCode?.replace(/[^0-9A-Za-z]/g, '');
    if (!cleanTargetCode) return;

    // Clean up request directly in Firebase
    try {
      get(ref(rtdb, `requests/${profile.friendCode}`)).then(snap => {
        if (snap.exists()) {
          const val = snap.val();
          Object.entries(val).forEach(([key, item]: [string, any]) => {
            if (item && item.fromFriendCode === cleanTargetCode) {
              remove(ref(rtdb, `requests/${profile.friendCode}/${key}`)).catch(() => {});
            }
          });
        }
      }).catch(() => {});
    } catch {}
  }

  public sendFriendRemovedNotice(target: { friendCode?: string; name?: string }) {
    const profile = getUserProfile();
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    if (!cleanTargetCode) return;

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

    try {
      push(ref(rtdb, `notices/${cleanTargetCode}`), {
        ...notice,
        type: 'remove'
      }).catch(() => {});
    } catch (e) {
      console.warn('Send friend removed notice error:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public onGameInvite(cb: (invite: IncomingGameInvite) => void): () => void {
    this.inviteListeners.push(cb);
    return () => {
      this.inviteListeners = this.inviteListeners.filter(l => l !== cb);
    };
  }

  public onFriendNotice(cb: (notice: IncomingFriendNotice) => void): () => void {
    this.noticeListeners.push(cb);
    return () => {
      this.noticeListeners = this.noticeListeners.filter(l => l !== cb);
    };
  }

  public onFriendRequest(cb: (req: any) => void): () => void {
    this.requestListeners.push(cb);
    return () => {
      this.requestListeners = this.requestListeners.filter(l => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch {}
    });
  }

  public destroy() {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.invitesRef) off(this.invitesRef);
    if (this.requestsRef) off(this.requestsRef);
    if (this.noticesRef) off(this.noticesRef);
    if (this.presenceRef) off(this.presenceRef);
    this.initialized = false;
  }
}

export const friendNetwork = new FriendNetwork();
