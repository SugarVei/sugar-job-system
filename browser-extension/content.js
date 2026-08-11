const norm = value => String(value || '').toLowerCase().replace(/[\s:：*＊_\-（）()]/g, '');
const first = value => Array.isArray(value) ? value.find(Boolean) : value;

const nearbyLabel = node => {
  const parts = [];
  const labelledBy = node.getAttribute('aria-labelledby');
  if (labelledBy) labelledBy.split(/\s+/).forEach(id => parts.push(document.getElementById(id)?.textContent));
  if (node.id) parts.push(document.querySelector(`label[for="${CSS.escape(node.id)}"]`)?.textContent);

  const containerSelectors = [
    '.ant-form-item', '.el-form-item', '.ivu-form-item', '.arco-form-item', '.semi-form-field',
    '.form-item', '[class*="form-item"]', '[class*="formItem"]', '[class*="FormItem"]',
  ];
  for (const selector of containerSelectors) {
    const container = node.closest(selector);
    if (!container) continue;
    const label = container.querySelector('label, .ant-form-item-label, .el-form-item__label, [class*="label"], [class*="Label"]');
    if (label) parts.push(label.textContent);
    break;
  }

  const parent = node.parentElement;
  const previous = parent?.previousElementSibling || node.previousElementSibling;
  if (previous && previous.textContent?.length < 80) parts.push(previous.textContent);
  return parts.filter(Boolean).join(' ');
};

const hintFor = node => norm([
  node.name,
  node.id,
  node.autocomplete,
  node.placeholder,
  node.getAttribute('aria-label'),
  nearbyLabel(node),
].join(' '));

const valueFor = (profile, hint) => {
  const p = profile.personal || {};
  const c = profile.contact || {};
  const i = profile.identity || {};
  const o = profile.online || {};
  const pref = profile.preferences || {};
  const education = Array.isArray(profile.education) ? profile.education[0] || {} : {};
  const map = [
    [/姓名拼音|姓名全拼|namepinyin|pinyin/, p.namePinyin],
    [/first.?name|given.?name|名字/, p.firstName || p.name],
    [/last.?name|family.?name|姓氏/, p.lastName],
    [/full.?name|姓名|name/, p.name || p.fullName],
    [/email|e-mail|邮箱|电子邮件/, c.email || p.email || o.email],
    [/phone|mobile|tel|手机|电话|联系方式/, c.phone || p.phone],
    [/birth|出生日期|生日/, p.birthDate],
    [/gender|sex|性别/, p.gender],
    [/ethnicity|民族/, p.ethnicity || i.ethnicity],
    [/nativeplace|籍贯/, p.nativePlace],
    [/户籍|户口所在地|household/, p.householdRegistrationLocation || i.householdRegistrationLocation],
    [/现居住地|当前居住|currentresidence/, p.currentResidence || c.currentAddress],
    [/证件类型|idtype|documenttype/, i.idType],
    [/linkedin/, o.linkedin],
    [/github/, o.github],
    [/portfolio|作品集|个人主页/, o.portfolio],
    [/期望工作城市|期望城市|工作地点|preferredlocation/, first(pref.preferredLocations)],
    [/期望从事行业|期望行业|targetindustry/, first(pref.industries)],
    [/期望从事职业|期望职位|目标岗位|targetrole/, first(pref.targetRoles)],
    [/求职状态|employmentstatus/, pref.employmentStatus],
    [/city|城市|所在地/, c.city || p.city],
    [/province|省份/, c.province],
    [/district|区县/, c.district],
    [/school|学校|院校/, education.school],
    [/major|专业/, education.major],
    [/degree|学历|学位/, education.degree],
  ];
  return map.find(([pattern]) => pattern.test(hint))?.[1] || '';
};

const setNativeValue = (field, value) => {
  const prototype = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : field instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) setter.call(field, String(value));
  else field.value = String(value);
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: String(value) }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true }));
};

const matchesChoice = (field, desired) => {
  const target = norm(desired);
  const choice = norm([field.value, nearbyLabel(field), field.getAttribute('aria-label')].join(' '));
  if (!target || !choice) return false;
  const aliases = target === '男' || target === 'male' ? ['男', 'male']
    : target === '女' || target === 'female' ? ['女', 'female']
      : [target];
  return aliases.some(alias => choice === alias || choice.includes(alias));
};

async function fill() {
  const stored = await chrome.storage.local.get('sugar_autofill_profile');
  const record = stored.sugar_autofill_profile;
  const profile = record?.profile;
  if (!profile) return { fields_total: 0, fields_filled: 0, fields_manual: 0, status: 'failed', error_codes: ['profile_missing'] };

  let total = 0;
  let filled = 0;
  const fields = document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=password]), textarea, select');
  for (const field of fields) {
    if (field.disabled) continue;
    const type = String(field.type || '').toLowerCase();
    const hint = hintFor(field);

    if (type === 'radio' || type === 'checkbox') {
      if (field.checked) continue;
      total++;
      const desired = valueFor(profile, hint);
      if (desired && matchesChoice(field, desired)) {
        field.click();
        filled++;
      }
      continue;
    }

    if (field.readOnly || String(field.value || '').trim()) continue;
    total++;
    const value = valueFor(profile, hint);
    if (value === '' || value == null) continue;

    if (field instanceof HTMLSelectElement) {
      const target = norm(value);
      const option = [...field.options].find(item => {
        const candidate = norm(item.textContent);
        return candidate === target || candidate.includes(target) || target.includes(candidate);
      });
      if (!option) continue;
      setNativeValue(field, option.value);
    } else {
      setNativeValue(field, value);
    }
    filled++;
  }

  const errorCodes = filled ? [] : ['no_matching_fields'];
  const run = {
    origin_host: location.hostname,
    status: filled && filled === total ? 'success' : 'partial',
    fields_total: total,
    fields_filled: filled,
    fields_manual: Math.max(0, total - filled),
    error_codes: errorCodes,
    adapter_names: ['generic-safe-fill-v2'],
  };
  chrome.runtime.sendMessage({ type: 'recordRun', run });
  return run;
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message.type === 'fill') fill().then(reply);
  return true;
});
