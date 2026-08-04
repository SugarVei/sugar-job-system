const COMPANY_SUFFIX = /(?:股份有限责任公司|有限责任公司|股份有限公司|集团有限公司|集团公司|有限公司|公司)$/u;

export function normalizeCompanyName(name: string) {
  return name.trim().toLocaleLowerCase('zh-CN').replace(/\s+/gu, '').replace(COMPANY_SUFFIX, '');
}
