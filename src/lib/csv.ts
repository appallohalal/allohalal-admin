/**
 * Lightweight RFC-4180-compatible CSV parser with UTF-8 BOM support.
 * Handles quoted fields, escaped quotes (""), embedded newlines, and comma/semicolon delimiters.
 */
export function parseCsvText(rawText: string): { headers: string[]; rows: Record<string, string>[] } {
  const text = rawText.replace(/^\uFEFF/, '');
  if (!text.trim()) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter from first line (comma vs semicolon)
  const firstNewline = text.search(/\r?\n/);
  const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline);
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';

  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell.trim());
      if (row.some((v) => v !== '')) matrix.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell.trim());
      if (row.some((v) => v !== '')) matrix.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((v) => v !== '')) {
    matrix.push(row);
  }

  if (matrix.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = matrix[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const values = matrix[r];
    if (!values.some((v) => v !== '')) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = (values[idx] ?? '').trim();
    });
    rows.push(obj);
  }

  return { headers, rows };
}

/**
 * Normalizes a header key for flexible column matching (e.g. "E-Code" -> "ecode").
 */
export function normalizeHeaderKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Picks the first matching non-empty column value from a parsed CSV row using candidate normalized keys.
 */
export function pickCsvField(row: Record<string, string>, candidates: string[]): string {
  const normalizedMap = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    normalizedMap.set(normalizeHeaderKey(k), v);
  }
  for (const candidate of candidates) {
    const val = normalizedMap.get(normalizeHeaderKey(candidate));
    if (val !== undefined && val !== '') {
      return val;
    }
  }
  return '';
}
