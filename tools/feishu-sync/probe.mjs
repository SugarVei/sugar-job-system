import { chromium } from 'playwright';
import XLSX from 'xlsx-js-style';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

export const SOURCE_URL = 'https://yal2at57cvq.feishu.cn/base/GtSLbyyR3aCENOsJYC6cdlsVnih?share_id=b43f8a74d629482099b267bf16046475&table=tblH4au5rnBcqHgJ&view=vew8PFC7nG';
export const TARGET_TABLE_ID = 'tblH4au5rnBcqHgJ';
const MAX_BYTES = 20 * 1024 * 1024;
const targetSheet = /26[、,，\s]*27.*校招汇总表/u;

export function validateWorkbook(bytes) {
  if (bytes.length < 4 || bytes.length > MAX_BYTES || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new Error('INVALID_WORKBOOK: 导出内容不是有效的 .xlsx，或超过 20MB。');
  }
  let workbook;
  try {
    workbook = XLSX.read(bytes, { type: 'buffer', raw: false, cellStyles: false });
  } catch {
    throw new Error('INVALID_WORKBOOK: Excel 文件解析失败。');
  }
  const selected = workbook.SheetNames.filter((name) => targetSheet.test(name));
  const names = selected.length ? selected : workbook.SheetNames.length === 1 ? workbook.SheetNames : [];
  if (!names.length) throw new Error('TARGET_SHEET_MISSING: 未找到 26、27 校招汇总表。');
  const sheets = names.map((name) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: '', blankrows: false });
    const headerIndex = rows.slice(0, 30).findIndex((row) => row.some((cell) => /^(公司名称|企业名称)$/u.test(String(cell).trim()))
      && row.some((cell) => /^(届次|届别|毕业届)$/u.test(String(cell).trim())));
    if (headerIndex < 0) throw new Error('HEADERS_MISSING: 缺少公司名称或届次列。');
    const nameIndex = rows[headerIndex].findIndex((cell) => /^(公司名称|企业名称)$/u.test(String(cell).trim()));
    const rowCount = rows.slice(headerIndex + 1).filter((row) => String(row[nameIndex] ?? '').trim()).length;
    if (!rowCount) throw new Error('EMPTY_WORKBOOK: 表内没有公司，保留原有数据。');
    return { name, rowCount };
  });
  return { sheets, rowCount: sheets.reduce((total, sheet) => total + sheet.rowCount, 0), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}

export function cloudSessionState(stored) {
  const cookies = stored.cookies.filter((cookie) => /(^|\.)(feishu\.cn|larksuite\.com)$/iu.test(cookie.domain));
  if (!cookies.length) throw new Error('SESSION_MISSING: 请先登录飞书。');
  // Preserve the sign-in origin, excluding all Base document caches.
  const origins = stored.origins.filter((origin) => origin.origin === 'https://accounts.feishu.cn');
  if (!origins.some((origin) => origin.localStorage.some((item) => item.name === 'dpop_tg_key_pair_v1'))) {
    throw new Error('SESSION_KEY_MISSING: 登录校验信息不完整，请重新登录飞书后再保存。');
  }
  return { cookies, origins };
}

async function firstVisible(locators) {
  for (const locator of locators) {
    for (const item of await locator.all()) {
      if (await item.isVisible()) return item;
    }
  }
  return null;
}

async function findExport(page) {
  return firstVisible([
    page.getByRole('menuitem', { name: /^(导出|Export)$/iu }),
    page.getByText(/^(导出|Export)$/iu, { exact: true }),
  ]);
}

export async function openExportMenu(page) {
  // Feishu can leave the SSR header mounted beside the hydrated header.
  // Exclude its placeholder even after stage-0 disappears, and select only a
  // visible live button so duplicate/hidden headers cannot break strict mode.
  const menu = page.locator('button.more-btn:not(.header-ssr-layout-component-MoreBtn):not(.header-ssr-layout-stage-0):visible').first();
  await menu.waitFor({ state: 'visible', timeout: 90_000 });
  const direct = await findExport(page);
  if (direct) return direct;
  await menu.click();
  await page.getByText(/^(导出|Export)$/iu, { exact: true }).first().waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => { throw new Error('AUTH_OR_PERMISSION_REQUIRED: 当前会话没有导出入口，请重新登录并检查下载权限。'); });
  return findExport(page);
}

export async function downloadWorkbook(page) {
  const source = new URL(page.url());
  if (source.hostname !== 'yal2at57cvq.feishu.cn' || source.searchParams.get('table') !== TARGET_TABLE_ID) {
    throw new Error('WRONG_TABLE: 当前页面不是指定的校招汇总表。');
  }
  const exportItem = await openExportMenu(page);
  await exportItem.hover();
  await page.getByText(/^Excel\s*\/\s*CSV\s*(文件)?$/iu).first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  let excel = await firstVisible([page.getByText(/^Excel\s*\/\s*CSV\s*(文件)?$/iu)]);
  if (!excel) {
    await exportItem.click();
    excel = await firstVisible([page.getByText(/^Excel\s*\/\s*CSV\s*(文件)?$/iu)]);
  }
  if (!excel) throw new Error('EXCEL_EXPORT_MISSING: 未找到 Excel/CSV 文件入口。');

  // Observe every new page too: Feishu may initiate the download in a popup.
  const context = page.context();
  let resolveDownload;
  const downloadPromise = new Promise((resolveDownloadValue) => { resolveDownload = resolveDownloadValue; });
  const onDownload = (download) => resolveDownload(download);
  const attach = (newPage) => newPage.on('download', onDownload);
  context.pages().forEach(attach);
  context.on('page', attach);
  let timeout;
  try {
    await excel.click();
    // This dialog is loaded asynchronously after selecting Excel/CSV.
    const dialog = page.getByRole('dialog').filter({ hasText: '下载设置' });
    await dialog.waitFor({ state: 'visible', timeout: 20_000 });
    if (await dialog.isVisible()) {
      const format = await firstVisible([dialog.getByRole('radio', { name: /Excel|xlsx/iu })]);
      if (format) await format.check();
      const confirm = await firstVisible([
        dialog.getByRole('button', { name: /^(导出|下载|Export|Download)$/iu }),
      ]);
      if (!confirm) throw new Error('EXPORT_DIALOG_CHANGED: 导出对话框需要人工检查。');
      await confirm.click();
    }
    const download = await Promise.race([
      downloadPromise,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('DOWNLOAD_TIMEOUT: 未收到 Excel 下载。')), 90_000); }),
    ]);
    const failure = await download.failure();
    if (failure) throw new Error('DOWNLOAD_FAILED: 飞书文件下载失败。');
    if (!/\.xlsx$/iu.test(download.suggestedFilename())) throw new Error('UNEXPECTED_FORMAT: 导出结果不是 .xlsx。');
    return download;
  } finally {
    clearTimeout(timeout);
    context.off('page', attach);
    context.pages().forEach((item) => item.off('download', onDownload));
  }
}

export async function main(command = process.argv[2]) {
  if (!['login', 'inspect', 'export', 'save-session'].includes(command)) throw new Error('用法: node probe.mjs login|inspect|export|save-session');
  const stateDir = process.env.FEISHU_SYNC_STATE_DIR || join(homedir(), '.sugar-job-system', 'feishu-sync');
  await mkdir(stateDir, { recursive: true });
  const output = join(stateDir, 'output');
  await mkdir(output, { recursive: true });
  const options = {
    ...(process.env.FEISHU_BROWSER_CHANNEL === 'chromium' ? {} : { channel: process.env.FEISHU_BROWSER_CHANNEL || (process.platform === 'win32' ? 'chrome' : undefined) }),
    headless: command !== 'login' && process.env.FEISHU_HEADED !== '1',
  };
  let browser;
  const stateB64 = process.env.FEISHU_SESSION_GZIP_B64;
  const stateFile = process.env.FEISHU_AUTH_STATE;
  let storedState;
  if (stateB64 || stateFile) {
    storedState = JSON.parse(stateB64 ? gunzipSync(Buffer.from(stateB64, 'base64')).toString('utf8') : await readFile(stateFile, 'utf8'));
    browser = await chromium.launch(options);
  }
  const contextOptions = {
    acceptDownloads: true,
    locale: 'zh-CN',
    viewport: { width: 1440, height: 960 },
  };
  const context = browser
    ? await browser.newContext({ ...contextOptions, storageState: storedState })
    : await chromium.launchPersistentContext(join(stateDir, 'browser-profile'), { ...options, ...contextOptions });
  let closed = false;
  context.on('close', () => { closed = true; });
  const page = context.pages()[0] || await context.newPage();
  try {
    if (command === 'save-session') {
      // storageState only includes origins visited by this context. Register
      // the sign-in origin with a plain document so its existing proof key is
      // captured even when the Base page does not open a sign-in iframe.
      const authPage = await context.newPage();
      try {
        await authPage.goto('https://accounts.feishu.cn/robots.txt', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      } finally {
        await authPage.close();
      }
      // Load the sign-in widget before capturing state. Feishu also keeps its
      // login proof key on the accounts origin; cookies alone can pass once
      // and then fail account verification in a fresh cloud browser.
      await page.goto(SOURCE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.locator('button.more-btn:not(.header-ssr-layout-component-MoreBtn):visible').first().waitFor({ timeout: 90_000 });
      const { cookies, origins } = cloudSessionState(await context.storageState());
      const state = JSON.stringify({ cookies, origins });
      const compressed = gzipSync(Buffer.from(state)).toString('base64');
      if (Buffer.byteLength(compressed) > 47_000) throw new Error('SESSION_TOO_LARGE: 会话超过云端凭据大小限制。');
      await writeFile(join(stateDir, 'session-state.json'), state, { mode: 0o600 });
      await writeFile(join(stateDir, 'session-gzip.b64'), compressed, { mode: 0o600 });
      console.log(JSON.stringify({ saved: true, cookieCount: cookies.length, authOriginCount: origins.length, compressedBytes: Buffer.byteLength(compressed) }));
      return;
    }
    if (command === 'login') {
      const windowClosed = context.waitForEvent('close', { timeout: 30 * 60_000 });
      // Attach a rejection handler immediately while navigation is in progress.
      windowClosed.catch(() => {});
      console.log('LOGIN_WINDOW_READY: 请在浏览器里登录飞书，确认能看到校招表后关闭这个独立浏览器窗口。');
      await page.goto(SOURCE_URL, { waitUntil: 'commit', timeout: 30_000 }).catch(() => {
        if (!closed) console.log('NAVIGATION_DELAYED: 飞书加载较慢，窗口会保留，请在浏览器中检查页面或刷新。');
      });
      await windowClosed;
      console.log('LOGIN_WINDOW_CLOSED: 登录窗口已关闭。是否有有效导出权限仍需运行 export 验证。');
      return;
    }
    await page.goto(SOURCE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    // Grid headers may be painted on a canvas, so do not wait for a DOM text
    // locator for 公司名称. Wait for the surrounding page shell instead.
    await page.locator('body').filter({ hasText: /校招汇总表|登录|Log In/iu }).waitFor({ state: 'visible', timeout: 30_000 });
    if (command === 'inspect') {
      const controls = await page.locator('button, [role="button"], [aria-label], [data-testid]').evaluateAll((elements) => elements
        .filter((element) => element.getBoundingClientRect().top < 160)
        .map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 70), label: element.getAttribute('aria-label'), testId: element.getAttribute('data-testid'), className: String(element.className).slice(0, 160) })).slice(0, 60));
      console.log(JSON.stringify({ url: page.url(), controls }, null, 2));
      await page.screenshot({ path: join(output, 'inspect.png') });
      return;
    }
    const download = await downloadWorkbook(page);
    const pending = join(output, 'catalog.pending.xlsx');
    await download.saveAs(pending);
    const report = validateWorkbook(await readFile(pending));
    const checkedAt = new Date().toISOString();
    const file = join(output, `catalog-${checkedAt.replace(/[:.]/gu, '-')}.xlsx`);
    await rename(pending, file);
    await writeFile(join(output, 'last-success.pending.json'), JSON.stringify({ ...report, checkedAt, file, source: SOURCE_URL, databaseWritten: false }, null, 2), 'utf8');
    await rename(join(output, 'last-success.pending.json'), join(output, 'last-success.json'));
    console.log(JSON.stringify({ ...report, file, databaseWritten: false }, null, 2));
  } finally {
    if (!closed) await context.close();
    if (browser) await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
