const norm = value => String(value || '').toLowerCase().replace(/\s+/g, '');
const text = node => norm([node.name, node.id, node.autocomplete, node.placeholder, node.getAttribute('aria-label'), document.querySelector(`label[for="${CSS.escape(node.id || '_')}"]`)?.textContent].join(' '));
const valueFor = (profile, hint) => {
  const p = profile.personal || {}, c = profile.contact || {}, o = profile.online || {};
  const map = [[/email|邮箱/, c.email || p.email], [/phone|mobile|tel|手机|电话/, c.phone || p.phone], [/first.?name|名(?!字)/, p.firstName || p.name], [/last.?name|姓/, p.lastName], [/full.?name|姓名|name/, p.name || p.fullName], [/linkedin/, o.linkedin], [/github/, o.github], [/portfolio|作品集/, o.portfolio], [/city|城市|所在地/, p.city || c.city], [/school|学校/, profile.education?.[0]?.school]];
  return map.find(([pattern]) => pattern.test(hint))?.[1] || '';
};
async function fill() {
  const stored = await chrome.storage.local.get('sugar_autofill_profile');
  const record = stored.sugar_autofill_profile;
  const profile = record?.profile;
  if (!profile) return { fields_total: 0, fields_filled: 0, fields_manual: 0, status: 'failed', error_codes: ['profile_missing'] };
  let total = 0, filled = 0;
  for (const field of document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=password]), textarea, select')) {
    if (field.disabled || field.readOnly || field.value) continue;
    total++;
    const value = valueFor(profile, text(field));
    if (!value) continue;
    if (field.tagName === 'SELECT') { const option = [...field.options].find(o => norm(o.textContent) === norm(value)); if (!option) continue; field.value = option.value; }
    else field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true })); filled++;
  }
  const run = { origin_host: location.hostname, status: filled === total ? 'success' : 'partial', fields_total: total, fields_filled: filled, fields_manual: Math.max(0, total - filled), error_codes: [], adapter_names: ['generic-safe-fill'] };
  chrome.runtime.sendMessage({ type: 'recordRun', run });
  return run;
}
chrome.runtime.onMessage.addListener((message, _sender, reply) => { if (message.type === 'fill') fill().then(reply); return true; });
