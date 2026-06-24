import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';

export default function SnapshotCard({ snapshot, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(snapshot.name);

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
    <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-4 hover:border-[#3A3D45] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
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
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-white truncate">{snapshot.name}</h3>
              <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">
                {new Date(snapshot.timestamp).toLocaleString()}
              </p>
            </div>
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#0D0F14] rounded-md py-2">
          <div className="text-lg font-semibold text-white">{snapshot.universes.length}</div>
          <div className="text-[10px] text-[#6B7280] font-mono uppercase">Universes</div>
        </div>
        <div className="bg-[#0D0F14] rounded-md py-2">
          <div className="text-lg font-semibold text-[#00E5FF]">{activeChannels}</div>
          <div className="text-[10px] text-[#6B7280] font-mono uppercase">Active Ch</div>
        </div>
        <div className="bg-[#0D0F14] rounded-md py-2">
          <div className="text-lg font-semibold text-[#F59E0B]">{snapshot.universes.length * 512}</div>
          <div className="text-[10px] text-[#6B7280] font-mono uppercase">Total Ch</div>
        </div>
      </div>

      {/* Universe tags */}
      <div className="mt-3 flex flex-wrap gap-1">
        {snapshot.universes.map((u, i) => (
          <span
            key={i}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0D0F14] border border-[#2A2D35] text-gray-400"
          >
            {u.protocol} U{u.universe}
          </span>
        ))}
      </div>
    </div>
  );
}