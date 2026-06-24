import { useState } from 'react';
import { Camera, FileSpreadsheet, Trash2, Inbox } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDMXStore } from '@/hooks/useDMXStore';
import { dmxStore } from '@/lib/dmxStore';
import SnapshotCard from '@/components/dmx/SnapshotCard';

export default function Snapshots() {
  const store = useDMXStore();
  const [snapshotName, setSnapshotName] = useState('');

  const handleTakeSnapshot = () => {
    dmxStore.takeSnapshot(snapshotName.trim() || undefined);
    setSnapshotName('');
  };

  const handleExportExcel = () => {
    if (store.snapshots.length === 0) return;

    const wb = XLSX.utils.book_new();
    const COLS = 20;

    for (const snap of store.snapshots) {
      const data = [
        [snap.name],
        [`Captured: ${new Date(snap.timestamp).toLocaleString()}`],
        [],
      ];

      for (const u of snap.universes) {
        // Universe header
        data.push([`${u.protocol} U${u.universe}`]);
        // Column headers: "Ch" + 1..20
        data.push(['Ch', ...Array.from({ length: COLS }, (_, i) => i + 1)]);
        // Value rows: row label (starting channel) + 20 values per row
        for (let row = 0; row < 512; row += COLS) {
          const rowValues = [];
          for (let col = 0; col < COLS; col++) {
            const chIdx = row + col;
            rowValues.push(chIdx < 512 ? u.channels[chIdx] : '');
          }
          data.push([row + 1, ...rowValues]);
        }
        // Blank separator between universes
        data.push([]);
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      // Excel sheet names: max 31 chars, no special chars
      const sheetName = snap.name.replace(/[\\/?*[\]:]/g, '_').substring(0, 31) || 'Snapshot';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    XLSX.writeFile(wb, `dmx-snapshots-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Snapshots</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {store.snapshots.length} snapshot{store.snapshots.length !== 1 ? 's' : ''} captured
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={store.snapshots.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 rounded-md text-xs hover:bg-[#22C55E]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Export to Excel
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
        {/* Capture controls */}
        <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-[#00E5FF]" />
            <h2 className="text-sm font-semibold text-white">Capture Snapshot</h2>
          </div>
          <p className="text-xs text-[#6B7280] mb-3">
            Captures the current DMX values across all universes. Give it a name (optional) or leave blank for auto-naming.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTakeSnapshot()}
              placeholder="e.g. Cue 1 — Opening look"
              className="flex-1 bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
            />
            <button
              onClick={handleTakeSnapshot}
              className="flex items-center gap-2 px-4 py-2 bg-[#00E5FF] text-[#0D0F14] rounded-md text-sm font-medium hover:bg-[#00E5FF]/90 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Capture
            </button>
          </div>
        </div>

        {/* Snapshot list */}
        {store.snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#161920] border border-[#2A2D35] flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-[#4B5563]" />
            </div>
            <h2 className="text-sm font-medium text-gray-300 mb-1">No snapshots yet</h2>
            <p className="text-xs text-[#6B7280] max-w-sm">
              Capture a snapshot to save the current state of all DMX universes. Snapshots can be renamed and exported to Excel.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-[#6B7280]">Captured Cues</h2>
              <button
                onClick={() => {
                  if (confirm('Delete all snapshots?')) dmxStore.clearSnapshots();
                }}
                className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EF4444] transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {store.snapshots.map((snap) => (
                <SnapshotCard
                  key={snap.id}
                  snapshot={snap}
                  onRename={(id, name) => dmxStore.renameSnapshot(id, name)}
                  onDelete={(id) => dmxStore.deleteSnapshot(id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}