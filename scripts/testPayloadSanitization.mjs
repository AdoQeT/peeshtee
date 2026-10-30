import assert from 'node:assert/strict';
import { test } from 'node:test';

// Exact implementation of cleanForRtdb from src/core/firebase.ts
function cleanForRtdb(v) {
  if (v === undefined || v === null) return v;
  return JSON.parse(JSON.stringify(v));
}

function assertNoUndefinedDeep(obj, path = 'root') {
  if (obj === undefined) {
    assert.fail(`Found undefined at path: ${path}`);
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) {
        assert.fail(`Found undefined property at path: ${path}.${k}`);
      }
      assertNoUndefinedDeep(v, `${path}.${k}`);
    }
  }
}

test('cleanForRtdb strips undefined from real GUEST_JOINED payload (without custom avatar)', () => {
  // Real MultiplayerManager guest join payload when user does not have custom avatar
  const realGuestJoinedPayload = {
    type: 'GUEST_JOINED',
    guestName: 'Eren',
    guestAvatar: '🐺',
    guestAvatarId: 'wolf',
    guestCustomAvatarUrl: undefined, // ROOT CAUSE BUG: this caused RTDB synchronous crash
    guestCustomTitle: undefined,
    guestLevel: 3,
    guestPeerId: 'inst_abc123'
  };

  const envelope = {
    __pistiEnvelope: true,
    msgId: 'inst_abc123-1730000000000-xyz123',
    roomCode: '648291',
    // roomToken conditional
    seq: 1,
    senderId: 'inst_abc123',
    timestamp: Date.now(),
    payload: realGuestJoinedPayload
  };

  const cleaned = cleanForRtdb(envelope);

  // Assert no undefined values exist
  assertNoUndefinedDeep(cleaned);
  assert.equal(cleaned.payload.guestName, 'Eren');
  assert.equal(cleaned.payload.guestLevel, 3);
  assert.equal('guestCustomAvatarUrl' in cleaned.payload, false);
  assert.equal('guestCustomTitle' in cleaned.payload, false);
});

test('cleanForRtdb strips undefined from real HOST_LOBBY_SYNC slots payload', () => {
  // Real MultiplayerManager host sync payload
  const realHostLobbySyncPayload = {
    type: 'HOST_LOBBY_SYNC',
    gameType: 'pisti',
    isLocked: false,
    maxPlayers: 2,
    roomToken: 'rtk_test123',
    slots: [
      {
        seatIndex: 0,
        peerId: 'host_instance_id',
        name: 'Masa Kurucusu',
        avatar: '🦁',
        avatarId: 'lion',
        customAvatarUrl: undefined, // Undefined slot field
        customTitle: undefined,
        level: 10,
        isHost: true,
        ready: true
      },
      {
        seatIndex: 1,
        peerId: 'guest_instance_id',
        name: 'Konuk',
        avatar: '🐺',
        avatarId: 'wolf',
        customAvatarUrl: undefined, // Undefined slot field
        customTitle: undefined,
        level: 1,
        isHost: false,
        ready: false
      }
    ]
  };

  const cleaned = cleanForRtdb(realHostLobbySyncPayload);
  assertNoUndefinedDeep(cleaned);
  assert.equal(cleaned.slots.length, 2);
  assert.equal('customAvatarUrl' in cleaned.slots[0], false);
  assert.equal('customTitle' in cleaned.slots[0], false);
  assert.equal('customAvatarUrl' in cleaned.slots[1], false);
  assert.equal('customTitle' in cleaned.slots[1], false);
});

test('cleanForRtdb strips undefined from real friendNetwork presence and invite payloads', () => {
  // Real friendNetwork presence payload when player is idle (no room, no custom avatar)
  const realPresence = {
    friendCode: '849201',
    name: 'Kullanıcı',
    avatar: '🐺',
    avatarId: 'wolf',
    customAvatarUrl: undefined,
    customTitle: undefined,
    level: 5,
    status: 'online',
    roomCode: undefined,
    gameType: undefined,
    stats: { wins: 4, losses: 2 },
    matchHistory: undefined,
    lastSeen: Date.now(),
    ownerUid: 'uid_anonymous_123'
  };

  const cleanedPresence = cleanForRtdb(realPresence);
  assertNoUndefinedDeep(cleanedPresence);
  assert.equal('customAvatarUrl' in cleanedPresence, false);
  assert.equal('roomCode' in cleanedPresence, false);
  assert.equal('matchHistory' in cleanedPresence, false);
  assert.equal(cleanedPresence.status, 'online');

  // Real invite payload
  const realInvite = {
    inviteId: 'inv-173000-xyz',
    fromId: 'p-123',
    fromFriendCode: '849201',
    fromName: 'Kullanıcı',
    fromAvatarId: 'wolf',
    fromCustomAvatarUrl: undefined,
    targetFriendCode: '123456',
    roomCode: '648291',
    gameType: 'pisti',
    timestamp: Date.now()
  };

  const cleanedInvite = cleanForRtdb(realInvite);
  assertNoUndefinedDeep(cleanedInvite);
  assert.equal('fromCustomAvatarUrl' in cleanedInvite, false);
  assert.equal(cleanedInvite.roomCode, '648291');
});

test('v1.17.0: friendNetwork minimal presence node has no stats/history/avatar dataURL', () => {
  const minimalPresence = {
    id: 'p-123',
    friendCode: '849201',
    name: 'Kullanıcı',
    avatarId: 'wolf',
    customTitle: null,
    level: 5,
    status: 'menu',
    roomCode: null,
    gameType: null,
    lastSeen: Date.now(),
    ownerUid: 'uid_123'
  };

  const cleaned = cleanForRtdb(minimalPresence);
  assertNoUndefinedDeep(cleaned);
  assert.equal('stats' in cleaned, false);
  assert.equal('matchHistory' in cleaned, false);
  assert.equal('customAvatarUrl' in cleaned, false);
  assert.equal(cleaned.status, 'menu');
});
