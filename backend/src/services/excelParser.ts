import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Activity, ParsedExcelData } from '../types';

interface CellAddress {
  r: number;
  c: number;
}

interface MergeRange {
  s: CellAddress;
  e: CellAddress;
}

function createFingerprint(workFront: string, generalTitle: string, description: string): string {
  const raw = `${workFront}|${generalTitle}|${description}`.toLowerCase().trim();
  return crypto.createHash('md5').update(raw).digest('hex');
}

function normalizeDateFromExcel(excelDate: number | string | Date): string | null {
  try {
    if (typeof excelDate === 'number') {
      const date = XLSX.SSF.parse_date_code(excelDate);
      if (date) {
        const y = date.y;
        const m = String(date.m).padStart(2, '0');
        const d = String(date.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } else if (excelDate instanceof Date) {
      return excelDate.toISOString().split('T')[0];
    } else if (typeof excelDate === 'string') {
      const parsed = new Date(excelDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function getCellValue(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  if (!cell) return '';
  if (cell.t === 'n' && cell.v !== undefined) {
    // Could be a date
    if (cell.z && (cell.z.includes('yy') || cell.z.includes('mm') || cell.z.includes('dd'))) {
      return normalizeDateFromExcel(cell.v) || String(cell.v);
    }
    return String(cell.v);
  }
  if (cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

function getRawCellValue(sheet: XLSX.WorkSheet, row: number, col: number): XLSX.CellObject | undefined {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  return sheet[addr];
}

function getMergedCellValue(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
  merges: MergeRange[]
): string {
  // Check if this cell is part of a merge, and if so return the top-left value
  for (const merge of merges) {
    if (
      row >= merge.s.r &&
      row <= merge.e.r &&
      col >= merge.s.c &&
      col <= merge.e.c
    ) {
      return getCellValue(sheet, merge.s.r, merge.s.c);
    }
  }
  return getCellValue(sheet, row, col);
}

function isXMarked(sheet: XLSX.WorkSheet, row: number, col: number): boolean {
  const val = getCellValue(sheet, row, col).toLowerCase();
  return val === 'x' || val === 'x' || val === '✓' || val === '1';
}

function detectDayColumns(
  sheet: XLSX.WorkSheet,
  headerRow: number,
  startCol: number,
  endCol: number
): { col: number; date: string | null; dayName: string }[] {
  const dayColumns: { col: number; date: string | null; dayName: string }[] = [];

  const DAY_NAMES = ['lun', 'mar', 'mié', 'mie', 'jue', 'vie', 'sáb', 'sab', 'dom',
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
    'lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado', 'domingo'];

  for (let col = startCol; col <= endCol; col++) {
    // Check current row and the row above for day/date headers
    const val = getCellValue(sheet, headerRow, col).toLowerCase().trim();
    const valAbove = headerRow > 0 ? getCellValue(sheet, headerRow - 1, col).toLowerCase().trim() : '';

    const isDay = DAY_NAMES.some(d => val.startsWith(d)) || DAY_NAMES.some(d => valAbove.startsWith(d));

    // Also check if there's a date in adjacent rows
    let dateStr: string | null = null;
    const rawCell = getRawCellValue(sheet, headerRow, col);
    if (rawCell && rawCell.t === 'n' && rawCell.z) {
      dateStr = normalizeDateFromExcel(rawCell.v as number);
    }

    if (isDay || dateStr) {
      dayColumns.push({ col, date: dateStr, dayName: val || valAbove });
    }
  }

  return dayColumns;
}

function findWeekLabel(sheet: XLSX.WorkSheet, range: XLSX.Range): string {
  const maxRow = Math.min(range.e.r, 10);
  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const val = getCellValue(sheet, r, c);
      // Look for week-related text
      if (/semana|week|wk\s*\d/i.test(val)) {
        return val.substring(0, 50);
      }
    }
  }

  // Try to find a date range like "dd/mm - dd/mm"
  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const val = getCellValue(sheet, r, c);
      if (/\d{1,2}[\/-]\d{1,2}/.test(val) && val.length < 30) {
        return val;
      }
    }
  }

  return `Upload ${new Date().toLocaleDateString()}`;
}

export function parseExcelFile(
  buffer: Buffer,
  discipline: string,
  filename: string,
  snapshotId: string
): ParsedExcelData {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: false,
    cellNF: true,
    cellStyles: false,
    sheetStubs: true,
  });

  const activities: Activity[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    const range = XLSX.utils.decode_range(sheet['!ref']);
    const merges: MergeRange[] = sheet['!merges'] || [];

    const weekLabel = findWeekLabel(sheet, range);

    // We'll scan the sheet to find the data table structure
    // Looking for:
    //   Col B (index 1): Frente de obra
    //   Col D (index 3): Activity description
    //   Col E (index 4): Resources
    //   Col F+ (index 5+): Day columns with X marks

    // Find header row - look for row containing day names or "lunes"/"lun" etc.
    let headerRow = -1;
    let dayStartCol = 5; // Default: column F (index 5)

    const DAY_PATTERNS = /^(lun|mar|mié|mie|jue|vie|sáb|sab|dom|mon|tue|wed|thu|fri|sat|sun)/i;

    for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
      let dayCount = 0;
      for (let c = 3; c <= range.e.c; c++) {
        const val = getCellValue(sheet, r, c);
        if (DAY_PATTERNS.test(val.trim())) {
          dayCount++;
          if (dayCount === 1) dayStartCol = c;
        }
      }
      if (dayCount >= 3) {
        headerRow = r;
        break;
      }
    }

    // Build date map: column -> date string
    // Try to find dates from above or in the header row
    const colDateMap: Map<number, string> = new Map();

    if (headerRow >= 0) {
      // Look for dates in rows near header
      for (let lookRow = Math.max(0, headerRow - 3); lookRow <= headerRow + 1; lookRow++) {
        for (let c = dayStartCol; c <= range.e.c; c++) {
          const cell = getRawCellValue(sheet, lookRow, c);
          if (cell && cell.t === 'n' && cell.v) {
            const dateStr = normalizeDateFromExcel(cell.v as number);
            if (dateStr) {
              colDateMap.set(c, dateStr);
            }
          } else {
            const val = getCellValue(sheet, lookRow, c);
            // Try parsing as date string
            const match = val.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
            if (match) {
              const day = match[1].padStart(2, '0');
              const month = match[2].padStart(2, '0');
              const year = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : new Date().getFullYear().toString();
              colDateMap.set(c, `${year}-${month}-${day}`);
            }
          }
        }
      }
    }

    // Determine which columns are "day" columns
    // If we found day headers, use those columns
    // Otherwise treat columns F+ as potential day columns
    let dayColumns: number[] = [];

    if (headerRow >= 0) {
      for (let c = dayStartCol; c <= range.e.c; c++) {
        const val = getCellValue(sheet, headerRow, c);
        if (DAY_PATTERNS.test(val.trim()) || colDateMap.has(c)) {
          dayColumns.push(c);
        }
      }
      // If we found the header but not many day columns, expand
      if (dayColumns.length === 0) {
        for (let c = dayStartCol; c <= Math.min(dayStartCol + 10, range.e.c); c++) {
          dayColumns.push(c);
        }
      }
    } else {
      // No header found, try from column F onwards
      for (let c = 5; c <= Math.min(range.e.c, 15); c++) {
        dayColumns.push(c);
      }
    }

    // Now scan data rows
    let currentWorkFront = '';
    let currentGeneralTitle = '';
    const dataStartRow = headerRow >= 0 ? headerRow + 1 : 1;

    for (let r = dataStartRow; r <= range.e.r; r++) {
      // Check column B for work front (Frente de obra)
      // This could be in a merged cell
      const colBVal = getMergedCellValue(sheet, r, 1, merges).trim();
      const colDVal = getCellValue(sheet, r, 3).trim();
      const colEVal = getCellValue(sheet, r, 4).trim();

      // Update work front if column B has content
      if (colBVal && colBVal.length > 0 && colBVal.length < 100) {
        // Filter out obvious non-data values
        if (!/^\d+$/.test(colBVal) && !/^(frente|front|obra|edificio|bloque|torre|sector|zona|area|área)/i.test(colBVal) || colBVal.length > 3) {
          currentWorkFront = colBVal;
        }
      }

      // Skip rows with no activity description
      if (!colDVal || colDVal.length === 0) continue;

      // Detect if this is a general title row or an activity row
      // General title rows typically: have no X in day columns and may be bold/styled
      // Or: description is short, all caps, or followed by sub-activities
      const hasXInDayColumns = dayColumns.some(c => isXMarked(sheet, r, c));
      const hasResources = colEVal.length > 0;

      // Determine if this is a section title/general title
      const looksLikeTitle = (
        !hasXInDayColumns &&
        !hasResources &&
        (colDVal === colDVal.toUpperCase() || colDVal.length < 40)
      );

      if (looksLikeTitle && !hasXInDayColumns && !hasResources) {
        currentGeneralTitle = colDVal;
        continue;
      }

      // This is an actual activity row
      // Collect scheduled days
      const scheduledDays: string[] = [];
      for (const col of dayColumns) {
        if (isXMarked(sheet, r, col)) {
          const dateStr = colDateMap.get(col);
          if (dateStr) {
            scheduledDays.push(dateStr);
          } else {
            // Use column index as day identifier if no date
            scheduledDays.push(`col_${col}`);
          }
        }
      }

      // Determine status
      let status: 'active' | 'blocked' | 'pending' = 'pending';
      if (scheduledDays.length > 0) {
        status = 'active';
      } else if (hasResources) {
        // Has resources but no schedule = blocked
        status = 'blocked';
      }

      // Compute start/end dates
      const realDates = scheduledDays.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      realDates.sort();
      const startDate = realDates.length > 0 ? realDates[0] : null;
      const endDate = realDates.length > 0 ? realDates[realDates.length - 1] : null;
      const durationDays = realDates.length;

      const workFrontToUse = currentWorkFront || 'General';

      const fingerprint = createFingerprint(workFrontToUse, currentGeneralTitle, colDVal);

      const activity: Activity = {
        id: uuidv4(),
        workFront: workFrontToUse,
        generalTitle: currentGeneralTitle,
        description: colDVal,
        resources: colEVal,
        scheduledDays,
        startDate,
        endDate,
        durationDays,
        discipline,
        status,
        sourceFile: filename,
        snapshotId,
        fingerprint,
      };

      activities.push(activity);
    }
  }

  // Determine week label from activities or sheet
  let weekLabel = 'Unknown Week';
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (firstSheet && firstSheet['!ref']) {
    const range = XLSX.utils.decode_range(firstSheet['!ref']);
    weekLabel = findWeekLabel(firstSheet, range);
  }

  return { activities, weekLabel };
}
