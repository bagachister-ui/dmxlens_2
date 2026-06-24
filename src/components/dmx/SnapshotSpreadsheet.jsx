import { useState } from 'react';
import { Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

const COLS = 20;

function cellColor(value) {
  if (value <= 0) return { color: '#374151' };
  const intensity = value / 255;
  return {
    color: value > 200 ? '#00E5FF' : '#7DD3FC',
    backgroundColor: `rgba(0, 229, 255, ${0.04 + intensity * 0.22})`,
  };
}

function UniverseTable({ universe }) {
  const rows = [];
  for (let start = 0; start < 512; start += COLS) {
    rows.push(start);
  }

  return (
    <div className="mb-5">
      <div className="text-xs font-mono text-[#9CA3AF] mb-1.5">
        {universe.protocol} <span className="text-white">U{universe.universe}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-[#0D0F14] text-[9px] text-[#4B5563] font-mono font-normal px-1.5 py-1 border border-[#1E2128] text-right">
                Ch
              </th>
              {Array.from({ length: COLS }).map((_, i) => (
                <th
                  key={i}
                  className="text-[9px] text-[#4B5563] font-mono font-normal py-1 border border-[#1E2128] text-center min-w-[30px]"
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((start) => (
              <tr key={start}>
                <td className="sticky left-0 bg-[#0D0F14] text-[9px] text-[#4B5563] font-mono px-1.5 py-1 border border-[#1E2128] text-right">
                  {start + 1}
                </td>
                {Array.from({ length: COLS }).map((_, col) => {
                  const idx = start + col;
                  const value = idx < 512 ? universe.channels[idx] : '';
                  return (
                    <td
                      key={col}
                      className="text-[10px] font-mono text-center py-1 border border-[#1E2128]"
                      style={value === '' ? {} : cellColor(value)}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SnapshotSpreadsheet({ snapshot, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(snapshot.name);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    if (name.trim()) {
      onRename(snapshot.id, name.trim());
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setName(snapshot.name);
    setEditing(false);
  };

  const activeChannels = snapshot.universes.reduce(
    (sum, u) => sum + u.channels.filter((v) => v > 0).length,
    0
  );

  return (
    <div className="bg-[#161920] border border-[#2A2D35] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2D35]">
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
              autoFocus
              className="flex-1 bg-[#0D0F14] border border-[#00E5FF]/40 rounded-md px-2 py-1 text-sm text-white focus:outline-none"
            />
            <button onClick={handleSave} className="p-1 text-[#22C55E] hover:bg-[#22C55E]/10 rounded">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={handleCancel} className="p-1 text-[#6B7280] hover:bg-white/5 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => setOpen(!open)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
              {open ? (
                <ChevronDown className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-white truncate">{snapshot.name}</h3>
                <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">
                  {new Date(snapshot.timestamp).toLocaleString()} · {snapshot.universes.length} universe
                  {snapshot.universes.length !== 1 ? 's' : ''} · {activeChannels} active ch
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-[#6B7280] hover:text-[#00E5FF] hover:bg-white/5 rounded transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(snapshot.id)}
                className="p-1.5 text-[#6B7280] hover:text-[#EF4444] hover:bg-white/5 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Spreadsheet body */}
      {open && (
        <div className="p-4">
          {snapshot.universes.length === 0 ? (
            <p className="text-xs text-[#6B7280]">No universe data in this snapshot.</p>
          ) : (
            snapshot.universes.map((u, i) => <UniverseTable key={i} universe={u} />)
          )}
        </div>
      )}
    </div>
  );
}