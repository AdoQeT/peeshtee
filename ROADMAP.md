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

### ⚡ Phase 3: Architectural Decoupling, Bundle Optimization & Deep Bot AI (Completed in v1.20.0)
- [x] **Large Component Modularization & Code Splitting**:
  - Implemented `React.lazy` and `Suspense` boundary for `UnoGameView`, decoupling the secondary Renq/Uno bundle from initial chunk loading.
- [x] **Advanced Bot AI Heuristics**:
  - Hard bot difficulty enhanced with table pot point density evaluation (`potBasePoints`), thickness thresholds, and card-counting-based safe discards on empty tables.
- [x] **Centralized Telemetry & Error Logging**:
  - Implemented structured `src/utils/logger.ts` utility that suppresses verbose console output in production and standardizes runtime diagnostics.
- [x] **Documentation Harmonization**:
  - Overhauled `README.md` to eliminate obsolete MQTT/WebRTC references and accurately document the pure Firebase Realtime Database and BroadcastChannel sync architecture.
- [x] **Realistic Tabletop Physical Deck Counting**:
  - Rewrote `CardCountingOverlay.tsx` to replicate authentic Pişti tabletop deck counting: closed deck in front of player flips cards one-by-one into an adjacent counted pile with tactile "tık-tık" audio, and special score cards are isolated and highlighted in real-time.

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

