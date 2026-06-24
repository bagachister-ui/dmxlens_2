import { useState } from 'react';
import { History, Pencil, Trash2, Check, X, Wifi } from 'lucide-react';

export default function ConnectionHistoryList({ history, onConnect, onRename, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  if (history.length === 0) return null;

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditName(entry.name || '');
  };

  const saveEdit = () => {
    if (editingId) {
      onRename(editingId, editName.trim());
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-[#00E5FF]" />
        <h2 className="text-sm font-semibold text-white">Connection History</h2>
        <span className="text-[10px] text-[#6B7280] font-mono ml-auto">
          {history.length} saved
        </span>
      </div>
      <div className="space-y-2">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 bg-[#0D0F14] border border-[#2A2D35] rounded-md p-2.5 hover:border-[#3A3D45] transition-colors"
          >
            {editingId === entry.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                  placeholder="e.g. FOH Bridge"
                  className="flex-1 bg-[#0D0F14] border border-[#00E5FF]/40 rounded px-2 py-1 text-sm text-white focus:outline-none"
                />
                <button onClick={saveEdit} className="p-1 text-[#22C55E] hover:bg-[#22C55E]/10 rounded">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={cancelEdit} className="p-1 text-[#6B7280] hover:bg-white/5 rounded">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onConnect(entry.url)}
                  className="flex-1 flex items-center gap-2 min-w-0 text-left"
                >
                  <Wifi className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />
                  <div className="min-w-0">
                    {entry.name && (
                      <div className="text-sm text-white truncate">{entry.name}</div>
                    )}
                    <div className={`text-xs font-mono truncate ${entry.name ? 'text-[#6B7280]' : 'text-gray-300'}`}>
                      {entry.url}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => startEdit(entry)}
                  className="p-1.5 text-[#6B7280] hover:text-[#00E5FF] hover:bg-white/5 rounded transition-colors flex-shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="p-1.5 text-[#6B7280] hover:text-[#EF4444] hover:bg-white/5 rounded transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}