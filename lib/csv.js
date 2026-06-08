/**
 * Minimal, dependency-free RFC-4180-ish CSV parser.
 * Handles quoted fields, embedded commas, embedded newlines, and "" escapes.
 */
export function parseCsv(text) {
  // Strip BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // handled by \n
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  // last field / row (if file doesn't end with newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parse CSV into an array of objects keyed by the header row. */
export function parseCsvObjects(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}

/** Parse the spreadsheet's M/D/YYYY or M/D/YYYY H:MM:SS date strings to a Date. */
export function parseSheetDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  const [datePart, timePart] = str.split(' ');
  const dm = datePart.split('/');
  if (dm.length !== 3) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const month = parseInt(dm[0], 10);
  const day = parseInt(dm[1], 10);
  const year = parseInt(dm[2], 10);
  let hh = 0, mm = 0, ss = 0;
  if (timePart) {
    const t = timePart.split(':');
    hh = parseInt(t[0], 10) || 0;
    mm = parseInt(t[1], 10) || 0;
    ss = parseInt(t[2], 10) || 0;
  }
  const d = new Date(year, month - 1, day, hh, mm, ss);
  return isNaN(d.getTime()) ? null : d;
}

/** "75%" -> 0.75 ; "75" -> 0.75 ; "" -> 0 */
export function parsePercent(s) {
  if (!s) return 0;
  const n = parseFloat(String(s).replace('%', '').trim());
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}
