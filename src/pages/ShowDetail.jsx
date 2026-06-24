import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, Settings2, Loader2, Inbox, Save, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { dmxStore } from '@/lib/dmxStore';
import { parseSnapshotFile } from '@/lib/snapshotParser';
import CloudSnapshotRow from '@/components/dmx/CloudSnapshotRow';
import MemberManager from '@/components/dmx/MemberManager';

export default function ShowDetail() {
  const { showId } = useParams();
  const fileInputRef = useRef(null);

  const [show, setShow] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [members, setMembers] = useState([]);
  const [savingMembers, setSavingMembers] = useState(false);
  const [busy, setBusy] = useState('');

  const isOwner = show && show.created_by === email;

  const loadAll = async () => {
    const me = await base44.auth.me();
    setEmail(me.email);
    const s = await base44.entities.Show.get(showId);
    setShow(s);
    setMembers(s.members || []);
    const snaps = await base44.entities.Snapshot.filter({ show_id: showId }, '-captured_at');
    setSnapshots(snaps);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [showId]);

  const handleSaveLive = async () => {
    const name = window.prompt('Name this snapshot:', `Snapshot ${snapshots.length + 1}`);
    if (name === null) return;
    setBusy('save');
    const universes = dmxStore.getAllUniverses().map((u) => ({
      protocol: u.protocol,
      universe: u.universe,
      channels: Array.from(u.channels),
    }));
    await base44.entities.Snapshot.create({
      show_id: showId,
      name: name.trim() || `Snapshot ${snapshots.length + 1}`,
      captured_at: new Date().toISOString(),
      universes,
    });
    setBusy('');
    await loadAll();
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('import');
    try {
      const parsed = await parseSnapshotFile(file);
      if (parsed.length === 0) {
        alert('No snapshot data found in that file. Use a file exported from the Snapshots page.');
      } else {
        for (const p of parsed) {
          await base44.entities.Snapshot.create({
            show_id: showId,
            name: p.name,
            captured_at: new Date().toISOString(),
            universes: p.universes,
          });
        }
      }
    } catch (err) {
      alert(`Could not read that file: ${err.message}`);
    }
    setBusy('');
    await loadAll();
  };

  const handleDeleteSnapshot = async (id) => {
    await base44.entities.Snapshot.delete(id);
    await loadAll();
  };

  const handleSaveMembers = async () => {
    setSavingMembers(true);
    await base44.entities.Show.update(showId, { members });
    setSavingMembers(false);
    setShowSettings(false);
    await loadAll();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#00E5FF] animate-spin" />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <p className="text-sm text-gray-300 mb-2">Show not found</p>
        <Link to="/shows" className="text-xs text-[#00E5FF] hover:underline">
          Back to Shows
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/shows"
            className="p-1.5 text-[#6B7280] hover:text-white hover:bg-white/5 rounded transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white tracking-tight truncate">{show.name}</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
              {show.description ? ` · ${show.description}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy === 'import'}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#161920] text-[#9CA3AF] border border-[#2A2D35] rounded-md text-xs hover:text-white hover:border-[#3A3D45] disabled:opacity-40 transition-colors"
          >
            {busy === 'import' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Import File
          </button>
          <button
            onClick={handleSaveLive}
            disabled={busy === 'save'}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#00E5FF] text-[#0D0F14] rounded-md text-xs font-medium hover:bg-[#00E5FF]/90 disabled:opacity-40 transition-colors"
          >
            {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            Save Current
          </button>
          {isOwner && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-[#6B7280] hover:text-white hover:bg-white/5 rounded transition-colors"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
        {/* Settings / member panel */}
        {showSettings && isOwner && (
          <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-5 mb-6">
            <MemberManager
              ownerEmail={show.created_by}
              members={members}
              onChange={setMembers}
            />
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[#2A2D35]">
              <button
                onClick={() => {
                  setMembers(show.members || []);
                  setShowSettings(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSaveMembers}
                disabled={savingMembers}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00E5FF] text-[#0D0F14] rounded-md text-xs font-medium hover:bg-[#00E5FF]/90 disabled:opacity-40 transition-colors"
              >
                {savingMembers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Members
              </button>
            </div>
          </div>
        )}

        {/* Snapshot list */}
        {snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#161920] border border-[#2A2D35] flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-[#4B5563]" />
            </div>
            <h2 className="text-sm font-medium text-gray-300 mb-1">No snapshots in this show</h2>
            <p className="text-xs text-[#6B7280] max-w-sm">
              Save the current live capture, or import a previously exported Excel/CSV file to populate this show.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snap) => (
              <CloudSnapshotRow key={snap.id} snapshot={snap} onDelete={handleDeleteSnapshot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}