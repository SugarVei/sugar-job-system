import type { ResumeFile } from '../types';

export async function extractResumeText(
  file: ResumeFile,
  getDownloadUrl: (filePath: string) => Promise<string>,
): Promise<string> {
  if (!file.file_path) throw new Error('简历文件路径为空，请重新上传');
  const signedUrl = await getDownloadUrl(file.file_path);
  const extension = file.file_name.split('.').pop()?.toLowerCase() ?? '';

  if (extension === 'pdf') {
    // The deployed legacy parser can report a transient XRef error on its
    // first read of a valid PDF. Retry that specific failure once.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedUrl }),
      });
      const payload = await response.json().catch(() => ({})) as { text?: string; error?: string };
      if (!response.ok || payload.error) {
        if (attempt === 0 && /bad XRef entry/i.test(payload.error ?? '')) continue;
        throw new Error(payload.error || 'PDF 解析失败，请重新导出可复制文字的 PDF 或使用 DOCX。');
      }
      return payload.text?.trim() ?? '';
    }
  }

  if (extension === 'docx') {
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error('DOCX 下载失败');
    const { default: JSZip } = await import('jszip');
    const archive = await JSZip.loadAsync(await response.arrayBuffer());
    const documentXml = archive.file('word/document.xml');
    if (!documentXml) throw new Error('无效的 DOCX 文件');
    const xml = await documentXml.async('string');
    const withParagraphs = xml.replace(/<w:p[ />]/g, '\n__PARAGRAPH__');
    return withParagraphs
      .split('__PARAGRAPH__')
      .map((segment) => {
        const parts: string[] = [];
        const textNode = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
        let match: RegExpExecArray | null;
        while ((match = textNode.exec(segment)) !== null) parts.push(match[1].replace(
          /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
          (entity, name: string) => {
            if (name.startsWith('#')) {
              const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
              return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
            }
            return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[name] ?? entity;
          },
        ));
        return parts.join('');
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  throw new Error('暂不支持该格式，请上传 PDF 或 DOCX 文件');
}

