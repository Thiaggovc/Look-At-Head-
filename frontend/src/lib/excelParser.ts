import * as XLSX from 'xlsx';
import { Activity } from '../types';

export interface ParsedExcelData {
  activities: Activity[];
  weekLabel: string;
}

export interface ParseOptions {
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;
}

/** Simple, stable string hash (FNV-1a 32-bit) → hex. Used for fingerprinting. */
function fingerprint(workFront: string, title: string, desc: string): string {
  const raw = `${workFront}|${title}|${desc}`.toLowerCase().trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0') + raw.length.toString(16);
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function cell(sheet: XLSX.WorkSheet, r: number, c: number): string {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cel = sheet[addr];
  if (!cel || cel.v === undefined || cel.v === null) return '';
  return String(cel.w ?? cel.v).trim();
}

function getMerged(sheet: XLSX.WorkSheet, r: number, c: number, merges: XLSX.Range[]): string {
  for (const m of merges) {
    if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
      return cell(sheet, m.s.r, m.s.c);
    }
  }
  return cell(sheet, r, c);
}

// Only "x" and "✓" are valid check marks. "1" (numeric) is intentionally excluded
// because day-number header rows use "1" as the number 1, not as a checkmark.
function isX(sheet: XLSX.WorkSheet, r: number, c: number): boolean {
  const v = cell(sheet, r, c).toLowerCase();
  return v === 'x' || v === '✓';
}

const MONTH_MAP: Record<string, number> = {
  jan:1, january:1, ene:1, enero:1,
  feb:2, february:2, febrero:2,
  mar:3, march:3, marzo:3,
  apr:4, april:4, abr:4, abril:4,
  may:5, mayo:5,
  jun:6, june:6, junio:6,
  jul:7, july:7, julio:7,
  aug:8, august:8, ago:8, agosto:8,
  sep:9, september:9, septiembre:9,
  oct:10, october:10, octubre:10,
  nov:11, november:11, noviembre:11,
  dec:12, december:12, dic:12, diciembre:12,
};

const DAY_NAMES = new Set(['sun','mon','tue','wed','thu','fri','sat',
  'lun','mar','mié','mie','jue','vie','sab','sáb','dom',
  'lunes','martes','miercoles','miércoles','jueves','viernes','sabado','sábado','domingo',
  'sunday','monday','tuesday','wednesday','thursday','friday','saturday']);

function buildColDateMap(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range,
  anchor?: { year: number; month: number; day: number },
): { colDateMap: Map<number, string>; dayColumns: number[]; dayNameRow: number; year: number } {
  const maxScanRow = Math.min(range.e.r, 25);
  const maxCol = range.e.c;

  // Scan from col 0 so we catch ALL day columns regardless of template layout.
  let dayNameRow = -1;
  for (let r = 0; r <= maxScanRow; r++) {
    let matches = 0;
    for (let c = 0; c <= maxCol; c++) {
      if (DAY_NAMES.has(cell(sheet, r, c).toLowerCase())) matches++;
    }
    if (matches >= 3) { dayNameRow = r; break; }
  }

  if (dayNameRow === -1) {
    return { colDateMap: new Map(), dayColumns: [], dayNameRow: -1, year: new Date().getFullYear() };
  }

  const dayNumRow = dayNameRow - 1;

  let monthRow = -1;
  for (let offset = 1; offset <= 3; offset++) {
    const r = dayNameRow - offset;
    if (r < 0) break;
    for (let c = 0; c <= maxCol; c++) {
      const v = cell(sheet, r, c).toLowerCase().substring(0, 3);
      if (MONTH_MAP[v]) { monthRow = r; break; }
    }
    if (monthRow !== -1) break;
  }

  let year = new Date().getFullYear();
  outer: for (let r = 0; r <= Math.min(range.e.r, 10); r++) {
    for (let c = 0; c <= maxCol; c++) {
      const v = cell(sheet, r, c);
      const m = v.match(/\b(20\d{2})\b/);
      if (m) { year = parseInt(m[1]); break outer; }
    }
  }

  // Collect every column that has a day-name in the day-name row.
  const dayColumns: number[] = [];
  for (let c = 0; c <= maxCol; c++) {
    if (DAY_NAMES.has(cell(sheet, dayNameRow, c).toLowerCase())) dayColumns.push(c);
  }

  // Seed starting month from the first month label to the left of / at the first
  // day column. Fall back to the explicit anchor only when no label is found.
  let curYear = year;
  let curMonth = 0;
  if (monthRow >= 0 && dayColumns.length > 0) {
    for (let c = 0; c <= dayColumns[0]; c++) {
      const mv = cell(sheet, monthRow, c).toLowerCase().substring(0, 3);
      if (MONTH_MAP[mv]) curMonth = MONTH_MAP[mv];
    }
  }
  if (curMonth === 0 && anchor) {
    curYear = anchor.year;
    curMonth = anchor.month;
  }
  if (curMonth === 0) curMonth = new Date().getMonth() + 1;

  // Walk day columns left→right. When the day number drops (31→1) roll the month.
  const colDateMap = new Map<number, string>();
  let prevDay = 0;
  for (const c of dayColumns) {
    const dayNum = parseInt(cell(sheet, dayNumRow, c), 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) { prevDay = 0; continue; }

    if (prevDay && dayNum < prevDay) {
      curMonth++;
      if (curMonth > 12) { curMonth = 1; curYear++; }
    }
    prevDay = dayNum;

    colDateMap.set(c, `${curYear}-${String(curMonth).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`);
  }

  return { colDateMap, dayColumns, dayNameRow, year: curYear };
}

function findWeekLabel(sheet: XLSX.WorkSheet, range: XLSX.Range): string {
  for (let r = 0; r <= Math.min(range.e.r, 10); r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const v = cell(sheet, r, c);
      if (/week|semana|look\s*ahead/i.test(v) && v.length > 5) {
        return v.substring(0, 80);
      }
    }
  }
  for (let r = 0; r <= Math.min(range.e.r, 10); r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const v = cell(sheet, r, c);
      if (/\d{1,2}[\/-]\d{1,2}/.test(v) && v.length < 40) return v;
    }
  }
  return `Carga ${new Date().toLocaleDateString()}`;
}

/** Parse an Excel file (as ArrayBuffer) entirely in the browser. */
export function parseExcelFile(
  data: ArrayBuffer,
  discipline: string,
  filename: string,
  snapshotId: string,
  options: ParseOptions = {},
): ParsedExcelData {
  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: false,
    cellNF: true,
    cellStyles: false,
    sheetStubs: true,
  });

  const allActivities: Activity[] = [];
  let weekLabel = `Carga ${new Date().toLocaleDateString()}`;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    const range = XLSX.utils.decode_range(sheet['!ref']);
    const merges: XLSX.Range[] = (sheet['!merges'] as XLSX.Range[]) || [];

    weekLabel = findWeekLabel(sheet, range);

    let anchor: { year: number; month: number; day: number } | undefined;
    if (options.startDate) {
      const [ay, am, ad] = options.startDate.split('-').map(Number);
      anchor = { year: ay, month: am, day: ad };
    }

    const detected = buildColDateMap(sheet, range, anchor);
    const dayNameRow = detected.dayNameRow;
    if (dayNameRow === -1) continue;

    // Auto-detect column positions from the first day column.
    // Pattern (works across templates):
    //   col (dayStart-2) = description
    //   col (dayStart-1) = resources
    //   col 0..(dayStart-3) = workFront candidates (section headers / merged cells)
    const dayStartCol = detected.dayColumns[0] ?? 5;
    const descCol = Math.max(0, dayStartCol - 2);
    const resCol  = Math.max(0, dayStartCol - 1);
    // When descCol == 0 there is no dedicated workFront column; section-header rows
    // detected inline in descCol will update currentWorkFront directly.
    const hasWfColumn = descCol > 0;

    // Apply window filter: keep only day columns within [startDate, endDate].
    let colDateMap: Map<number, string>;
    let dayColumns: number[];

    if (options.startDate || options.endDate) {
      colDateMap = new Map();
      dayColumns = [];
      for (const col of detected.dayColumns) {
        const date = detected.colDateMap.get(col);
        if (!date) continue;
        if (options.startDate && date < options.startDate) continue;
        if (options.endDate   && date > options.endDate)   continue;
        colDateMap.set(col, date);
        dayColumns.push(col);
      }
    } else {
      colDateMap = detected.colDateMap;
      dayColumns = detected.dayColumns;
    }

    const dataStartRow = dayNameRow + 1;
    let currentWorkFront = '';
    let currentGeneralTitle = '';

    for (let r = dataStartRow; r <= range.e.r; r++) {

      // ── WorkFront from dedicated column(s) left of descCol ──────────────────
      if (hasWfColumn) {
        // Scan every column between 0 and descCol-1 (inclusive) for section labels.
        // Use getMerged so merged-cell headers are picked up correctly.
        for (let c = 0; c < descCol; c++) {
          const v = getMerged(sheet, r, c, merges).trim();
          if (v && v.length < 120 && !/^\d+$/.test(v)) {
            currentWorkFront = v;
            break;
          }
        }
      }

      const colD = cell(sheet, r, descCol).trim();
      const colE = resCol !== descCol ? cell(sheet, r, resCol).trim() : '';

      if (!colD) continue;

      // ── Check X marks in day columns ────────────────────────────────────────
      const scheduledDays: string[] = [];
      for (const c of dayColumns) {
        if (isX(sheet, r, c)) {
          scheduledDays.push(colDateMap.get(c) ?? `col_${c}`);
        }
      }

      const hasX         = scheduledDays.length > 0;
      const hasResources = colE.length > 0;

      // ── Section-header detection ─────────────────────────────────────────────
      // A row qualifies as a section header when it has no X marks, no resources,
      // and its description text is short ALL-CAPS (typical of group labels).
      const looksLikeHeader =
        !hasX && !hasResources &&
        colD === colD.toUpperCase() &&
        colD.length > 1 && colD.length < 80;

      if (looksLikeHeader) {
        if (hasWfColumn) {
          // Template has a dedicated workFront column → treat as generalTitle label.
          currentGeneralTitle = colD;
        } else {
          // Compact template (descCol == 0) → no separate column, section labels
          // appear inline and act as workFront separators.
          currentWorkFront = colD;
        }
        continue;
      }

      if (!hasX && !hasResources) continue;

      let status: 'active' | 'blocked' | 'pending';
      if (hasX) status = 'active';
      else if (hasResources) status = 'blocked';
      else status = 'pending';

      const realDates = scheduledDays
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();
      const startDate    = realDates[0] ?? null;
      const endDate      = realDates[realDates.length - 1] ?? null;
      const durationDays = realDates.length;

      const wf = currentWorkFront || 'General';

      allActivities.push({
        id: uuid(),
        workFront: wf,
        generalTitle: currentGeneralTitle,
        description: colD,
        resources: colE,
        scheduledDays,
        startDate,
        endDate,
        durationDays,
        discipline,
        status,
        sourceFile: filename,
        snapshotId,
        fingerprint: fingerprint(wf, currentGeneralTitle, colD),
      });
    }
  }

  return { activities: allActivities, weekLabel };
}

export { fingerprint, uuid };
