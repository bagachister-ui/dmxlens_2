import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Radio, Wifi, WifiOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { dmxStore } from '@/lib/dmxStore';
import SourceForm from '@/components/dmx/SourceForm';
import ActivityPulse from '@/components/dmx/ActivityPulse';

export default function Sources() {
  const [sources, setSources] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [wsUrl, setWsUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSources = async () => {
    try {
      const list = await base44.entities.DMXSource.list();
      setSources(list);
      dmxStore.setSources(list);
    } catch (e) {
      console.error('Failed to load sources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editing) {
        const updated = await base44.entities.DMXSource.update(editing.id, data);
        setSources((prev) => prev.map((s) => (s.id === editing.id ? updated : s)));
      } else {
        const created = await base44.entities.DMXSource.create(data);
        setSources((prev) => [...prev, created]);
      }
      dmxStore.setSources(editing ? sources.map((s) => (s.id === editing.id ? { ...s, ...data } : s)) : [...sources, { ...data }]);
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      // Fallback: update local state only
      if (editing) {
        setSources((prev) => prev.map((s) => (s.id === editing.id ? { ...s, ...data } : s)));
      } else {
        const local = { ...data, id: `local-${Date.now()}` };
        setSources((prev) => [...prev, local]);
      }
      dmxStore.setSources(
        editing
          ? sources.map((s) => (s.id === editing.id ? { ...s, ...data } : s))
          : [...sources, { ...data }]
      );
      setShowForm(false);
      setEditing(null);
    }
  };

  const handleDelete = async (source) => {
    try {
      if (!source.id?.startsWith('local-')) {
        await base44.entities.DMXSource.delete(source.id);
      }
    } catch (e) {
      // ignore — still remove from local state
    }
    const updated = sources.filter((s) => s.id !== source.id);
    setSources(updated);
    dmxStore.setSources(updated);
  };

  const handleConnect = () => {
    if (wsUrl.trim()) {
      dmxStore.connectWebSocket(wsUrl.trim());
    }
  };

  const handleDisconnect = () => {
    dmxStore.disconnectWebSocket();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">DMX Sources</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Configure sACN or Art-Net sources to monitor
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#00E5FF] text-[#0D0F14] rounded-md text-xs font-medium hover:bg-[#00E5FF]/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </button>
        )}
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Form */}
          {showForm && (
            <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-5">
              <h2 className="text-sm font-semibold text-white mb-4">
                {editing ? 'Edit Source' : 'New DMX Source'}
              </h2>
              <SourceForm
                initial={editing}
                onSave={handleSave}
                onCancel={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              />
            </div>
          )}

          {/* Source list */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-[#6B7280] text-sm">Loading sources...</div>
            ) : sources.length === 0 && !showForm ? (
              <div className="text-center py-12">
                <Radio className="w-10 h-10 text-[#4B5563] mx-auto mb-3" />
                <p className="text-sm text-gray-300 mb-1">No sources configured</p>
                <p className="text-xs text-[#6B7280]">Add a source to start monitoring DMX signal</p>
              </div>
            ) : (
              sources.map((source) => {
                const uni = dmxStore.getUniverse(source.protocol, source.universe);
                return (
                  <div
                    key={source.id}
                    className="bg-[#161920] border border-[#2A2D35] rounded-lg p-4 flex items-center gap-4"
                  >
                    <ActivityPulse active={uni?.signalPresent || false} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            source.protocol === 'sACN'
                              ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                              : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                          }`}
                        >
                          {source.protocol}
                        </span>
                        <span className="text-sm text-white font-medium truncate">
                          {source.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#6B7280] font-mono">
                        Universe {source.universe}
                        {source.sourceIP ? ` · ${source.sourceIP}` : ''}
                        {uni ? ` · ${uni.packetRate.toFixed(1)} fps` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditing(source);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded-md text-[#6B7280] hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(source)}
                        className="p-1.5 rounded-md text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* WebSocket bridge connection */}
          <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="w-4 h-4 text-[#00E5FF]" />
              <h2 className="text-sm font-semibold text-white">WebSocket Bridge</h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider ml-auto ${
                  dmxStore.wsStatus === 'connected'
                    ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20'
                    : dmxStore.wsStatus === 'connecting'
                    ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                    : dmxStore.wsStatus === 'error'
                    ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20'
                    : 'bg-[#2A2D35] text-[#6B7280]'
                }`}
              >
                {dmxStore.wsStatus}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mb-4">
              Connect to an external UDP-to-WebSocket bridge running on your lighting network.
              The bridge listens on UDP port 5568 (sACN) and 6454 (Art-Net), parses packets,
              and forwards structured DMX frames to this app in real time.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://10.0.1.50:8080"
                className="flex-1 bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white font-mono placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
              />
              {dmxStore.wsStatus === 'connected' ? (
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
                  disabled={!wsUrl.trim() || dmxStore.wsStatus === 'connecting'}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00E5FF] text-[#0D0F14] rounded-md text-sm font-medium hover:bg-[#00E5FF]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Wifi className="w-4 h-4" />
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}