import * as XLSX from 'xlsx-js-style';
import JSZip from 'jszip';

export const C = {
  pageBg: 'FFFFFF', border: 'E5E5EA', text: '1D1D1F', textLight: '86868B',
  headerBg: 'F2F3F7', headerFg: '2C2C2E', chartLine: '1973E8', chartDark: '1D6FB8',
  status: {
    '已投递': { bg: 'F2F3F5', fg: '5F6368' }, '在线测评': { bg: 'E8F4FD', fg: '1973E8' },
    'AI面': { bg: 'EEF2FF', fg: '4F46E5' }, '一面': { bg: 'EEF2FF', fg: '4F46E5' },
    '二面': { bg: 'EEF2FF', fg: '4F46E5' }, 'HR面': { bg: 'E6F4EA', fg: '1E7E34' },
    'Offer': { bg: 'F0F7F2', fg: '2E7D47' }, '已拒绝': { bg: 'FDECEE', fg: 'C93B47' },
    '已放弃': { bg: 'FDECEE', fg: 'C93B47' }, '待投递': { bg: 'FEF7EB', fg: 'B25E09' },
    '待跟进': { bg: 'FAF4EF', fg: 'B25E28' }, '人才库': { bg: 'F2F3F5', fg: '5F6368' },
  } as Record<string, { bg: string; fg: string }>,
};

export function style(bg = C.pageBg, fg = C.text, sz = 10, bold = false, line = true) {
  return {
    font: { name: '微软雅黑', sz, bold, color: { rgb: fg } },
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: line ? { bottom: { style: 'thin', color: { rgb: C.border } } } : {},
  };
}

export function cell(ws: XLSX.WorkSheet, row: number, col: number, value: unknown, s = style()) {
  const v = value == null || (typeof value === 'number' && !Number.isFinite(value)) ? '' : value;
  ws[XLSX.utils.encode_cell({ r: row - 1, c: col })] = { v, t: typeof v === 'number' ? 'n' : 's', s } as XLSX.CellObject;
}

export function merged(ws: XLSX.WorkSheet, row: number, first: number, last: number, value: unknown, s = style()) {
  for (let c = first; c <= last; c++) cell(ws, row, c, c === first ? value : '', s);
  (ws['!merges'] ??= []).push({ s: { r: row - 1, c: first }, e: { r: row - 1, c: last } });
}

export const pct = (n: number, total: number) => `${(total ? n / total * 100 : 0).toFixed(1)}%`;
export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function displayWidth(value: unknown): number {
  return Math.max(0, ...String(value ?? '').split(/\r?\n/).map(line => [...line].reduce((n, ch) => n + (ch.codePointAt(0)! > 255 ? 2 : 1), 0)));
}

export function distribution(ws: XLSX.WorkSheet, row: number, col: number, headers: string[], rows: [string, number][], total: number) {
  headers.forEach((h, i) => cell(ws, row, col + i, h, style(C.headerBg, C.headerFg, 10.5, true)));
  rows.forEach(([label, n], i) => {
    const s = style(i % 2 === 0 ? 'FBFBFC' : 'FFFFFF');
    cell(ws, row + i + 1, col, label, s);
    cell(ws, row + i + 1, col + 1, n, s);
    cell(ws, row + i + 1, col + 2, total ? n / total : 0, s);
    ws[XLSX.utils.encode_cell({ r: row + i, c: col + 2 })].z = '0.0%';
    const colors = headers[0] === '状态' ? C.status[label] : undefined;
    if (colors) cell(ws, row + i + 1, col, label, style(colors.bg, colors.fg, 10, true));
  });
}

export function metricCard(ws: XLSX.WorkSheet, row: number, col: number, width: number, label: string, value: number, detail: string, bg: string, fg: string) {
  merged(ws, row, col, col + width - 1, label, style(bg, fg, 10, true, false));
  merged(ws, row + 1, col, col + width - 1, value, style(bg, fg, 26, true, false));
  merged(ws, row + 2, col, col + width - 1, detail, style(bg, fg, 9, false, false));
}

export function detailSheet(title: string, headers: string[], values: unknown[][], widths: number[]) {
  const ws: XLSX.WorkSheet = {};
  merged(ws, 1, 1, headers.length, title, style('FFFFFF', C.text, 16, true, false));
  headers.forEach((h, i) => cell(ws, 2, i + 1, h, style(C.headerBg, C.headerFg, 10.5, true)));
  ws['!rows'] = [{ hpt: 36 }, { hpt: 30 }];
  values.forEach((row, i) => {
    let lines = 1;
    row.forEach((value, c) => {
      cell(ws, i + 3, c + 1, value, style(i % 2 === 0 ? 'FBFBFC' : 'FFFFFF', C.text, 10, c === 0));
      lines = Math.max(lines, Math.ceil(displayWidth(value) / Math.max(1, widths[c] - 2)), String(value ?? '').split('\n').length);
    });
    ws['!rows']!.push({ hpt: Math.min(409, Math.max(36, lines * 15 + 12)) });
  });
  ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 1 }, { r: Math.max(1, values.length + 1), c: headers.length });
  ws['!cols'] = [4, ...widths].map(wch => ({ wch }));
  if (values.length) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ r: 1, c: 1 }, { r: values.length + 1, c: headers.length }) };
  return ws;
}

export async function styleWorkbookPackage(wb: XLSX.WorkBook, frozenSheets: number[]) {
  const zip = await JSZip.loadAsync(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer);
  for (let i = 1; i <= wb.SheetNames.length; i++) {
    const path = `xl/worksheets/sheet${i}.xml`;
    let xml = await zip.file(path)!.async('text');
    const pane = frozenSheets.includes(i) ? '<pane xSplit="1" ySplit="2" topLeftCell="B3" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B3" sqref="B3"/>' : '';
    const view = `<sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>`;
    xml = /<sheetViews[\s>]/.test(xml) ? xml.replace(/<sheetViews\b[^>]*>[\s\S]*?<\/sheetViews>/, view) : xml.replace(/(<dimension\b[^>]*\/>)/, `$1${view}`);
    zip.file(path, xml);
  }
  return zip;
}

export function downloadExcel(out: ArrayBuffer, name: string) {
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
