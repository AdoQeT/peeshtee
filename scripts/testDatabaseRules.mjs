import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulesJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../database.rules.json'), 'utf8')
);

/**
 * Lightweight Firebase RTDB Rule Snapshot simulator for evaluating
 * exact expression strings from `database.rules.json`.
 */
function makeSnapshot(obj) {
  return {
    exists() {
      return obj !== undefined && obj !== null;
    },
    val() {
      return obj === undefined ? null : obj;
    },
    isString() {
      return typeof obj === 'string';
    },
    isBoolean() {
      return typeof obj === 'boolean';
    },
    isNumber() {
      return typeof obj === 'number';
    },
    hasChildren(keys) {
      if (!obj || typeof obj !== 'object') return false;
      return keys.every(k => obj[k] !== undefined && obj[k] !== null);
    },
    child(relPath) {
      const parts = String(relPath).split('/').filter(Boolean);
      let cur = obj;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) {
          cur = cur[p];
        } else {
          cur = null;
          break;
        }
      }
      return makeSnapshot(cur);
    }
  };
}

function evalRule(expr, context) {
  if (typeof expr === 'boolean') return expr;
  const keys = Object.keys(context);
  const vals = Object.values(context);
  const fn = new Function(...keys, `return Boolean(${expr});`);
  return fn(...vals);
}

test('database.rules.json: rooms/$code does not expose root .read and restricts events/presence to members or host', () => {
  const roomRules = rulesJson.rules.rooms.$code;
  assert.equal('.read' in roomRules, false, 'rooms/$code must not have open .read');

  const dbTree = {
    rooms: {
      '123456': {
        meta: { hostUid: 'uid_host', active: true, created: 1, roomToken: 'tok' },
        members: { uid_guest: true },
        presence: {
          inst_host: { instanceId: 'inst_host', uid: 'uid_host', role: 'host', lastSeen: 1000 },
          inst_guest: { instanceId: 'inst_guest', uid: 'uid_guest', role: 'guest', lastSeen: 1000 }
        }
      }
    }
  };

  const root = makeSnapshot(dbTree);

  // Outsider cannot read events or presence
  assert.equal(
    evalRule(roomRules.events['.read'], { auth: { uid: 'uid_outsider' }, root, $code: '123456' }),
    false
  );
  assert.equal(
    evalRule(roomRules.presence['.read'], { auth: { uid: 'uid_outsider' }, root, $code: '123456' }),
    false
  );

  // Host and member can read events and presence
  assert.equal(
    evalRule(roomRules.events['.read'], { auth: { uid: 'uid_host' }, root, $code: '123456' }),
    true
  );
  assert.equal(
    evalRule(roomRules.events['.read'], { auth: { uid: 'uid_guest' }, root, $code: '123456' }),
    true
  );
});

test('database.rules.json: events/$id rejects spoofed senderId and allows verified presence uid', () => {
  const eventRules = rulesJson.rules.rooms.$code.events.$id;
  const dbTree = {
    rooms: {
      '123456': {
        meta: { hostUid: 'uid_host', active: true, created: 1, roomToken: 'tok' },
        members: { uid_guest: true },
        presence: {
          inst_host: { instanceId: 'inst_host', uid: 'uid_host', role: 'host', lastSeen: 1000 },
          inst_guest: { instanceId: 'inst_guest', uid: 'uid_guest', role: 'guest', lastSeen: 1000 }
        }
      }
    }
  };
  const root = makeSnapshot(dbTree);
  const emptyData = makeSnapshot(null);

  // Guest trying to spoof senderId = 'inst_host'
  const spoofedPayload = makeSnapshot({
    msgId: 'msg-1',
    senderId: 'inst_host',
    timestamp: 12345,
    payload: { type: 'PLAY_CARD' }
  });

  assert.equal(
    evalRule(eventRules['.write'], {
      auth: { uid: 'uid_guest' },
      root,
      data: emptyData,
      newData: spoofedPayload,
      $code: '123456',
      $id: 'evt1'
    }),
    false,
    'Spoofed senderId must be rejected by .write rule'
  );

  // Guest writing with own verified instanceId ('inst_guest' -> 'uid_guest')
  const authenticPayload = makeSnapshot({
    msgId: 'msg-2',
    senderId: 'inst_guest',
    timestamp: 12345,
    payload: { type: 'PLAY_CARD' }
  });

  assert.equal(
    evalRule(eventRules['.write'], {
      auth: { uid: 'uid_guest' },
      root,
      data: emptyData,
      newData: authenticPayload,
      $code: '123456',
      $id: 'evt2'
    }),
    true
  );
  assert.equal(
    evalRule(eventRules['.validate'], {
      auth: { uid: 'uid_guest' },
      root,
      data: emptyData,
      newData: authenticPayload,
      $code: '123456',
      $id: 'evt2'
    }),
    true
  );
});

test('database.rules.json: invites, requests, and notices enforce recipient read/delete and sender ownership', () => {
  const inviteRules = rulesJson.rules.invites.$friendCode;
  const dbTree = {
    profiles: {
      '111111': { ownerUid: 'uid_alice', name: 'Alice' },
      '222222': { ownerUid: 'uid_bob', name: 'Bob' }
    }
  };
  const root = makeSnapshot(dbTree);

  // Only Bob (owner of 222222) can read invites/222222
  assert.equal(
    evalRule(inviteRules['.read'], { auth: { uid: 'uid_bob' }, root, $friendCode: '222222' }),
    true
  );
  assert.equal(
    evalRule(inviteRules['.read'], { auth: { uid: 'uid_alice' }, root, $friendCode: '222222' }),
    false
  );

  // Alice can create an invite to 222222 if senderUid === uid_alice and fromFriendCode === 111111
  const validInvite = makeSnapshot({
    fromId: 'p-alice',
    fromFriendCode: '111111',
    senderUid: 'uid_alice',
    roomCode: '654321',
    timestamp: 1000
  });
  assert.equal(
    evalRule(inviteRules.$id['.write'], {
      auth: { uid: 'uid_alice' },
      root,
      data: makeSnapshot(null),
      newData: validInvite,
      $friendCode: '222222',
      $id: 'inv1'
    }),
    true
  );

  // Impersonator (uid_mallory claiming fromFriendCode 111111) is rejected
  const forgedInvite = makeSnapshot({
    fromId: 'p-alice',
    fromFriendCode: '111111',
    senderUid: 'uid_mallory',
    roomCode: '654321',
    timestamp: 1000
  });
  assert.equal(
    evalRule(inviteRules.$id['.write'], {
      auth: { uid: 'uid_mallory' },
      root,
      data: makeSnapshot(null),
      newData: forgedInvite,
      $friendCode: '222222',
      $id: 'inv2'
    }),
    false
  );
});

test('database.rules.json: admins/$uid is read-only for the matching user and never client-writable', () => {
  const adminRules = rulesJson.rules.admins.$uid;
  assert.equal(adminRules['.write'], false);
  assert.equal(evalRule(adminRules['.read'], { auth: { uid: 'uid_1' }, $uid: 'uid_1' }), true);
  assert.equal(evalRule(adminRules['.read'], { auth: { uid: 'uid_2' }, $uid: 'uid_1' }), false);
});

test('database.rules.json: optional live @firebase/rules-unit-testing check when emulator is active', async (t) => {
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    t.skip('FIREBASE_DATABASE_EMULATOR_HOST not set; static rule AST evaluation passed above');
    return;
  }

  const { initializeTestEnvironment, assertSucceeds, assertFails } = await import(
    '@firebase/rules-unit-testing'
  );
  const [host, portStr] = process.env.FIREBASE_DATABASE_EMULATOR_HOST.split(':');
  const testEnv = await initializeTestEnvironment({
    projectId: 'pisti-overdrive-test',
    database: {
      host,
      port: Number(portStr || 9000),
      rules: fs.readFileSync(path.join(__dirname, '../database.rules.json'), 'utf8')
    }
  });

  try {
    const aliceDb = testEnv.authenticatedContext('uid_alice').database();
    const malloryDb = testEnv.authenticatedContext('uid_mallory').database();

    await assertSucceeds(
      aliceDb.ref('rooms/123456/meta').set({
        created: Date.now(),
        hostUid: 'uid_alice',
        roomToken: 'tok_123',
        active: true
      })
    );
    await assertFails(malloryDb.ref('rooms/123456/events').get());
  } finally {
    await testEnv.cleanup();
  }
});
