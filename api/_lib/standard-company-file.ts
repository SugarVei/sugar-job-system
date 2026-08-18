import * as XLSX from 'xlsx-js-style';
import {
  STANDARD_CATALOG_MAX_FILE_BYTES,
  collectIncomingCompanies,
  type SheetMatrix,
} from '../../src/lib/standardCompanyImport';

const DATA_URL = /^data:[^;,]*;base64,([A-Za-z0-9+/=\s]+)$/;

function readWorkbookMatrices(buffer: Buffer): SheetMatrix[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
  return workbook.SheetNames.slice(0, 12).map((name) => ({
    name: name.slice(0, 40) || 'Sheet1',
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    }),
  }));
}

export function workbookFromUpload(fileName: string, fileData: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const encoded = DATA_URL.exec(fileData);
  if (extension !== 'xlsx' || !encoded) throw new Error('INVALID_FILE');
  const file = Buffer.from(encoded[1].replace(/\s+/g, ''), 'base64');
  if (!file.length || file.length > STANDARD_CATALOG_MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE');
  if (file.subarray(0, 2).toString() !== 'PK') throw new Error('INVALID_FILE');

  const parsed = collectIncomingCompanies(readWorkbookMatrices(file));
  if (parsed.companies.length === 0 && parsed.skipped.every((row) => row.reason === '缺少公司名' || !row.reason)) {
    throw new Error('NO_COMPANY_COLUMN');
  }
  return parsed;
}
