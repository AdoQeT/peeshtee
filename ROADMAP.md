# Project P (Peeshtee: Overdrive) — Comprehensive Engineering Roadmap & Architecture Evolution

This document establishes the official engineering roadmap, critical architectural audits, and active milestone deliverables for **Project P (Peeshtee: Overdrive)**.

---

## 🎯 Master Architecture & Modernization Plan

### 🚨 Phase 1: Security Hardening, Anti-Cheat & Core Environment (Completed in v1.18.0)
- [x] **Repository Configuration & Rules Tracking**:
  - Add `database.rules.json` and `firebase.json` directly to the repository so security rules are versioned and verifiable.
  - Enforce least-privilege security rules: host-only room metadata mutations, event immutability, indexed presence, and strict ownerUid-based profile/presence write access without root read/write bypasses.
- [x] **Secret Hygiene & Webhook Hardening**:
  - Remove hardcoded Discord Webhook URLs from `scripts/sendDiscordChangelog.mjs`.
  - Enforce `process.env.DISCORD_WEBHOOK_URL` and add `.env.example`.
- [x] **Multiplayer Anti-Cheat & Packet Verification**:
  - Verify message sender authenticity strictly via `PacketEnvelope.senderId` matching the assigned `peerId` in room slots (stop trusting arbitrary payload client claims).
  - Seal replay attack & token filter gaps in `handleRawIncoming`: ensure `roomToken` is strictly validated and reject unauthenticated or mismatched tokens.
  - Block spoofed card plays and turn actions across both Pişti (`App.tsx`) and RENQ/Uno (`UnoGameView.tsx`).
- [x] **Single Source of Truth Versioning & Build Config Fixes**:
  - Fix `vite.config.ts` regex defect (`pkg.version.replace(/\.0$/, '')`) which corrupted semantic versions (e.g., `1.17.0` becoming `1.17`).
  - Wire `MainMenu.tsx` version badge dynamically from `__APP_VERSION__` instead of hardcoded strings.
  - Declare explicit `engines` (`node: ">=20.0.0"`) in `package.json`.

---

### 🧪 Phase 2: Comprehensive Test Coverage, Assets & CI/CD
- [ ] **Pure Function Unit Testing**:
  - Unit tests for `src/core/rules.ts`: Pişti, Double Pişti, Jack clearing, Five-Rule instant win, majority card scoring (3 pts), Diamond 10 (3 pts), Club 2 (2 pts), and Aces (1 pt).
  - Unit tests for `src/core/ai/bot.ts`: decision heuristics, Jack preservation thresholds, risk assessment.
  - Unit tests for `src/features/uno/unoRules.ts`: color matching, +2 / +4 draw stacking, skips, reverses.
- [ ] **GitHub Actions CI/CD Pipeline**:
  - Create `.github/workflows/ci.yml` running linting, type checks (`tsc -b`), and automated tests on every push and pull request.
- [ ] **Public Assets & Progressive Web App (PWA)**:
  - Create missing `public/` directory with proper `favicon.ico`, `manifest.json`, Web App icons, and OpenGraph social preview assets.
  - Enhance `index.html` with explicit SEO meta tags, OpenGraph previews, and viewport accessibility.
- [ ] **Offline Singleplayer Support**:
  - Enable service worker caching for complete offline singleplayer playability against local bots.

---

### ⚡ Phase 3: Architectural Decoupling, Bundle Optimization & Deep Bot AI
- [ ] **Large Component Modularization**:
  - Refactor monolithic `App.tsx` (3600+ lines) into specialized custom hooks:
    - `useDealChoreography`: Batch card distribution, trajectory physics, and fanning audio.
    - `useMultiplayerSync`: Pure Firebase RTDB packet negotiation, heartbeat monitoring, and reconnection buffers.
    - `usePistiGame`: Reducer-based game state management.
  - Refactor `UnoGameView.tsx` and `TableSurface.tsx` into modular sub-components.
- [ ] **Code Splitting & Bundle Pruning**:
  - Implement `React.lazy` for `UnoGameView` and `TableSurface` to slash initial chunk size from 746 kB down to ~250 kB.
  - Dynamically load non-critical audio assets and procedural particles.
- [ ] **Advanced Bot AI Heuristics**:
  - Upgrade Hard bot difficulty: compute table pot value, track played cards, calculate Pişti odds, and avoid feeding valuable cards to opponents.
- [ ] **Centralized Telemetry & Error Logging**:
  - Implement structured `logger.ts` utility that suppresses noisy console output in production and centralizes runtime error reporting.
- [ ] **Documentation Harmonization**:
  - Overhaul `README.md` to remove obsolete WebRTC / MQTT references and document current pure Firebase Realtime Database architecture.

---

## 📜 Historical Release Archive (Summary)
- **v1.18.0**: Authentic batch card dealing choreography starting from cutter clockwise, pitch-shifting card deal sound, Dealer ('D') and Cutter ('✂️') physical table chips, and configurable Deal Speed (Fast / Normal / Cinematic).
- **v1.17.1**: Fully self-contained CSS `@keyframes` and inline palette styling for `MatchIntroOverlay`, complete 4-player team roster integration.
- **v1.17.0**: Resolved React 18 setState batching bug in lobby sync, introduced `MatchIntroOverlay`, implemented micro-footprint presence engine with indexed queries and transaction-based friend code reservations.
- **v1.16.7**: Resolved synchronous RTDB undefined property crash using `cleanForRtdb` across all database mutations.
- **v1.16.2**: Fully migrated from public MQTT brokers to 100% pure Firebase Realtime Database architecture.
