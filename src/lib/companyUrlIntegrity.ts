import { normalizeCompanyName } from './companyName';

/**
 * Company-specific recruitment URLs manually verified against the destination
 * page. Keep this list small: it guards known cross-company mislinks without
 * pretending that a URL can be validated from its domain alone.
 */
const VERIFIED_URL_OVERRIDES: Record<string, { badUrls: string[]; url: string; applyUrl: string }> = {
  [normalizeCompanyName('卡奥斯')]: {
    badUrls: ['https://maker.haier.net/client/campus/customizedptjobs/id/87.html'],
    url: 'https://maker.haier.net/client/newarea/businessdetail/type/2',
    applyUrl: 'https://maker.haier.net/client/newarea/businessdetail/type/2',
  },
  [normalizeCompanyName('盈康一生')]: {
    badUrls: ['https://maker.haier.net/client/campus/activityindex.html'],
    url: 'https://maker.haier.net/client/healthy/index.html',
    applyUrl: 'https://maker.haier.net/client/healthy/index.html',
  },
  [normalizeCompanyName('中粮家佳康')]: {
    badUrls: ['https://mp.weixin.qq.com/s/vzOQzoxXQdufGGZx3sMcUg'],
    url: 'https://cofcojoycome.zhaopin.com/',
    applyUrl: 'https://cofcojoycome.zhaopin.com/',
  },
};

export function applyVerifiedCompanyUrl(
  companyName: string,
  url: string,
  applyUrl = url,
) {
  const override = VERIFIED_URL_OVERRIDES[normalizeCompanyName(companyName)];
  if (override && (override.badUrls.includes(url) || override.badUrls.includes(applyUrl))) return override;
  return { url, applyUrl };
}
