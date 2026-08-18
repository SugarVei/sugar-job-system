import * as XLSX from 'xlsx-js-style';
import {
  STANDARD_CATALOG_MAX_FILE_BYTES,
  STANDARD_CATALOG_MAX_SHEETS,
  collectIncomingCompanies,
  isMissingCompanyColumn,
  type SheetMatrix,
} from './standardCompanyImport';

export function workbookMatricesFromBytes(data: Uint8Array): SheetMatrix[] {
  const workbook = XLSX.read(data, { type: 'array', raw: false, cellStyles: false });
  return workbook.SheetNames.slice(0, STANDARD_CATALOG_MAX_SHEETS).map((name) => ({
    name: name.slice(0, 40) || 'Sheet1',
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    }),
  }));
}

export function parseCatalogWorkbookBuffer(data: Uint8Array, fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (extension !== 'xlsx') throw new Error('INVALID_FILE');
  if (!data.length || data.length > STANDARD_CATALOG_MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE');
  if (String.fromCharCode(data[0], data[1]) !== 'PK') throw new Error('INVALID_FILE');

  const parsed = collectIncomingCompanies(workbookMatricesFromBytes(data));
  if (isMissingCompanyColumn(parsed)) throw new Error('NO_COMPANY_COLUMN');
  return parsed;
}

export async function parseCatalogWorkbookFile(file: File) {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('INVALID_FILE');
  if (file.size > STANDARD_CATALOG_MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE');
  return parseCatalogWorkbookBuffer(new Uint8Array(await file.arrayBuffer()), file.name);
}
