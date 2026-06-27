// Node.js serverless function (no edge config) — parses PDF resumes server-side

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — pdf-parse ships CJS; Vercel's esbuild handles interop
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const { signedUrl } = req.body as { signedUrl: string };
  if (!signedUrl) { res.status(400).json({ error: 'Missing signedUrl' }); return; }

  try {
    const fileRes = await fetch(signedUrl);
    if (!fileRes.ok) {
      res.status(400).json({ error: `Failed to fetch file: ${fileRes.status}` });
      return;
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const data = await pdfParse(buffer);
    res.status(200).json({ text: data.text });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
