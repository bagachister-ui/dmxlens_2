import { Link } from 'react-router-dom';
import { Radio, Wifi, WifiOff } from 'lucide-react';
import { dmxStore } from '@/lib/dmxStore';
import { useDMXStore } from '@/hooks/useDMXStore';
import { sortUniverses, universeKey } from '@/lib/dmxUtils';
import ConnectionHistoryList from '@/components/dmx/ConnectionHistoryList';

const PROTOCOLS = ['sACN', 'Art-Net'];

export default function DetectedSources() {
  const store = useDMXStore();
  const connected = store.mode === 'live';
  const sources = sortUniverses(store.getAllUniverses());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#00E5FF]" />
          <h2 className="text-sm font-semibold text-white">Detected Sources</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="text-[10px] font-mono text-[#22C55E] uppercase tracking-wider">Scanning</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="text-[10px] font-mono text-[#6B7280] uppercase tracking-wider">Offline</span>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-[#6B7280]">
        Sources appear automatically as the bridge receives sACN / Art-Net frames, summarized below
        by protocol. Click a universe to inspect its channels.
      </p>

      {/* Detected source summary */}
      <div className="space-y-2">
        {sources.length === 0 ? (
          <div className="text-center py-12 bg-[#161920] border border-[#2A2D35] border-dashed rounded-lg">
            <Radio className="w-10 h-10 text-[#4B5563] mx-auto mb-3" />
            <p className="text-sm text-gray-300 mb-1">
              {connected ? 'Listening for DMX signal…' : 'No bridge connected'}
            </p>
            <p className="text-xs text-[#6B7280] max-w-xs mx-auto">
              {connected
                ? 'No sACN or Art-Net frames received yet. Sources will show up here the moment a console starts sending.'
                : 'Connect the live bridge on the right, then any DMX sender on your network will be detected automatically.'}
            </p>
          </div>
        ) : (
          PROTOCOLS.map((proto) => {
            const protoSources = sources.filter((s) => s.protocol === proto);
            if (protoSources.length === 0) return null;
            return (
              <div
                key={proto}
                className="bg-[#161920] border border-[#2A2D35] rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      proto === 'sACN'
                        ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                    }`}
                  >
                    {proto}
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-mono">
                    {protoSources.length} universe{protoSources.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {protoSources.map((u) => (
                    <Link
                      key={universeKey(u)}
                      to={`/universe/${u.protocol}/${u.universe}?ip=${encodeURIComponent(u.sourceIP)}`}
                      title={`${u.sourceName} · ${u.sourceIP || 'unknown IP'} · ${u.packetRate.toFixed(1)} fps`}
                      className="flex items-center gap-1.5 bg-[#0D0F14] border border-[#2A2D35] rounded-md px-2 py-1 hover:border-[#00E5FF]/40 transition-colors"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.signalPresent ? 'bg-[#22C55E] animate-pulse' : 'bg-[#EF4444]'
                        }`}
                      />
                      <span className="text-xs font-mono text-gray-200">U{u.universe}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Connection history */}
      <ConnectionHistoryList
        history={store.connectionHistory}
        onConnect={(url) => store.connectWebSocket(url)}
        onRename={(id, name) => dmxStore.renameConnectionHistory(id, name)}
        onDelete={(id) => dmxStore.deleteConnectionHistory(id)}
      />
    </div>
  );
}