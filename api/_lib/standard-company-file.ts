import {
  attachClientSkipped,
  isMissingCompanyColumn,
  normalizeImportedCompanies,
} from '../../src/lib/standardCompanyImport';

export function catalogFromImportBody(body: Record<string, unknown>) {
  if (!Array.isArray(body.companies)) throw new Error('INVALID_FILE');
  const parsed = attachClientSkipped(normalizeImportedCompanies(body.companies), body.skipped);
  if (isMissingCompanyColumn(parsed)) throw new Error('NO_COMPANY_COLUMN');
  return parsed;
}
