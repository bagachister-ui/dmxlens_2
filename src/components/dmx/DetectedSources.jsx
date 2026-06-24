import { Link } from 'react-router-dom';
import { Radio, Wifi, WifiOff } from 'lucide-react';
import { dmxStore } from '@/lib/dmxStore';
import { useDMXStore } from '@/hooks/useDMXStore';
import ActivityPulse from '@/components/dmx/ActivityPulse';
import ConnectionHistoryList from '@/components/dmx/ConnectionHistoryList';

export default function DetectedSources() {
  const store = useDMXStore();
  const connected = store.mode === 'live';
  const sources = store
    .getAllUniverses()
    .slice()
    .sort((a, b) =>
      a.protocol === b.protocol
        ? a.universe - b.universe || a.sourceIP.localeCompare(b.sourceIP)
        : a.protocol.localeCompare(b.protocol)
    );

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
        Sources appear automatically as the bridge receives sACN / Art-Net frames. Each row is a
        distinct sender (protocol + universe + IP). A row disappears when its signal stops.
      </p>

      {/* Detected source list */}
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
          sources.map((u) => (
            <Link
              key={`${u.protocol}:${u.universe}:${u.sourceIP}`}
              to={`/universe/${u.protocol}/${u.universe}?ip=${encodeURIComponent(u.sourceIP)}`}
              className="bg-[#161920] border border-[#2A2D35] rounded-lg p-4 flex items-center gap-4 hover:border-[#00E5FF]/40 transition-colors"
            >
              <ActivityPulse active={u.signalPresent} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      u.protocol === 'sACN'
                        ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                    }`}
                  >
                    {u.protocol}
                  </span>
                  <span className="text-sm text-white font-medium truncate">{u.sourceName}</span>
                </div>
                <div className="text-[10px] text-[#6B7280] font-mono">
                  Universe {u.universe} · {u.sourceIP || 'unknown IP'}
                </div>
                <div className="text-[10px] font-mono mt-1">
                  <span className="text-[#22C55E]">
                    ● {u.packetRate.toFixed(1)} fps · {u.frameCount} frames
                  </span>
                </div>
              </div>
            </Link>
          ))
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