import { useState } from 'react';

export default function SourceForm({ onSave, onCancel, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [protocol, setProtocol] = useState(initial?.protocol || 'sACN');
  const [universe, setUniverse] = useState(initial?.universe ?? 1);
  const [sourceIP, setSourceIP] = useState(initial?.sourceIP || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const uni = parseInt(universe);
    if (isNaN(uni) || uni < 0) {
      setError('Universe must be a valid number');
      return;
    }
    if (protocol === 'sACN' && uni > 63999) {
      setError('sACN universe must be 0–63999');
      return;
    }
    if (protocol === 'Art-Net' && uni > 32767) {
      setError('Art-Net universe must be 0–32767');
      return;
    }
    onSave({
      name: name.trim(),
      protocol,
      universe: uni,
      sourceIP: sourceIP.trim() || undefined,
      active: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[10px] text-[#6B7280] font-mono uppercase tracking-wider mb-1.5">
          Source Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. GrandMA3 — FOH"
          autoFocus
          className="w-full bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-[#6B7280] font-mono uppercase tracking-wider mb-1.5">
            Protocol
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {['sACN', 'Art-Net'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProtocol(p)}
                className={`px-3 py-2 rounded-md text-xs font-mono transition-colors border ${
                  protocol === p
                    ? p === 'sACN'
                      ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
                      : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                    : 'bg-[#0D0F14] text-[#6B7280] border-[#2A2D35] hover:border-[#3A3D45]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-[#6B7280] font-mono uppercase tracking-wider mb-1.5">
            Universe
          </label>
          <input
            type="number"
            min="0"
            max={protocol === 'sACN' ? 63999 : 32767}
            value={universe}
            onChange={(e) => setUniverse(e.target.value)}
            className="w-full bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-[#6B7280] font-mono uppercase tracking-wider mb-1.5">
          Source IP <span className="text-[#4B5563]normal-case">(optional — auto-detected in live mode)</span>
        </label>
        <input
          type="text"
          value={sourceIP}
          onChange={(e) => setSourceIP(e.target.value)}
          placeholder="e.g. 10.0.1.100"
          className="w-full bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white font-mono placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
        />
      </div>

      {error && (
        <div className="text-xs text-[#EF4444] font-mono">{error}</div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-[#00E5FF] text-[#0D0F14] rounded-md text-sm font-medium hover:bg-[#00E5FF]/90 transition-colors"
        >
          {initial ? 'Save Changes' : 'Add Source'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-[#6B7280] hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}