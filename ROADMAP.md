# Project P (Peeshtee: Overdrive) — Comprehensive Engineering Roadmap & Architecture Evolution

This document establishes the official engineering roadmap, critical architectural audits, and active milestone deliverables for **Project P (Peeshtee: Overdrive)**.

---

## 🎯 Master Architecture & Modernization Plan

### 🚨 Phase 1: Security Hardening, Anti-Cheat & Core Environment
- [x] **Repository Configuration & Rules Tracking**:
  - Add `database.rules.json` and `firebase.json` directly to the repository so security rules are versioned and verifiable.
  - Enforce least-privilege security rules: host-only room metadata mutations, `senderId` bound to `presence/$instanceId/uid === auth.uid`, member-scoped room event/presence reads, recipient-bound `invites`/`requests`/`notices`, and server-managed `admins/$uid`.
- [x] **Secret Hygiene & Webhook Hardening**:
  - Remove hardcoded Discord Webhook URLs from `scripts/sendDiscordChangelog.mjs` and remove founder passcode hashes from client bundle (`profileManager.ts`).
  - Enforce `process.env.DISCORD_WEBHOOK_URL` and add `.env.example`.
- [x] **Multiplayer Anti-Cheat & Packet Verification**:
  - Verify message sender authenticity strictly via `PacketEnvelope.senderId` matching the assigned `peerId` in room slots.
  - Enforce monotonic `seq` replay protection across all packets (including `GUEST_JOINED`, `HOST_LOBBY_SYNC`, `MP_GAME_START`).
  - Deny unverified or missing seat/peerId actions in both Pişti and RENQ/Uno (`UnoGameView.tsx`).
- [ ] **Host-Authoritative Deck Secrecy (C2 — Planned Separate Branch)**:
  - Stop broadcasting full `seedDeck` and `seedUnoDeck` to all clients (`App.tsx`); deliver each player's hand via a private per-player channel while keeping card identity separate from card face.
- [x] **Single Source of Truth Versioning & Build Config Fixes**:
  - Fix `vite.config.ts` version string handling and wire `MainMenu.tsx` dynamically from `__APP_VERSION__`.
  - Align `package.json` `engines` (`node: ">=24.12.0"`) and GitHub Actions CI (`node-version: 24`) with `firebase@13`.

---

### 🧪 Phase 2: Comprehensive Test Coverage, Assets & CI/CD (Completed in v1.18.1)
- [x] **Pure Function Unit Testing**:
  - Unit tests for `src/core/rules.ts` (`scripts/testRules.mjs`): Pişti (10 pts), Double Pişti Jack-on-Jack (20 pts), Jack non-match sweeping (0 pts Pişti), 5-Rule instant win, card counting and score calculation (Aces: 1 pt, Jacks: 1 pt, Diamond 10: 3 pts, Club 2: 2 pts, majority cards: 3 pts).
  - Unit tests for `src/core/ai/bot.ts` (`scripts/testBot.mjs`): Direct trick matching, Jack sweep thresholds, Jack preservation on low piles, and card counting on hard difficulty to prevent opponent Piştis.
  - Unit tests for `src/features/uno/unoRules.ts` (`scripts/testUnoRules.mjs`): Color/rank validation, draw stacking rules (+2 countered by +2 or +4; +4 countered only by +4), AI color weighting and penalty stacking prioritization.
  - Unified `npm test` script executing all 18 automated test cases in Node.js test runner.
- [x] **GitHub Actions CI/CD Pipeline**:
  - Created `.github/workflows/ci.yml` running on push & PR to `main` with Node 20 caching, dependency installation (`npm ci`), test runner (`npm test`), and production build verification (`npm run build`).
- [x] **Public Assets & Progressive Web App (PWA)**:
  - Created root `public/` directory with `manifest.json`, scalable SVG app icon (`icon.svg`), and rich OpenGraph social share card (`og-image.svg`).
  - Updated `index.html` with explicit viewport, theme color, SEO meta description, OpenGraph preview tags, Twitter cards, and web manifest linkage.
- [x] **Offline Singleplayer Support**:
  - Implemented `/sw.js` Service Worker with caching of static shells, assets, and Google Fonts fallback, enabling offline playability for singleplayer games.
  - Registered Service Worker in production mode via `src/main.tsx`.

---

### 🃏 Phase 2.5: Polish, UX & Quick Wins (Completed in v1.18.2)
- [x] **Dealer/Cutter Icon Removal**: Removed `RoleChip` (D and ✂️ icons) from the table surface; component now renders nothing, preserving type compatibility.
- [x] **Monaco Velvet Ana Menü Teması**: Ana menü arka plan degradesi, TableSurface'taki gerçek tema renkleriyle (deep purple/violet) uyumlu hale getirildi ve tema değişiminde ambient glow güncellendi.
- [x] **Yükleme Ekranı Hız Optimizasyonu**: `MatchIntroOverlay` varsayılan süresi 3000ms'den **2250ms**'e (%75) düşürüldü; riffle/tap animasyon zamanlamaları buna göre kalibre edildi.
- [x] **Kart Animasyonu Motor Yükseltmesi** (`cardPhysicsEngine.ts`):
  - `motionType` alanı eklendi: `deal`, `play`, `sweep`, `jack` — her tip için ayrı easing, loft yüksekliği, banking ve süre baskısı.
  - `play` kartları: hafif elastic spring (`cubic-bezier(0.20, 1.10, 0.30, 1.02)`) ile oynanan hissi.
  - `sweep` kartları: accelerate easing ile hızlı ve kararlı toplama.
  - `jack` kartları: daha dramatik 130px loft, geniş yay eğrisi ve 38° aerodynamic pitch.
  - Landing micro-settle: son %10'da küçük scale overshoot ile gerçek kart dokunuş hissi.
  - `rotateZ` banking: kartlar eğrinin içine doğal olarak yaslanıyor.
  - Keyframe adımları 18'den **20'ye** çıkarıldı, bezier eğrileri daha pürüzsüz.

---

### ⚡ Phase 3: Architectural Decoupling, Bundle Optimization & Deep Bot AI
- [x] **Large Component Modularization & Code Splitting**:
  - Implemented `React.lazy` and `Suspense` boundary for `UnoGameView`, decoupling the secondary Renq/Uno bundle from initial chunk loading.
- [ ] **Further Hook & Bundle Decomposition (D1 & D2)**:
  - Split `usePistiGame.ts` into smaller focused hooks (`useCountingCeremony`, dealing, cutting, bot turn, round end) and lazy-load `TableSurface`.
- [x] **Advanced Bot AI Heuristics**:
  - Hard bot difficulty enhanced with table pot point density evaluation (`potBasePoints`), thickness thresholds, and card-counting-based safe discards on empty tables.
- [x] **Centralized Telemetry & Error Logging**:
  - Implemented structured `src/utils/logger.ts` utility and routed all `console.*` calls across `src/` through `logger`.
- [x] **Documentation Harmonization**:
  - Updated `README.md` to eliminate obsolete MQTT/WebRTC/Vite 5 references and accurately document the Firebase Realtime Database and BroadcastChannel sync architecture.
- [x] **Realistic Tabletop Physical Deck Counting**:
  - Updated `TableSurface.tsx` and `CardCountingOverlay.tsx` so collected card piles do not disappear to 0 when counting starts, gliding cards directly from `tableRefs.collectedEls` into the counting piles.

---

### 🔮 Phase 4: Player Experience, Accessibility & Growth
- [ ] **Erişilebilirlik (a11y)**:
  - Klavye ile kart seçme ve oynama akışı (`Tab` → `Enter`); ARIA etiketleri kart elleri, skor tablosu ve modal'lar için tamamlanmalı.
  - Ekran okuyucu desteği için anlamlı `aria-label` içerikleri (`"Karo 10 oyna"`, `"Vale ile süpür"` gibi).
- [ ] **Gizlilik & Kullanıcı Hakları**:
  - Hesap ve profil silme akışı (KVKK/GDPR uyumluluğu); "Tüm verilerimi sil" seçeneği ayarlar içinden.
  - Gizlilik politikası sayfası ya da modal'ı.
- [ ] **Hata İzleme & Prodüksiyon Gözlemleme**:
  - Sentry veya benzeri bir araçla `ErrorBoundary` entegrasyonu; üretimde sessiz catch yerine yapılandırılmış error raporlama.
- [ ] **Ranked & Turnuva Modu**:
  - Elo-tabanlı sıralama sistemi; sezonluk liderboard; ELO badge görünümü.
- [ ] **Sesli Sohbet (Voice Chat)**:
  - WebRTC peer-to-peer ses kanalı veya Discord Activity entegrasyonu.
- [ ] **Lonca / Guild Sistemi**:
  - Takım bazlı arkadaş listesi grupları, lonca rekabeti ve günlük lonca görevi.

---

## 📜 Historical Release Archive (Summary)
- **v1.30.0**: Added competitive progression and table atmosphere systems: Level Rewards (unlockable card backs, titles, and table themes gated by player level), Global Live Leaderboard (fetching and ranking Top 25 players across XP, Wins, and Piştis from Firebase RTDB with real-time sync), Achievements Showcase (8 unlockable milestones across Pişti and RENQ with floating golden unlock toast notifications and a dedicated 3rd tab in the profile modal), dynamic Lo-Fi Ambience soundscape (warm Rhodes chords and vinyl crackle procedural Web Audio generator), animated card backs (moving neon scanlines on `cyber_neon` and diagonal shimmering gold sheen on `gold_dragon`), and expanding holographic neon shockwave rings and particle bursts on Pişti and Double Pişti slams.
- **v1.29.1**: Restored the clean centered 2-column Arcade hub layout (`max-w-5xl`), placed the Daily Quests widget as an elegant slim floating panel on the left edge with collapse/expand toggle, moved the micro Level & XP progress bar directly underneath the header profile box, renamed game modes from Offline/Online to Singleplayer/Multiplayer across all 4 languages (TR, EN, DE, ES), and applied general stability refinements.
- **v1.29.0**: Cancelled dead-center deck cut +5 bonus points rule, fixed match history and level (XP) data persistence bug by preserving profile attributes across localStorage reads, moved Daily Quests from profile modal to a dedicated left-side Main Menu widget with automated quest reward claiming, modularized monolithic code by extracting `UnoOpponentSeat` and `DailyQuestsWidget` to drastically reduce token footprint for future AI iterations, completely cleaned Firebase Realtime Database collections (profiles, rooms, presence, notices), added automated database clean script (`npm run clean-db`), and restored secure developer crown verification with customized high-security founder passcodes (`01.02.1995` and `zeitnotisthegreatest`).
- **v1.28.0**: Fixed 4-player Pişti end-of-round team score calculation bug (eliminated duplicate Pişti points caused by bonusPoints overlap and properly aggregated partner scores), overhauled RENQ 3D card physics engine with zero teleportation (exact fanned hand slots tracked for 0-displacement arrivals), introduced realistic seat-oriented flight departure angles and aerodynamic parabolic loft for opponent discards (flipping face-up in mid-air from left, top, and right rims), and enhanced discard stack settle dynamics and penalty cascading delivery.
- **v1.27.0**: Overhauled RENQ with tactile deck cut riffle hover preview (paper friction ticks and card lift dynamics), perimeter horizontal player profile banners (top, bottom, left, right) facing user, trigonometric 8-slot radial emote wheel with floating reaction pops and multiplayer sync, 2 semi-transparent orbital direction arrows directly on table felt indicating rotation flow with reverse neon light sweep ring, fiery/neon growing combo scale and animation for stacked penalties (+2, +4, +6, +8), full 4-language (TR, EN, DE, ES) localization across RENQ, Profile, In-Game Chat, and Social panels, and spectator mode support for watching ongoing matches live from friends list.
- **v1.26.0**: Reworked Main Menu into a 2-column Arcade Game Hub (Offline Pişti & RENQ vs Online Multiplayer Lobby) and removed custom match setup button, added full 4-language support (TR, EN, DE, ES) across Settings, Online Lobby, and Menus with localized random AI bot names, fixed ScoreBoard turn-change table resize jitter, removed collected pile border flashes and card count badges, enabled real-time deck card decrement during dealing, oriented 4P side player banners horizontally on the outer table perimeter with side-positioned collected/pisti pools and wider user hand spacing, rebuilt the emote picker as a trigonometric radial wheel, removed stock avatar selection from ProfileModal (random stock avatar on new profile or custom upload), slowed end-of-round team card merge animation and moved 4P rival counting station to the side opponent at 1.2x counting speed with skip buttons removed, and added backdrop blur to the Social drawer.
- **v1.25.0**: Fixed 4-player side seat animation desync, rotation snaps, and teleportation via seat-aware initial tilt (-90°/+90°) and scale transitions, overhauled in-game ScoreBoard HUD into a sleek modern glassmorphism design, elevated all 7 table themes with enhanced spotlight falloffs and velvet textures, and redesigned main menu game mode cards.
- **v1.24.1**: Refactored end-of-round score station breakdown to display individual deck points, +3P majority, and pisti tally separately from center grand total, introduced graceful multiplayer lobby guest departure via `GUEST_LEFT` without aborting the room, and added automatic presence drop detection to keep host lobby intact.
- **v1.24.0**: Added AI bot personalities (aggressive, tactician, bluffer, balanced) with contextual speech dialogue and emote reactions, added 1-click Quick Matchmaking queue in multiplayer, upgraded radial reaction wheel with 8 tactile emote slots, added dynamic 3D specular holographic glints on high-value cards, integrated win streaks and all-time record piştis into player profile, built a cinematic victory podium for match finish, fully translated How to Play rules modal (TR/EN), and updated Coming Soon roadmap showcase.
- **v1.23.1**: Resolved online Pişti sub-deal (Phase 2) card desync & infinite turn timer loop via canonical absolute-seat dealing & uninterrupted turn flow, fixed direct friend lobby game invites through RTDB rule presence fallback & room code normalization, and upgraded all 7 table themes with ultra-realistic baize textures, brass/gold dual-stitched rails, and central spotlight atmospheres.
- **v1.23.0**: Fixed round starter rotation & direct-to-slot hand card dealing, oriented 4P side player piles & badges perpendicular to table edges, removed dashed card slot borders, added pre-count Pişti & 4P team deck merge animation, redesigned end-of-hand VS score card, hardened RTDB security rules & replay protection, and completed TR/EN i18n & theme-matched intro palettes.
- **v1.22.0**: Extracted `useCardFlightState`, `useMultiplayerRoom`, and `usePistiGame` custom hooks from `App.tsx`, reducing `App.tsx` from ~3,700 lines to ~1,160 lines.
- **v1.21.1**: Upright score & name badges across all counting stations (zero inverted text), spacious centered tabletop felt positioning, zero card spawn/delete physical continuity during hand-to-count ceremony, and tactile single-card flip transition.
- **v1.21.0**: Kinetic Pişti Slam physics (slow dramatic 160px loft rise, apex hang anticipation, explosive downward crash with table shudder impact), physical deck pool glide from collection tray to player felt stations (zero teleportation), and seat-perspective spatial counting stations (0° user front, 180° opponent top, 90°/-90° table flanks).
- **v1.20.2**: Tabletop physical 52-card object conservation during counting (zero modal/banner, cards physically slide from corner to front, simultaneous flip opening onto adjacent open stack with tactile table tick audio), Jack Double Pişti rendering in Pişti pool with 2x golden badge, and click spam debounce lock preventing premature card bounce/teleportation during dealing.
- **v1.20.1**: Zero modal / zero darkening authentic in-table deck counting ceremony (closed piles slide directly to user/opponent front, simultaneous flip opening to adjacent open stack with isolated point cards showcase), full collected pile card scaling (1:1 with table cards, no shrinking or teleportation artifacts), and deal-to-play debounce lock to prevent premature card play bounces.
- **v1.20.0**: Authentic tabletop deck counting ceremony (closed pile flips one-by-one to adjacent open stack with tactile audio & isolated score card tray), Phase 3 completion (React.lazy code splitting for Uno/Renq, logger.ts telemetry, bot heuristics upgrade, and pure Firebase RTDB documentation overhaul).
- **v1.19.0**: Replaced end-of-hand card count modal with full animated `CardCountingOverlay` — collected cards fly from table positions to center stage, scoring increments live per card with special card pops, majority/score banners, and inline next-round controls.
- **v1.18.2**: Dealer/Cutter icon removal, Monaco Velvet main menu background fix, MatchIntroOverlay 25% speed boost, card physics engine upgrade (motionType-aware easing, micro-settle, rotateZ banking).
- **v1.18.1**: Comprehensive test suite (18 tests), GitHub Actions CI/CD, PWA manifest & offline service worker, public assets & OpenGraph social card.
- **v1.18.0**: Security hardening (database.rules.json, firebase.json), anti-cheat verified sender checks, environment hygiene, Vite versioning single-source-of-truth.
- **v1.17.1**: Fully self-contained CSS `@keyframes` and inline palette styling for `MatchIntroOverlay`, complete 4-player team roster integration.
- **v1.17.0**: Resolved React 18 setState batching bug in lobby sync, introduced `MatchIntroOverlay`, implemented micro-footprint presence engine with indexed queries and transaction-based friend code reservations.
- **v1.16.7**: Resolved synchronous RTDB undefined property crash using `cleanForRtdb` across all database mutations.
- **v1.16.2**: Fully migrated from public MQTT brokers to 100% pure Firebase Realtime Database architecture.

