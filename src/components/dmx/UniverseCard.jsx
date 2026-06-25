import { useNavigate } from 'react-router-dom';
import { universeDetailPath } from '@/lib/dmxUtils';
import ActivityPulse from './ActivityPulse';

export default function UniverseCard({ universe }) {
  const navigate = useNavigate();

  const activeChannels = universe.channels
    ? Array.from(universe.channels).filter((v) => v > 0).length
    : 0;

  const ago = universe.lastSeen
    ? Math.max(0, Math.floor((Date.now() - universe.lastSeen) / 1000))
    : null;

  return (
    <button
      onClick={() => navigate(universeDetailPath(universe))}
      className="group relative bg-[#161920] border border-[#2A2D35] rounded-lg p-4 text-left transition-all hover:border-[#00E5FF]/40 hover:bg-[#1A1E27] cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                universe.protocol === 'sACN'
                  ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                  : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
              }`}
            >
              {universe.protocol}
            </span>
            <ActivityPulse active={universe.signalPresent} />
          </div>
          <div className="text-lg font-semibold text-white font-mono">
            U{universe.universe}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#6B7280] font-mono uppercase tracking-wider">Rate</div>
          <div
            className={`text-sm font-mono font-medium ${
              universe.signalPresent ? 'text-[#00E5FF]' : 'text-[#EF4444]'
            }`}
          >
            {universe.packetRate.toFixed(1)}
            <span className="text-[10px] text-[#6B7280] ml-0.5">fps</span>
          </div>
        </div>
      </div>

      {/* Source name */}
      <div className="text-xs text-gray-300 mb-3 truncate">{universe.sourceName}</div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#2A2D35]">
        <div>
          <div className="text-[9px] text-[#6B7280] font-mono uppercase">Active Ch</div>
          <div className="text-xs font-mono text-gray-200">{activeChannels}/512</div>
        </div>
        <div>
          <div className="text-[9px] text-[#6B7280] font-mono uppercase">Frames</div>
          <div className="text-xs font-mono text-gray-200">
            {universe.frameCount.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-[#6B7280] font-mono uppercase">Last Seen</div>
          <div
            className={`text-xs font-mono ${
              ago !== null && ago < 3 ? 'text-[#22C55E]' : 'text-[#F59E0B]'
            }`}
          >
            {ago === null ? '—' : ago < 1 ? 'now' : `${ago}s`}
          </div>
        </div>
      </div>

      {/* Source IP */}
      <div className="mt-2 text-[10px] text-[#4B5563] font-mono truncate">
        {universe.sourceIP}
      </div>
    </button>
  );
}