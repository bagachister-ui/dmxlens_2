import { useState } from 'react';
import { X } from 'lucide-react';

export default function CreateShowDialog({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onCreate({ name: name.trim(), description: description.trim() });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#161920] border border-[#2A2D35] rounded-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2D35]">
          <h2 className="text-sm font-semibold text-white">New Show</h2>
          <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Show name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Summer Tour 2026"
              className="w-full bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Venue, dates, notes…"
              className="w-full bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#2A2D35]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#9CA3AF] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="px-4 py-2 bg-[#00E5FF] text-[#0D0F14] rounded-md text-sm font-medium hover:bg-[#00E5FF]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Creating…' : 'Create Show'}
          </button>
        </div>
      </div>
    </div>
  );
}