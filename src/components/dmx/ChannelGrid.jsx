import { memo, useState } from 'react';

const ChannelCell = memo(({ index, value, onHover }) => {
  const channelNum = index + 1;
  const intensity = value / 255;

  return (
    <div
      onMouseEnter={() => onHover && onHover(index)}
      className="relative flex flex-col items-center justify-center border-r border-b border-[#1E2128] cursor-default transition-colors duration-100"
      style={{
        width: '36px',
        height: '34px',
        backgroundColor: value > 0
          ? `rgba(0, 229, 255, ${0.04 + intensity * 0.22})`
          : 'transparent',
      }}
    >
      <span className="text-[7px] text-[#4B5563] leading-none font-mono">{channelNum}</span>
      <span
        className="text-[10px] font-mono leading-none mt-0.5"
        style={{
          color: value > 0 ? (value > 200 ? '#00E5FF' : '#7DD3FC') : '#374151',
          fontWeight: value > 0 ? 500 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
});
ChannelCell.displayName = 'ChannelCell';

export default function ChannelGrid({ channels, onChannelHover }) {
  const [hovered, setHovered] = useState(null);

  const handleHover = (idx) => {
    setHovered(idx);
    if (onChannelHover) onChannelHover(idx);
  };

  if (!channels) {
    return (
      <div className="flex items-center justify-center h-64 text-[#6B7280] text-sm">
        No signal data — waiting for frames...
      </div>
    );
  }

  return (
    <div className="inline-block">
      {/* Column headers */}
      <div className="flex mb-1 ml-8">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="text-[7px] text-[#4B5563] font-mono text-center"
            style={{ width: '36px' }}
          >
            {i === 0 ? '' : i * 16}
          </div>
        ))}
      </div>
      <div className="flex">
        {/* Row labels */}
        <div className="flex flex-col mr-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="text-[7px] text-[#4B5563] font-mono flex items-center justify-end pr-1"
              style={{ height: '34px', width: '28px' }}
            >
              {i * 32 + 1}
            </div>
          ))}
        </div>
        {/* Grid */}
        <div
          className="grid border-l border-t border-[#1E2128]"
          style={{ gridTemplateColumns: 'repeat(32, 36px)' }}
        >
          {Array.from(channels).map((value, index) => (
            <ChannelCell
              key={index}
              index={index}
              value={value}
              onHover={handleHover}
            />
          ))}
        </div>
      </div>
      {hovered !== null && (
        <div className="mt-2 text-[10px] font-mono text-[#6B7280]">
          Ch {hovered + 1} → {channels[hovered]} (0x{channels[hovered].toString(16).padStart(2, '0').toUpperCase()})
        </div>
      )}
    </div>
  );
}