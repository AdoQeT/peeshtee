/**
 * Project Pişti - Pure Firebase Realtime Database Friend & Social Network (v1.17.0)
 * Completely powered by Firebase RTDB with minimal presence footprint,
 * serverTimeOffset synchronization, and indexed discovery.
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
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  ensureFirebaseAuth,
  cleanForRtdb
} from '../../core/firebase';
import {
  getUserProfile,
  addOrUpdateFriend,
  addIncomingFriendRequest,
  removeFriend,
  calculateLevel
} from '../profile/profileManager';

export interface OnlinePlayerPresence {
  id: string;
  friendCode: string;
  name: string;
  avatarId: string;
  customTitle?: string;
  level?: number;
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
  targetFriendCode?: string;
  targetName?: string;
  timestamp: number;
}

export class FriendNetwork {
  private onlinePlayers: Map<string, OnlinePlayerPresence> = new Map();
  private friendsPresence: Map<string, OnlinePlayerPresence> = new Map();
  private friendPresenceListeners: Map<string, any> = new Map();
  private listeners: Array<() => void> = [];
  private inviteListeners: Array<(invite: IncomingGameInvite) => void> = [];
  private noticeListeners: Array<(notice: IncomingFriendNotice) => void> = [];
  private requestListeners: Array<(req: any) => void> = [];
  private currentStatus: 'menu' | 'lobby' | 'playing' = 'menu';
  private currentRoomCode?: string;
  private currentGameType: 'pisti' | 'uno' = 'pisti';
  private heartbeatInterval: number | null = null;
  private serverTimeOffset = 0;
  private initialized = false;

  private invitesRef: any = null;
  private requestsRef: any = null;
  private noticesRef: any = null;
  private exploreQueryRef: any = null;
  private offsetRef: any = null;
  private connectedRef: any = null;

  public async init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const user = await ensureFirebaseAuth();
    if (!user) {
      console.warn('Firebase anonymous authentication failed in friendNetwork');
    }

    const myProfile = getUserProfile();
    const myCode = myProfile.friendCode;

    // 0. Synchronize server time offset
    try {
      this.offsetRef = ref(rtdb, '.info/serverTimeOffset');
      onValue(this.offsetRef, (snap: any) => {
        this.serverTimeOffset = typeof snap.val() === 'number' ? snap.val() : 0;
      });
    } catch (e) {
      console.warn('Server time offset listener warning:', e);
    }

    // 0.1 Register onDisconnect once when connected
    try {
      this.connectedRef = ref(rtdb, '.info/connected');
      onValue(this.connectedRef, (snap: any) => {
        if (snap.val() === true) {
          const profile = getUserProfile();
          if (profile.friendCode) {
            const myPresenceRef = ref(rtdb, `presence/${profile.friendCode}`);
            try {
              onDisconnect(myPresenceRef).remove();
            } catch (err) {
              console.error('onDisconnect setup error:', err);
            }
            this.announcePresence();
          }
        }
      });
    } catch (e) {
      console.warn('Connected listener warning:', e);
    }

    if (myCode) {
      // 1. Firebase Cloud: Listen for Incoming Game Invites
      try {
        this.invitesRef = ref(rtdb, `invites/${myCode}`);
        onChildAdded(this.invitesRef, async (snapshot: any) => {
          const inv = snapshot.val() as IncomingGameInvite;
          if (!inv) return;

          // Check 1: Expiration check (older than 2 minutes)
          const now = Date.now();
          if (now - (inv.timestamp || 0) > 120000) {
            try {
              remove(snapshot.ref).catch(() => {});
            } catch {}
            return;
          }

          // Check 2: Active room verification before presenting to user
          if (inv.roomCode) {
            try {
              const metaSnap = await get(ref(rtdb, `rooms/${inv.roomCode}/meta`));
              if (!metaSnap.exists() || metaSnap.val()?.active === false) {
                remove(snapshot.ref).catch(() => {});
                return;
              }
            } catch {
              // Network fallback
            }
          }

          if (inv.fromId !== getUserProfile().id) {
            this.inviteListeners.forEach(cb => cb(inv));
            // Remove handled invite
            try {
              remove(snapshot.ref).catch(err => {
                console.error('Firebase remove invite error:', err);
              });
            } catch (err) {
              console.error('Firebase remove invite exception:', err);
            }
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
          if (!req || req.fromId === getUserProfile().id) return;

          const curProfile = getUserProfile();
          const cleanSenderCode = (req.fromFriendCode || '').replace(/\D/g, '');

          // Ignore if already friends or duplicate pending request
          const alreadyFriend = curProfile.friends?.some(
            f => (f.friendCode || '').replace(/\D/g, '') === cleanSenderCode
          );
          const alreadyPending = curProfile.incomingFriendRequests?.some(
            r => (r.friendCode || '').replace(/\D/g, '') === cleanSenderCode
          );

          if (alreadyFriend || alreadyPending) {
            try {
              remove(snapshot.ref).catch(() => {});
            } catch {}
            return;
          }

          addIncomingFriendRequest({
            id: req.fromId,
            friendCode: req.fromFriendCode,
            name: req.fromName,
            avatarId: req.fromAvatarId,
            customTitle: req.fromCustomTitle,
            lastPlayedAt: Date.now()
          });
          this.requestListeners.forEach(cb => cb(req));
          this.notifyListeners();
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
              avatarId: notice.fromAvatarId
            });
            this.syncFriendPresenceListeners();
            this.noticeListeners.forEach(cb => cb(notice));
            this.notifyListeners();
          } else if (notice.type === 'remove') {
            removeFriend(notice.fromId, notice.fromFriendCode, notice.fromName);
            this.syncFriendPresenceListeners();
            this.noticeListeners.forEach(cb => cb(notice));
            this.notifyListeners();
          }
          // Remove handled notice
          try {
            remove(snapshot.ref).catch(err => {
              console.error('Firebase remove notice error:', err);
            });
          } catch (err) {
            console.error('Firebase remove notice exception:', err);
          }
        });
      } catch (err) {
        console.warn('Firebase notice listener error:', err);
      }

      // 4. Firebase Cloud: Discover / Explore presence query (last 30 active players)
      try {
        this.exploreQueryRef = query(ref(rtdb, 'presence'), orderByChild('lastSeen'), limitToLast(30));
        onValue(this.exploreQueryRef, (snapshot: any) => {
          if (!snapshot.exists() || !snapshot.val()) {
            this.onlinePlayers.clear();
            this.notifyListeners();
            return;
          }

          const data = snapshot.val();
          if (data && typeof data === 'object') {
            this.onlinePlayers.clear();
            const cleanMyCode = (myCode || '').replace(/\D/g, '');
            Object.values(data).forEach((p: any) => {
              const pClean = (p?.friendCode || '').replace(/\D/g, '');
              if (p && pClean && pClean !== cleanMyCode) {
                if (this.isPlayerOnline(p.lastSeen)) {
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
        console.warn('Firebase explore presence query error:', err);
      }

      // 5. Setup individual presence listeners for friends
      this.syncFriendPresenceListeners();
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

    // Heartbeat every 12 seconds
    this.heartbeatInterval = window.setInterval(() => {
      this.announcePresence();
    }, 12000);
  }

  public syncFriendPresenceListeners() {
    const profile = getUserProfile();
    const friends = profile.friends || [];
    const currentCodes = new Set(friends.map(f => (f.friendCode || '').replace(/\D/g, '')).filter(Boolean));

    // Remove obsolete listeners
    this.friendPresenceListeners.forEach((r, code) => {
      if (!currentCodes.has(code)) {
        off(r);
        this.friendPresenceListeners.delete(code);
        this.friendsPresence.delete(code);
      }
    });

    // Add new listeners
    currentCodes.forEach(code => {
      if (!this.friendPresenceListeners.has(code)) {
        try {
          const presenceNodeRef = ref(rtdb, `presence/${code}`);
          onValue(presenceNodeRef, (snap: any) => {
            const val = snap.val();
            if (val && this.isPlayerOnline(val.lastSeen)) {
              this.friendsPresence.set(code, val);
            } else {
              this.friendsPresence.delete(code);
            }
            this.notifyListeners();
          });
          this.friendPresenceListeners.set(code, presenceNodeRef);
        } catch (err) {
          console.warn(`Friend presence listener error for ${code}:`, err);
        }
      }
    });
  }

  public isPlayerOnline(lastSeen?: number): boolean {
    if (!lastSeen || typeof lastSeen !== 'number') return false;
    const nowServer = Date.now() + this.serverTimeOffset;
    return (nowServer - lastSeen) < 35000;
  }

  public isFriendOnline(friendCode?: string): boolean {
    if (!friendCode) return false;
    const clean = friendCode.replace(/\D/g, '');
    const p = this.friendsPresence.get(clean) || this.onlinePlayers.get(clean);
    return !!(p && this.isPlayerOnline(p.lastSeen));
  }

  public getFriendPresence(friendCode?: string): OnlinePlayerPresence | undefined {
    if (!friendCode) return undefined;
    const clean = friendCode.replace(/\D/g, '');
    return this.friendsPresence.get(clean) || this.onlinePlayers.get(clean);
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

  public async announcePresence() {
    const profile = getUserProfile();
    if (!profile.friendCode) return;

    const user = await ensureFirebaseAuth().catch(() => null);
    const lvlInfo = calculateLevel(profile.xp || 0);

    // Minimal footprint presence node: no stats, no matchHistory, no customAvatarUrl
    const presence: Record<string, any> = {
      id: profile.id,
      friendCode: profile.friendCode,
      name: profile.name,
      avatarId: profile.avatarId,
      customTitle: profile.customTitle || null,
      level: lvlInfo.level,
      status: this.currentStatus,
      roomCode: this.currentRoomCode || null,
      gameType: this.currentGameType || null,
      lastSeen: serverTimestamp(),
      ownerUid: user?.uid || null
    };

    try {
      const myPresenceRef = ref(rtdb, `presence/${profile.friendCode}`);
      await set(myPresenceRef, cleanForRtdb(presence));
    } catch (err) {
      console.error('Firebase presence exception:', err);
    }
  }

  public getOnlinePlayers(): OnlinePlayerPresence[] {
    return Array.from(this.onlinePlayers.values());
  }

  public async sendGameInvite(
    target: string | { friendCode?: string; name?: string },
    roomCode: string,
    gameType: 'pisti' | 'uno' = 'pisti'
  ): Promise<boolean> {
    const profile = getUserProfile();
    const rawCode = typeof target === 'string' ? target : target.friendCode;
    const cleanTargetCode = rawCode?.replace(/[^0-9A-Za-z]/g, '');
    if (!cleanTargetCode) return false;

    // Notice payload: avatarId only (no heavy dataURL)
    const invite: IncomingGameInvite = {
      inviteId: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      targetFriendCode: cleanTargetCode,
      roomCode,
      gameType,
      timestamp: Date.now()
    };

    try {
      await push(ref(rtdb, `invites/${cleanTargetCode}`), cleanForRtdb(invite));
      return true;
    } catch (e) {
      console.error('Send game invite error:', e);
      return false;
    }
  }

  public async sendFriendRequest(target: { friendCode?: string; name?: string }): Promise<boolean> {
    const profile = getUserProfile();
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    if (!cleanTargetCode || cleanTargetCode === profile.friendCode) return false;

    // Check if already friends
    if (profile.friends?.some(f => (f.friendCode || '').replace(/\D/g, '') === cleanTargetCode)) {
      return false;
    }

    const req = {
      id: `freq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      fromCustomTitle: profile.customTitle || null,
      targetFriendCode: cleanTargetCode,
      timestamp: Date.now()
    };

    try {
      await push(ref(rtdb, `requests/${cleanTargetCode}`), cleanForRtdb(req));
      return true;
    } catch (e) {
      console.error('Send friend request error:', e);
      return false;
    }
  }

  public async sendFriendAccept(target: { friendCode?: string; name?: string }): Promise<boolean> {
    const profile = getUserProfile();
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    if (!cleanTargetCode) return false;

    const notice: IncomingFriendNotice = {
      id: `fr-acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: profile.id,
      fromFriendCode: profile.friendCode,
      fromName: profile.name,
      fromAvatarId: profile.avatarId,
      targetFriendCode: cleanTargetCode,
      targetName: target.name?.trim(),
      timestamp: Date.now()
    };

    try {
      await push(ref(rtdb, `notices/${cleanTargetCode}`), cleanForRtdb({
        ...notice,
        type: 'accept'
      }));
      this.syncFriendPresenceListeners();
      return true;
    } catch (e) {
      console.error('Send friend accept error:', e);
      return false;
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
              remove(ref(rtdb, `requests/${profile.friendCode}/${key}`)).catch((err) => {
                console.error('Remove declined request error:', err);
              });
            }
          });
        }
      }).catch((err) => {
        console.error('Fetch requests for decline error:', err);
      });
    } catch (err) {
      console.error('Decline friend request exception:', err);
    }
  }

  public async sendFriendRemovedNotice(target: { friendCode?: string; name?: string }): Promise<boolean> {
    const profile = getUserProfile();
    const cleanTargetCode = target.friendCode?.replace(/[^0-9A-Za-z]/g, '');
    if (!cleanTargetCode) return false;

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
      await push(ref(rtdb, `notices/${cleanTargetCode}`), cleanForRtdb({
        ...notice,
        type: 'remove'
      }));
      this.syncFriendPresenceListeners();
      return true;
    } catch (e) {
      console.error('Send friend removed notice error:', e);
      return false;
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
    if (this.exploreQueryRef) off(this.exploreQueryRef);
    if (this.offsetRef) off(this.offsetRef);
    if (this.connectedRef) off(this.connectedRef);
    this.friendPresenceListeners.forEach(r => off(r));
    this.friendPresenceListeners.clear();
    this.friendsPresence.clear();
    this.initialized = false;
  }
}

export const friendNetwork = new FriendNetwork();
