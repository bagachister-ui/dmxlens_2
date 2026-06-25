// DMX Signal Store — singleton that manages live DMX data from a WebSocket bridge.
// Connects to an external WebSocket bridge that forwards parsed sACN / Art-Net UDP packets.
//
// Sources are NOT configured manually. Every distinct sender that the bridge forwards
// — identified by protocol + universe + source IP — is auto-discovered and tracked.
// A source only exists (and shows signal) because real frames actually arrived for it.

const SIGNAL_TIMEOUT_MS = 3000;

class DMXStore {
  constructor() {
    this.universes = new Map();
    this.listeners = new Set();
    this.mode = 'offline'; // 'offline' until a bridge is connected, then 'live'
    this.ws = null;
    this.wsUrl = null;
    this.wsStatus = 'disconnected';
    this.eventLog = [];
    this.maxLogEntries = 80;
    this.artnetOffset = 1; // Art-Net universes are 0-based; offset to display as 1-based
    this.connectionHistory = this._loadConnectionHistory();
    this._timeoutTimer = null;
    this._startTimeoutChecker();
  }

  // A discovered source is uniquely a (protocol, universe, sender IP) combination.
  // Two consoles can output the same universe from different IPs — both are tracked.
  _key(protocol, universe, ip) {
    return `${protocol}:${universe}:${ip || ''}`;
  }

  _startTimeoutChecker() {
    if (this._timeoutTimer) return;
    this._timeoutTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [k, u] of Array.from(this.universes.entries())) {
        if (now - u.lastSeen > SIGNAL_TIMEOUT_MS) {
          // No frame for this sender in the timeout window — it's gone offline.
          // Remove it entirely so the detected-sources list only shows live senders.
          this.universes.delete(k);
          this.log(`Source lost — ${u.protocol} U${u.universe} (${u.sourceIP})`, 'warning');
          changed = true;
        }
      }
      if (changed) this._notify();
    }, 1000);
  }

  // Look up a specific discovered source. IP is required to disambiguate when
  // multiple senders share a universe; if omitted, returns the first match.
  getUniverse(protocol, universe, ip) {
    if (ip !== undefined) {
      return this.universes.get(this._key(protocol, universe, ip));
    }
    return this.getAllUniverses().find(
      (u) => u.protocol === protocol && u.universe === Number(universe)
    );
  }

  getAllUniverses() {
    return Array.from(this.universes.values());
  }

  getActiveUniverses() {
    return this.getAllUniverses().filter((u) => u.signalPresent);
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
        this.mode = 'offline';
        this.log(`WebSocket disconnected`, 'warning');
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
    this.mode = 'offline';
    this.log(`Disconnected`);
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
    const frameIP = frame.sourceIP || '';
    const k = this._key(frame.protocol, displayUniverse, frameIP);
    let u = this.universes.get(k);

    if (!u) {
      // First frame from this sender — auto-discover it as a new source.
      u = {
        protocol: frame.protocol,
        universe: displayUniverse,
        sourceName: frame.sourceName || `${frame.protocol} ${frameIP || 'unknown'}`,
        sourceIP: frameIP,
        channels: new Uint8Array(512),
        lastUpdate: 0,
        lastSeen: 0,
        frameCount: 0,
        packetRate: 0,
        rateWindow: [],
        sequence: 0,
        signalPresent: false,
      };
      this.universes.set(k, u);
      this.log(`New source detected — ${u.protocol} U${displayUniverse} from ${frameIP || 'unknown'}`, 'info');
    }

    if (frame.sourceName) u.sourceName = frame.sourceName;
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
    this._notify();
  }
}

export const dmxStore = new DMXStore();