import {
  STANDARD_CATALOG_MAX_FILE_BYTES,
  isMissingCompanyColumn,
  normalizeImportedCompanies,
  type IncomingCompany,
} from '../../src/lib/standardCompanyImport';
import { parseCatalogWorkbookBuffer } from '../../src/lib/standardCompanyWorkbook';

const DATA_URL = /^data:[^;,]*;base64,([A-Za-z0-9+/=\s]+)$/;

export function workbookFromUpload(fileName: string, fileData: string) {
  const encoded = DATA_URL.exec(fileData);
  if (!encoded) throw new Error('INVALID_FILE');
  const file = Buffer.from(encoded[1].replace(/\s+/g, ''), 'base64');
  if (!file.length || file.length > STANDARD_CATALOG_MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE');
  return parseCatalogWorkbookBuffer(file, fileName);
}

export function catalogFromImportBody(body: Record<string, unknown>) {
  if (Array.isArray(body.companies)) {
    const parsed = normalizeImportedCompanies(body.companies);
    if (isMissingCompanyColumn(parsed)) throw new Error('NO_COMPANY_COLUMN');
    return parsed;
  }

  const fileName = typeof body.file_name === 'string' ? body.file_name.slice(0, 180) : '';
  const fileData = typeof body.file_data === 'string' ? body.file_data : '';
  if (!fileData) throw new Error('INVALID_FILE');
  return workbookFromUpload(fileName, fileData);
}

export type ParsedCatalogUpload = {
  companies: IncomingCompany[];
  skipped: ReturnType<typeof normalizeImportedCompanies>['skipped'];
  sheets: string[];
};
