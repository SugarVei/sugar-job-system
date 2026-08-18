import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveHotCompanyHq, resolvePrefectureName } from './hotCompanyHq.ts';

describe('hotCompanyHq', () => {
  it('maps official city names and comma-separated workplace lists', () => {
    assert.equal(resolvePrefectureName('北京市'), '北京');
    assert.equal(resolveHotCompanyHq({ name: '新公司', city: '北京,上海,深圳' })?.city, '北京');
    assert.equal(resolveHotCompanyHq({ name: '新公司', city: '杭州市 / 南京' })?.city, '杭州');
    assert.equal(resolveHotCompanyHq({ name: '新公司', city: '全国' }), null);
  });
});
