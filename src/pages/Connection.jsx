import { useState } from 'react';
import { Wifi, WifiOff, Copy, Download, Check, Plug, FileCode, Package, SlidersHorizontal } from 'lucide-react';
import { useDMXStore } from '@/hooks/useDMXStore';
import { bridgeScript, bridgePackageJson } from '@/lib/bridgeContent';

const steps = [
  { num: 1, title: 'Install Node.js 18+', desc: 'Download from nodejs.org and install on a machine connected to your lighting network (Ethernet or WiFi).' },
  { num: 2, title: 'Download the bridge files', desc: 'Use the download buttons below to get dmx-bridge.js and package.json. Place them in a folder together.' },
  { num: 3, title: 'Install dependencies', desc: 'Open a terminal in that folder and run: npm install' },
  { num: 4, title: 'Start the bridge', desc: 'Run: npm start  —  you should see the bridge listening on ports 5568, 6454, and 8080.' },
  { num: 5, title: 'Connect the web app', desc: 'Find the bridge machine\'s IP address, enter ws://<IP>:8080 below, and click Connect.' },
];

export default function Connection() {
  const store = useDMXStore();
  const [wsUrl, setWsUrl] = useState(store.wsUrl || '');
  const [artnetOffset, setArtnetOffset] = useState(store.artnetOffset);
  const [copied, setCopied] = useState(null);

  const handleOffsetChange = (value) => {
    const v = parseInt(value) || 0;
    setArtnetOffset(v);
    store.setArtnetOffset(v);
  };

  const handleConnect = () => {
    if (wsUrl.trim()) store.connectWebSocket(wsUrl.trim());
  };

  const handleDisconnect = () => {
    store.disconnectWebSocket();
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor =
    store.wsStatus === 'connected' ? '#22C55E' :
    store.wsStatus === 'connecting' ? '#F59E0B' :
    store.wsStatus === 'error' ? '#EF4444' : '#6B7280';

  return (
    <div className="h-full overflow-auto">
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between sticky top-0 bg-[#0D0F14] z-10">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Live Connection</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Connect to a local bridge for real-time sACN & Art-Net signal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-xs font-mono uppercase tracking-wider" style={{ color: statusColor }}>
            {store.wsStatus}
          </span>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Connection controls */}
        <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Plug className="w-4 h-4 text-[#00E5FF]" />
            <h2 className="text-sm font-semibold text-white">WebSocket Bridge URL</h2>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">
            Enter the WebSocket URL of your running bridge. The app switches from simulation to live mode automatically.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              placeholder="ws://10.0.1.50:8080"
              className="flex-1 bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white font-mono placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
            />
            {store.wsStatus === 'connected' ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 rounded-md text-sm hover:bg-[#EF4444]/20 transition-colors"
              >
                <WifiOff className="w-4 h-4" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={!wsUrl.trim() || store.wsStatus === 'connecting'}
                className="flex items-center gap-2 px-4 py-2 bg-[#00E5FF] text-[#0D0F14] rounded-md text-sm font-medium hover:bg-[#00E5FF]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Wifi className="w-4 h-4" />
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Art-Net universe offset */}
        <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-[#F59E0B]" />
            <h2 className="text-sm font-semibold text-white">Art-Net Universe Offset</h2>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">
            Art-Net universes start at 0 by default, while sACN starts at 1. This offset is added to
            incoming Art-Net universe numbers so they align with your console's labeling. Only affects
            live Art-Net frames — simulated sources use the universe number you configured.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#9CA3AF] font-mono">Offset</label>
            <input
              type="number"
              value={artnetOffset}
              onChange={(e) => handleOffsetChange(e.target.value)}
              className="w-20 bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-1.5 text-sm text-white font-mono text-center focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
            />
            <span className="text-xs text-[#6B7280] font-mono">
              Art-Net U0 → U{0 + (artnetOffset || 0)}, U1 → U{1 + (artnetOffset || 0)}, …
            </span>
          </div>
        </div>

        {/* Setup instructions */}
        <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Setup Instructions</h2>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[11px] font-mono text-[#00E5FF]">
                  {step.num}
                </div>
                <div>
                  <div className="text-sm text-white font-medium">{step.title}</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bridge script */}
        <div className="bg-[#161920] border border-[#2A2D35] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2A2D35] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#00E5FF]" />
              <span className="text-sm font-semibold text-white font-mono">dmx-bridge.js</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(bridgeScript, 'script')}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-[#9CA3AF] hover:text-white bg-[#0D0F14] border border-[#2A2D35] rounded transition-colors"
              >
                {copied === 'script' ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                {copied === 'script' ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => downloadFile(bridgeScript, 'dmx-bridge.js')}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-[#9CA3AF] hover:text-white bg-[#0D0F14] border border-[#2A2D35] rounded transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            </div>
          </div>
          <pre className="p-4 text-[11px] font-mono text-[#9CA3AF] overflow-auto max-h-80 leading-relaxed">
            {bridgeScript}
          </pre>
        </div>

        {/* package.json */}
        <div className="bg-[#161920] border border-[#2A2D35] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2A2D35] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#00E5FF]" />
              <span className="text-sm font-semibold text-white font-mono">package.json</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(bridgePackageJson, 'pkg')}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-[#9CA3AF] hover:text-white bg-[#0D0F14] border border-[#2A2D35] rounded transition-colors"
              >
                {copied === 'pkg' ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                {copied === 'pkg' ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => downloadFile(bridgePackageJson, 'package.json')}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-[#9CA3AF] hover:text-white bg-[#0D0F14] border border-[#2A2D35] rounded transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            </div>
          </div>
          <pre className="p-4 text-[11px] font-mono text-[#9CA3AF] overflow-auto max-h-48 leading-relaxed">
            {bridgePackageJson}
          </pre>
        </div>
      </div>
    </div>
  );
}