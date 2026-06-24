import { useDMXStore } from '@/hooks/useDMXStore';
import DetectedSources from '@/components/dmx/DetectedSources';
import ConnectionPanel from '@/components/dmx/ConnectionPanel';

export default function Setup() {
  const store = useDMXStore();

  const statusColor =
    store.wsStatus === 'connected' ? '#22C55E' :
    store.wsStatus === 'connecting' ? '#F59E0B' :
    store.wsStatus === 'error' ? '#EF4444' : '#6B7280';

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Connection</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Connect a live bridge — sACN and Art-Net sources are detected automatically
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-xs font-mono uppercase tracking-wider" style={{ color: statusColor }}>
            {store.wsStatus}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto items-start">
          {/* Left column — auto-detected sources */}
          <div>
            <DetectedSources />
          </div>
          {/* Right column — live connection */}
          <div>
            <ConnectionPanel />
          </div>
        </div>
      </div>
    </div>
  );
}