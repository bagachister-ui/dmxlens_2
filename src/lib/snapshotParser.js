import * as XLSX from 'xlsx';

// Parses a previously-exported DMX snapshot file (Excel or CSV) back into
// universe data. Mirrors the export layout produced in Snapshots.jsx:
//
//   <Snapshot name>
//   Captured: <timestamp>
//   (blank)
//   <PROTOCOL UXX>           <- universe header, e.g. "sACN U1" or "Art-Net U0"
//   Ch | 1 | 2 | ... | 20    <- column header row
//   1  | v | v | ... | v     <- 26 value rows of 20 channels each (512 total)
//   ...
//   (blank)
//
// Returns: [{ name, universes: [{ protocol, universe, channels: number[512] }] }]

const UNIVERSE_HEADER = /^(sACN|Art-Net)\s+U(\d+)$/i;

function parseSheet(rows, fallbackName) {
  let name = fallbackName;
  // First non-empty cell that isn't "Captured:" is the snapshot name
  for (const row of rows) {
    const first = (row[0] ?? '').toString().trim();
    if (first && !/^captured:/i.test(first) && !UNIVERSE_HEADER.test(first)) {
      name = first;
      break;
    }
    if (UNIVERSE_HEADER.test(first)) break;
  }

  const universes = [];
  let current = null;
  let collecting = false;

  for (const row of rows) {
    const first = (row[0] ?? '').toString().trim();
    const headerMatch = first.match(UNIVERSE_HEADER);

    if (headerMatch) {
      if (current) universes.push(current);
      current = {
        protocol: headerMatch[1].toLowerCase() === 'sacn' ? 'sACN' : 'Art-Net',
        universe: parseInt(headerMatch[2], 10),
        channels: new Array(512).fill(0),
      };
      collecting = false;
      continue;
    }

    if (!current) continue;

    // The "Ch" header row marks the start of value rows
    if (first.toLowerCase() === 'ch') {
      collecting = true;
      continue;
    }

    if (collecting) {
      const startCh = parseInt(first, 10);
      if (!Number.isFinite(startCh)) continue;
      for (let col = 1; col < row.length; col++) {
        const idx = startCh - 1 + (col - 1);
        if (idx >= 0 && idx < 512) {
          const v = parseInt(row[col], 10);
          current.channels[idx] = Number.isFinite(v) ? Math.max(0, Math.min(255, v)) : 0;
        }
      }
    }
  }

  if (current) universes.push(current);
  return { name, universes };
}

export async function parseSnapshotFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const snapshots = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
    const parsed = parseSheet(rows, sheetName);
    if (parsed.universes.length > 0) {
      snapshots.push(parsed);
    }
  }

  return snapshots;
}