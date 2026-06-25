import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plug, Radio, Camera } from 'lucide-react';
import { useDMXStore } from '@/hooks/useDMXStore';
import { sortUniverses, universeKey } from '@/lib/dmxUtils';
import UniverseCard from '@/components/dmx/UniverseCard';
import EventLog from '@/components/dmx/EventLog';
import SaveSnapshotDialog from '@/components/dmx/SaveSnapshotDialog';

export default function Dashboard() {
  const store = useDMXStore();
  const navigate = useNavigate();
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const universes = sortUniverses(store.getAllUniverses());
  const activeCount = universes.filter((u) => u.signalPresent).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Universe Overview</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {universes.length} source{universes.length !== 1 ? 's' : ''} detected ·{' '}
            <span className={activeCount > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
              {activeCount} active
            </span>
            {' · '}
            <span className={store.mode === 'live' ? 'text-[#22C55E]' : 'text-[#6B7280]'}>
              {store.mode === 'live' ? 'LIVE MODE' : 'BRIDGE OFFLINE'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSnapshotDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#161920] border border-[#2A2D35] rounded-md text-xs text-gray-300 hover:border-[#00E5FF]/40 hover:text-white transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            Take Snapshot
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex gap-4 p-6 min-h-0">
        {/* Universe grid */}
        <div className="flex-1 min-w-0 overflow-auto">
          {universes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#161920] border border-[#2A2D35] flex items-center justify-center mb-4">
                <Radio className="w-7 h-7 text-[#4B5563]" />
              </div>
              <h2 className="text-sm font-medium text-gray-300 mb-1">No DMX signal detected</h2>
              <p className="text-xs text-[#6B7280] mb-4 max-w-sm">
                Connect your local Node.js bridge — any sACN or Art-Net source on your
                network will be detected and appear here automatically.
              </p>
              <Link
                to="/setup"
                className="flex items-center gap-2 px-4 py-2 bg-[#00E5FF] text-[#0D0F14] rounded-md text-sm font-medium hover:bg-[#00E5FF]/90 transition-colors"
              >
                <Plug className="w-4 h-4" />
                Connect Bridge
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {universes.map((u) => (
                <UniverseCard key={universeKey(u)} universe={u} />
              ))}
            </div>
          )}
        </div>

        {/* Event log sidebar */}
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <EventLog entries={store.eventLog} />
        </div>
      </div>

      {showSnapshotDialog && (
        <SaveSnapshotDialog
          onClose={() => setShowSnapshotDialog(false)}
          onSaved={() => {
            setShowSnapshotDialog(false);
            navigate('/snapshots');
          }}
        />
      )}
    </div>
  );
}