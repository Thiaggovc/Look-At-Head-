// Client-side PDF export. We render a print-optimized HTML document in a new
// window and trigger the browser's print dialog ("Save as PDF"). This needs no
// external dependency and paginates automatically, so it handles any number of
// days while keeping the sticky notes legible.

import { Activity, STATUS_CONFIG } from '../types';

export interface PdfColumn {
  title: string;
  subtitle?: string;
  activities: Activity[];
}

interface PdfMeta {
  projectName: string;
  groupLabel: string;
}

const STATUS_COLOR: Record<Activity['status'], string> = {
  active: '#28A745',
  blocked: '#D94B4B',
  pending: '#D7A700',
};

function esc(s: string): string {
  return (s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function cardHtml(a: Activity): string {
  const color = STATUS_COLOR[a.status];
  const statusLabel = STATUS_CONFIG[a.status]?.label ?? a.status;
  return `
    <div class="card" style="border-left:4px solid ${color}">
      <div class="card-wf">${esc(a.workFront)}</div>
      <div class="card-desc">${esc(a.description)}</div>
      ${a.resources ? `<div class="card-res">🔧 ${esc(a.resources)}</div>` : ''}
      <div class="card-foot">
        <span class="badge" style="background:${color}1a;color:${color}">${esc(statusLabel)}</span>
        <span class="disc">${esc(a.discipline)}</span>
      </div>
    </div>`;
}

function columnHtml(col: PdfColumn): string {
  return `
    <div class="col">
      <div class="col-head">
        <div class="col-title">${esc(col.title)}</div>
        ${col.subtitle ? `<div class="col-sub">${esc(col.subtitle)}</div>` : ''}
        <div class="col-count">${col.activities.length}</div>
      </div>
      <div class="col-body">
        ${col.activities.map(cardHtml).join('') || '<div class="empty">Sin actividades</div>'}
      </div>
    </div>`;
}

export function exportBoardToPdf(columns: PdfColumn[], meta: PdfMeta): void {
  const total = columns.reduce((n, c) => n + c.activities.length, 0);
  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" />
<title>${esc(meta.projectName)} — Look Ahead</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1F2937; margin: 0; padding: 16px; }
  .head { display: flex; align-items: baseline; gap: 12px; border-bottom: 2px solid #F5A623; padding-bottom: 8px; margin-bottom: 14px; }
  .head h1 { font-size: 18px; margin: 0; color: #B36B00; }
  .head .meta { font-size: 11px; color: #6B7280; margin-left: auto; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
  .col { width: 180px; border: 1px solid #E5D6B8; border-radius: 8px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .col-head { background: #FCEFD3; padding: 6px 8px; position: relative; }
  .col-title { font-size: 12px; font-weight: 700; color: #7A5800; }
  .col-sub { font-size: 9px; color: #9A7B30; }
  .col-count { position: absolute; top: 6px; right: 8px; font-size: 10px; font-weight: 700; background: #fff; border-radius: 99px; padding: 1px 7px; color: #7A5800; }
  .col-body { padding: 6px; display: flex; flex-direction: column; gap: 6px; background: #FFFBF2; }
  .card { background: #fff; border: 1px solid #EEE; border-radius: 6px; padding: 6px 8px; break-inside: avoid; page-break-inside: avoid; }
  .card-wf { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: #9A7B30; }
  .card-desc { font-size: 10px; font-weight: 600; line-height: 1.25; margin: 2px 0; }
  .card-res { font-size: 8.5px; color: #6B7280; margin-bottom: 3px; }
  .card-foot { display: flex; align-items: center; gap: 5px; }
  .badge { font-size: 7.5px; font-weight: 700; border-radius: 99px; padding: 1px 6px; }
  .disc { font-size: 7.5px; color: #9CA3AF; }
  .empty { font-size: 9px; color: #B0A88F; text-align: center; padding: 8px 0; }
</style></head>
<body>
  <div class="head">
    <h1>${esc(meta.projectName)}</h1>
    <span class="meta">${columns.length} ${esc(meta.groupLabel)} · ${total} actividades · ${esc(today)}</span>
  </div>
  <div class="grid">${columns.map(columnHtml).join('')}</div>
  <script>window.onload = function(){ window.focus(); window.print(); };</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Permite las ventanas emergentes para exportar el PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
