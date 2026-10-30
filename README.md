# Project P (Peeshtee: Overdrive)

A high-performance, deterministic card game platform and real-time multiplayer engine built with TypeScript, React 18, Web Animations API (WAAPI), procedural Web Audio API, and Firebase Realtime Database.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-RTDB-FFA611.svg?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)

---

## Architecture Overview

Project P is structured as a modular client application separating core simulation logic, rendering pipelines, audio synthesis, and distributed networking.

```mermaid
graph TD
    subgraph Client["Client Application Layer"]
        UI["React 18 Component Tree & Modals"]
        State["Application State & Session Controller"]
        Anim["WAAPI Card Animation Pipeline"]
        Audio["Procedural Web Audio Engine"]
    end

    subgraph Core["Deterministic Core Layer"]
        Rules["Rules Evaluator & Score Calculator"]
        Deck["Deck Shuffler & Dealing State Machine"]
        AI["Heuristic Bot Decision Engine"]
    end

    subgraph Network["Distributed Networking Layer"]
        Firebase["Firebase Realtime Database (Meta / Presence / Social)"]
        MQTT["Dual MQTT WebSocket Mesh (HiveMQ / EMQX)"]
        LocalMesh["BroadcastChannel Cross-Tab Synchronization"]
        Validator["Monotonic Sequence & Peer ID Validator"]
    end

    UI --> State
    State --> Core
    Core --> Anim
    Core --> Audio
    State <--> Network
    Network --> Validator
```

---

## Technical Specifications

### 1. Deterministic Core Engine
- **Headless State Evaluation**: Core rule checks and round computations execute independently of the presentation tree.
- **Rule Matrix**: Computes matching conditions, bonus card values, sweeps, capture points, and team scores with deterministic outcomes.
- **Bot Engine**: Heuristic decision trees operating across three difficulty tiers (Easy, Medium, Hard) taking into account pile memory, card distributions, and risk assessments.

### 2. Animation & Rendering Pipeline
- **WAAPI (Web Animations API)**: 60Hz–240Hz adaptive animation execution bypassing main-thread UI layout thrashing.
- **Physical Deck Choreography**: 3D transform trajectories for multi-step shuffle sequences, pack sliding, cut-deck displacement, and collection gathering.
- **Hardware-Accelerated FX**: 2D Canvas particles and GPU composite layers for dynamic impact and particle simulations.

### 3. Procedural Audio Synthesis
- **Zero Static Audio Assets**: Procedural Web Audio API sound generator synthesizing card slides, strikes, sweeps, and fanfares dynamically.
- **Polyphonic Ambient Synthesis**: Real-time ambient backdrop synthesis with independent volume control and master mute states.

### 4. Distributed Networking & Cloud Synchronization
- **Cloud State & Persistence**: Google Firebase Realtime Database for instantaneous room discovery, persistent presence indicators, real-time friend graph synchronization, and direct match invites.
- **P2P/WebSocket Transport**: Dual MQTT WebSocket broker fallback (HiveMQ + EMQX) with sub-second handshake resolution.
- **Security & Integrity**:
  - Peer ID slot validation (`senderSlot.peerId === msg.senderPeerId`).
  - Monotonic packet sequence counter (`seq`) to reject duplicates and out-of-order replay attacks.
  - Sanitized in-game payload filtering.

---

## Project Structure

```
├── public/                 # Static public assets
├── scripts/                # CI/CD and deployment scripts
│   └── sendDiscordChangelog.mjs
├── src/
│   ├── components/         # React presentation layer & table components
│   ├── core/
│   │   ├── ai/             # Bot heuristic algorithms
│   │   ├── audio/          # Procedural Web Audio API sound synthesizer
│   │   ├── deck/           # Deck generation and shuffle routines
│   │   ├── particles/      # Canvas 2D particle simulation
│   │   └── rules/          # Deterministic game rules & score breakdowns
│   ├── features/
│   │   ├── friends/        # Firebase friend graph & presence network
│   │   ├── multiplayer/    # WebRTC/MQTT/Firebase room connection manager
│   │   ├── profile/        # Local & cloud profile data management
│   │   └── uno/            # Secondary card game engine (Renq)
│   ├── types/              # TypeScript definitions & data contracts
│   ├── utils/              # i18n localization and shared helpers
│   ├── App.tsx             # Root application orchestrator
│   └── main.tsx            # Entry point
├── LICENSE                 # MIT License
├── package.json            # Dependencies and version configuration
├── ROADMAP.md              # Technical milestone release history
└── tsconfig.json           # TypeScript configuration
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm v9.0.0 or higher

### Installation
```bash
git clone https://github.com/adoqet/peeshtee.git
cd peeshtee
npm install
```

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
