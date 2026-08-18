import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canManageStandardCatalog, catalogAdminEmails } from './standardCatalogAdmin.ts';

describe('standardCatalogAdmin', () => {
  it('defaults to the owner email when the env is empty', () => {
    assert.deepEqual(catalogAdminEmails(''), ['twxyforl@gmail.com']);
    assert.equal(canManageStandardCatalog('twxyforl@gmail.com'), true);
    assert.equal(canManageStandardCatalog('other@example.com'), false);
    assert.equal(canManageStandardCatalog(''), false);
  });

  it('uses the env allowlist when it is set', () => {
    assert.deepEqual(catalogAdminEmails('a@example.com, B@example.com'), ['a@example.com', 'b@example.com']);
    assert.equal(canManageStandardCatalog('b@example.com', 'a@example.com, B@example.com'), true);
    assert.equal(canManageStandardCatalog('twxyforl@gmail.com', 'a@example.com'), false);
  });
});
