import { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';

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
  for (let start = 0; start < 512; start += COLS) rows.push(start);

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
                  const value = idx < 512 ? (universe.channels?.[idx] ?? 0) : '';
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

export default function CloudSnapshotRow({ snapshot, onDelete }) {
  const [open, setOpen] = useState(false);
  const universes = snapshot.universes || [];
  const activeChannels = universes.reduce(
    (sum, u) => sum + (u.channels?.filter((v) => v > 0).length || 0),
    0
  );

  return (
    <div className="bg-[#161920] border border-[#2A2D35] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2D35]">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {open ? (
            <ChevronDown className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-white truncate">{snapshot.name}</h3>
            <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">
              {snapshot.captured_at ? new Date(snapshot.captured_at).toLocaleString() : '—'} ·{' '}
              {universes.length} universe{universes.length !== 1 ? 's' : ''} · {activeChannels} active ch
            </p>
          </div>
        </button>
        <button
          onClick={() => onDelete(snapshot.id)}
          className="p-1.5 text-[#6B7280] hover:text-[#EF4444] hover:bg-white/5 rounded transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="p-4">
          {universes.length === 0 ? (
            <p className="text-xs text-[#6B7280]">No universe data in this snapshot.</p>
          ) : (
            universes.map((u, i) => <UniverseTable key={i} universe={u} />)
          )}
        </div>
      )}
    </div>
  );
}