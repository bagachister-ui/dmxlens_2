export default function ActivityPulse({ active, color }) {
  const c = color || (active ? '#22C55E' : '#EF4444');
  return (
    <span className="relative inline-flex h-2 w-2 flex-shrink-0">
      {active && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
          style={{ backgroundColor: c }}
        />
      )}
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ backgroundColor: c }}
      />
    </span>
  );
}