// Shared helpers for working with detected DMX sources.
// A source is uniquely identified by protocol + universe + sender IP.

export function universeKey(u) {
  return `${u.protocol}:${u.universe}:${u.sourceIP || ''}`;
}

// Sort detected sources: protocol → universe number → sender IP.
export function sortUniverses(list) {
  return list
    .slice()
    .sort((a, b) =>
      a.protocol === b.protocol
        ? a.universe - b.universe || (a.sourceIP || '').localeCompare(b.sourceIP || '')
        : a.protocol.localeCompare(b.protocol)
    );
}