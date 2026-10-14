# AGENTS.md

## Cursor Cloud specific instructions

### 项目概览

Sugar 求职系统是一个前端应用（React 18 + Vite 5 + TypeScript + Tailwind），数据与登录依赖 Supabase。仓库还包含两个附属部分：

- `api/`：Vercel Serverless Functions（AI 对话、邮箱抓取、简历解析、浏览器插件配对等）。本地开发不是必需，且需要 `DEEPSEEK_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`AI_CREDENTIAL_MASTER_KEY` 等服务端密钥；只在需要调试这些接口时用 `vercel dev` 运行。
- `browser-extension/`：配套的 Chrome 智能填表插件，在 `chrome://extensions` 以“加载已解压的扩展程序”方式加载，无独立构建步骤。

### 常用命令（详见 `package.json`）

- 开发：`npm run dev`（Vite，端口 5173，`vite.config.ts` 中 `host: true`）
- 构建：`npm run build`（先 `tsc --noEmit` 类型检查，再 `vite build`）
- 代码检查：`npm run lint`（ESLint，配置见 `eslint.config.js`）
- 仓库没有任何自动化测试框架，也没有 CI / git hooks；质量门槛只有 `npm run lint` 和 `npm run build`。手动验收清单见 `docs/job-assist-manual-check.md` 和 `design-qa.md`。

### 关键陷阱：Supabase 是核心功能的前提

- `src/lib/supabase.ts` 只从环境变量读取 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`。**未配置时应用会自动进入“演示模式”**（`AuthContext` 注入一个“演示用户”会话并跳过登录），此时列表读取返回空、任何写入都会抛出“Supabase 尚未配置，无法保存数据。”。因此要真正验证核心功能（登录、投递/公司/简历/面试/Offer 的增删改查），必须连上可用的 Supabase。
- Vite 环境变量在启动时读取；修改 `.env` 后必须**重启 `npm run dev`** 才会生效。

### 连接 Supabase 的两种方式

1. 远程（最省事，推荐）：在 Secrets 中提供指向已应用 schema 的托管 Supabase 项目的 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`，写入 `.env` 后重启 dev server。
2. 本地（离线自足，本环境已验证可行）：需要 Docker 与 Supabase CLI（属于系统依赖，不放进更新脚本）。仓库已包含 `supabase/config.toml`（本地默认关闭邮箱确认，注册即登录）。启动步骤：
   - `supabase start`（首次会拉取镜像），记录输出中的 `API_URL`（`http://127.0.0.1:54321`）和 `ANON_KEY`。
   - **不要用 `supabase db reset` / 依赖 `supabase/migrations/` 建库**：`supabase/schema.sql` 才是完整的基础 schema，而 `supabase/migrations/` 里的时间戳迁移是增量补丁、依赖 schema.sql 建好的基础表，在空库上单独跑会因缺表而失败。正确做法是直接应用基础 schema：
     `docker exec -i $(docker ps --format '{{.Names}}' | grep supabase_db) psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/schema.sql`
   - 把上面的 `API_URL` / `ANON_KEY` 写入 `.env` 的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`，重启 dev server。
   - `schema.sql` 已覆盖核心表（applications、companies、resumes、interviews、referral_codes 等）；若要验证求职辅助、Offer、邮箱等后期功能，再按需应用 `supabase/migration_*.sql` / `supabase/migrations/*.sql` 中对应的增量脚本。

### 本机 Docker 备注

本环境的 Docker 需使用 `fuse-overlayfs` 存储驱动，且 Docker 29 下必须在 `/etc/docker/daemon.json` 关闭 `containerd-snapshotter`（`"features": {"containerd-snapshotter": false}`），否则 `supabase start` 拉起的容器无法正常运行。
