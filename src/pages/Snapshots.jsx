import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  FolderOpen,
  Loader2,
  ArrowLeft,
  Camera,
  Upload,
  Settings2,
  Inbox,
  Save,
  X,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { dmxStore } from '@/lib/dmxStore';
import { parseSnapshotFile } from '@/lib/snapshotParser';
import { progressBus } from '@/lib/progressBus';
import CreateShowDialog from '@/components/dmx/CreateShowDialog';
import CloudSnapshotRow from '@/components/dmx/CloudSnapshotRow';
import MemberManager from '@/components/dmx/MemberManager';

export default function Snapshots() {
  const fileInputRef = useRef(null);
  const newShowFileRef = useRef(null);

  const [email, setEmail] = useState('');
  const [shows, setShows] = useState([]);
  const [loadingShows, setLoadingShows] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  // Selected show (detail view)
  const [activeShow, setActiveShow] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnaps, setLoadingSnaps] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [members, setMembers] = useState([]);
  const [savingMembers, setSavingMembers] = useState(false);
  const [busy, setBusy] = useState('');

  const isOwner =
    activeShow && (activeShow.created_by || '').toLowerCase() === (email || '').toLowerCase();

  const loadShows = () =>
    progressBus.track(async () => {
      const me = await base44.auth.me();
      setEmail(me.email);
      const all = await base44.entities.Show.list('-updated_date');
      const myEmail = (me.email || '').toLowerCase();
      const visible = all.filter(
        (s) => (s.created_by || '').toLowerCase() === myEmail || (s.members || []).includes(myEmail)
      );
      setShows(visible);
      setLoadingShows(false);
    });

  useEffect(() => {
    loadShows();
  }, []);

  const handleCreateShow = ({ name, description }) =>
    progressBus.track(async () => {
      const created = await base44.entities.Show.create({ name, description, members: [] });
      setShowDialog(false);
      setShows((prev) => [created, ...prev]);
    });

  // Build snapshot records from parsed file data, ordered earliest-on-top
  const buildSnapshotRecords = (showId, parsed) => {
    const base = Date.now();
    return parsed.map((p, i) => ({
      show_id: showId,
      name: p.name,
      // Stagger ascending so the first parsed snapshot has the earliest timestamp (sorts to top)
      captured_at: new Date(base + i * 1000).toISOString(),
      universes: p.universes,
    }));
  };

  const handleCreateShowFromFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('newFromFile');
    progressBus.start();
    try {
      const parsed = await parseSnapshotFile(file);
      if (parsed.length === 0) {
        alert('No snapshot data found in that file. Use a CSV/Excel file exported from this app.');
      } else {
        const showName = file.name.replace(/\.(xlsx|xls|csv)$/i, '');
        const created = await base44.entities.Show.create({ name: showName, description: '', members: [] });
        await base44.entities.Snapshot.bulkCreate(buildSnapshotRecords(created.id, parsed));
        setShows((prev) => [created, ...prev]);
        openShow(created);
      }
    } catch (err) {
      alert(`Could not read that file: ${err.message}`);
    }
    progressBus.done();
    setBusy('');
  };

  const handleDeleteShow = async (show) => {
    if (!window.confirm(`Delete "${show.name}" and all of its snapshots? This cannot be undone.`)) return;
    setBusy(`delShow:${show.id}`);
    progressBus.start();
    await base44.entities.Snapshot.deleteMany({ show_id: show.id });
    await base44.entities.Show.delete(show.id);
    setShows((prev) => prev.filter((s) => s.id !== show.id));
    progressBus.done();
    setBusy('');
  };

  const openShow = (show) =>
    progressBus.track(async () => {
      setActiveShow(show);
      setMembers(show.members || []);
      setShowSettings(false);
      setLoadingSnaps(true);
      const snaps = await base44.entities.Snapshot.filter({ show_id: show.id }, 'captured_at');
      setSnapshots(snaps);
      setLoadingSnaps(false);
    });

  const reloadSnaps = (showId = activeShow?.id) =>
    progressBus.track(async () => {
      if (!showId) return;
      const snaps = await base44.entities.Snapshot.filter({ show_id: showId }, 'captured_at');
      setSnapshots(snaps);
    });

  const backToShows = () => {
    setActiveShow(null);
    setSnapshots([]);
    setShowSettings(false);
  };

  const handleSaveLive = async () => {
    const name = window.prompt('Name this snapshot:', `Snapshot ${snapshots.length + 1}`);
    if (name === null) return;
    setBusy('save');
    progressBus.start();
    const universes = dmxStore.getAllUniverses().map((u) => ({
      protocol: u.protocol,
      universe: u.universe,
      channels: Array.from(u.channels),
    }));
    await base44.entities.Snapshot.create({
      show_id: activeShow.id,
      name: name.trim() || `Snapshot ${snapshots.length + 1}`,
      captured_at: new Date().toISOString(),
      universes,
    });
    await reloadSnaps();
    progressBus.done();
    setBusy('');
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('import');
    progressBus.start();
    try {
      const parsed = await parseSnapshotFile(file);
      if (parsed.length === 0) {
        alert('No snapshot data found in that file. Use a CSV/Excel file exported from this app.');
      } else {
        await base44.entities.Snapshot.bulkCreate(buildSnapshotRecords(activeShow.id, parsed));
      }
    } catch (err) {
      alert(`Could not read that file: ${err.message}`);
    }
    await reloadSnaps();
    progressBus.done();
    setBusy('');
  };

  const handleExportExcel = () => {
    if (snapshots.length === 0) return;
    const wb = XLSX.utils.book_new();
    const COLS = 20;

    for (const snap of snapshots) {
      const data = [
        [snap.name],
        [`Captured: ${snap.captured_at ? new Date(snap.captured_at).toLocaleString() : ''}`],
        [],
      ];
      for (const u of snap.universes || []) {
        data.push([`${u.protocol} U${u.universe}`]);
        data.push(['Ch', ...Array.from({ length: COLS }, (_, i) => i + 1)]);
        for (let row = 0; row < 512; row += COLS) {
          const rowValues = [];
          for (let col = 0; col < COLS; col++) {
            const chIdx = row + col;
            rowValues.push(chIdx < 512 ? (u.channels?.[chIdx] ?? 0) : '');
          }
          data.push([row + 1, ...rowValues]);
        }
        data.push([]);
      }
      const ws = XLSX.utils.aoa_to_sheet(data);
      const sheetName = snap.name.replace(/[\\/?*[\]:]/g, '_').substring(0, 31) || 'Snapshot';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    const safeShow = (activeShow?.name || 'show').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    XLSX.writeFile(wb, `${safeShow}-snapshots-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDeleteSnapshot = (id) =>
    progressBus.track(async () => {
      await base44.entities.Snapshot.delete(id);
      await reloadSnaps();
    });

  const handleSaveMembers = async () => {
    setSavingMembers(true);
    progressBus.start();
    await base44.entities.Show.update(activeShow.id, { members });
    progressBus.done();
    setSavingMembers(false);
    setShowSettings(false);
    const updated = { ...activeShow, members };
    setActiveShow(updated);
    setShows((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  // ─────────────────────────────────────────────  SHOWS LIST VIEW
  if (!activeShow) {
    return (
      <div className="h-full flex flex-col">
        <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Snapshots</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Click a show to open it — capture, upload CSV/Excel, and manage its snapshots inside
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={newShowFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleCreateShowFromFile}
              className="hidden"
            />
            <button
              onClick={() => newShowFileRef.current?.click()}
              disabled={busy === 'newFromFile'}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#161920] text-[#9CA3AF] border border-[#2A2D35] rounded-md text-xs hover:text-white hover:border-[#3A3D45] disabled:opacity-40 transition-colors"
            >
              {busy === 'newFromFile' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Create from File
            </button>
            <button
              onClick={() => setShowDialog(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#00E5FF] text-[#0D0F14] rounded-md text-xs font-medium hover:bg-[#00E5FF]/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Show
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
          {loadingShows ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#00E5FF] animate-spin" />
            </div>
          ) : shows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#161920] border border-[#2A2D35] flex items-center justify-center mb-4">
                <FolderOpen className="w-7 h-7 text-[#4B5563]" />
              </div>
              <h2 className="text-sm font-medium text-gray-300 mb-1">No shows yet</h2>
              <p className="text-xs text-[#6B7280] max-w-sm">
                Create a show to store a series of snapshots in the cloud, or use "Create from
                File" to build one directly from an exported CSV/Excel file.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shows.map((show) => (
                <ShowCardStatic
                  key={show.id}
                  show={show}
                  currentEmail={email}
                  onOpen={() => openShow(show)}
                  onDelete={() => handleDeleteShow(show)}
                  deleting={busy === `delShow:${show.id}`}
                />
              ))}
            </div>
          )}
        </div>

        {showDialog && (
          <CreateShowDialog onClose={() => setShowDialog(false)} onCreate={handleCreateShow} />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────  SHOW DETAIL VIEW
  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={backToShows}
            className="p-1.5 text-[#6B7280] hover:text-white hover:bg-white/5 rounded transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white tracking-tight truncate">{activeShow.name}</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
              {activeShow.description ? ` · ${activeShow.description}` : ''}
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
            Upload CSV / Excel
          </button>
          <button
            onClick={handleExportExcel}
            disabled={snapshots.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 rounded-md text-xs hover:bg-[#22C55E]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export
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
        {showSettings && isOwner && (
          <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-5 mb-6">
            <MemberManager ownerEmail={activeShow.created_by} members={members} onChange={setMembers} />
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[#2A2D35]">
              <button
                onClick={() => {
                  setMembers(activeShow.members || []);
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

        {loadingSnaps ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#00E5FF] animate-spin" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#161920] border border-[#2A2D35] flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-[#4B5563]" />
            </div>
            <h2 className="text-sm font-medium text-gray-300 mb-1">No snapshots in this show</h2>
            <p className="text-xs text-[#6B7280] max-w-sm">
              Save the current live capture, or upload a previously exported CSV/Excel file to populate this show.
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

// Non-Link version of the show card (used to open inline)
function ShowCardStatic({ show, currentEmail, onOpen, onDelete, deleting }) {
  const isOwner = (show.created_by || '').toLowerCase() === (currentEmail || '').toLowerCase();
  const memberCount = (show.members?.length || 0) + 1;
  return (
    <div className="relative group block bg-[#161920] border border-[#2A2D35] rounded-lg p-4 hover:border-[#00E5FF]/40 transition-colors h-full">
      {isOwner && (
        <button
          onClick={onDelete}
          disabled={deleting}
          title="Delete show"
          className="absolute top-2 right-2 p-1.5 text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded transition-colors disabled:opacity-40 z-10"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
      <button onClick={onOpen} className="text-left w-full">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-white truncate pr-6">{show.name}</h3>
            {show.description && (
              <p className="text-xs text-[#6B7280] mt-0.5 truncate">{show.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-[#6B7280]">
              <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
              <span className={isOwner ? 'text-[#00E5FF]' : 'text-[#6B7280]'}>
                {isOwner ? 'Owner' : 'Member'}
              </span>
              <span className="text-[#00E5FF] ml-auto">Open →</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}