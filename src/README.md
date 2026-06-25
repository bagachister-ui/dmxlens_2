# DMXLens — DMX Signal Reader & Analyzer

A web-based DMX lighting diagnostics platform. It captures **live sACN (E1.31)** and **Art-Net** signals through a local bridge, auto-discovers every sender on the network, lets techs inspect 512-channel universes in real time, compare two sources side-by-side, and save/import/export channel snapshots into cloud "Shows" shared across multiple users.

> **This README doubles as a full rebuild specification.** It documents every file, the folder layout, the data model, the live-data flow, and the external bridge so the app can be reconstructed faithfully in another Base44 app.

---

## ⚠️ Best way to copy this app

Documenting files in a README lets another agent **rebuild** the app, but a rebuild always drifts slightly from the original. For an **exact, lossless clone**, use **GitHub two-way sync**:

1. In this app: connect it to a GitHub repository (syncs all files to the repo).
2. In the new app: connect it to the **same** repository to pull every file byte-for-byte.

Use this README for documentation, onboarding, and as a rebuild spec when GitHub sync isn't an option.

---

## Architecture at a glance

```
┌─────────────────┐   UDP sACN/Art-Net   ┌──────────────────┐   WebSocket JSON   ┌─────────────────┐
│ Lighting console│ ───────────────────► │ dmx-bridge.js    │ ─────────────────► │  Web app        │
│ (sACN / Art-Net)│   (5568 / 6454)      │ (local Node.js)  │   (ws://host:8080) │  (this Base44   │
└─────────────────┘                      └──────────────────┘                    │   app)          │
                                                                                  └─────────────────┘
```

Browsers cannot open raw UDP sockets, so a small **local Node.js bridge** (`bridge/dmx-bridge.js`) listens for UDP DMX packets, parses them, and forwards structured JSON frames over WebSocket to the web app. The web app holds all live state in a singleton store and renders it reactively.

---

## Folder structure

```
.
├── README.md                         ← this file
├── index.html                        ← HTML entry, fonts, mount point
├── index.css                         ← design tokens (dark theme), fonts, scrollbar
├── tailwind.config.js                ← Tailwind theme → token mapping
├── App.jsx                           ← router + auth/query/toast providers
├── main.jsx                          ← React entry
│
├── api/
│   └── base44Client.js               ← pre-initialized Base44 SDK client
│
├── entities/                         ← database schemas (JSON)
│   ├── Show.json                     ← a named collection of snapshots, with members[]
│   └── Snapshot.json                 ← captured universe channel data for a show
│
├── lib/
│   ├── dmxStore.js                   ← ★ singleton store: live WS data, source discovery, history, event log
│   ├── dmxUtils.js                   ← source key/sort/detail-path helpers
│   ├── snapshotParser.js             ← parse exported CSV/Excel back into universe objects
│   ├── progressBus.js                ← global "work in progress" event bus for the top loading bar
│   ├── bridgeContent.js              ← bridge script + package.json as strings (for in-app download)
│   ├── AuthContext.jsx               ← auth provider (platform boilerplate)
│   ├── query-client.js               ← react-query client
│   ├── app-params.js                 ← app param helpers (platform boilerplate)
│   ├── utils.js                      ← cn() classname helper
│   └── PageNotFound.jsx              ← 404 page
│
├── hooks/
│   ├── useDMXStore.js                ← ★ subscribes to dmxStore, throttles re-renders to ~15fps
│   └── use-mobile.jsx                ← viewport helper
│
├── pages/
│   ├── Dashboard.jsx                 ← universe card grid + event log + "Take Snapshot"
│   ├── UniverseDetail.jsx            ← 512-channel grid + signal stats for one source
│   ├── Setup.jsx                     ← connection page: detected sources + bridge connection panel
│   ├── Compare.jsx                   ← pick two sources, diff channels side-by-side
│   ├── Snapshots.jsx                 ← Shows list + show detail (save/import/export/members)
│   ├── Login.jsx / Register.jsx / ForgotPassword.jsx / ResetPassword.jsx   ← auth (platform boilerplate)
│
├── components/
│   ├── Layout.jsx                    ← sidebar nav + live status, wraps all pages
│   ├── GlobalProgressBar.jsx         ← top loading bar driven by progressBus
│   ├── ScrollToTop.jsx               ← scroll reset on route change
│   ├── ProtectedRoute.jsx            ← auth gate (platform boilerplate)
│   ├── UserNotRegisteredError.jsx / AuthLayout.jsx / GoogleIcon.jsx        ← auth (platform boilerplate)
│   ├── dmx/
│   │   ├── UniverseCard.jsx          ← dashboard card: telemetry + signal status for one source
│   │   ├── ChannelGrid.jsx           ← 512-channel intensity grid with hover details
│   │   ├── SignalStatus.jsx          ← per-universe diagnostic stat list
│   │   ├── ActivityPulse.jsx         ← animated signal-present indicator
│   │   ├── DetectedSources.jsx       ← live list of discovered sources + connection history
│   │   ├── ConnectionPanel.jsx       ← WS URL input, Art-Net offset, bridge download/instructions
│   │   ├── ConnectionHistoryList.jsx ← saved bridge connections (rename/connect/delete)
│   │   ├── EventLog.jsx              ← scrolling diagnostic event log
│   │   ├── CompareGrid.jsx           ← row-per-channel A/B/delta comparison grid
│   │   ├── SaveSnapshotDialog.jsx    ← dashboard "Take Snapshot" → save into a show
│   │   ├── CloudSnapshotRow.jsx      ← collapsible snapshot row with channel tables
│   │   ├── CreateShowDialog.jsx      ← new-show modal
│   │   └── MemberManager.jsx         ← add/remove member emails on a show
│   └── ui/                           ← shadcn/ui components (full set)
│
└── bridge/                           ← LOCAL helper (NOT part of the web app build)
    ├── dmx-bridge.js                 ← Node.js UDP→WebSocket relay
    ├── package.json                  ← bridge deps (ws)
    └── README.md                     ← bridge setup instructions
```

★ = the core files that define how live data flows. Start here when rebuilding.

---

## Data model (entities)

### `Show`
A named collection of snapshots, owned by its creator and optionally shared.

| Field | Type | Notes |
|---|---|---|
| `name` | string (required) | Show name |
| `description` | string | Optional |
| `members` | string[] | Emails (besides the owner) who can access the show |

Access rule: a user sees a show if `created_by` equals their email **or** their email is in `members` (compared case-insensitively).

### `Snapshot`
A captured frozen state of all live universes at a moment in time.

| Field | Type | Notes |
|---|---|---|
| `show_id` | string (required) | Parent `Show` id |
| `name` | string (required) | Snapshot / cue label |
| `captured_at` | date-time | When captured (used for sort order) |
| `universes` | object[] | Each: `{ protocol, universe, channels[0..511] }` |

`User` is the built-in Base44 user entity (not redefined here).

---

## Live data flow (how it actually works)

1. **Bridge** (`bridge/dmx-bridge.js`) binds UDP 5568 (sACN, joins multicast `239.255.x.x` for universes 1–512) and UDP 6454 (Art-Net), and runs a minimal WebSocket server on 8080.
2. It parses each valid packet (validating sACN preamble/identifier/DMP-vector/START-code and Art-Net ID/opcode) into a JSON frame: `{ type:'dmxFrame', protocol, universe, sourceName, sourceIP, channels[512], sequence, timestamp }` and broadcasts it to connected WS clients.
3. **`dmxStore`** (singleton) connects to the bridge WebSocket. Each incoming frame is keyed by `protocol:universe:sourceIP` — so two consoles sending the same universe from different IPs are tracked as **separate sources**. New keys are auto-discovered; sources with no frame for 3s are dropped. Art-Net universes get a configurable offset (default +1) to display 1-based.
4. **`useDMXStore`** hook subscribes components to the store and throttles re-renders to ~15fps for performance.
5. **Pages/components** read sources via `store.getAllUniverses()` / `getUniverse()` and render reactively. Sorting & key/path generation are centralized in `lib/dmxUtils.js`.

**Snapshots** are saved by mapping the current live universes into the `Snapshot.universes` array (channels as plain number arrays). Export writes one Excel sheet per snapshot; import (`lib/snapshotParser.js`) reverses that back into universe objects, clamping values 0–255.

---

## Pages & routes

| Route | Page | Purpose |
|---|---|---|
| `/` | Dashboard | Grid of detected universes, event log, take-snapshot |
| `/universe/:protocol/:universe?ip=` | UniverseDetail | 512-channel grid + stats for one source (IP disambiguates) |
| `/setup` (`/sources`, `/connection`) | Setup | Detected sources + bridge connection management |
| `/compare` | Compare | Diff two sources channel-by-channel |
| `/snapshots` | Snapshots | Shows list → show detail (save/import/export/members) |
| `/login` `/register` `/forgot-password` `/reset-password` | Auth | Platform boilerplate |

All app pages render inside `components/Layout.jsx` (sidebar + live status).

---

## Design system

- **Theme:** dark, single palette defined as HSL tokens in `index.css` (`:root`), mapped to Tailwind classes in `tailwind.config.js`.
- **Accent:** cyan `--primary: 187 100% 50%` (`#00E5FF`). sACN = cyan, Art-Net = amber `#F59E0B`.
- **Fonts:** Inter (UI) + JetBrains Mono (numeric/telemetry), imported at the top of `index.css`.
- **Background:** `#0D0F14`; cards `#161920`; borders `#2A2D35`.

---

## Dependencies

App runtime uses Base44's standard React + Vite + Tailwind + shadcn/ui stack. Notable libraries actually used:

- `xlsx` — snapshot CSV/Excel import & export
- `lucide-react` — icons
- `@tanstack/react-query` — query client provider
- `react-router-dom` — routing

The **bridge** (`bridge/`) is a separate Node.js program and depends only on Node built-ins plus optionally `ws` (the included script implements WebSocket manually, so `ws` is not strictly required to run `dmx-bridge.js`).

---

## Running the bridge (end users)

```bash
cd bridge
npm install        # optional — script has no hard deps
node dmx-bridge.js
```

Then in the web app, open **Connection** and enter `ws://<bridge-machine-IP>:8080`. The bridge must be on the same network as the lighting console. The script can also be downloaded directly from the in-app Connection page (served from `lib/bridgeContent.js`).

---

## Rebuild checklist (for an AI agent cloning this app)

1. Create entities `Show` and `Snapshot` exactly as specified above.
2. Recreate `lib/dmxStore.js` and `hooks/useDMXStore.js` first — they define all live behavior.
3. Add `lib/dmxUtils.js`, `lib/progressBus.js`, `lib/snapshotParser.js`, `lib/bridgeContent.js`.
4. Build pages and `components/dmx/*` against the store API (`getAllUniverses`, `getUniverse`, `connectWebSocket`, `setArtnetOffset`, `subscribe`).
5. Wire routes in `App.jsx` and wrap them in `components/Layout.jsx`.
6. Apply the design tokens in `index.css` + `tailwind.config.js`.
7. Copy the `bridge/` folder verbatim — it's standalone.
8. Keep auth pages/components as platform boilerplate (do not rewrite).