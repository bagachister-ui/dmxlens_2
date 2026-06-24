// Bridge script content embedded as string constants for download/display from the webapp.
// Escaped for use inside JavaScript template literals: backticks -> \`, ${ -> \${, literal \n -> \\n, etc.

export const bridgePackageJson = `{
  "name": "dmx-signal-bridge",
  "version": "1.0.0",
  "description": "Local UDP-to-WebSocket bridge for sACN (E1.31) and Art-Net DMX signal reception",
  "main": "dmx-bridge.js",
  "scripts": {
    "start": "node dmx-bridge.js"
  },
  "dependencies": {
    "ws": "^8.16.0"
  }
}
`;

export const bridgeScript = `#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * DMX Signal Bridge — Local UDP-to-WebSocket relay
 *
 * This script runs on a machine connected to your lighting network (Ethernet or WiFi).
 * It listens for sACN (E1.31) and Art-Net UDP packets, parses the DMX data, and
 * forwards structured JSON frames to the web app via WebSocket.
 *
 * Browsers cannot open raw UDP sockets, so this bridge is required for live signal
 * reception. The web app connects to this bridge's WebSocket endpoint.
 *
 * SETUP
 * 1. Install Node.js 18+ (https://nodejs.org)
 * 2. Run:  npm install
 * 3. Run:  npm start
 * 4. In the web app, go to Connection -> enter: ws://<this-machine-IP>:8080
 *
 * The bridge listens on:
 *   - UDP 5568  (sACN / E1.31 — joins multicast 239.255.0.0-239.255.255.255)
 *   - UDP 6454  (Art-Net)
 *   - WS  8080  (WebSocket server for the web app)
 */

const dgram = require('dgram');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

const WS_PORT = 8080;
const SACN_PORT = 5568;
const ARTNET_PORT = 6454;

const wsClients = new Set();

// Collect all local IPv4 interface addresses (for multicast joins on every NIC)
function localIPv4Addresses() {
  const addrs = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info.family === 'IPv4' && !info.internal) addrs.push(info.address);
    }
  }
  return addrs;
}

// Throttled per-protocol "packet received" logging so the console isn't flooded
const lastLog = { sACN: 0, 'Art-Net': 0 };
function logPacket(protocol, universe, rinfo) {
  const now = Date.now();
  if (now - lastLog[protocol] > 2000) {
    lastLog[protocol] = now;
    console.log(\`[\${protocol}] RX universe \${universe} from \${rinfo.address} (\${wsClients.size} ws client\${wsClients.size !== 1 ? 's' : ''})\`);
  }
}

// --- WebSocket Server (minimal implementation over http.Server) ---
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'DMX Signal Bridge',
    clients: wsClients.size,
    sacnPort: SACN_PORT,
    artnetPort: ARTNET_PORT,
  }));
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\\r\\n' +
    'Upgrade: websocket\\r\\n' +
    'Connection: Upgrade\\r\\n' +
    \`Sec-WebSocket-Accept: \${accept}\\r\\n\\r\\n\`
  );

  wsClients.add(socket);
  console.log(\`[WS] Client connected (\${wsClients.size} total)\`);

  socket.on('close', () => {
    wsClients.delete(socket);
    console.log(\`[WS] Client disconnected (\${wsClients.size} total)\`);
  });
  socket.on('error', () => wsClients.delete(socket));
});

server.listen(WS_PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('  DMX Signal Bridge — Listening');
  console.log('========================================');
  console.log('  WebSocket  : ws://0.0.0.0:' + WS_PORT);
  console.log('  sACN UDP   : ' + SACN_PORT + ' (multicast 239.255.x.x)');
  console.log('  Art-Net UDP: ' + ARTNET_PORT);
  console.log('========================================');
  console.log('\\nConnect the web app to: ws://<this-machine-IP>:' + WS_PORT + '\\n');
});

// --- WebSocket broadcast ---
function broadcast(frame) {
  const json = JSON.stringify(frame);
  let frameBytes;
  const len = Buffer.byteLength(json);
  if (len < 126) {
    frameBytes = Buffer.alloc(2 + len);
    frameBytes[0] = 0x81;
    frameBytes[1] = len;
    frameBytes.write(json, 2);
  } else if (len < 65536) {
    frameBytes = Buffer.alloc(4 + len);
    frameBytes[0] = 0x81;
    frameBytes[1] = 126;
    frameBytes.writeUInt16BE(len, 2);
    frameBytes.write(json, 4);
  } else {
    frameBytes = Buffer.alloc(10 + len);
    frameBytes[0] = 0x81;
    frameBytes[1] = 127;
    frameBytes.writeBigUInt64BE(BigInt(len), 2);
    frameBytes.write(json, 10);
  }

  for (const client of wsClients) {
    try {
      if (client.writable) client.write(frameBytes);
    } catch (e) {
      wsClients.delete(client);
    }
  }
}

// --- sACN (E1.31) Parser ---
function parseSacn(buf, rinfo) {
  if (buf.length < 126) return null;
  // Preamble size is big-endian 0x0010
  const preamble = buf.readUInt16BE(0);
  if (preamble !== 0x0010) return null;
  // ACN Packet Identifier: "ASC-E1.17" + 3 null bytes (12 bytes at offset 4)
  if (buf.toString('ascii', 4, 13) !== 'ASC-E1.17') return null;

  // E1.31 framing layer
  const sourceName = buf.toString('ascii', 44, 108).replace(/\\x00+$/, '');
  const seq = buf.readUInt8(111);
  const universe = buf.readUInt16BE(113);

  // E1.31 DMP layer (offsets per ANSI E1.31):
  //   115-116 DMP flags & length      121-122 address increment
  //   117     DMP vector              123-124 property value count
  //   118     address & data type     125     START code
  //   119-120 first property address  126+    DMX channel data
  const dmpVector = buf.readUInt8(117);
  if (dmpVector !== 0x02) return null; // VECTOR_DMP_SET_PROPERTY

  const propValCount = buf.readUInt16BE(123); // includes the START code byte
  const startCode = buf.readUInt8(125);
  if (startCode !== 0x00) return null; // 0x00 = DMX levels; ignore 0xDD priority etc.

  const dmxStart = 126; // first DMX slot, immediately after START code
  const slotCount = propValCount - 1; // subtract the START code byte
  const channels = new Array(512).fill(0);

  for (let i = 0; i < Math.min(slotCount, 512); i++) {
    channels[i] = buf.readUInt8(dmxStart + i);
  }

  return {
    type: 'dmxFrame',
    protocol: 'sACN',
    universe,
    sourceName: sourceName || ('sACN ' + rinfo.address),
    sourceIP: rinfo.address,
    channels,
    sequence: seq,
    timestamp: Date.now(),
  };
}

// --- Art-Net Parser ---
function parseArtNet(buf, rinfo) {
  if (buf.length < 18) return null;
  // Art-Net ID: "Art-Net" + null terminator (8 bytes)
  if (buf.toString('ascii', 0, 7) !== 'Art-Net') return null;

  const opcode = buf.readUInt16LE(8);
  if (opcode !== 0x5000) return null;

  const seq = buf.readUInt8(12);
  const universe = buf.readUInt16LE(14);
  const length = buf.readUInt16BE(16);

  const channels = new Array(512).fill(0);
  const dataStart = 18;
  for (let i = 0; i < Math.min(length, 512); i++) {
    channels[i] = buf.readUInt8(dataStart + i);
  }

  return {
    type: 'dmxFrame',
    protocol: 'Art-Net',
    universe,
    sourceName: 'Art-Net ' + rinfo.address,
    sourceIP: rinfo.address,
    channels,
    sequence: seq,
    timestamp: Date.now(),
  };
}

// --- sACN UDP Socket (multicast) ---
const sacnSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

sacnSocket.on('message', (buf, rinfo) => {
  const frame = parseSacn(buf, rinfo);
  if (frame) {
    logPacket('sACN', frame.universe, rinfo);
    broadcast(frame);
  }
});

sacnSocket.on('listening', () => {
  const iface = sacnSocket.address();
  sacnSocket.setBroadcast(true);
  console.log('[sACN] Listening on ' + iface.address + ':' + iface.port);

  // sACN multicast group for a universe is 239.255.<high byte>.<low byte>.
  // Join the groups for universes 1-512 on every local interface so the OS
  // forwards the multicast traffic regardless of which NIC faces the console.
  const interfaces = localIPv4Addresses();
  const joinGroup = (group) => {
    if (interfaces.length === 0) {
      try { sacnSocket.addMembership(group); } catch (e) {}
    } else {
      for (const ifAddr of interfaces) {
        try { sacnSocket.addMembership(group, ifAddr); } catch (e) {}
      }
    }
  };
  for (let uni = 1; uni <= 512; uni++) {
    joinGroup('239.255.' + ((uni >> 8) & 0xff) + '.' + (uni & 0xff));
  }
  console.log('[sACN] Joined multicast for universes 1-512 on ' +
    (interfaces.length ? interfaces.join(', ') : 'default interface'));
});

sacnSocket.on('error', (err) => {
  console.error('[sACN] Socket error: ' + err.message);
});

sacnSocket.bind(SACN_PORT, '0.0.0.0');

// --- Art-Net UDP Socket ---
const artnetSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

artnetSocket.on('message', (buf, rinfo) => {
  const frame = parseArtNet(buf, rinfo);
  if (frame) {
    logPacket('Art-Net', frame.universe, rinfo);
    broadcast(frame);
  }
});

artnetSocket.on('listening', () => {
  const iface = artnetSocket.address();
  console.log('[Art-Net] Listening on ' + iface.address + ':' + iface.port);
});

artnetSocket.on('error', (err) => {
  console.error('[Art-Net] Socket error: ' + err.message);
});

artnetSocket.bind(ARTNET_PORT, '0.0.0.0');

// --- Graceful shutdown ---
process.on('SIGINT', () => {
  console.log('\\nShutting down bridge...');
  sacnSocket.close();
  artnetSocket.close();
  server.close();
  process.exit(0);
});
`;