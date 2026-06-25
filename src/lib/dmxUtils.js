// Shared helpers for working with detected DMX sources.
// A source is uniquely identified by protocol + universe + sender IP.

export function universeKey(u) {
  return `${u.protocol}:${u.universe}:${u.sourceIP || ''}`;
}

// Route to a source's detail page, carrying the sender IP to disambiguate
// multiple senders on the same universe.
export function universeDetailPath(u) {
  return `/universe/${u.protocol}/${u.universe}?ip=${encodeURIComponent(u.sourceIP || '')}`;
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