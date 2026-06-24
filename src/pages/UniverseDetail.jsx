import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Radio } from 'lucide-react';
import { useDMXStore } from '@/hooks/useDMXStore';
import ChannelGrid from '@/components/dmx/ChannelGrid';
import SignalStatus from '@/components/dmx/SignalStatus';

export default function UniverseDetail() {
  const { protocol, universe } = useParams();
  const navigate = useNavigate();
  const store = useDMXStore();

  const ip = new URLSearchParams(window.location.search).get('ip');
  const uni = store.getUniverse(protocol, parseInt(universe), ip ?? undefined);

  if (!uni) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Radio className="w-10 h-10 text-[#4B5563] mb-3" />
        <p className="text-sm text-gray-300 mb-1">Source not detected</p>
        <p className="text-xs text-[#6B7280] mb-4">
          {protocol} U{universe} is no longer sending signal
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-[#161920] border border-[#2A2D35] rounded-md text-xs text-gray-300 hover:text-white transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const activeChannels = uni.channels
    ? Array.from(uni.channels).filter((v) => v > 0).length
    : 0;
  const maxVal = uni.channels
    ? Math.max(...Array.from(uni.channels))
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-md text-[#6B7280] hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                uni.protocol === 'sACN'
                  ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                  : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
              }`}
            >
              {uni.protocol}
            </span>
            <h1 className="text-lg font-semibold text-white font-mono">
              Universe {uni.universe}
            </h1>
            <span
              className={`w-2 h-2 rounded-full ${
                uni.signalPresent ? 'bg-[#22C55E] animate-pulse' : 'bg-[#EF4444]'
              }`}
            />
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {uni.sourceName} · {uni.sourceIP} · {uni.packetRate.toFixed(1)} fps
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex gap-4 p-6 min-h-0 overflow-hidden">
        {/* Channel grid */}
        <div className="flex-1 overflow-auto">
          <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white tracking-wide uppercase">
                512 Channel Grid
              </span>
              <div className="flex items-center gap-4 text-[10px] font-mono text-[#6B7280]">
                <span>
                  <span className="text-[#22C55E]">{activeChannels}</span> active
                </span>
                <span>
                  max <span className="text-[#00E5FF]">{maxVal}</span>
                </span>
              </div>
            </div>
            <ChannelGrid channels={uni.channels} />
          </div>
        </div>

        {/* Side panel */}
        <div className="w-64 flex-shrink-0 space-y-4 overflow-auto">
          <SignalStatus universe={uni} />

          {/* Quick stats */}
          <div className="bg-[#161920] border border-[#2A2D35] rounded-lg p-4">
            <span className="text-xs font-semibold text-white tracking-wide uppercase block mb-3">
              Channel Distribution
            </span>
            <div className="space-y-1.5">
              {[
                { label: '0 (off)', range: [0, 0], color: '#4B5563' },
                { label: '1–85', range: [1, 85], color: '#7DD3FC' },
                { label: '86–170', range: [86, 170], color: '#00E5FF' },
                { label: '171–255', range: [171, 255], color: '#22D3EE' },
              ].map((bucket) => {
                const count = uni.channels
                  ? Array.from(uni.channels).filter(
                      (v) => v >= bucket.range[0] && v <= bucket.range[1]
                    ).length
                  : 0;
                const pct = uni.channels ? (count / 512) * 100 : 0;
                return (
                  <div key={bucket.label}>
                    <div className="flex items-center justify-between text-[10px] font-mono mb-0.5">
                      <span className="text-[#6B7280]">{bucket.label}</span>
                      <span className="text-gray-300">{count}</span>
                    </div>
                    <div className="h-1 bg-[#0D0F14] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{ width: `${pct}%`, backgroundColor: bucket.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}