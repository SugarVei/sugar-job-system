const COMPANY_SUFFIX = /(?:股份有限责任公司|有限责任公司|股份有限公司|集团有限公司|集团公司|有限公司|公司)$/u;

const COMPANY_ALIASES: Array<[RegExp, string]> = [
  [/^(?:北京)?北方华创(?:科技集团|微电子装备|微电子)?$/u, '北方华创'],
];

export function normalizeCompanyName(name: string) {
  const normalized = name.trim().toLocaleLowerCase('zh-CN').replace(/\s+/gu, '').replace(COMPANY_SUFFIX, '');
  return COMPANY_ALIASES.find(([pattern]) => pattern.test(normalized))?.[1] ?? normalized;
}

/** 投递记录名称只要包含热门公司的名称，就视为同一家公司。 */
export function applicationCompanyMatchesHotCompany(applicationCompanyName: string, hotCompanyName: string) {
  const applicationName = normalizeCompanyName(applicationCompanyName);
  const brandName = normalizeCompanyName(hotCompanyName);
  return Boolean(brandName && applicationName.includes(brandName));
}
