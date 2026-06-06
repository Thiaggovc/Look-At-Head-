import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Activity, ParsedExcelData } from '../types';

function fingerprint(workFront: string, title: string, desc: string): string {
  const raw = `${workFront}|${title}|${desc}`.toLowerCase().trim();
  return crypto.createHash('md5').update(raw).digest('hex');
}

function cell(sheet: XLSX.WorkSheet, r: number, c: number): string {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cel = sheet[addr];
  if (!cel || cel.v === undefined || cel.v === null) return '';
  return String(cel.w ?? cel.v).trim();
}

function cellRaw(sheet: XLSX.WorkSheet, r: number, c: number): XLSX.CellObject | undefined {
  return sheet[XLSX.utils.encode_cell({ r, c })];
}

function getMerged(sheet: XLSX.WorkSheet, r: number, c: number, merges: XLSX.Range[]): string {
  for (const m of merges) {
    if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
      return cell(sheet, m.s.r, m.s.c);
    }
  }
  return cell(sheet, r, c);
}

function isX(sheet: XLSX.WorkSheet, r: number, c: number): boolean {
  const v = cell(sheet, r, c).toLowerCase();
  return v === 'x' || v === '✓' || v === '1';
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

/**
 * Build a column→ISO-date map from the Excel header rows.
 *
 * Layout found in the target file:
 *   rowMonth  : MAY   <blank>  JUN  <blank>  JUN  ...   (month name, may span merged cells)
 *   rowDay    : 31  1  2  3  4  5  6  7  8  ...          (day numbers)
 *   rowDayName: SUN MON TUE WED THU FRI SAT SUN ...      (abbreviated day names)
 *
 * The function finds these three rows automatically and returns
 * a Map<colIndex, 'YYYY-MM-DD'>.
 */
function buildColDateMap(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range,
  dataStartCol: number,
): { colDateMap: Map<number, string>; dayColumns: number[]; dayNameRow: number; year: number } {
  const maxScanRow = Math.min(range.e.r, 25);
  const maxCol = range.e.c;

  // 1. Find the row that contains abbreviated day names (SUN/MON/... or LUN/MAR/...)
  let dayNameRow = -1;
  for (let r = 0; r <= maxScanRow; r++) {
    let matches = 0;
    for (let c = dataStartCol; c <= maxCol; c++) {
      const v = cell(sheet, r, c).toLowerCase();
      if (DAY_NAMES.has(v)) matches++;
    }
    if (matches >= 3) { dayNameRow = r; break; }
  }

  if (dayNameRow === -1) {
    // Fallback: no day name row found
    return { colDateMap: new Map(), dayColumns: [], dayNameRow: -1, year: new Date().getFullYear() };
  }

  // 2. The row just above dayNameRow should have day numbers
  const dayNumRow = dayNameRow - 1;

  // 3. Month names are in one of the rows above dayNumRow
  //    Scan up to 3 rows above to find it.
  let monthRow = -1;
  for (let offset = 1; offset <= 3; offset++) {
    const r = dayNameRow - offset;
    if (r < 0) break;
    for (let c = dataStartCol; c <= maxCol; c++) {
      const v = cell(sheet, r, c).toLowerCase().substring(0, 3);
      if (MONTH_MAP[v]) { monthRow = r; break; }
    }
    if (monthRow !== -1) break;
  }

  // 4. Determine year — look anywhere in top 10 rows for a 4-digit year
  let year = new Date().getFullYear();
  outer: for (let r = 0; r <= Math.min(range.e.r, 10); r++) {
    for (let c = 0; c <= maxCol; c++) {
      const v = cell(sheet, r, c);
      const m = v.match(/\b(20\d{2})\b/);
      if (m) { year = parseInt(m[1]); break outer; }
    }
  }

  // 5. Build column → date map
  //    Track current month by scanning monthRow left-to-right.
  const colDateMap = new Map<number, string>();
  const dayColumns: number[] = [];

  let currentMonth = 0;

  // Determine which columns are actually day columns (have a day name in dayNameRow)
  const dayColSet = new Set<number>();
  for (let c = dataStartCol; c <= maxCol; c++) {
    const v = cell(sheet, dayNameRow, c).toLowerCase();
    if (DAY_NAMES.has(v)) dayColSet.add(c);
  }

  for (let c = dataStartCol; c <= maxCol; c++) {
    // Update current month if this column has a month name
    if (monthRow >= 0) {
      const mv = cell(sheet, monthRow, c).toLowerCase().substring(0, 3);
      if (MONTH_MAP[mv]) currentMonth = MONTH_MAP[mv];
    }

    if (!dayColSet.has(c)) continue;
    dayColumns.push(c);

    // Get day number from dayNumRow
    const dayStr = cell(sheet, dayNumRow, c);
    const dayNum = parseInt(dayStr, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || currentMonth === 0) continue;

    // Handle year rollover: if month resets (e.g. DEC→JAN) increment year
    // Simple heuristic: if this month < previous month in map and not first column
    const mm = String(currentMonth).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    colDateMap.set(c, `${year}-${mm}-${dd}`);
  }

  return { colDateMap, dayColumns, dayNameRow, year };
}

/** Add n calendar days to a 'YYYY-MM-DD' string and return a new 'YYYY-MM-DD'. */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
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
  return `Upload ${new Date().toLocaleDateString()}`;
}

export interface ParseOptions {
  /** Explicit first day of the look-ahead window, 'YYYY-MM-DD'. */
  startDate?: string;
  /** Explicit last day of the look-ahead window, 'YYYY-MM-DD'. */
  endDate?: string;
}

export function parseExcelFile(
  buffer: Buffer,
  discipline: string,
  filename: string,
  snapshotId: string,
  options: ParseOptions = {},
): ParsedExcelData {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: false,
    cellNF: true,
    cellStyles: false,
    sheetStubs: true,
  });

  const allActivities: Activity[] = [];
  let weekLabel = `Upload ${new Date().toLocaleDateString()}`;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    const range = XLSX.utils.decode_range(sheet['!ref']);
    const merges: XLSX.Range[] = (sheet['!merges'] as XLSX.Range[]) || [];

    weekLabel = findWeekLabel(sheet, range);

    // Data starts at column D (index 3); schedule starts at column F (index 5)
    const DATA_COL_DESC = 3;  // D
    const DATA_COL_RES  = 4;  // E
    const DATA_COL_SCHED_START = 5; // F

    const detected = buildColDateMap(sheet, range, DATA_COL_SCHED_START);
    const dayNameRow = detected.dayNameRow;
    if (dayNameRow === -1) continue; // couldn't parse this sheet

    // Date assignment strategy:
    //   When the user supplies an explicit look-ahead window, ignore the
    //   sheet's (often stale) month/year headers entirely and assign dates
    //   by counting consecutive calendar days from `startDate`, one per
    //   day column. Columns whose date falls past `endDate` are dropped —
    //   this is what filters out leftover marks from previous versions.
    let colDateMap: Map<number, string>;
    let dayColumns: number[];

    if (options.startDate) {
      colDateMap = new Map();
      dayColumns = [];
      detected.dayColumns.forEach((col, i) => {
        const date = addDays(options.startDate!, i);
        if (!options.endDate || date <= options.endDate) {
          colDateMap.set(col, date);
          dayColumns.push(col);
        }
      });
    } else {
      // Fallback: rely on the sheet's own month/day headers
      colDateMap = detected.colDateMap;
      dayColumns = detected.dayColumns;
    }

    const dataStartRow = dayNameRow + 1;

    let currentWorkFront = '';
    let currentGeneralTitle = '';

    for (let r = dataStartRow; r <= range.e.r; r++) {
      const colB = getMerged(sheet, r, 1, merges).trim();
      const colD = cell(sheet, r, DATA_COL_DESC).trim();
      const colE = cell(sheet, r, DATA_COL_RES).trim();

      // Update work front when column B has meaningful content
      if (colB && colB.length > 0 && colB.length < 120 && !/^\d+$/.test(colB)) {
        currentWorkFront = colB;
      }

      if (!colD) continue;

      // Collect scheduled days — ONLY from confirmed day columns
      const scheduledDays: string[] = [];
      for (const c of dayColumns) {
        if (isX(sheet, r, c)) {
          const dateStr = colDateMap.get(c);
          scheduledDays.push(dateStr ?? `col_${c}`);
        }
      }

      const hasX = scheduledDays.length > 0;
      const hasResources = colE.length > 0;

      // Detect section title rows: all-caps, no X, no resources
      const looksLikeTitle = !hasX && !hasResources && colD === colD.toUpperCase() && colD.length < 60;
      if (looksLikeTitle) {
        currentGeneralTitle = colD;
        continue;
      }

      // Drop rows that contribute nothing to THIS look-ahead window:
      // no scheduled day inside the window and no resource/constraint note.
      // These are typically activities left over from previous versions.
      if (!hasX && !hasResources) continue;

      // Status
      let status: 'active' | 'blocked' | 'pending';
      if (hasX) status = 'active';
      else if (hasResources) status = 'blocked';
      else status = 'pending';

      const realDates = scheduledDays
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();
      const startDate = realDates[0] ?? null;
      const endDate   = realDates[realDates.length - 1] ?? null;
      const durationDays = realDates.length;

      const wf = currentWorkFront || 'General';

      allActivities.push({
        id: uuidv4(),
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
