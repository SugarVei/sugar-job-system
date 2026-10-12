import type { Application } from '../types';

export const EXCEL_PROGRESS_STEPS = ['待投递', '已投递', '在线测评', 'AI面', 'HR面', '一面', '二面', 'Offer'] as const;
export const EXCEL_PROGRESS_WIDTH = 104;

export function progressRank(status: string): number {
  const index = (EXCEL_PROGRESS_STEPS as readonly string[]).indexOf(status);
  if (index >= 0) return index;
  return ({ 待跟进: -1, 人才库: -2, 已拒绝: -3, 已放弃: -4 } as Record<string, number>)[status] ?? -5;
}

function dateRank(value: string | null): number {
  if (!value) return 0;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return 0;
  const [, y, m, d] = match;
  const timestamp = Date.UTC(+y, +m - 1, +d);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === +y && date.getUTCMonth() === +m - 1 && date.getUTCDate() === +d ? timestamp : 0;
}

/** Sort only the exported copy; keep the in-app records and stable ties unchanged. */
export function sortApplicationsByProgress(items: Application[]): Application[] {
  return items.map((item, index) => ({ item, index })).sort((a, b) =>
    progressRank(b.item.status) - progressRank(a.item.status)
    || dateRank(b.item.apply_date) - dateRank(a.item.apply_date)
    || a.index - b.index).map(entry => entry.item);
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]!));
}

function emu(px: number) { return Math.round(px * 9525); }

/** Native editable DrawingML groups, anchored inside the status cells in column G. */
export function progressDrawingXml(rows: { status: string; height: number }[]): string | null {
  let id = 1;
  const width = EXCEL_PROGRESS_WIDTH * 7 + 5 - 24;
  const height = 50;
  const stepWidth = width / 8;
  const diameter = 22;
  const anchors: string[] = [];
  const shape = (name: string, x: number, y: number, w: number, h: number, geometry: string,
    fill: string | null, value = '', color = '1D1D1F', size = 9, bold = false) => {
    const identifier = id++;
    const fillXml = fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>';
    const body = value ? `<xdr:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="zh-CN" sz="${Math.round(size * 100)}" b="${bold ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:rPr><a:t>${escapeXml(value)}</a:t></a:r><a:endParaRPr lang="zh-CN"/></a:p></xdr:txBody>` : '';
    return `<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="${identifier}" name="${escapeXml(name)}"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="${geometry}"><a:avLst/></a:prstGeom>${fillXml}<a:ln><a:noFill/></a:ln></xdr:spPr>${body}</xdr:sp>`;
  };
  rows.forEach(({ status, height: rowHeight }, index) => {
    const current = (EXCEL_PROGRESS_STEPS as readonly string[]).indexOf(status);
    if (current < 0) return;
    const row = index + 2;
    const offset = Math.max(8, (rowHeight * 4 / 3 - height) / 2);
    const active = status === 'Offer' ? '2E7D47' : status === 'HR面' ? '1E7E34' : ['AI面', '一面'].includes(status) ? '6351A2' : status === '二面' || status === '在线测评' ? '1D6FB8' : '1D1D1F';
    const groupId = id++;
    let children = '';
    for (let i = 0; i < 7; i++) {
      children += shape(`连接线 ${i + 1}`, stepWidth * (i + .5) + diameter / 2, 10, stepWidth - diameter, 1.5, 'rect', i < current ? 'B8B8BD' : 'E5E5EA');
    }
    EXCEL_PROGRESS_STEPS.forEach((step, i) => {
      children += shape(`阶段 ${i + 1}`, stepWidth * (i + .5) - diameter / 2, 0, diameter, diameter, 'ellipse', i < current ? '1D1D1F' : i === current ? active : 'E5E5EA', String(i + 1), i <= current ? 'FFFFFF' : '86868B', 10, true);
      children += shape(`阶段名称 ${i + 1}`, i * stepWidth, 29, stepWidth, 19, 'rect', null, step, i === current ? '1D1D1F' : '86868B', 8.5, i === current);
    });
    anchors.push(`<xdr:twoCellAnchor editAs="twoCell"><xdr:from><xdr:col>6</xdr:col><xdr:colOff>${emu(12)}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${emu(offset)}</xdr:rowOff></xdr:from><xdr:to><xdr:col>6</xdr:col><xdr:colOff>${emu(width + 12)}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${emu(offset + height)}</xdr:rowOff></xdr:to><xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="${groupId}" name="投递进度 ${index + 1}" descr="${escapeXml(status)}"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr><xdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(width)}" cy="${emu(height)}"/><a:chOff x="0" y="0"/><a:chExt cx="${emu(width)}" cy="${emu(height)}"/></a:xfrm></xdr:grpSpPr>${children}</xdr:grpSp><xdr:clientData/></xdr:twoCellAnchor>`);
  });
  return anchors.length ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors.join('')}</xdr:wsDr>` : null;
}
