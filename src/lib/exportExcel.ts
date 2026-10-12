import * as XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import type { Application } from '../types';
import { APPLICATION_STATUSES } from './applicationStatus';
import { EXCEL_PROGRESS_WIDTH, progressRank, sortApplicationsByProgress, progressDrawingXml } from './excelProgress';

const C = {
  pageBg: 'FFFFFF', border: 'E5E5EA', text: '1D1D1F', textLight: '86868B',
  headerBg: 'F2F3F7', headerFg: '2C2C2E', chartLine: '1973E8', chartDark: '1D6FB8',
  status: {
    '已投递': { bg: 'F2F3F5', fg: '5F6368' },
    '在线测评': { bg: 'E8F4FD', fg: '1973E8' },
    'AI面': { bg: 'EEF2FF', fg: '4F46E5' },
    '一面': { bg: 'EEF2FF', fg: '4F46E5' },
    '二面': { bg: 'EEF2FF', fg: '4F46E5' },
    'HR面': { bg: 'E6F4EA', fg: '1E7E34' },
    'Offer': { bg: 'F0F7F2', fg: '2E7D47' },
    '已拒绝': { bg: 'FDECEE', fg: 'C93B47' },
    '已放弃': { bg: 'FDECEE', fg: 'C93B47' },
    '待投递': { bg: 'FEF7EB', fg: 'B25E09' },
    '待跟进': { bg: 'FAF4EF', fg: 'B25E28' },
    '人才库': { bg: 'F2F3F5', fg: '5F6368' },
  } as Record<string, { bg: string; fg: string }>,
};

function style(bg = C.pageBg, fg = C.text, sz = 10, bold = false, line = true) {
  return {
    font: { name: '微软雅黑', sz, bold, color: { rgb: fg } },
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: line ? { bottom: { style: 'thin', color: { rgb: C.border } } } : {},
  };
}

function cell(ws: XLSX.WorkSheet, row: number, col: number, value: unknown, s = style()) {
  const v = value == null || (typeof value === 'number' && !Number.isFinite(value)) ? '' : value;
  ws[XLSX.utils.encode_cell({ r: row - 1, c: col })] = {
    v, t: typeof v === 'number' ? 'n' : 's', s,
  } as XLSX.CellObject;
}

function merged(ws: XLSX.WorkSheet, row: number, first: number, last: number, value: unknown, s = style()) {
  for (let c = first; c <= last; c++) cell(ws, row, c, c === first ? value : '', s);
  (ws['!merges'] ??= []).push({ s: { r: row - 1, c: first }, e: { r: row - 1, c: last } });
}

function pct(n: number, total: number) {
  return `${(total ? n / total * 100 : 0).toFixed(1)}%`;
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekKey(dateStr: string): string | null {
  // Date-only application dates must keep their calendar day in every timezone.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(+y, +m - 1, +d));
  if (date.getUTCFullYear() !== +y || date.getUTCMonth() !== +m - 1 || date.getUTCDate() !== +d) return null;
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function counts(items: Application[], pick: (a: Application) => string | null) {
  const result = new Map<string, number>();
  for (const app of items) {
    const key = pick(app)?.trim() || '未填写';
    result.set(key, (result.get(key) ?? 0) + 1);
  }
  return [...result].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
}

function distribution(ws: XLSX.WorkSheet, row: number, col: number, headers: string[], rows: [string, number][], total: number) {
  headers.forEach((h, i) => cell(ws, row, col + i, h, style(C.headerBg, C.headerFg, 10.5, true)));
  rows.forEach(([label, n], i) => {
    const s = style(i % 2 === 0 ? 'FBFBFC' : 'FFFFFF');
    cell(ws, row + i + 1, col, label, s);
    cell(ws, row + i + 1, col + 1, n, s);
    cell(ws, row + i + 1, col + 2, total ? n / total : 0, s);
    ws[XLSX.utils.encode_cell({ r: row + i, c: col + 2 })].z = '0.0%';
    if (headers[0] === '状态') {
      const colors = C.status[label];
      if (colors) cell(ws, row + i + 1, col, label, style(colors.bg, colors.fg, 10, true));
    }
  });
}

function buildOverviewSheet(items: Application[], date: string): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const total = items.length;
  const interviewing = items.filter(a => ['一面', '二面', 'AI面', 'HR面', 'Offer'].includes(a.status)).length;
  const offers = items.filter(a => a.status === 'Offer').length;
  const followUps = items.filter(a => ['在线测评', 'AI面', 'HR面', '待跟进'].includes(a.status)).length;
  merged(ws, 1, 1, 6, 'Sugar 求职系统 · 投递情况总览', style('FFFFFF', C.text, 16, true, false));
  merged(ws, 2, 1, 6, `求职进度全景监控看板 · 数据更新至 ${date}`, style('FFFFFF', C.textLight, 9.5, false, false));
  const cards = [
    ['投递总数', total, '全部记录', 'F0F4FA', '1D6FB8', 'DCE5F2'],
    ['进入面试', interviewing, `进面率 ${pct(interviewing, total)}`, 'F4F1FA', '6351A2', 'E3DCF2'],
    ['获得 Offer', offers, `Offer 率 ${pct(offers, total)}${offers ? '' : ' · 冲刺中'}`, 'F0F7F2', '2E7D47', 'D9EBDC'],
    ['待跟进事项', followUps, '测评 / AI面 / HR面 / 待跟进', 'FAF4EF', 'B25E28', 'F2E4D6'],
  ] as const;
  cards.forEach(([label, n, sub, bg, fg, edge], i) => {
    const row = i < 2 ? 4 : 8;
    const col = i % 2 === 0 ? 1 : 4;
    merged(ws, row, col, col + 2, label, style(bg, fg, 10.5, true, false));
    merged(ws, row + 1, col, col + 2, n, style(bg, fg, 26, true, false));
    const s = style(bg, fg, 9.5, false, false);
    s.border = { bottom: { style: 'thin', color: { rgb: edge } } };
    merged(ws, row + 2, col, col + 2, sub, s);
  });
  const statusCounts = counts(items, a => a.status);
  // Include every observed status once; move the next table down for larger datasets.
  const statuses = [...APPLICATION_STATUSES.filter(s => statusCounts.some(([key]) => key === s)), ...statusCounts.map(([s]) => s).filter(s => !(APPLICATION_STATUSES as readonly string[]).includes(s))];
  distribution(ws, 12, 1, ['状态', '数量', '占比'], statuses.map(s => [s, statusCounts.find(([key]) => key === s)?.[1] ?? 0]), total);
  distribution(ws, 12, 4, ['城市', '数量', '占比'], counts(items, a => a.city).slice(0, 10), total);
  const channelStart = Math.max(24, 14 + statuses.length);
  const channels = counts(items, a => a.channel);
  distribution(ws, channelStart, 1, ['渠道', '数量', '占比'], channels, total);
  const end = Math.max(36, channelStart + channels.length);
  for (let r = 25; r <= end; r++) for (let c = 4; c <= 6; c++) cell(ws, r, c, '', style('F8F9FA', C.text, 11, false, false));
  ws.E25.v = `求职洞察\n\n① 关注核心城市，按目标岗位精准投递\n\n② 当前进面率 ${pct(interviewing, total)}，持续复盘面试\n\n③ 增加精准内推，优先跟进 ${followUps} 项待办`;
  ws['!merges']!.push({ s: { r: 24, c: 4 }, e: { r: end - 1, c: 6 } });
  ws['!ref'] = `B1:G${end}`;
  ws['!cols'] = [4, 24, 12, 16, 24, 12, 16].map(wch => ({ wch }));
  ws['!rows'] = Array.from({ length: end }, (_, i) => ({ hpt: i === 0 ? 36 : i === 1 ? 18 : [3, 7].includes(i) ? 22 : [4, 8].includes(i) ? 36 : [5, 9].includes(i) ? 20 : [2, 6, 10].includes(i) ? 12 : 24 }));
  return ws;
}

function displayWidth(value: unknown): number {
  return Math.max(0, ...String(value ?? '').split(/\r?\n/).map(line => [...line].reduce((n, ch) => n + (ch.codePointAt(0)! > 255 ? 2 : 1), 0)));
}

function buildDetailSheet(items: Application[]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const headers = ['公司名称', '岗位名称', '城市', '投递渠道', '投递日期', '当前状态', '薪资范围', 'JD关键词', '备注', '录入时间'];
  merged(ws, 1, 1, 10, 'Sugar 求职系统 · 投递明细', style('FFFFFF', C.text, 16, true, false));
  headers.forEach((h, i) => {
    const s = style(C.headerBg, C.headerFg, 10.5, true);
    s.border = { bottom: { style: 'thin', color: { rgb: 'D1D1D6' } } };
    cell(ws, 2, i + 1, h, s);
  });
  const widths = [20, 22, 12, 16, 14, EXCEL_PROGRESS_WIDTH, 16, 32, 40, 14];
  const rows = [{ hpt: 36 }, { hpt: 30 }];
  items.forEach((app, i) => {
    const values = [app.company_name, app.position_name, app.city, app.channel, app.apply_date, app.status,
      app.salary_range, app.jd_keywords?.join('、'), app.notes, app.created_at?.slice(0, 10)];
    let lines = 1;
    values.forEach((value, c) => {
      const w = displayWidth(value);
      if (c !== 5) widths[c] = Math.min(c >= 7 ? 56 : 40, Math.max(widths[c], w + 4));
      const colors = c === 5 && progressRank(app.status) < 0 ? C.status[app.status] : undefined;
      cell(ws, i + 3, c + 1, value, style(colors?.bg ?? (i % 2 === 0 ? 'FBFBFC' : 'FFFFFF'), colors?.fg ?? C.text, 10, c < 2 || c === 5));
      if (c === 5 && progressRank(app.status) >= 0) ws[`G${i + 3}`].z = ';;;';
      lines = Math.max(lines, Math.ceil(w / (widths[c] - 2)), String(value ?? '').split('\n').length);
    });
    rows.push({ hpt: Math.min(409, Math.max(64, lines * 15 + 8)) });
  });
  ws['!ref'] = `B1:K${Math.max(2, items.length + 2)}`;
  ws['!cols'] = [4, ...widths].map(wch => ({ wch }));
  ws['!rows'] = rows;
  if (items.length) ws['!autofilter'] = { ref: `B2:K${items.length + 2}` };
  return ws;
}

function buildWeeklySheet(items: Application[]): { ws: XLSX.WorkSheet; lastDataRow: number } {
  const ws: XLSX.WorkSheet = {};
  const byWeek = new Map<string, number>();
  let undated = 0;
  items.forEach(app => {
    const key = app.apply_date ? getWeekKey(app.apply_date) : null;
    if (key) byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
    else undated++;
  });
  const entries = [...byWeek].sort((a, b) => a[0].localeCompare(b[0]));
  merged(ws, 1, 1, 3, '每周投递趋势', style('FFFFFF', C.text, 16, true, false));
  merged(ws, 2, 1, 3, undated ? `${undated} 条无有效投递日期，未计入趋势` : '', style('FFFFFF', C.textLight, 9.5, false, false));
  cell(ws, 3, 1, '周次', style(C.headerBg, C.headerFg, 10.5, true));
  cell(ws, 3, 2, '投递数', style(C.headerBg, C.headerFg, 10.5, true));
  entries.forEach(([key, n], i) => {
    const s = style(i % 2 === 0 ? 'FBFBFC' : 'FFFFFF');
    cell(ws, i + 4, 1, key, s);
    cell(ws, i + 4, 2, n, s);
  });
  ws['!ref'] = `B1:D${Math.max(3, entries.length + 3)}`;
  ws['!cols'] = [{ wch: 4 }, { wch: 20 }, { wch: 16 }, { wch: 8 }];
  ws['!rows'] = Array.from({ length: Math.max(3, entries.length + 3) }, (_, i) => ({ hpt: i === 0 ? 36 : 24 }));
  return { ws, lastDataRow: entries.length + 3 };
}

// ── Chart XML（真实 Excel 折线图）────────────────────────────
function chartXml(lastDataRow: number) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<c:date1904 val="0"/><c:lang val="zh-CN"/><c:roundedCorners val="1"/>
<c:chart>
  <c:autoTitleDeleted val="1"/>
  <c:plotArea>
    <c:layout/>
    <c:lineChart>
      <c:grouping val="standard"/>
      <c:varyColors val="0"/>
      <c:ser>
        <c:idx val="0"/><c:order val="0"/>
        <c:spPr>
          <a:ln w="25400"><a:solidFill><a:srgbClr val="${C.chartLine}"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        </c:spPr>
        <c:marker>
          <c:symbol val="circle"/><c:size val="6"/>
          <c:spPr>
            <a:solidFill><a:srgbClr val="${C.chartLine}"/></a:solidFill>
            <a:ln w="9525"><a:solidFill><a:srgbClr val="${C.chartDark}"/></a:solidFill></a:ln>
          </c:spPr>
        </c:marker>
        <c:dLbls>
          <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900" b="0"/></a:pPr></a:p></c:txPr>
          <c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/>
          <c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/>
        </c:dLbls>
        <c:cat><c:strRef><c:f>'周度趋势'!$B$4:$B$${lastDataRow}</c:f></c:strRef></c:cat>
        <c:val><c:numRef><c:f>'周度趋势'!$C$4:$C$${lastDataRow}</c:f></c:numRef></c:val>
        <c:smooth val="1"/>
      </c:ser>
      <c:marker val="1"/><c:smooth val="0"/><c:axId val="12345678"/><c:axId val="87654321"/>
    </c:lineChart>
    <c:catAx>
      <c:axId val="12345678"/><c:scaling><c:orientation val="minMax"/></c:scaling>
      <c:delete val="0"/><c:axPos val="b"/>
      <c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>
      <c:spPr><a:ln><a:solidFill><a:srgbClr val="${C.border}"/></a:solidFill></a:ln></c:spPr>
      <c:txPr><a:bodyPr rot="-5400000"/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800"><a:solidFill><a:srgbClr val="${C.textLight}"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr>
      <c:crossAx val="87654321"/>
    </c:catAx>
    <c:valAx>
      <c:axId val="87654321"/><c:scaling><c:orientation val="minMax"/></c:scaling>
      <c:delete val="0"/><c:axPos val="l"/>
      <c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="${C.border}"/></a:solidFill><a:prstDash val="dash"/></a:ln></c:spPr></c:majorGridlines>
      <c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>
      <c:spPr><a:ln><a:noFill/></a:ln></c:spPr>
      <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800"><a:solidFill><a:srgbClr val="${C.textLight}"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr>
      <c:crossAx val="12345678"/>
    </c:valAx>
  </c:plotArea>
  <c:plotVisOnly val="1"/>
</c:chart>
<c:spPr>
  <a:solidFill><a:srgbClr val="${C.pageBg}"/></a:solidFill>
  <a:ln w="9525"><a:solidFill><a:srgbClr val="${C.border}"/></a:solidFill></a:ln>
</c:spPr>
</c:chartSpace>`;
}

const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
<xdr:twoCellAnchor editAs="oneCell">
  <xdr:from><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
  <xdr:to><xdr:col>16</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>24</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
  <xdr:graphicFrame macro="">
    <xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId1"/>
    </a:graphicData></a:graphic>
  </xdr:graphicFrame>
  <xdr:clientData/>
</xdr:twoCellAnchor>
</xdr:wsDr>`;

const drawingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`;

const sheetRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;

// ── 主导出函数 ────────────────────────────────────────────────
export async function createApplicationsExcel(items: Application[], asOf = new Date()): Promise<ArrayBuffer> {
  const date = localDate(asOf);
  const wb = XLSX.utils.book_new();
  const sortedItems = sortApplicationsByProgress(items);
  const detail = buildDetailSheet(sortedItems);
  XLSX.utils.book_append_sheet(wb, buildOverviewSheet(items, date), '投递总览');
  XLSX.utils.book_append_sheet(wb, detail, '投递明细');
  const { ws: ws3, lastDataRow } = buildWeeklySheet(items);
  XLSX.utils.book_append_sheet(wb, ws3, '周度趋势');

  // xlsx-js-style does not serialize sheet views or frozen panes. Add valid OOXML views.
  // 写入 buffer
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  // 注入图表 XML（仅在有周度数据时）
  const zip = await JSZip.loadAsync(buf as ArrayBuffer);

  for (let i = 1; i <= 3; i++) {
    const path = `xl/worksheets/sheet${i}.xml`;
    const entry = zip.file(path);
    if (!entry) throw new Error(`Missing worksheet: ${path}`);
    let xml = await entry.async('text');
    const pane = i === 2 ? '<pane xSplit="1" ySplit="2" topLeftCell="B3" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B3" sqref="B3"/>' : '';
    const view = `<sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>`;
    if (/<sheetViews[\s>]/.test(xml)) {
      xml = xml.replace(/<sheetViews\b[^>]*>[\s\S]*?<\/sheetViews>/, view);
    } else {
      xml = xml.replace(/(<dimension\b[^>]*\/>)/, `$1${view}`);
    }
    zip.file(path, xml);
  }

  const progress = progressDrawingXml(sortedItems.map((app, i) => ({ status: app.status, height: detail['!rows']![i + 2].hpt! })));
  if (progress) {
    zip.file('xl/drawings/statusProgress.xml', progress);
    zip.file('xl/worksheets/_rels/sheet2.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdProgress" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/statusProgress.xml"/></Relationships>`);
    const entry = zip.file('xl/worksheets/sheet2.xml')!;
    let xml = await entry.async('text');
    if (!xml.includes('xmlns:r=')) xml = xml.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
    zip.file('xl/worksheets/sheet2.xml', xml.replace('</worksheet>', '<drawing r:id="rIdProgress"/></worksheet>'));
    const contentTypes = await zip.file('[Content_Types].xml')!.async('text');
    zip.file('[Content_Types].xml', contentTypes.replace('</Types>', '<Override PartName="/xl/drawings/statusProgress.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>'));
  }

  if (lastDataRow >= 4) {
    zip.file('xl/charts/chart1.xml', chartXml(lastDataRow));
    zip.file('xl/drawings/drawing1.xml', drawingXml);
    zip.file('xl/drawings/_rels/drawing1.xml.rels', drawingRels);
    zip.file('xl/worksheets/_rels/sheet3.xml.rels', sheetRels);

    // 在 sheet3.xml 中添加 <drawing> 引用
    const s3 = zip.file('xl/worksheets/sheet3.xml');
    if (s3) {
      let xml = await s3.async('text');
      if (!xml.includes('xmlns:r=')) {
        xml = xml.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
      }
      xml = xml.replace('</worksheet>', '<drawing r:id="rId1"/></worksheet>');
      zip.file('xl/worksheets/sheet3.xml', xml);
    }

    // 更新 [Content_Types].xml
    const ct = zip.file('[Content_Types].xml');
    if (ct) {
      let ctXml = await ct.async('text');
      ctXml = ctXml.replace('</Types>',
        `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>
</Types>`);
      zip.file('[Content_Types].xml', ctXml);
    }
  }

  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}

export async function exportApplicationsToExcel(items: Application[]): Promise<void> {
  const asOf = new Date();
  const out = await createApplicationsExcel(items, asOf);
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const date = localDate(asOf);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sugar求职记录_${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
