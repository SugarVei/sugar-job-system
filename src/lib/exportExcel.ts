/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import type { Application, ApplicationStatus } from '../types';

// ── 颜色：完全对应网页主题 ────────────────────────────────────
const C = {
  pageBg:     'FAF7F0',
  pageBg2:    'F0EBE0',
  border:     'E4DDCF',
  titleBg:    '1B1A17',
  titleFg:    'FFFDF8',
  headerBg:   '2F2E2A',
  headerFg:   'F5F0E7',
  text:       '4A463E',
  textLight:  '8A8478',
  // 网页 StatCard 颜色
  green:  { bg: 'D9E6D3', fg: '2F5D36' },
  yellow: { bg: 'FBEEC2', fg: '7A5A12' },
  coral:  { bg: 'FBE0D8', fg: 'A23D24' },
  purple: { bg: 'E4E0F7', fg: '4A3F96' },
  // 网页状态颜色（来自 Overview.tsx STATUS_COLOR）
  status: {
    '已投递': { bg: 'CFC6B4', fg: '5D584D' },
    '笔试':   { bg: 'F4C84A', fg: '7A5A12' },
    '面试':   { bg: '7CC4A0', fg: '1B4D35' },
    'Offer':  { bg: '5FA86B', fg: 'FFFFFF' },
    '拒绝':   { bg: 'F0613F', fg: 'FFFFFF' },
    '待跟进': { bg: 'A89CF0', fg: '2D2473' },
  } as Record<string, { bg: string; fg: string }>,
  chartLine:  '5FA86B',
  chartDark:  '2F5D36',
};

const STATUS_ORDER: ApplicationStatus[] = ['已投递', '笔试', '面试', 'Offer', '待跟进', '拒绝'];

// ── 样式工厂 ─────────────────────────────────────────────────
function border(rgb = C.border) {
  const side = { style: 'thin', color: { rgb } };
  return { top: side, bottom: side, left: side, right: side };
}

function titleSt(bg = C.titleBg, fg = C.titleFg, sz = 16): any {
  return {
    font: { bold: true, sz, color: { rgb: fg }, name: 'Calibri' },
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
}

function hdrSt(bg = C.headerBg, fg = C.headerFg): any {
  return {
    font: { bold: true, sz: 11, color: { rgb: fg } },
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: border(),
  };
}

function dataSt(bg = C.pageBg, fg = C.text, bold = false, align: any = 'left'): any {
  return {
    font: { sz: 10, color: { rgb: fg }, bold },
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    alignment: { horizontal: align, vertical: 'center' },
    border: border(),
  };
}

function bgSt(rgb = C.pageBg): any {
  return { fill: { patternType: 'solid', fgColor: { rgb } } };
}

function sectionSt(): any {
  return {
    font: { bold: true, sz: 12, color: { rgb: C.text } },
    fill: { patternType: 'solid', fgColor: { rgb: C.pageBg } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
}

// ── 辅助：设置单元格 ──────────────────────────────────────────
function setCell(ws: any, addr: string, v: any, t: string, s: any) {
  ws[addr] = { v, t, s };
}

function fillRow(ws: any, cols: string[], row: number, s: any) {
  cols.forEach(col => setCell(ws, `${col}${row}`, '', 's', s));
}

// ── 辅助：ISO 周次 ────────────────────────────────────────────
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function pct(n: number, total: number) {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '-';
}

// ── Sheet 1：投递总览 ─────────────────────────────────────────
function buildOverviewSheet(items: Application[]): any {
  const ws: any = {};
  const COLS = ['A','B','C','D','E','F'];

  const total = items.length;
  const interviewing = items.filter(a => ['面试','Offer'].includes(a.status)).length;
  const offers = items.filter(a => a.status === 'Offer').length;
  const followUps = items.filter(a => a.status === '待跟进').length;

  const statusCount: Record<string, number> = {};
  STATUS_ORDER.forEach(s => (statusCount[s] = 0));
  const channelCount: Record<string, number> = {};
  const cityCount: Record<string, number> = {};
  items.forEach(app => {
    statusCount[app.status] = (statusCount[app.status] ?? 0) + 1;
    const ch = app.channel?.trim() || '未填写';
    channelCount[ch] = (channelCount[ch] ?? 0) + 1;
    const ci = app.city?.trim() || '未填写';
    cityCount[ci] = (cityCount[ci] ?? 0) + 1;
  });

  // Row 1：大标题
  setCell(ws, 'A1', 'Sugar 求职系统 · 投递情况总览', 's', titleSt(C.titleBg, C.titleFg, 18));
  ['B','C','D','E','F'].forEach(c => setCell(ws, `${c}1`, '', 's', titleSt(C.titleBg, C.titleFg, 18)));

  // Row 2：空白
  fillRow(ws, COLS, 2, bgSt());

  // Row 3：核心数据 section label
  setCell(ws, 'A3', '📈  核心数据', 's', sectionSt());
  ['B','C','D','E','F'].forEach(c => setCell(ws, `${c}3`, '', 's', bgSt()));

  // Rows 4-6 & 8-10：4 张 StatCard（对应网页的 4 个颜色卡片）
  const cards = [
    { label: '投递总数',  value: total,       sub: '全部记录',                   ...C.green  },
    { label: '进入面试',  value: interviewing, sub: `进面率 ${pct(interviewing, total)}`, ...C.yellow },
    { label: '获得 Offer',value: offers,       sub: `Offer 率 ${pct(offers, total)}`,    ...C.coral  },
    { label: '待跟进',   value: followUps,    sub: '需要处理',                  ...C.purple },
  ];

  const cardDefs = [
    { cols: ['A','B','C'], startRow: 4 },
    { cols: ['D','E','F'], startRow: 4 },
    { cols: ['A','B','C'], startRow: 8 },
    { cols: ['D','E','F'], startRow: 8 },
  ];

  cards.forEach((card, i) => {
    const { cols, startRow } = cardDefs[i];
    const cardBgSt = (_row: number, extra: any = {}) => ({
      font: { sz: 10, color: { rgb: card.fg }, ...extra.font },
      fill: { patternType: 'solid', fgColor: { rgb: card.bg } },
      alignment: { horizontal: 'left', vertical: 'center' },
      ...extra,
    });
    // label
    setCell(ws, `${cols[0]}${startRow}`, card.label, 's', { ...cardBgSt(0), font: { bold: true, sz: 11, color: { rgb: card.fg } } });
    cols.slice(1).forEach(c => setCell(ws, `${c}${startRow}`, '', 's', bgSt(card.bg)));
    // big number
    setCell(ws, `${cols[0]}${startRow+1}`, card.value, 'n', {
      font: { bold: true, sz: 26, color: { rgb: card.fg }, name: 'Poppins' },
      fill: { patternType: 'solid', fgColor: { rgb: card.bg } },
      alignment: { horizontal: 'left', vertical: 'center' },
    });
    cols.slice(1).forEach(c => setCell(ws, `${c}${startRow+1}`, '', 's', bgSt(card.bg)));
    // sub label
    setCell(ws, `${cols[0]}${startRow+2}`, card.sub, 's', { ...cardBgSt(0), font: { sz: 10, color: { rgb: card.fg } } });
    cols.slice(1).forEach(c => setCell(ws, `${c}${startRow+2}`, '', 's', bgSt(card.bg)));
  });

  // Row 7, 11：两排卡片之间的间隔
  fillRow(ws, COLS, 7, bgSt());
  fillRow(ws, COLS, 11, bgSt());

  // Row 12：状态分布 section label
  setCell(ws, 'A12', '📋  状态分布', 's', sectionSt());
  ['B','C','D','E','F'].forEach(c => setCell(ws, `${c}12`, '', 's', bgSt()));

  // Row 13：状态表头
  ['状态','数量','占比'].forEach((h, i) => setCell(ws, `${'ABC'[i]}13`, h, 's', hdrSt()));
  ['D','E','F'].forEach(c => setCell(ws, `${c}13`, '', 's', bgSt()));

  // Rows 14-19：状态数据（颜色对应网页状态标签）
  STATUS_ORDER.forEach((status, i) => {
    const row = 14 + i;
    const cnt = statusCount[status] ?? 0;
    const sc = C.status[status] ?? { bg: C.pageBg, fg: C.text };
    const st: any = {
      font: { sz: 10, color: { rgb: sc.fg }, bold: true },
      fill: { patternType: 'solid', fgColor: { rgb: sc.bg } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: border(),
    };
    setCell(ws, `A${row}`, status, 's', st);
    setCell(ws, `B${row}`, cnt, 'n', st);
    setCell(ws, `C${row}`, pct(cnt, total), 's', { ...st, font: { sz: 10, color: { rgb: sc.fg } } });
    ['D','E','F'].forEach(c => setCell(ws, `${c}${row}`, '', 's', bgSt()));
  });

  // 城市分布
  const cityRows = Object.entries(cityCount).sort((a,b) => b[1]-a[1]).slice(0, 10);
  let r = 21;
  fillRow(ws, COLS, 20, bgSt());
  setCell(ws, `A${r}`, '🌆  城市分布 (Top 10)', 's', sectionSt());
  ['B','C','D','E','F'].forEach(c => setCell(ws, `${c}${r}`, '', 's', bgSt()));
  r++;
  ['城市','数量','占比'].forEach((h,i) => setCell(ws, `${'ABC'[i]}${r}`, h, 's', hdrSt()));
  ['D','E','F'].forEach(c => setCell(ws, `${c}${r}`, '', 's', bgSt()));
  r++;
  cityRows.forEach(([city, cnt], idx) => {
    const bg = idx % 2 === 0 ? C.pageBg : C.pageBg2;
    setCell(ws, `A${r}`, city, 's', dataSt(bg, C.text, false, 'left'));
    setCell(ws, `B${r}`, cnt, 'n', dataSt(bg, C.text, true, 'center'));
    setCell(ws, `C${r}`, pct(cnt, total), 's', dataSt(bg, C.textLight, false, 'center'));
    ['D','E','F'].forEach(c => setCell(ws, `${c}${r}`, '', 's', bgSt()));
    r++;
  });

  // 渠道分布
  const chRows = Object.entries(channelCount).sort((a,b) => b[1]-a[1]).slice(0, 10);
  fillRow(ws, COLS, r, bgSt()); r++;
  setCell(ws, `A${r}`, '📡  投递渠道分布', 's', sectionSt());
  ['B','C','D','E','F'].forEach(c => setCell(ws, `${c}${r}`, '', 's', bgSt()));
  r++;
  ['渠道','数量','占比'].forEach((h,i) => setCell(ws, `${'ABC'[i]}${r}`, h, 's', hdrSt()));
  ['D','E','F'].forEach(c => setCell(ws, `${c}${r}`, '', 's', bgSt()));
  r++;
  chRows.forEach(([ch, cnt], idx) => {
    const bg = idx % 2 === 0 ? C.pageBg : C.pageBg2;
    setCell(ws, `A${r}`, ch, 's', dataSt(bg, C.text, false, 'left'));
    setCell(ws, `B${r}`, cnt, 'n', dataSt(bg, C.text, true, 'center'));
    setCell(ws, `C${r}`, pct(cnt, total), 's', dataSt(bg, C.textLight, false, 'center'));
    ['D','E','F'].forEach(c => setCell(ws, `${c}${r}`, '', 's', bgSt()));
    r++;
  });

  ws['!ref'] = `A1:F${r - 1}`;
  ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }];

  const merges: any[] = [
    { s:{r:0,c:0}, e:{r:0,c:5} }, // 标题
    { s:{r:1,c:0}, e:{r:1,c:5} }, // 空白
    { s:{r:2,c:0}, e:{r:2,c:5} }, // 核心数据 label
    // Card 1
    { s:{r:3,c:0}, e:{r:3,c:2} }, { s:{r:4,c:0}, e:{r:4,c:2} }, { s:{r:5,c:0}, e:{r:5,c:2} },
    // Card 2
    { s:{r:3,c:3}, e:{r:3,c:5} }, { s:{r:4,c:3}, e:{r:4,c:5} }, { s:{r:5,c:3}, e:{r:5,c:5} },
    { s:{r:6,c:0}, e:{r:6,c:5} }, // 间隔
    // Card 3
    { s:{r:7,c:0}, e:{r:7,c:2} }, { s:{r:8,c:0}, e:{r:8,c:2} }, { s:{r:9,c:0}, e:{r:9,c:2} },
    // Card 4
    { s:{r:7,c:3}, e:{r:7,c:5} }, { s:{r:8,c:3}, e:{r:8,c:5} }, { s:{r:9,c:3}, e:{r:9,c:5} },
    { s:{r:10,c:0}, e:{r:10,c:5} }, // 间隔
    { s:{r:11,c:0}, e:{r:11,c:5} }, // 状态 label
    { s:{r:19,c:0}, e:{r:19,c:5} }, // 城市前间隔
    { s:{r:20,c:0}, e:{r:20,c:5} }, // 城市 label
  ];
  ws['!merges'] = merges;

  const rowHeights: any[] = [];
  rowHeights[0] = { hpt: 44 };
  rowHeights[1] = { hpt: 8 };
  rowHeights[2] = { hpt: 30 };
  [3,7].forEach(start => {
    rowHeights[start]   = { hpt: 26 };
    rowHeights[start+1] = { hpt: 44 };
    rowHeights[start+2] = { hpt: 20 };
  });
  rowHeights[6]  = { hpt: 8 };
  rowHeights[10] = { hpt: 8 };
  rowHeights[11] = { hpt: 30 };
  rowHeights[12] = { hpt: 28 };
  ws['!rows'] = rowHeights;

  return ws;
}

// ── Sheet 2：投递明细 ─────────────────────────────────────────
function buildDetailSheet(items: Application[]): any {
  const ws: any = {};
  const COLS = 'ABCDEFGHI';
  const headers = ['公司名称','岗位名称','城市','投递渠道','投递日期','当前状态','薪资范围','备注','录入时间'];

  headers.forEach((_, i) =>
    setCell(ws, `${COLS[i]}1`, i === 0 ? 'Sugar 求职系统 · 投递明细' : '', 's', titleSt(C.titleBg, C.titleFg, 14))
  );
  headers.forEach((h, i) => setCell(ws, `${COLS[i]}2`, h, 's', hdrSt()));

  items.forEach((app, rowIdx) => {
    const row = rowIdx + 3;
    const altBg = rowIdx % 2 === 0 ? C.pageBg : C.pageBg2;
    const sc = C.status[app.status] ?? { bg: C.pageBg, fg: C.text };
    const vals = [
      app.company_name, app.position_name, app.city ?? '',
      app.channel ?? '', app.apply_date ?? '', app.status,
      app.salary_range ?? '', app.notes ?? '', app.created_at?.slice(0,10) ?? '',
    ];
    vals.forEach((val, i) => {
      if (i === 5) {
        setCell(ws, `${COLS[i]}${row}`, val, 's', {
          font: { sz: 10, color: { rgb: sc.fg }, bold: true },
          fill: { patternType: 'solid', fgColor: { rgb: sc.bg } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: border(),
        });
      } else {
        const bold = i < 2;
        const align = (i >= 2 && i <= 4) ? 'center' : 'left';
        setCell(ws, `${COLS[i]}${row}`, val, 's', dataSt(altBg, C.text, bold, align));
      }
    });
  });

  const last = Math.max(3, items.length + 2);
  ws['!ref'] = `A1:I${last}`;
  ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:8} }];
  ws['!cols'] = [
    {wch:18},{wch:18},{wch:10},{wch:14},
    {wch:12},{wch:10},{wch:12},{wch:30},{wch:12},
  ];
  ws['!rows'] = [{ hpt: 36 }, { hpt: 28 }];
  return ws;
}

// ── Sheet 3：周度趋势 ─────────────────────────────────────────
function buildWeeklySheet(items: Application[]): { ws: any; lastDataRow: number } {
  const ws: any = {};

  const byWeek: Record<string, number> = {};
  items.forEach(app => {
    if (app.apply_date) {
      const w = getWeekKey(app.apply_date);
      byWeek[w] = (byWeek[w] ?? 0) + 1;
    }
  });
  const weekData = Object.entries(byWeek).sort((a,b) => a[0].localeCompare(b[0]));

  setCell(ws, 'A1', '📅  每周投递趋势', 's', titleSt(C.titleBg, C.titleFg, 16));
  ['B','C'].forEach(c => setCell(ws, `${c}1`, '', 's', titleSt(C.titleBg, C.titleFg, 16)));
  ['A','B','C'].forEach(c => setCell(ws, `${c}2`, '', 's', bgSt()));
  setCell(ws, 'A3', '周次', 's', hdrSt());
  setCell(ws, 'B3', '投递数', 's', hdrSt());
  setCell(ws, 'C3', '', 's', bgSt());

  weekData.forEach(([week, cnt], i) => {
    const row = i + 4;
    const bg = i % 2 === 0 ? C.pageBg : C.pageBg2;
    setCell(ws, `A${row}`, week, 's', dataSt(bg, C.text, false, 'center'));
    setCell(ws, `B${row}`, cnt, 'n', dataSt(bg, C.chartDark, true, 'center'));
    setCell(ws, `C${row}`, '', 's', bgSt());
  });

  const lastDataRow = 3 + weekData.length;
  ws['!ref'] = `A1:C${Math.max(4, lastDataRow)}`;
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:2} },
    { s:{r:1,c:0}, e:{r:1,c:2} },
  ];
  ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 2 }];
  ws['!rows'] = [{ hpt: 40 }, { hpt: 8 }, { hpt: 28 }];
  return { ws, lastDataRow };
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
          <c:spPr/><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900" b="0"/></a:pPr></a:p></c:txPr>
          <c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/>
          <c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/>
        </c:dLbls>
        <c:cat><c:strRef><c:f>'周度趋势'!$A$4:$A$${lastDataRow}</c:f></c:strRef></c:cat>
        <c:val><c:numRef><c:f>'周度趋势'!$B$4:$B$${lastDataRow}</c:f></c:numRef></c:val>
        <c:smooth val="1"/>
      </c:ser>
      <c:marker val="1"/><c:smooth val="0"/>
    </c:lineChart>
    <c:catAx>
      <c:axId val="12345678"/><c:scaling><c:orientation val="minMax"/></c:scaling>
      <c:delete val="0"/><c:axPos val="b"/>
      <c:tickMark val="none"/><c:tickLblPos val="nextTo"/>
      <c:spPr><a:ln><a:solidFill><a:srgbClr val="${C.border}"/></a:solidFill></a:ln></c:spPr>
      <c:txPr><a:bodyPr rot="-5400000"/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800"><a:solidFill><a:srgbClr val="${C.textLight}"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr>
      <c:crossAx val="87654321"/>
    </c:catAx>
    <c:valAx>
      <c:axId val="87654321"/><c:scaling><c:orientation val="minMax"/></c:scaling>
      <c:delete val="0"/><c:axPos val="l"/>
      <c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="${C.border}"/></a:solidFill><a:prstDash val="dash"/></a:ln></c:spPr></c:majorGridlines>
      <c:tickMark val="none"/><c:tickLblPos val="nextTo"/>
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
<xdr:twoCellAnchor moveWithCells="0" sizeWithCells="0">
  <xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
  <xdr:to><xdr:col>15</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>24</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
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
export async function exportApplicationsToExcel(items: Application[]): Promise<void> {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildOverviewSheet(items), '投递总览');
  XLSX.utils.book_append_sheet(wb, buildDetailSheet(items),  '投递明细');
  const { ws: ws3, lastDataRow } = buildWeeklySheet(items);
  XLSX.utils.book_append_sheet(wb, ws3, '周度趋势');

  // 写入 buffer
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  // 注入图表 XML（仅在有周度数据时）
  const zip = await JSZip.loadAsync(buf as ArrayBuffer);

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

  const out = await zip.generateAsync({ type: 'arraybuffer' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sugar求职记录_${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
