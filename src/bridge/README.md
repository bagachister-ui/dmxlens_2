# DMX Signal Bridge

A local Node.js script that receives live sACN (E1.31) and Art-Net DMX packets over your lighting network and relays them to the DMX Signal Reader web app via WebSocket.

Browsers cannot open raw UDP sockets, so this bridge is **required** for live signal reception. The web app runs in simulation mode until you connect to a running bridge.

## Quick Start

```bash
# 1. Install Node.js 18+ from https://nodejs.org

# 2. Install the WebSocket dependency
npm install

# 3. Run the bridge
npm start
# or: node dmx-bridge.js
```

You should see:

```
╔══════════════════════════════════════════════╗
║   DMX Signal Bridge — Listening              ║
╠══════════════════════════════════════════════╣
║  WebSocket  : ws://0.0.0.0:8080              ║
║  sACN UDP   : 5568 (multicast 239.255.x.x)   ║
║  Art-Net UDP: 6454                            ║
╚══════════════════════════════════════════════╝
```

## Connecting the Web App

1. Find this machine's IP address on your lighting network (e.g. `10.0.1.50`)
2. Open the DMX Signal Reader web app
3. Go to **Sources** → **WebSocket Bridge**
4. Enter `ws://10.0.1.50:8080` and click **Connect**
5. The app switches from SIMULATION to LIVE mode

## How It Works

```
Lighting Console ──UDP──► [This Bridge] ──WebSocket──► Web App
  (sACN:5568)              Parses E1.31 / Art-Net       Displays 512 channels
  (Art-Net:6454)           Forwards JSON frames          Real-time grid
```

### Ports

| Protocol | Port  | Direction |
|----------|-------|-----------|
| sACN     | 5568  | UDP in (multicast 239.255.x.x) |
| Art-Net  | 6454  | UDP in |
| WebSocket | 8080 | TCP out to web app |

### Frame Format

Each frame sent to the web app:

```json
{
  "type": "dmxFrame",
  "protocol": "sACN",
  "universe": 1,
  "sourceName": "GrandMA3",
  "sourceIP": "10.0.1.100",
  "channels": [0, 255, 128, ...512 values],
  "sequence": 42,
  "timestamp": 1719012345678
}
```

## Network Requirements

- The bridge machine must be on the same network/VLAN as your lighting consoles
- For sACN multicast, ensure multicast routing is enabled on your network
- For Art-Net, ensure UDP port 6454 is open on the bridge machine's firewall
- On macOS/Linux, you may need `sudo` for ports below 1024 (5568 and 6454 are above 1024, so usually no special permissions needed)

## Troubleshooting

**No signal appearing in the web app?**
- Verify the bridge is running and shows "Listening" messages
- Check the WebSocket URL matches the bridge machine's IP
- Ensure your console is outputting sACN or Art-Net to the correct universe
- For sACN: verify multicast is routable on your network
- For Art-Net: verify the console's Art-Net subnet matches your network

**"WebSocket connection error" in the web app?**
- The bridge may not be running — check the terminal
- Firewall may be blocking port 8080 — allow TCP 8080 on the bridge machine
- Wrong IP address — use the bridge machine's LAN IP, not localhost (unless running on the same machine)