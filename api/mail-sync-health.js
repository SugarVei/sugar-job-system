export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const results = {};
  const checks = [
    ['supabase', () => import('@supabase/supabase-js')],
    ['imapflow', () => import('imapflow')],
    ['mailparser', () => import('mailparser')],
    ['luxon', () => import('luxon')],
    ['sanitizer', () => import('sanitize-html')],
    ['mailSyncEntry', () => import('./mail-interview-sync.js')],
  ];
  for (const [name, load] of checks) {
    try { const loaded = await load(); results[name] = { ok: true, defaultType: typeof loaded.default }; }
    catch (error) { results[name] = { ok: false, code: error?.code || error?.name || 'LOAD_FAILED', message: String(error?.message || '').slice(0, 250) }; }
  }
  res.status(200).json({ startup: true, modules: results });
}
