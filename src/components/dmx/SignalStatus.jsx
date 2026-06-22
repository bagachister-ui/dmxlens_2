import ActivityPulse from './ActivityPulse';

export default function SignalStatus({ universe }) {
  if (!universe) return null;

  const ago = universe.lastSeen
    ? Math.max(0, (Date.now() - universe.lastSeen) / 1000).toFixed(1)
    : null;

  const rows = [
    { label: 'Signal', value: universe.signalPresent ? 'PRESENT' : 'LOST', color: universe.signalPresent ? '#22C55E' : '#EF4444' },
    { label: 'Packet Rate', value: `${universe.packetRate.toFixed(1)} fps` },
    { label: 'Sequence', value: universe.sequence },
    { label: 'Frame Count', value: universe.frameCount.toLocaleString() },
    { label: 'Source IP', value: universe.sourceIP },
    { label: 'Last Packet', value: ago ? `${ago}s ago` : '—' },
  ];

  return (
    <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <ActivityPulse active={universe.signalPresent} />
        <span className="text-xs font-semibold text-white tracking-wide uppercase">
          Signal Status
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-[10px] text-[#6B7280] font-mono uppercase tracking-wider">
              {row.label}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: row.color || '#E5E7EB' }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}