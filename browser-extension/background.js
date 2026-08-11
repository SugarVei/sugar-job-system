const ORIGIN = 'https://sugar-job-system.vercel.app';
const KEY = 'sugar_autofill_connection';
const request = async (path, init = {}) => {
  const response = await fetch(`${ORIGIN}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `请求失败 (${response.status})`);
  return body;
};
const connection = async () => (await chrome.storage.local.get(KEY))[KEY] || null;
async function syncProfile() {
  const saved = await connection();
  if (!saved?.device_token) throw new Error('请先在插件中输入配对码');
  const result = await request('/api/extension-profile', { headers: { 'X-Device-Token': saved.device_token } });
  if (!result.profile) throw new Error('系统中尚未保存标准资料');
  await chrome.storage.local.set({ sugar_autofill_profile: result.profile, [KEY]: { ...saved, synced_at: new Date().toISOString() } });
  return result.profile;
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    if (message.type === 'pair') {
      const pair_code = String(message.pairCode || '').trim();
      if (!/^\d{6}$/.test(pair_code)) throw new Error('请输入 6 位配对码');
      const result = await request('/api/extension-pair-exchange', { method: 'POST', body: JSON.stringify({ pair_code, display_name: 'Chrome', browser: 'Chrome', platform: navigator.platform, extension_version: chrome.runtime.getManifest().version }) });
      await chrome.storage.local.set({ [KEY]: { ...result, paired_at: new Date().toISOString() } });
      await syncProfile();
      reply({ ok: true, device: result.device });
    } else if (message.type === 'sync') reply({ ok: true, profile: await syncProfile() });
    else if (message.type === 'status') reply({ ok: true, connection: await connection() });
    else if (message.type === 'recordRun') {
      const saved = await connection();
      if (saved?.device_token) await request('/api/extension-runs', { method: 'POST', headers: { 'X-Device-Token': saved.device_token }, body: JSON.stringify(message.run) });
      reply({ ok: true });
    }
  })().catch(error => reply({ ok: false, error: error.message }));
  return true;
});
