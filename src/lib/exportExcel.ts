import * as XLSX from 'xlsx-js-style';
import type { Application, Interview } from '../types';
import { C, cell, merged, style, localDate, displayWidth, styleWorkbookPackage, downloadExcel } from './excelStyle';
import { buildApplicationOverview } from './excelApplicationOverview';
import { addOverviewDrawing } from './excelDrawing';
import { EXCEL_PROGRESS_WIDTH, progressRank, sortApplicationsByProgress, progressDrawingXml } from './excelProgress';

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
export async function createApplicationsExcel(items: Application[], asOf = new Date(), interviews: Interview[] = []): Promise<ArrayBuffer> {
  const wb = XLSX.utils.book_new();
  const sortedItems = sortApplicationsByProgress(items);
  const detail = buildDetailSheet(sortedItems);
  const overview = buildApplicationOverview(items, interviews, asOf);
  XLSX.utils.book_append_sheet(wb, overview.ws, '投递总览');
  XLSX.utils.book_append_sheet(wb, detail, '投递明细');
  const { ws: ws3, lastDataRow } = buildWeeklySheet(items);
  XLSX.utils.book_append_sheet(wb, ws3, '周度趋势');

  const zip = await styleWorkbookPackage(wb, [2]);
  await addOverviewDrawing(zip, overview.stages, overview.other, overview.charts);

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

export async function exportApplicationsToExcel(items: Application[], interviews: Interview[] = []): Promise<void> {
  const asOf = new Date();
  downloadExcel(await createApplicationsExcel(items, asOf, interviews), `Sugar求职记录_${localDate(asOf)}.xlsx`);
}
