# Engineering Roadmap & Release Milestones

This document records completed engineering milestones, architecture evolutions, and scheduled development objectives for **Project P (Peeshtee: Overdrive)**.

---

## Release Milestones

### v1.16.4 (Current)
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
