import { useState, useEffect } from 'react';
import { X, FolderOpen, Loader2, FolderPlus, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { dmxStore } from '@/lib/dmxStore';

// Dialog launched from the Dashboard "Take Snapshot" button.
// Lists the user's existing shows to save the current live capture into.
// If the user has no shows, it prompts them to create one inline.
export default function SaveSnapshotDialog({ onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [shows, setShows] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedShowId, setSelectedShowId] = useState('');
  const [newShowName, setNewShowName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setEmail(me.email);
      const all = await base44.entities.Show.list('-updated_date');
      const myEmail = (me.email || '').toLowerCase();
      const visible = all.filter(
        (s) => (s.created_by || '').toLowerCase() === myEmail || (s.members || []).includes(myEmail)
      );
      setShows(visible);
      if (visible.length > 0) setSelectedShowId(visible[0].id);
      setName(`Snapshot ${new Date().toLocaleTimeString()}`);
      setLoading(false);
    })();
  }, []);

  const hasShows = shows.length > 0;

  const handleSave = async () => {
    setSaving(true);
    let showId = selectedShowId;

    // Create a new show first if the user has none (or chose to make one)
    if (!hasShows) {
      const created = await base44.entities.Show.create({
        name: newShowName.trim() || 'Untitled Show',
        description: '',
        members: [],
      });
      showId = created.id;
    }

    const universes = dmxStore.getAllUniverses().map((u) => ({
      protocol: u.protocol,
      universe: u.universe,
      channels: Array.from(u.channels),
    }));

    await base44.entities.Snapshot.create({
      show_id: showId,
      name: name.trim() || 'Snapshot',
      captured_at: new Date().toISOString(),
      universes,
    });

    setSaving(false);
    onSaved?.();
  };

  const canSave = hasShows ? !!selectedShowId : !!newShowName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-[#161920] border border-[#2A2D35] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2D35]">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#00E5FF]" />
            <h2 className="text-sm font-semibold text-white">Save Snapshot</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-white rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#00E5FF] animate-spin" />
            </div>
          ) : (
            <>
              {/* Snapshot name */}
              <div>
                <label className="block text-[10px] uppercase tracking-wide font-mono text-[#6B7280] mb-1.5">
                  Snapshot name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
                />
              </div>

              {/* Destination show */}
              {hasShows ? (
                <div>
                  <label className="block text-[10px] uppercase tracking-wide font-mono text-[#6B7280] mb-1.5">
                    Save into show
                  </label>
                  <select
                    value={selectedShowId}
                    onChange={(e) => setSelectedShowId(e.target.value)}
                    className="w-full bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
                  >
                    {shows.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs text-[#9CA3AF]">
                    <FolderPlus className="w-3.5 h-3.5 text-[#00E5FF]" />
                    You don't have any shows yet — name one to create it
                  </div>
                  <label className="block text-[10px] uppercase tracking-wide font-mono text-[#6B7280] mb-1.5">
                    New show name
                  </label>
                  <input
                    type="text"
                    value={newShowName}
                    onChange={(e) => setNewShowName(e.target.value)}
                    placeholder="e.g. Main Show"
                    className="w-full bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#2A2D35]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving || !canSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#00E5FF] text-[#0D0F14] rounded-md text-xs font-medium hover:bg-[#00E5FF]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
            Save Snapshot
          </button>
        </div>
      </div>
    </div>
  );
}