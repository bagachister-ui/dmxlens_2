import { memo } from 'react';

// One row per channel pair, showing A value, B value, and the delta between them.
const CompareCell = memo(({ index, valueA, valueB }) => {
  const delta = valueA - valueB;
  const channelNum = index + 1;

  let deltaColor = '#374151';
  let bg = 'transparent';
  if (delta > 0) {
    deltaColor = '#22C55E';
    bg = `rgba(34, 197, 94, ${0.05 + Math.min(Math.abs(delta) / 255, 1) * 0.22})`;
  } else if (delta < 0) {
    deltaColor = '#EF4444';
    bg = `rgba(239, 68, 68, ${0.05 + Math.min(Math.abs(delta) / 255, 1) * 0.22})`;
  }

  const valColor = (v) => (v > 0 ? (v > 200 ? '#00E5FF' : '#7DD3FC') : '#374151');

  return (
    <div
      className="flex items-center border-b border-[#1E2128]"
      style={{ backgroundColor: bg, height: '24px' }}
    >
      <span className="text-[9px] text-[#4B5563] font-mono w-10 text-right pr-2 flex-shrink-0">
        {channelNum}
      </span>
      <span className="text-[10px] font-mono w-12 text-center" style={{ color: valColor(valueA) }}>
        {valueA}
      </span>
      <span className="text-[10px] font-mono w-12 text-center" style={{ color: valColor(valueB) }}>
        {valueB}
      </span>
      <span
        className="text-[10px] font-mono w-12 text-center font-medium"
        style={{ color: deltaColor }}
      >
        {delta > 0 ? `+${delta}` : delta}
      </span>
    </div>
  );
});
CompareCell.displayName = 'CompareCell';

export default function CompareGrid({ channelsA, channelsB, labelA, labelB, diffOnly }) {
  const a = channelsA || new Uint8Array(512);
  const b = channelsB || new Uint8Array(512);

  const rows = [];
  for (let i = 0; i < 512; i++) {
    if (diffOnly && (a[i] || 0) === (b[i] || 0)) continue;
    rows.push(i);
  }

  return (
    <div className="inline-block border border-[#1E2128] rounded-md overflow-hidden bg-[#0D0F14]">
      {/* Header */}
      <div className="flex items-center bg-[#161920] border-b border-[#2A2D35] sticky top-0 z-10">
        <span className="text-[9px] text-[#6B7280] font-mono w-10 text-right pr-2 uppercase tracking-wide">Ch</span>
        <span className="text-[9px] text-[#00E5FF] font-mono w-12 text-center truncate" title={labelA}>{labelA}</span>
        <span className="text-[9px] text-[#A78BFA] font-mono w-12 text-center truncate" title={labelB}>{labelB}</span>
        <span className="text-[9px] text-[#6B7280] font-mono w-12 text-center uppercase tracking-wide">Δ</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-[#6B7280] w-[176px]">
          No differences — both sources are identical.
        </div>
      ) : (
        rows.map((i) => (
          <CompareCell key={i} index={i} valueA={a[i]} valueB={b[i]} />
        ))
      )}
    </div>
  );
}