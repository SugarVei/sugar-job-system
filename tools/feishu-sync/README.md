# 飞书校招公司库自动同步

导出指定的「📁26、27校招汇总表」，校验 Excel 后复用网站现有的 27 届筛选、去重与字段合并规则，更新标准公司库。源表未出现的公司不会删除。

## 云端执行

工作流为 `.github/workflows/feishu-catalog-sync.yml`，每天美东时间 08:17 运行，时区为 `America/New_York`，随夏令时调整；电脑无需开机。执行可能受 GitHub 队列影响。

- `FEISHU_SESSION_GZIP_B64`：独立飞书登录会话，保存在 GitHub 加密 Secret。
- `FEISHU_SYNC_SIGNING_KEY`：仅用于公司库同步的 Ed25519 私钥，保存在 GitHub 加密 Secret。
- `FEISHU_CATALOG_SYNC_URL`：同步函数地址，保存在仓库 Variable。
- `FEISHU_CATALOG_SYNC_ENABLED=true`：首次云端验证后开启每日运行。

安装依赖时不提供凭据。下载步骤只获得飞书会话；写入步骤只获得签名私钥。数据库管理密钥留在 Supabase 函数内部，不传给 GitHub。工作流不上传登录状态、Excel 或浏览器跟踪作为公开产物。

在 Actions 页面手动选择 `preview` 预览数量，或选择 `apply` 执行。源文件为空、缺列、损坏、会话失效或读取失败时停止，不发送数据库更新。所有公司变更通过一个数据库 upsert 事务完成；重复执行不会重复添加相同公司。

## 本机验证与登录续期

在项目根目录运行 `npm ci --ignore-scripts`，在本目录运行 `npm ci`，本机需安装 Chrome。设置 `FEISHU_BROWSER_CHANNEL=msedge` 可使用 Edge。

1. 根目录运行 `node tools/feishu-sync/probe.mjs login`，在独立浏览器登录飞书，看到目标表后关闭窗口。
2. `node tools/feishu-sync/probe.mjs export`，真实导出并校验。
3. `node tools/feishu-sync/probe.mjs save-session`，生成供云端复用的压缩会话，包含独立浏览器的飞书 Cookies 及登录页面的校验信息（包括登录证明密钥），不包含缓存的表格数据。Cookies 单独复制可能只成功一次，随后出现账号校验异常；续期后应连续验证两次独立浏览器导出。
4. 用 PowerShell 更新云端会话：

   ```powershell
   Get-Content -LiteralPath "$env:USERPROFILE\.sugar-job-system\feishu-sync\session-gzip.b64" -Raw |
     gh secret set FEISHU_SESSION_GZIP_B64 --repo SugarVei/sugar-job-system
   ```

默认浏览器配置和结果位于用户主目录的 `.sugar-job-system/feishu-sync/`，在仓库之外。`FEISHU_SYNC_STATE_DIR` 可指定其他目录。不要提交该目录、私钥或登录状态。飞书注销、会话过期或下载权限改变后，需要重新登录并更新 Secret。

验证写入接口时，在根目录运行：

```powershell
$env:FEISHU_CATALOG_SYNC_URL = 'https://evnnkfclhxmjprttcmal.supabase.co/functions/v1/standard-company-catalog-sync'
node --experimental-strip-types --import ./scripts/register-ts-ext.mjs tools/feishu-sync/sync.mjs preview
```

## 服务端与维护

`server/_lib/standard-catalog-sync.ts` 验证签名及时间戳，完整分页读取现有公司，再用 `diffCatalog` 计算变化。`catalog-sync-public-key.ts` 是可公开的验证公钥；私钥仅在本机私有目录和 GitHub 加密 Secret 中。

`npm run build:catalog-sync` 将函数打包到 `node_modules/.catalog-sync/index.js`，再部署为 Supabase Edge Function `standard-company-catalog-sync`。函数自行验证 Ed25519 签名，因此平台 JWT 校验关闭；未签名、被篡改或时间戳超过 2 分钟的请求不能访问数据库。

沿用 `standard_companies` 和 `standard_company_import_runs`，没有新增数据库表。日志文件名为 `feishu-auto-YYYY-MM-DD.xlsx`，关联最近一次标准公司库导入的管理员。

导入与页面读取上限从 4,000 调整到 20,000，卡片继续沿用现有分页。源表超限时同步报错，避免静默截断。

热门公司的日期筛选按公司记录的 `source_update_date` 自动生成，并默认选择最新开招日期，不使用同步任务的执行日期。筛选值保留完整年月日，避免上一年同月同日的公司混入；下拉文案沿用“月日开招”。已打开的网页每 5 分钟、切回窗口或恢复联网时刷新公司库；刷新失败时保留上次成功加载的数据。用户手动选择历史日期或全部时继续保留选择。

## 验证命令

- 根目录 `npm test`：现有功能及同步签名、分页、字段保留、重复执行、失败停止。
- 本目录 `npm test`：有效 Excel、错误工作表、空表、缺列、损坏文件和登录 HTML。
- 根目录 `npm run lint`、`npm run build`。

实现参考：[Playwright 登录状态](https://playwright.dev/docs/auth)、[下载事件](https://playwright.dev/docs/downloads)、[GitHub 定时工作流](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule)。
