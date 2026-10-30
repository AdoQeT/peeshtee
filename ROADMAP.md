# Engineering Roadmap & Release Milestones

This document records completed engineering milestones, architecture evolutions, and scheduled development objectives for **Project P (Peeshtee: Overdrive)**.

---

## Release Milestones

### v1.17.1 (Current)
- **Refactored MatchIntroOverlay Visual Architecture**: Replaced third-party animation dependencies with fully self-contained CSS `@keyframes` and inline palette styling across all table themes (Monaco Velvet, Melbourne Red, Estoril Blue, Alpine White, Traditional).
- **Comprehensive 4-Player Team Roster**: Updated all `runWithIntro` initiations (singleplayer 4-player, online host, online guest) to display complete player lineups with Team A vs Team B groupings.
- **Native Motion Accessibility**: Replaced the custom screenShake coupling with native `prefers-reduced-motion` auto-detection for smooth accessibility.

### v1.17.0
- **Resolved React 18 Lobby Sync Updater Bug**: Migrated `MultiplayerModal` slot computation outside the batched React setState updater onto `slotsRef.current` as the single source of truth, guaranteeing `HOST_LOBBY_SYNC` fires synchronously upon `GUEST_JOINED`, `REQUEST_SEAT_CHANGE`, and `PEER_DISCONNECTED`.
- **Match Preparation & 5-Card Fan Intro Overlay**: Added `MatchIntroOverlay` featuring staggered card fan-out animations, VS player roster, dynamic table theme adaptation, progress indicator, and gameplay tips smoothly transitioning matches in singleplayer and multiplayer.
- **Micro-Footprint Online Presence Engine**: Stripped stats, match history, and custom avatar dataURLs from RTDB presence nodes. Presence is indexed by `lastSeen` with `.indexOn` for 30-player explore queries and dedicated friend listeners.
- **Server Time Offset & Connection-Bound onDisconnect**: Integrated Firebase `.info/serverTimeOffset` and `.info/connected` synchronization to determine online status accurately within 35s windows.
- **Guaranteed Unique Friend Code Claiming**: Enforced transactional reservation via `claimUniqueFriendCode()` using `runTransaction` on `profiles/{code}/ownerUid`.
- **Friend Code Verification & Direct Offline Invites**: Added `fetchRemoteProfile` verification in `FriendsModal` to surface instant user validation feedback and permit offline invitations.

### v1.16.7
- **Firebase RTDB Payload Sanitization**: Implemented `cleanForRtdb` across all database write methods (`peerManager`, `friendNetwork`, `profileManager`) to strip `undefined` values and prevent synchronous Firebase property exceptions.
- **Root Cause Resolution for Lobby Desync**: Fixed missing `GUEST_JOINED` and `HOST_LOBBY_SYNC` packets caused by undefined avatar fields when players use preset avatars without custom images.
- **Conditional Envelope Token**: Safely omitted empty `roomToken` attributes from packet envelopes to eliminate undefined property propagation.
- **Explicit Cloud Error Logging**: Replaced all silent `catch {}` and `.catch(() => {})` blocks across real-time modules with explicit console error logging.
- **DEV Undefined Property Detector**: Added runtime deep undefined property scanner in `send()` to alert developers during local testing.
- **Deep Payload Sanitization Unit Testing**: Introduced unit tests simulating real multiplayer and social payloads without custom avatars to guarantee zero undefined attributes reach the database.

### v1.16.6
- **Clock-Agnostic Packet Processing**: Removed strict client-timestamp filtering in `peerManager.ts` to accommodate device clock skew while relying securely on `roomToken` and collision-free room initialization.
- **Heartbeat & Presence Decoupling**: Moved player heartbeats completely off the event log to `rooms/{code}/presence/{instanceId}` with real-time `onValue` peer health listeners.
- **Safe Room Code Generation & Host Identification**: Added active room metadata inspection (6-hour freshness check) with up to 5 collision retries and stored `hostUid` for rule authorization.
- **Avatar Payload Optimization & Migration**: Stripped heavy avatar payloads from multiplayer sync packets, introduced center-square image cropping (`object-fit: cover`) for thumbnails, and migrated oversized legacy avatars on startup.
- **Deep-Link State Machine**: Handled deep-link consuming with dedicated `deepLinkConsumedRef` to clean URL query strings accurately upon match termination or explicit exit.
- **Stale Closure Mitigation**: Resolved stale `lobbyRole` references in `MultiplayerModal` using a synchronized ref.

### v1.16.5
- **Deep-Link Protection**: Preserved URL search parameters (`?oda=...`, `?room=...`, `?kod=...`) on initial mount by evaluating deep links before URL cleanup effect.
- **Robust Firebase Verification & Error Surfacing**: Added 5s timeout on `get(rooms/code/meta)` verification on room join, 8s timeout on room hosting, and surface explicit error messages (PERMISSION_DENIED, timeout, network failure) instead of silent failures.
- **Clean Slate Room Hosting**: Automatically purges stale room event trees before creating rooms and adds `roomToken` handshake validation.
- **Payload & Heartbeat Optimization**: Separated peer presence tracking from event log with `rooms/code/presence`, stripped large avatar dataURLs from packet payloads, and restricted multi-tab local broadcast fallback to DEV mode.
- **Dependency & Type Pruning**: Completely uninstalled unused dependencies (`mqtt`, `peerjs`, `trystero`, `@trystero-p2p/mqtt`) and removed legacy unused `NetworkAdapter` types.
- **Anonymous Authentication Integration**: Added `ensureFirebaseAuth()` via `signInAnonymously()` to secure database rules against unauthenticated writes.

### v1.16.4
- **Database & Local Profile Reset**: Completely cleared stale cloud database entities on Firebase and bumped local storage key to `project_p_user_profile_v2` for a clean slate across all clients.
- **Robust Multiplayer Handshake Engine**: Streamlined sequence packet acceptance to prevent replayed sync packets from dropping valid `GUEST_JOINED` and `HOST_LOBBY_SYNC` events, extending guest handshake window.
- **Full TR / EN Translation Coverage**: Translated remaining untranslated elements including scoreboard indicators, round markers, and main menu card labels.
- **Social Drawer Auto-Dismissal**: Fixed backdrop interaction so clicking outside the drawer or anywhere on the main menu automatically collapses the social panel.

### v1.16.3
- **Room Code & Invite Normalization**: Unified room code handling across direct input, invite notifications, and deep link URLs to prevent room key mismatches and join timeouts ("bağlanılamadı").
- **Live Friend Presence Matching**: Enhanced presence sync with sanitized friend code comparison, heartbeat interval resilient to background throttling, and immediate visibility re-announcement.
- **Firebase Realtime Database Quota & Storage Protection**: Implemented automated room cleanup on host disconnection (`onDisconnect().remove()`) and rolling packet pruning in active match event logs to prevent database bloat.
- **Language Switch Transition & Synchronized i18n**: Added pub/sub reactive language listener with smooth fade-in/fade-out UI transitions when toggling between Turkish and English.

### v1.16.2
- **100% Pure Firebase Realtime Database Engine**: Completely removed public MQTT brokers (HiveMQ/EMQX) and legacy WebRTC dependencies. Matchmaking, room state, slot negotiation, in-game card events, and friend requests now run with 100% guaranteed delivery on Google Firebase RTDB.
- **Synchronized Match Launch**: Resolved client transition desync where guests were entering matches after the host; all participants now receive synchronized match start packets and trigger animations simultaneously.
- **Friend Request & Toast Auto-Dismissal**: Restored real-time request notifications and auto-dismissal timers for toast banners across the viewport.
- **Bi-directional Profile State Sync**: Instant profile data propagation between social panels, active state contexts, and cloud records.

### v1.16.1
- **Firebase Realtime Database Social Network**: Overhauled the friend system to synchronize directly via Firebase RTDB (`requests/`, `notices/`, `presence/`, `invites/`). Replaced lossy broker topic messaging with verified cloud event listeners.
- **Connection Handshake Optimization**: Decoupled blocking MQTT connection attempts from lobby room resolution. Room metadata is registered and retrieved instantly via Firebase RTDB, preventing client spinner hangs.
- **Theme Distinction Refactoring**: Redesigned `monaco_velvet` with dedicated midnight purple (`#3b0764`) and imperial gold styling, eliminating aesthetic overlap with `melbourne_red`.
- **UI De-cluttering & Settings Consolidation**: Relocated language toggles (TR/EN) and master audio controls from the top navigation bar into a unified Settings modal. Stripped informal descriptions and legacy technical terminology across modal dialogs.
- **Dynamic Routing & Drawer State Management**: Implemented automatic social drawer dismissal upon match initiation and added bidirectional query string synchronization (`?oda=...`, `?mode=...`) with clean URL restoration on exit.
- **Profile Image Payload Expansion**: Elevated custom profile avatar file size ceiling from 2MB to 10MB.
- **Repository Documentation Standards**: Formalized technical architecture documentation in `README.md` and added standard MIT `LICENSE`.

### v1.16.0
- **Cloud Infrastructure Integration**: Deployed Google Firebase Realtime Database backing for game room metadata, social presence tracking, and profile state.
- **Lobby Audio & Readiness Flow**: Eliminated audio notification loops on guest connection and established immediate client readiness states.
- **Profile Integration in Matchmaking**: Removed redundant manual name prompts when joining via URL or invite code, utilizing authenticated profile context.
- **Estoril Blue Visual Overdrive**: Implemented responsive visual animations and neon laser layers for the Estoril Blue table theme.

### v1.15.0
- **Bidirectional Friend Sync**: Real-time cross-client friend removal and request acknowledgement pipeline.
- **Heuristic Bot Deck-Cutting**: Deterministic AI deck splitting decision model based on round position and risk distribution.
- **Secondary Game Mode Stabilization**: Resolved sequence locks and rotation bugs in 4-player Renq matches.

### v1.14.3
- **Deck Cut Choreography**: Eliminated duplicate rendering artifacts during card spread; aligned deck slot offsets with physical table coordinates.
- **Match History Persistence**: Ensured persistent local career statistics recording across all single-player and multiplayer outcomes.
- **Capture Stacking Geometry**: Refactored card capture pile layouts with staggered angular offsets.

### v1.14.2
- **Continuous Deck Transition**: Unified shuffle-to-table transition cycles using Web Animations API.
- **Discord Deployment Webhook**: Automated embed changelog dispatch for CI/CD releases.
- **HUD & Emote Layering**: Elevated overlay z-indexes to prevent clipping under scoreboards.

### v1.14.1
- **Slide-out Social Drawer**: Implemented independent, non-intrusive navigation drawer for social interactions and online roster views.

### v1.13.0
- **Penalty Synchronization**: Multi-card penalty queue synchronization and dynamic card lift trajectories in online matches.
- **In-Game Badges**: Dynamic custom title rendering across in-game scoreboards and player slots.

### v1.12.0
- **Custom Avatar Pipeline**: Client-side image processing, compression, and distribution across peer nodes.

### v1.11.0
- **Network Security & Packet Validation**: Implemented strict seat index authorization against peer identities, monotonic packet sequence filtering, and state integrity guards.

### v1.0.0 – v1.10.0
- **Deterministic Core Simulation**: Baseline deterministic rule engine for Turkish Pişti and Renq card games.
- **Procedural Audio Engine**: Web Audio API procedural synthesizer for zero-dependency sound generation.
- **Multi-Broker Mesh**: Initial dual MQTT broker failover architecture with local `BroadcastChannel` testing bridge.
- **Adaptive WAAPI Pipeline**: Multi-phase card motion choreography targeting 60Hz–240Hz displays.

---

## Future Roadmap

- [ ] **Native WebRTC DataChannels**: Direct peer-to-peer data channel mesh for zero-latency gameplay when STUN/TURN connections are established.
- [ ] **Ranked Matchmaking & ELO Rating**: Server-assisted matchmaking algorithm matching players by calculated skill ratings.
- [ ] **Spectator Mode**: Read-only peer connections enabling live match observation.
- [ ] **Custom Tournament Brackets**: Structured multi-round knockout and round-robin tournament orchestration.
