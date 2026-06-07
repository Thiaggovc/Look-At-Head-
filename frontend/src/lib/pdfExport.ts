import { Activity, STATUS_CONFIG } from '../types';

export interface PdfColumn {
  title: string;
  subtitle?: string;
  dateKey?: string;       // YYYY-MM-DD — present when groupBy === 'endDate'
  activities: Activity[];
}

export interface PdfMeta {
  projectName: string;
  groupLabel: string;
  calendarMode?: boolean; // true when grouped by endDate
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return (s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const STATUS_COLORS: Record<Activity['status'], { accent: string; light: string; label: string }> = {
  active:  { accent: '#1E9E6B', light: '#e6f7f1', label: 'Activa'    },
  blocked: { accent: '#D44B2F', light: '#fdecea', label: 'Bloqueada' },
  pending: { accent: '#C79500', light: '#fef8e1', label: 'Pendiente' },
};

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── card HTML ───────────────────────────────────────────────────────────────

function stickyHtml(a: Activity): string {
  const { accent, light } = STATUS_COLORS[a.status];
  const statusLabel = STATUS_COLORS[a.status].label;
  const disc = esc(a.discipline || '');
  const wf   = esc(a.workFront  || '');
  const desc = esc(a.description || '');
  const res  = esc(a.resources  || '');
  return `
    <div class="sticky" style="border-left:3px solid ${accent};">
      ${wf ? `<div class="s-wf">${wf}</div>` : ''}
      <div class="s-desc">${desc}</div>
      ${res ? `<div class="s-res">${res}</div>` : ''}
      <div class="s-foot">
        <span class="s-badge" style="background:${light};color:${accent};">${statusLabel}</span>
        ${disc ? `<span class="s-disc">${disc}</span>` : ''}
      </div>
    </div>`;
}

// ─── CALENDAR mode ────────────────────────────────────────────────────────────
// Fills every day between earliest and latest date, groups into calendar weeks.

function calendarHtml(columns: PdfColumn[]): string {
  // Build map dateKey → activities
  const byDate = new Map<string, Activity[]>();
  let minDate: Date | null = null, maxDate: Date | null = null;

  for (const col of columns) {
    const key = col.dateKey;
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    byDate.set(key, col.activities);
    const d = parseDate(key);
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  }

  if (!minDate || !maxDate) return '<p style="color:#999;font-size:12px">Sin datos de fecha.</p>';

  // Extend range to full weeks (Mon–Sun)
  const startMonday = new Date(minDate);
  while (startMonday.getDay() !== 1) startMonday.setDate(startMonday.getDate() - 1);
  const endSunday = new Date(maxDate);
  while (endSunday.getDay() !== 0) endSunday.setDate(endSunday.getDate() + 1);

  // Build list of all days
  type DayCell = { date: Date; key: string; inRange: boolean; acts: Activity[] };
  const days: DayCell[] = [];
  let cur = new Date(startMonday);
  while (cur <= endSunday) {
    const key = formatDate(cur);
    const inRange = cur >= minDate && cur <= maxDate;
    days.push({ date: new Date(cur), key, inRange, acts: byDate.get(key) ?? [] });
    cur = addDays(cur, 1);
  }

  // Group into weeks (rows of 7)
  const weeks: DayCell[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i+7));

  // DOW header
  const dowHeader = `
    <tr class="dow-row">
      ${DOW_LABELS.slice(1).concat(DOW_LABELS[0]).map(d =>
        `<th class="dow-cell">${d}</th>`
      ).join('')}
    </tr>`;

  // Week rows — inject a "month label" row when month changes
  let lastMonth = -1;
  const weekRows = weeks.map(week => {
    const firstInRange = week.find(d => d.inRange);
    let monthRow = '';
    if (firstInRange && firstInRange.date.getMonth() !== lastMonth) {
      lastMonth = firstInRange.date.getMonth();
      const m = MONTH_LABELS[lastMonth];
      const y = firstInRange.date.getFullYear();
      monthRow = `<tr><td colspan="7" class="month-label">${m} ${y}</td></tr>`;
    }

    const cells = week.map(({ date, inRange, acts }) => {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isEmpty   = !inRange;
      const dayNum    = date.getDate();
      const hasActs   = acts.length > 0;

      const classes = [
        'day-cell',
        isWeekend  ? 'weekend' : '',
        isEmpty    ? 'out-of-range' : '',
        hasActs    ? 'has-acts' : '',
      ].filter(Boolean).join(' ');

      const dayHeader = isEmpty
        ? `<div class="day-num ghost">${dayNum}</div>`
        : `<div class="day-num${isWeekend ? ' weekend-num' : ''}">${dayNum}</div>`;

      const cards = inRange && hasActs
        ? acts.map(stickyHtml).join('')
        : (inRange ? '<div class="day-empty">—</div>' : '');

      return `<td class="${classes}">${dayHeader}${cards}</td>`;
    }).join('');

    return monthRow + `<tr class="week-row">${cells}</tr>`;
  }).join('');

  return `
    <table class="calendar">
      <thead>${dowHeader}</thead>
      <tbody>${weekRows}</tbody>
    </table>`;
}

// ─── GRID mode (non-date groupBy) ────────────────────────────────────────────

function gridHtml(columns: PdfColumn[]): string {
  return `<div class="col-grid">${columns.map(col => {
    const count = col.activities.length;
    return `
      <div class="gcol">
        <div class="gcol-head">
          <span class="gcol-title">${esc(col.title)}</span>
          ${col.subtitle ? `<span class="gcol-sub">${esc(col.subtitle)}</span>` : ''}
          <span class="gcol-badge">${count}</span>
        </div>
        <div class="gcol-body">
          ${count ? col.activities.map(stickyHtml).join('') : '<div class="day-empty">Sin actividades</div>'}
        </div>
      </div>`;
  }).join('')}</div>`;
}

// ─── main export ─────────────────────────────────────────────────────────────

export function exportBoardToPdf(columns: PdfColumn[], meta: PdfMeta): void {
  const total   = columns.reduce((n, c) => n + c.activities.length, 0);
  const today   = new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });
  const isCalendar = meta.calendarMode === true;

  const bodyHtml = isCalendar ? calendarHtml(columns) : gridHtml(columns);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(meta.projectName)} — Look a head</title>
<style>
/* ── print config ── */
@page { size: A4 landscape; margin: 7mm 8mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* ── page base ── */
body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #f0eee9;
  margin: 0; padding: 0;
  color: #1a1714;
  font-size: 10px;
}

/* ── page header ── */
.page-head {
  display: flex; align-items: center; gap: 14px;
  padding: 8px 12px 8px;
  background: linear-gradient(135deg,rgba(255,255,255,0.92) 0%, rgba(255,253,245,0.85) 100%);
  border: 1px solid rgba(210,185,130,0.45);
  border-radius: 12px; margin-bottom: 9px;
  box-shadow: 0 2px 12px rgba(180,140,60,0.12), inset 0 1px 0 rgba(255,255,255,0.9);
}
.head-logo {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  background: linear-gradient(150deg,#D09A20,#E8C050);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(200,150,20,0.35);
  color: #fff; font-size: 18px; font-weight: 700;
}
.head-text h1 { font-size: 16px; font-weight: 750; margin: 0; letter-spacing: 0.14em; color: #2d2510; }
.head-text p  { font-size: 9px; color: #9a8860; margin: 1px 0 0; }
.head-meta { margin-left: auto; text-align: right; }
.head-meta .m-label { font-size: 9px; color: #b09060; }
.head-meta .m-val   { font-size: 11px; font-weight: 700; color: #4a3810; }

/* ── calendar wrapper ── */
.calendar {
  width: 100%; border-collapse: separate; border-spacing: 3px;
}

/* ── DOW header ── */
.dow-row th.dow-cell {
  font-size: 8px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: #9a8860;
  padding: 3px 5px; text-align: left;
  background: rgba(255,255,255,0.5);
  border-radius: 5px 5px 0 0;
}

/* ── month label row ── */
.month-label {
  font-size: 11px; font-weight: 700; color: #7a5c10;
  letter-spacing: 0.06em; padding: 7px 4px 2px;
  text-transform: uppercase;
}

/* ── day cell ── */
.day-cell {
  vertical-align: top;
  width: 14.28%;
  min-height: 68px;
  padding: 5px 5px 6px;
  border-radius: 8px;
  background: linear-gradient(160deg, rgba(255,255,255,0.88) 0%, rgba(255,253,248,0.78) 100%);
  border: 1px solid rgba(220,200,155,0.40);
  box-shadow: 0 1px 4px rgba(180,150,80,0.08), inset 0 1px 0 rgba(255,255,255,0.75);
}
.day-cell.weekend {
  background: linear-gradient(160deg, rgba(245,243,255,0.85) 0%, rgba(238,234,255,0.72) 100%);
  border-color: rgba(180,165,225,0.35);
}
.day-cell.out-of-range {
  background: rgba(235,232,225,0.30);
  border: 1px dashed rgba(190,180,160,0.35);
  box-shadow: none;
}
.day-cell.has-acts {
  box-shadow: 0 2px 8px rgba(180,150,80,0.14), inset 0 1px 0 rgba(255,255,255,0.85);
}

/* ── day number ── */
.day-num {
  font-size: 15px; font-weight: 750; color: #3a2e18;
  line-height: 1; margin-bottom: 4px; letter-spacing: -0.02em;
}
.day-num.ghost       { color: rgba(150,140,120,0.35); }
.day-num.weekend-num { color: #6a5898; }
.day-empty { font-size: 9px; color: rgba(150,140,120,0.5); padding: 2px 0; }

/* ── sticky note card ── */
.sticky {
  background: linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(253,251,245,0.90) 100%);
  border-radius: 6px; padding: 5px 6px 4px;
  margin-bottom: 4px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.9);
  break-inside: avoid; page-break-inside: avoid;
}
.s-wf   { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #9a8060; margin-bottom: 1px; }
.s-desc { font-size: 9px; font-weight: 640; line-height: 1.3; color: #1a1714; }
.s-res  { font-size: 7.5px; color: #7a7060; margin-top: 2px; }
.s-foot { display: flex; align-items: center; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
.s-badge { font-size: 7px; font-weight: 700; border-radius: 99px; padding: 1px 5px; }
.s-disc  { font-size: 7px; color: #aaa090; }

/* ── non-calendar grid mode ── */
.col-grid { display: flex; flex-wrap: wrap; gap: 7px; align-items: flex-start; }
.gcol { width: 168px; border-radius: 10px; overflow: hidden; break-inside: avoid; page-break-inside: avoid;
  box-shadow: 0 2px 10px rgba(180,150,80,0.12); border: 1px solid rgba(220,200,155,0.40); }
.gcol-head { background: linear-gradient(135deg,rgba(255,248,225,0.95),rgba(255,243,200,0.90));
  padding: 6px 8px; display: flex; align-items: center; gap: 5px; border-bottom: 1px solid rgba(220,200,155,0.4); }
.gcol-title { font-size: 11px; font-weight: 700; color: #5a4010; flex: 1; }
.gcol-sub   { font-size: 8px; color: #9a8060; }
.gcol-badge { font-size: 9px; font-weight: 700; background: rgba(255,255,255,0.8); border-radius: 99px; padding: 1px 7px; color: #7a5800; }
.gcol-body  { background: rgba(255,254,248,0.9); padding: 5px 6px; display: flex; flex-direction: column; gap: 5px; }

/* ── print ── */
@media print { body { background: white; } }
</style>
</head>
<body>

  <div class="page-head">
    <div class="head-logo">L</div>
    <div class="head-text">
      <h1>Look a head</h1>
      <p>Planning Manager</p>
    </div>
    <div style="width:1px;height:30px;background:rgba(200,180,120,0.35);margin:0 4px;"></div>
    <div class="head-text">
      <h1 style="font-size:13px;letter-spacing:0">${esc(meta.projectName)}</h1>
      <p>${esc(isCalendar ? 'Vista calendario' : `Por ${esc(meta.groupLabel)}`)}</p>
    </div>
    <div class="head-meta">
      <div class="m-label">Actividades</div>
      <div class="m-val">${total}</div>
    </div>
    <div style="width:1px;height:30px;background:rgba(200,180,120,0.35);margin:0 4px;"></div>
    <div class="head-meta">
      <div class="m-label">Exportado</div>
      <div class="m-val" style="font-size:9px;font-weight:600">${esc(today)}</div>
    </div>
  </div>

  ${bodyHtml}

  <script>window.onload=function(){window.focus();window.print();};</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Permite las ventanas emergentes para exportar el PDF.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
