const norm = value => String(value || '').toLowerCase().replace(/[\s:：*＊_\-（）()]/g, '');
const first = value => Array.isArray(value) ? value.find(Boolean) : value;
const scalar = value => Array.isArray(value) ? value.filter(Boolean).join('\n') : value;
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const sectionFor = node => {
  const patterns = [
    ['education', /教育经历|教育背景/],
    ['work', /工作经历|工作经验|实习经历|实习经验/],
    ['projects', /项目经历|项目经验/],
    ['campus', /校园经历|校园实践/],
  ];
  let section = '';
  const candidates = document.querySelectorAll('h1,h2,h3,h4,h5,h6,legend,[class*="title"],[class*="Title"]');
  for (const candidate of candidates) {
    if (!(candidate.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    const label = String(candidate.textContent || '').trim();
    if (!label || label.length > 40) continue;
    const match = patterns.find(([, pattern]) => pattern.test(label));
    if (match) section = match[0];
  }
  return section;
};

const kindFor = (hint, section) => {
  if (section === 'education') {
    if (/学校名称|学校|院校/.test(hint)) return 'school';
    if (/专业名称|专业/.test(hint)) return 'major';
    if (/学历|学位/.test(hint)) return 'degree';
  }
  if (section === 'work') {
    if (/公司名称|公司|单位名称|单位/.test(hint)) return 'company';
    if (/职位名称|岗位名称|职位|岗位/.test(hint)) return 'title';
    if (/工作职责|工作内容|职位描述|职责描述|实习内容/.test(hint)) return 'highlights';
  }
  if (section === 'projects') {
    if (/项目名称|项目名/.test(hint)) return 'name';
    if (/项目角色|担任角色|职责|角色/.test(hint)) return 'role';
    if (/项目描述|项目内容|项目成果|项目职责/.test(hint)) return 'highlights';
  }
  if (/开始时间|起始时间|开始日期|入学时间/.test(hint)) return 'startDate';
  if (/结束时间|截止时间|结束日期|毕业时间/.test(hint)) return 'endDate';
  return '';
};

const repeatableValue = (profile, context) => {
  if (!context.section || !context.kind) return '';
  let records = [];
  if (context.section === 'education') records = Array.isArray(profile.education) ? profile.education : [];
  if (context.section === 'projects') records = Array.isArray(profile.projects) ? profile.projects : [];
  if (context.section === 'campus') records = Array.isArray(profile.campus) ? profile.campus : [];
  if (context.section === 'work') {
    const work = Array.isArray(profile.work) ? profile.work : [];
    const internships = Array.isArray(profile.internships) ? profile.internships : [];
    records = work.length ? work : internships;
  }
  const record = records[context.index] || records[0] || {};
  return scalar(record[context.kind]) || '';
};

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

const valueFor = (profile, hint, context = {}) => {
  const repeated = repeatableValue(profile, context);
  if (repeated !== '' && repeated != null) return repeated;
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

const chooseCustomOption = async (field, value) => {
  field.click();
  await pause(120);
  const target = norm(value);
  const options = document.querySelectorAll([
    '[role="option"]', '.ant-select-item-option', '.el-select-dropdown__item', '.ivu-select-item',
    '.arco-select-option', '[class*="select-option"]', '[class*="selectOption"]',
  ].join(','));
  for (const option of options) {
    const rect = option.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const candidate = norm(option.textContent);
    if (candidate !== target && !candidate.includes(target) && !target.includes(candidate)) continue;
    option.click();
    await pause(80);
    return true;
  }
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return false;
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
  const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=password]), textarea, select')];
  const contexts = fields.map(field => {
    const hint = hintFor(field);
    const section = sectionFor(field);
    return { field, hint, section, kind: kindFor(hint, section), index: 0 };
  });
  contexts.forEach((context, position) => {
    if (!context.section || !context.kind) return;
    context.index = contexts.slice(0, position).filter(previous => previous.section === context.section && previous.kind === context.kind).length;
  });

  for (const context of contexts) {
    const { field, hint } = context;
    if (field.disabled) continue;
    const type = String(field.type || '').toLowerCase();

    if (type === 'radio' || type === 'checkbox') {
      if (field.checked) continue;
      total++;
      const desired = valueFor(profile, hint, context);
      if (desired && matchesChoice(field, desired)) {
        field.click();
        filled++;
      }
      continue;
    }

    if (String(field.value || '').trim()) continue;
    total++;
    const value = valueFor(profile, hint, context);
    if (value === '' || value == null) continue;

    if (field instanceof HTMLSelectElement) {
      const target = norm(value);
      const option = [...field.options].find(item => {
        const candidate = norm(item.textContent);
        return candidate === target || candidate.includes(target) || target.includes(candidate);
      });
      if (!option) continue;
      setNativeValue(field, option.value);
    } else if (field.readOnly && context.kind && !/Date$/.test(context.kind)) {
      if (!await chooseCustomOption(field, value)) continue;
    } else {
      const dateValue = /Date$/.test(context.kind) ? String(value).slice(0, 7) : value;
      setNativeValue(field, dateValue);
      await pause(30);
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
    adapter_names: ['generic-safe-fill-v3', 'repeatable-experience-fields'],
  };
  chrome.runtime.sendMessage({ type: 'recordRun', run });
  return run;
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message.type === 'fill') fill().then(reply);
  return true;
});
