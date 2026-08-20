import {
  isMissingCompanyColumn,
  normalizeImportedCompanies,
} from '../../src/lib/standardCompanyImport';

export function catalogFromImportBody(body: Record<string, unknown>) {
  if (!Array.isArray(body.companies)) throw new Error('INVALID_FILE');
  const parsed = normalizeImportedCompanies(body.companies);
  if (isMissingCompanyColumn(parsed) && body.client_parsed !== true) throw new Error('NO_COMPANY_COLUMN');
  return parsed;
}
