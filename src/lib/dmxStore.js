// DMX Signal Store — singleton that manages simulated or live DMX data
// In simulation mode, generates realistic sACN/Art-Net frames at ~44fps per universe
// In live mode, connects to an external WebSocket bridge that forwards parsed UDP packets

const SIM_FPS = 44;
const SIM_TICK_MS = 1000 / SIM_FPS;
const SIGNAL_TIMEOUT_MS = 3000;

class DMXStore {
  constructor() {
    this.sources = [];
    this.universes = new Map();
    this.listeners = new Set();
    this.simTimers = new Map();
    this.mode = 'simulation';
    this.ws = null;
    this.wsUrl = null;
    this.wsStatus = 'disconnected';
    this.eventLog = [];
    this.maxLogEntries = 80;
    this.artnetOffset = 1; // Art-Net universes are 0-based; offset to display as 1-based
    this.snapshots = [];
    this.connectionHistory = this._loadConnectionHistory();
    this._timeoutTimer = null;
    this._startTimeoutChecker();
  }

  _key(protocol, universe) {
    return `${protocol}:${universe}`;
  }

  _startTimeoutChecker() {
    if (this._timeoutTimer) return;
    this._timeoutTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const u of this.universes.values()) {
        if (u.signalPresent && now - u.lastSeen > SIGNAL_TIMEOUT_MS) {
          u.signalPresent = false;
          this.log(`Signal lost — ${u.protocol} U${u.universe} (${u.sourceName})`, 'warning');
          changed = true;
        }
      }
      if (changed) this._notify();
    }, 1000);
  }

  _generateIP() {
    return `10.0.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`;
  }

  _generateSimParams() {
    const params = [];
    for (let i = 0; i < 512; i++) {
      const r = Math.random();
      if (r < 0.45) {
        params.push({ type: 'static', value: 0 });
      } else if (r < 0.60) {
        params.push({ type: 'static', value: Math.floor(Math.random() * 256) });
      } else if (r < 0.82) {
        params.push({
          type: 'sine',
          base: 40 + Math.random() * 180,
          amplitude: 15 + Math.random() * 80,
          freq: 0.2 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2,
        });
      } else {
        params.push({ type: 'walk', value: Math.random() * 255, velocity: 0 });
      }
    }
    return params;
  }

  _initUniverse(source) {
    const k = this._key(source.protocol, source.universe);
    if (!this.universes.has(k)) {
      this.universes.set(k, {
        protocol: source.protocol,
        universe: source.universe,
        sourceName: source.name,
        sourceIP: source.sourceIP || this._generateIP(),
        channels: new Uint8Array(512),
        lastUpdate: 0,
        lastSeen: 0,
        frameCount: 0,
        packetRate: 0,
        rateWindow: [],
        sequence: 0,
        signalPresent: false,
        simParams: this._generateSimParams(),
      });
    } else {
      const u = this.universes.get(k);
      u.sourceName = source.name;
      if (source.sourceIP) u.sourceIP = source.sourceIP;
    }
  }

  _simulateFrame(u) {
    const params = u.simParams;
    const channels = u.channels;
    const t = Date.now() / 1000;

    for (let i = 0; i < 512; i++) {
      const p = params[i];
      if (p.type === 'static') {
        channels[i] = p.value;
      } else if (p.type === 'sine') {
        channels[i] = Math.max(0, Math.min(255, Math.round(
          p.base + Math.sin(t * p.freq + p.phase) * p.amplitude
        )));
      } else if (p.type === 'walk') {
        p.velocity += (Math.random() - 0.5) * 3;
        p.velocity *= 0.94;
        p.value += p.velocity;
        if (p.value < 0) { p.value = 0; p.velocity = Math.abs(p.velocity) * 0.3; }
        if (p.value > 255) { p.value = 255; p.velocity = -Math.abs(p.velocity) * 0.3; }
        channels[i] = Math.round(p.value);
      }
    }

    u.sequence = (u.sequence + 1) % 256;
    u.frameCount++;
    u.lastUpdate = Date.now();
    u.lastSeen = Date.now();
    u.signalPresent = true;

    const now = Date.now();
    u.rateWindow.push(now);
    while (u.rateWindow.length > 0 && u.rateWindow[0] < now - 2000) {
      u.rateWindow.shift();
    }
    u.packetRate = u.rateWindow.length / 2;
  }

  _startSim(source) {
    const k = this._key(source.protocol, source.universe);
    this._initUniverse(source);
    if (this.simTimers.has(k)) return;

    const timer = setInterval(() => {
      const u = this.universes.get(k);
      if (u) this._simulateFrame(u);
    }, SIM_TICK_MS);
    this.simTimers.set(k, timer);
    this.log(`Simulation started — ${source.protocol} U${source.universe} (${source.name})`);
  }

  _stopSim(protocol, universe) {
    const k = this._key(protocol, universe);
    const timer = this.simTimers.get(k);
    if (timer) {
      clearInterval(timer);
      this.simTimers.delete(k);
    }
    const u = this.universes.get(k);
    if (u) u.signalPresent = false;
  }

  setSources(sources) {
    const activeKeys = new Set(
      sources.map((s) => this._key(s.protocol, s.universe))
    );

    for (const [k] of this.simTimers) {
      if (!activeKeys.has(k)) {
        const [proto, uni] = k.split(':');
        this._stopSim(proto, parseInt(uni));
      }
    }

    for (const s of sources) {
      if (s.active !== false) {
        this._startSim(s);
      } else {
        this._stopSim(s.protocol, s.universe);
      }
    }

    this.sources = sources;
    this._notify();
  }

  getUniverse(protocol, universe) {
    return this.universes.get(this._key(protocol, universe));
  }

  getAllUniverses() {
    return Array.from(this.universes.values());
  }

  getActiveUniverses() {
    return this.getAllUniverses().filter((u) => u.signalPresent);
  }

  takeSnapshot(name) {
    const universes = this.getAllUniverses().map((u) => ({
      protocol: u.protocol,
      universe: u.universe,
      channels: Array.from(u.channels),
    }));
    const snapshot = {
      id: `snap_${Date.now()}`,
      name: name || `Snapshot ${this.snapshots.length + 1}`,
      timestamp: new Date().toISOString(),
      universes,
    };
    this.snapshots.push(snapshot);
    this.log(`Snapshot captured: "${snapshot.name}" (${universes.length} universe${universes.length !== 1 ? 's' : ''})`);
    this._notify();
    return snapshot;
  }

  renameSnapshot(id, newName) {
    const snap = this.snapshots.find((s) => s.id === id);
    if (snap) {
      snap.name = newName;
      this._notify();
    }
  }

  deleteSnapshot(id) {
    this.snapshots = this.snapshots.filter((s) => s.id !== id);
    this._notify();
  }

  clearSnapshots() {
    this.snapshots = [];
    this._notify();
  }

  _loadConnectionHistory() {
    try {
      return JSON.parse(localStorage.getItem('dmx_connection_history') || '[]');
    } catch (e) {
      return [];
    }
  }

  _saveConnectionHistory() {
    try {
      localStorage.setItem('dmx_connection_history', JSON.stringify(this.connectionHistory));
    } catch (e) {
      // ignore storage errors
    }
  }

  addConnectionHistory(url) {
    this.connectionHistory = this.connectionHistory.filter((h) => h.url !== url);
    this.connectionHistory.unshift({
      id: `conn_${Date.now()}`,
      url,
      name: '',
      lastUsed: new Date().toISOString(),
    });
    if (this.connectionHistory.length > 20) {
      this.connectionHistory = this.connectionHistory.slice(0, 20);
    }
    this._saveConnectionHistory();
    this._notify();
  }

  renameConnectionHistory(id, name) {
    const entry = this.connectionHistory.find((h) => h.id === id);
    if (entry) {
      entry.name = name;
      this._saveConnectionHistory();
      this._notify();
    }
  }

  deleteConnectionHistory(id) {
    this.connectionHistory = this.connectionHistory.filter((h) => h.id !== id);
    this._saveConnectionHistory();
    this._notify();
  }

  log(message, level = 'info') {
    this.eventLog.unshift({
      message,
      level,
      timestamp: new Date().toISOString(),
    });
    if (this.eventLog.length > this.maxLogEntries) {
      this.eventLog.pop();
    }
    this._notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    for (const l of this.listeners) {
      try {
        l();
      } catch (e) {
        // ignore listener errors
      }
    }
  }

  connectWebSocket(url) {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
    }
    this.wsUrl = url;
    this._loggedFirstFrame = false;
    this.addConnectionHistory(url);
    this.wsStatus = 'connecting';
    this.log(`Connecting to WebSocket bridge: ${url}`);
    this._notify();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.wsStatus = 'connected';
        this.mode = 'live';
        this.log(`WebSocket connected — live mode active`);
        this._notify();
      };

      this.ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data);
          if (frame.type === 'dmxFrame' && !this._loggedFirstFrame) {
            this._loggedFirstFrame = true;
            this.log(`Live frame received — ${frame.protocol} U${frame.universe}`, 'info');
          }
          this._processLiveFrame(frame);
        } catch (e) {
          this.log(`Frame parse error: ${e.message}`, 'error');
        }
      };

      this.ws.onerror = () => {
        this.wsStatus = 'error';
        this.log(`WebSocket connection error`, 'error');
        this._notify();
      };

      this.ws.onclose = () => {
        this.wsStatus = 'disconnected';
        this.mode = 'simulation';
        this.log(`WebSocket disconnected — simulation mode restored`, 'warning');
        this._notify();
      };
    } catch (e) {
      this.wsStatus = 'error';
      this.log(`WebSocket failed: ${e.message}`, 'error');
      this._notify();
    }
  }

  disconnectWebSocket() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.wsStatus = 'disconnected';
    this.mode = 'simulation';
    this.log(`Disconnected — simulation mode active`);
    this._notify();
  }

  setArtnetOffset(value) {
    this.artnetOffset = parseInt(value) || 0;
    this.log(`Art-Net universe offset set to ${this.artnetOffset > 0 ? '+' : ''}${this.artnetOffset}`);
    this._notify();
  }

  _processLiveFrame(frame) {
    const displayUniverse = frame.protocol === 'Art-Net'
      ? frame.universe + this.artnetOffset
      : frame.universe;
    const k = this._key(frame.protocol, displayUniverse);
    let u = this.universes.get(k);
    if (!u) {
      u = {
        protocol: frame.protocol,
        universe: displayUniverse,
        sourceName: frame.sourceName || `Live ${frame.protocol} U${displayUniverse}`,
        sourceIP: frame.sourceIP || 'unknown',
        channels: new Uint8Array(512),
        lastUpdate: 0,
        lastSeen: 0,
        frameCount: 0,
        packetRate: 0,
        rateWindow: [],
        sequence: 0,
        signalPresent: false,
        simParams: null,
      };
      this.universes.set(k, u);
    }

    if (frame.channels && frame.channels.length === 512) {
      u.channels = new Uint8Array(frame.channels);
    }

    u.sequence = frame.sequence ?? (u.sequence + 1) % 256;
    u.frameCount++;
    u.lastUpdate = Date.now();
    u.lastSeen = Date.now();
    u.signalPresent = true;

    const now = Date.now();
    u.rateWindow.push(now);
    while (u.rateWindow.length > 0 && u.rateWindow[0] < now - 2000) {
      u.rateWindow.shift();
    }
    u.packetRate = u.rateWindow.length / 2;
  }
}

export const dmxStore = new DMXStore();