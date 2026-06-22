const levelColors = {
  info: '#9CA3AF',
  warning: '#F59E0B',
  error: '#EF4444',
};

export default function EventLog({ entries }) {
  return (
    <div className="bg-[#161920] border border-[#2A2D35] rounded-lg flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#2A2D35] flex items-center justify-between">
        <span className="text-xs font-semibold text-white tracking-wide uppercase">
          Event Log
        </span>
        <span className="text-[10px] text-[#6B7280] font-mono">{entries.length} entries</span>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-1 min-h-0">
        {entries.length === 0 ? (
          <div className="text-[#4B5563] text-xs font-mono text-center py-4">
            No events
          </div>
        ) : (
          entries.map((entry, i) => {
            const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            return (
              <div key={i} className="flex items-start gap-2 text-[11px] font-mono">
                <span className="text-[#4B5563] flex-shrink-0">{time}</span>
                <span
                  className="flex-shrink-0 uppercase text-[9px] tracking-wider mt-0.5"
                  style={{ color: levelColors[entry.level] || '#9CA3AF' }}
                >
                  [{entry.level}]
                </span>
                <span className="text-gray-300 break-all">{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}