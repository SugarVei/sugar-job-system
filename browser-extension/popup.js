const send = message => chrome.runtime.sendMessage(message);
const result = text => document.querySelector('#result').textContent = text;
async function status() { const r = await send({ type: 'status' }); document.querySelector('#status').textContent = r.connection ? `已连接：${r.connection.device?.display_name || 'Chrome'}` : '尚未连接，请先在 Sugar 页面生成配对码。'; }
document.querySelector('#pair').onclick = async () => { const r = await send({ type: 'pair', pairCode: document.querySelector('#code').value }); result(r.ok ? '连接并同步成功。' : r.error); if (r.ok) status(); };
document.querySelector('#sync').onclick = async () => { const r = await send({ type: 'sync' }); result(r.ok ? '资料已同步。' : r.error); };
document.querySelector('#fill').onclick = async () => { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); try { const r = await chrome.tabs.sendMessage(tab.id, { type: 'fill' }); result(r?.fields_filled ? `已填写 ${r.fields_filled}/${r.fields_total} 项；不会提交表单。` : r?.error_codes?.includes('profile_missing') ? '插件中没有标准资料，请先点击“同步标准资料”。' : `识别到 ${r?.fields_total ?? 0} 项，但没有匹配字段；请刷新招聘页面后重试。`); } catch { result('插件尚未注入当前页面，请刷新招聘页面后重试。'); } };
status();
