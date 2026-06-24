import { useState } from 'react';
import { GitCompareArrows, ArrowLeftRight, Filter } from 'lucide-react';
import { useDMXStore } from '@/hooks/useDMXStore';
import CompareGrid from '@/components/dmx/CompareGrid';

function SourceSelect({ label, value, onChange, universes, accent }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-[10px] uppercase tracking-wide font-mono mb-1.5" style={{ color: accent }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#161920] border border-[#2A2D35] rounded-md px-3 py-2 text-sm text-white focus:border-[#00E5FF]/50 focus:outline-none"
      >
        <option value="">Select a source…</option>
        {universes.map((u) => {
          const key = `${u.protocol}:${u.universe}:${u.sourceIP}`;
          return (
            <option key={key} value={key}>
              {u.protocol} · U{u.universe} · {u.sourceIP || u.sourceName}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default function Compare() {
  const store = useDMXStore();
  const universes = store.getAllUniverses();

  const [keyA, setKeyA] = useState('');
  const [keyB, setKeyB] = useState('');
  const [diffOnly, setDiffOnly] = useState(false);

  const findU = (key) => universes.find((u) => `${u.protocol}:${u.universe}:${u.sourceIP}` === key);
  const uA = findU(keyA);
  const uB = findU(keyB);

  const swap = () => {
    setKeyA(keyB);
    setKeyB(keyA);
  };

  const shortLabel = (u) => (u ? `${u.protocol === 'sACN' ? 'sACN' : 'ArtN'} U${u.universe}` : '—');

  // Count differing channels
  let diffCount = 0;
  if (uA && uB) {
    for (let i = 0; i < 512; i++) {
      if ((uA.channels[i] || 0) !== (uB.channels[i] || 0)) diffCount++;
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Compare Sources</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Pick two sources to compare channel values side by side — green means A is higher, red means B is higher
          </p>
        </div>
        {uA && uB && (
          <div className="text-xs font-mono">
            <span className={diffCount > 0 ? 'text-[#F59E0B]' : 'text-[#22C55E]'}>
              {diffCount} channel{diffCount !== 1 ? 's' : ''} differ{diffCount === 1 ? 's' : ''}
            </span>
          </div>
        )}
      </header>

      {/* Selectors */}
      <div className="px-6 py-4 border-b border-[#2A2D35] flex-shrink-0">
        {universes.length === 0 ? (
          <p className="text-xs text-[#6B7280]">No sources detected yet — connect the live bridge so sources appear automatically.</p>
        ) : (
          <div className="flex items-end gap-3 max-w-2xl">
            <SourceSelect label="Source A" value={keyA} onChange={setKeyA} universes={universes} accent="#00E5FF" />
            <button
              onClick={swap}
              title="Swap A and B"
              className="mb-0.5 p-2 text-[#6B7280] hover:text-white hover:bg-white/5 rounded-md border border-[#2A2D35] transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <SourceSelect label="Source B" value={keyB} onChange={setKeyB} universes={universes} accent="#A78BFA" />
            <button
              onClick={() => setDiffOnly((v) => !v)}
              className={`mb-0.5 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs border transition-colors ${
                diffOnly
                  ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/40'
                  : 'bg-[#161920] text-[#9CA3AF] border-[#2A2D35] hover:text-white hover:border-[#3A3D45]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Differences only
            </button>
          </div>
        )}
      </div>

      {/* Comparison */}
      <div className="flex-1 overflow-auto p-6">
        {!uA || !uB ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#161920] border border-[#2A2D35] flex items-center justify-center mb-4">
              <GitCompareArrows className="w-7 h-7 text-[#4B5563]" />
            </div>
            <h2 className="text-sm font-medium text-gray-300 mb-1">Select two sources to compare</h2>
            <p className="text-xs text-[#6B7280] max-w-sm">
              Choose a Source A and Source B above. They can be any mix of sACN and Art-Net universes.
            </p>
          </div>
        ) : (
          <CompareGrid
            channelsA={uA.channels}
            channelsB={uB.channels}
            labelA={shortLabel(uA)}
            labelB={shortLabel(uB)}
            diffOnly={diffOnly}
          />
        )}
      </div>
    </div>
  );
}