import JSZip from 'jszip';

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Determine if a line looks like a section heading (e.g. "一、自我介绍")
function isHeading(line: string) {
  return /^[一二三四五六七八九十]+[、.]/.test(line.trim());
}

function buildParagraphs(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const safe = escapeXml(line);
      if (line.trim() === '') {
        return '<w:p><w:r><w:t> </w:t></w:r></w:p>';
      }
      if (isHeading(line)) {
        return `<w:p>
          <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="2F5D36"/></w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r>
        </w:p>`;
      }
      return `<w:p><w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
    })
    .join('\n');
}

export async function generateDocx(title: string, content: string): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`,
  );

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
  );

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    ${buildParagraphs(content)}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  );

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}
