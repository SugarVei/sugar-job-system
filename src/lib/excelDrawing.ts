import type JSZip from 'jszip';

const ns = 'http://schemas.openxmlformats.org';
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
const emu = (px: number) => Math.round(px * 9525);
export interface ExcelChart {
  kind: 'bar' | 'line' | 'doughnut'; labels: string[]; values: (number | null)[];
  labelRef: string; valueRef: string; col: number; row: number; endCol: number; endRow: number;
  colors?: string[];
}

export function nativeChartXml(chart: ExcelChart, index: number) {
  const colors = chart.colors ?? ['1973E8', '82C99A', 'B3A0D5', 'A8DDDD', 'F1D890', 'ABD8B2'];
  const cat = `<c:cat><c:strRef><c:f>${escape(chart.labelRef)}</c:f><c:strCache><c:ptCount val="${chart.labels.length}"/>${chart.labels.map((v, i) => `<c:pt idx="${i}"><c:v>${escape(v)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat>`;
  const val = `<c:val><c:numRef><c:f>${escape(chart.valueRef)}</c:f><c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="${chart.values.length}"/>${chart.values.map((v, i) => v === null ? '' : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val>`;
  const points = chart.kind === 'line' ? '' : chart.values.map((_, i) => `<c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${colors[i % colors.length]}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>`).join('');
  const line = `<c:spPr><a:ln w="25400"><a:solidFill><a:srgbClr val="1973E8"/></a:solidFill></a:ln></c:spPr>`;
  const marker = '<c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>';
  const labels = `<c:dLbls><c:showLegendKey val="0"/><c:showVal val="${chart.kind === 'doughnut' ? 0 : 1}"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`;
  const ser = `<c:ser><c:idx val="0"/><c:order val="0"/>${chart.kind === 'line' ? line + marker : ''}${points}${labels}${cat}${val}${chart.kind === 'line' ? '<c:smooth val="0"/>' : ''}</c:ser>`;
  const axis1 = 9000 + index * 2, axis2 = axis1 + 1;
  const majorUnit = Math.max(1, Math.ceil(Math.max(1, ...chart.values.map(v => v ?? 0)) / 4));
  const axes = `<c:catAx><c:axId val="${axis1}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${axis2}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="${axis2}"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="E5E5EA"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="0" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${axis1}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/><c:majorUnit val="${majorUnit}"/></c:valAx>`;
  const plot = chart.kind === 'doughnut' ? `<c:doughnutChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="270"/><c:holeSize val="68"/></c:doughnutChart>`
    : chart.kind === 'bar' ? `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="1"/>${ser}<c:gapWidth val="110"/><c:axId val="${axis1}"/><c:axId val="${axis2}"/></c:barChart>${axes}`
    : `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}<c:marker val="1"/><c:smooth val="0"/><c:axId val="${axis1}"/><c:axId val="${axis2}"/></c:lineChart>${axes}`;
  const legend = chart.kind === 'doughnut' ? '<c:legend><c:legendPos val="r"/><c:overlay val="0"/></c:legend>' : '';
  return `<?xml version="1.0" encoding="UTF-8"?><c:chartSpace xmlns:c="${ns}/drawingml/2006/chart" xmlns:a="${ns}/drawingml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><c:lang val="zh-CN"/><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/>${plot}</c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/><c:showDLblsOverMax val="0"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:solidFill><a:srgbClr val="86868B"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:defRPr></a:pPr><a:endParaRPr lang="zh-CN"/></a:p></c:txPr></c:chartSpace>`;
}

function anchor(col: number, row: number, endCol: number, endRow: number, content: string) {
  return `<xdr:twoCellAnchor editAs="twoCell"><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${endCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${endRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>${content}<xdr:clientData/></xdr:twoCellAnchor>`;
}

export async function addOverviewDrawing(zip: JSZip, stages: { status: string; count: number }[], other: string, charts: ExcelChart[]) {
  let id = 1;
  const shape = (name: string, x: number, y: number, w: number, h: number, geometry: string, fill: string | null, text = '', size = 10, bold = false, color = '1D1D1F') => {
    const body = text ? `<xdr:txBody><a:bodyPr wrap="none" lIns="0" rIns="0" tIns="0" bIns="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="zh-CN" sz="${size * 100}" b="${bold ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:rPr><a:t>${escape(text)}</a:t></a:r><a:endParaRPr lang="zh-CN"/></a:p></xdr:txBody>` : '';
    return `<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="${id++}" name="${escape(name)}"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="${geometry}"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}<a:ln><a:noFill/></a:ln></xdr:spPr>${body}</xdr:sp>`;
  };
  const colors = ['ECE5D7', 'FFEBAF', 'DFD1F5', 'BDDAFA', 'A8DDDD', 'B3E1CA', 'ABD8B2', '82C99A'];
  const groupId = id++;
  let children = shape('投递进度卡片', 0, 0, 976, 184, 'roundRect', 'FBFAF7');
  children += shape('投递进度标题', 16, 10, 150, 26, 'rect', null, '投递进度', 14, true);
  children += shape('阶段统计说明', 170, 10, 320, 26, 'rect', null, '各阶段当前记录数', 9, false, '86868B');
  stages.forEach(({ status, count }, i) => {
    const x = 14 + i * 119;
    children += shape(`${status} 阶段`, x, 48, 114, 82, 'chevron', colors[i]);
    children += shape(`${status} 名称`, x + 9, 55, 95, 28, 'rect', null, status, 9, true);
    children += shape(`${status} 数量`, x + 9, 85, 95, 31, 'rect', null, String(count), 17, true);
  });
  children += shape('其他阶段统计', 14, 145, 945, 22, 'rect', null, other, 9, false, '86868B');
  const group = `<xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="${groupId}" name="投递进度"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr><xdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(976)}" cy="${emu(184)}"/><a:chOff x="0" y="0"/><a:chExt cx="${emu(976)}" cy="${emu(184)}"/></a:xfrm></xdr:grpSpPr>${children}</xdr:grpSp>`;
  let anchors = anchor(8, 3, 24, 9, group);
  const rels: string[] = [];
  const types: string[] = ['<Override PartName="/xl/drawings/overview.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'];
  charts.forEach((chart, i) => {
    const chartId = `rIdOverviewChart${i + 1}`;
    const file = `overviewChart${i + 1}.xml`;
    zip.file(`xl/charts/${file}`, nativeChartXml(chart, i));
    rels.push(`<Relationship Id="${chartId}" Type="${ns}/officeDocument/2006/relationships/chart" Target="../charts/${file}"/>`);
    types.push(`<Override PartName="/xl/charts/${file}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
    anchors += anchor(chart.col, chart.row, chart.endCol, chart.endRow, `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id++}" name="总览图表 ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${ns}/drawingml/2006/chart"><c:chart xmlns:c="${ns}/drawingml/2006/chart" xmlns:r="${ns}/officeDocument/2006/relationships" r:id="${chartId}"/></a:graphicData></a:graphic></xdr:graphicFrame>`);
  });
  zip.file('xl/drawings/overview.xml', `<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr xmlns:xdr="${ns}/drawingml/2006/spreadsheetDrawing" xmlns:a="${ns}/drawingml/2006/main">${anchors}</xdr:wsDr>`);
  if (rels.length) zip.file('xl/drawings/_rels/overview.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${ns}/package/2006/relationships">${rels.join('')}</Relationships>`);
  const relPath = 'xl/worksheets/_rels/sheet1.xml.rels';
  const existing = await zip.file(relPath)?.async('text') ?? `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${ns}/package/2006/relationships"></Relationships>`;
  zip.file(relPath, existing.replace('</Relationships>', `<Relationship Id="rIdOverview" Type="${ns}/officeDocument/2006/relationships/drawing" Target="../drawings/overview.xml"/></Relationships>`));
  let sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('text');
  if (!sheet.includes('xmlns:r=')) sheet = sheet.replace('<worksheet ', `<worksheet xmlns:r="${ns}/officeDocument/2006/relationships" `);
  zip.file('xl/worksheets/sheet1.xml', sheet.replace('</worksheet>', '<drawing r:id="rIdOverview"/></worksheet>'));
  const contentTypes = await zip.file('[Content_Types].xml')!.async('text');
  zip.file('[Content_Types].xml', contentTypes.replace('</Types>', types.join('') + '</Types>'));
}
