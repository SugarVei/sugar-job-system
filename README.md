# Sugar 求职系统 🍬

一个把求职过程「记录化、可视化、行动化」的网页应用，由原单文件设计稿重构为标准前端工程。

- **技术栈**：React 18 + Vite 5 + TypeScript + Tailwind CSS + Vercel Serverless/Edge Functions
- **后端 / 登录**：Supabase（Auth 邮箱登录注册 + Postgres 云端存储 + Storage 文件上传 + 行级安全 RLS）
- **响应式**：电脑（侧边栏）/ 平板（两列）/ 手机（底部导航、卡片单列），最低适配 360px
- **页面**：登录、总览仪表盘、投递总览、投递记录、公司库、热门公司、简历库、面试日历、Offer 管理、面试复盘、JD 匹配分析
- **内嵌 AI 能力**：热门公司页找公司、投递总览分析、简历库生成面试稿件（当前不是独立导航页面）
- **主题**：粉 / 蓝 / 绿 / 灰 / 米白 5 套配色，弥散流光动态背景，磨砂玻璃质感

---

## 一、本地运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（见下方「Supabase 配置」）
cp .env.example .env
#   然后编辑 .env 填入你的 Supabase URL 和 anon key

# 3. 启动开发服务器
npm run dev
#   打开 http://localhost:5173

# 4. 生产打包
npm run build      # 产物在 dist/
npm run preview    # 本地预览打包结果
```

> 未配置 `.env` 时页面仍可打开并展示登录界面，但登录/注册不可用（会有提示）。配置后即可正常使用。

---

## 二、Supabase 配置

### 1. 创建项目
1. 打开 <https://supabase.com> 注册并新建一个 Project（免费额度足够个人使用）。
2. 进入 **Project Settings → API**，复制：
   - `Project URL` → 填入 `.env` 的 `VITE_SUPABASE_URL`
   - `anon` `public` key → 填入 `.env` 的 `VITE_SUPABASE_ANON_KEY`

> ⚠️ 只使用 **anon public** key，前端绝不要放 `service_role` key。anon key 是设计为公开的，数据安全由下面的 RLS 行级安全策略保证。

### 2. 建表 + 行级安全
1. 进入 Supabase 控制台 → **SQL Editor → New query**。
2. 按顺序执行以下 SQL：
   - 第一步：[`supabase/schema.sql`](./supabase/schema.sql)
   - 第二步：[`supabase/migration_resume_files.sql`](./supabase/migration_resume_files.sql)。如果 `schema.sql` 已是最新版，此步骤可作为兼容旧库使用。
   - 第三步：[`supabase/migration_resume_files_ai_scripts.sql`](./supabase/migration_resume_files_ai_scripts.sql)
   - 第四步：[`supabase/migration_api_keys.sql`](./supabase/migration_api_keys.sql)
   - 对已有数据库，先执行第一阶段统一迁移：[`supabase/migration_phase1_foundation_fix.sql`](./supabase/migration_phase1_foundation_fix.sql)。它会兼容旧字段并补齐状态约束、索引、RLS 与 Storage policy，不删除业务数据。
   - 最后执行第二阶段职业模块迁移：[`supabase/migration_phase2_career_modules.sql`](./supabase/migration_phase2_career_modules.sql)。
3. `schema.sql` 会创建 `applications` / `companies` / `resumes` / `resume_files` / `user_api_keys` / `interviews`，自动维护 `updated_at`，并为业务表开启 RLS + select/insert/update/delete 策略，保证**每个用户只能读写自己的数据**。

### 3. 安全说明
- 前端只能使用 Supabase `anon public` key，不要把 `service_role` key 写入代码、`.env` 或 Vercel 前端变量。
- API Key 存储在用户自己的 Supabase 数据中，并受 RLS 行级权限保护；除非真正实现加密，不要称为“已加密”。
- AI 服务商充值、API Key 创建和账号登录应在 DeepSeek / OpenAI / Anthropic / Kimi 官方平台完成。
- AI 接口只会使用服务端白名单中的官方 `baseUrl`，不会信任前端传入的任意地址。

### 4. 邮箱登录设置
- 默认情况下 Supabase 会要求邮箱确认。可在 **Authentication → Providers → Email** 中：
  - 保持「Confirm email」开启（更安全）：注册后需去邮箱点确认链接再登录；
  - 或关闭它（体验更顺滑）：注册后可直接登录。
- 部署上线后，记得在 **Authentication → URL Configuration** 把你的线上域名加入 **Site URL / Redirect URLs**。

---

## 三、数据表结构

| 表 | 关键字段 |
|---|---|
| `applications` 投递记录 | company_name, position_name, city, channel, apply_date, status, salary_range, job_url, jd_text, jd_keywords, match_score, next_action, deadline_at, priority, notes |
| `companies` 公司库 | company_name, industry, city, scale, website, notes |
| `resumes` 简历库 | resume_name, target_position, file_url, notes |
| `resume_files` 简历/稿件文件 | resume_id, file_name, file_path, kind, size, content, source |
| `user_api_keys` 用户 AI Key | provider, api_key |
| `interviews` 面试日历 | company_name, position_name, interview_time, round, interview_type, notes |
| `offers` Offer 管理 | 薪资结构、回复截止、状态、评分、谈薪与风险 |
| `interview_reviews` 面试复盘 | 面试信息、STAR、表现评分、改进计划 |
| `interview_review_questions` 面试问题/题库 | 问题、回答、题型、掌握状态 |
| `jd_matches` JD 匹配历史 | JD 解析、关键词、匹配分数、建议与投递联动 |

每张表都含 `id`、`user_id`、`created_at`、`updated_at`。完整 SQL（含 RLS）见 [`supabase/schema.sql`](./supabase/schema.sql)。

---

## 四、部署到 Vercel（推荐）

1. 把项目推到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "init sugar job system"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
   > `.env` 已被 `.gitignore` 忽略，不会上传密钥，放心。
2. 打开 <https://vercel.com> → **Add New → Project** → 选择刚才的 GitHub 仓库导入。
3. Vercel 会自动识别为 Vite 项目（已附带 `vercel.json`）：
   - Framework Preset：`Vite`
   - Build Command：`npm run build`
   - Output Directory：`dist`
4. 在 **Settings → Environment Variables** 添加两个变量（**不要**写进代码仓库）：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ALLOWED_ORIGIN`（建议填生产域名，如 `https://sugar-job-system.vercel.app`，用于 Vercel API CORS）
   - `DEEPSEEK_API_KEY`（可选，只作为 DeepSeek 服务端兜底；用户也可以在 AI 设置中保存自己的 Key）
5. 点 **Deploy**。几十秒后得到一个 `https://xxx.vercel.app` 网址，电脑/平板/手机都能访问登录。
6. 之后每次 `git push` 都会自动重新部署。

---

## 五、部署到 Netlify

1. 同样先把项目推到 GitHub。
2. 打开 <https://app.netlify.com> → **Add new site → Import an existing project** → 选 GitHub 仓库。
3. 构建设置（已附带 `netlify.toml`，一般会自动填好）：
   - Build command：`npm run build`
   - Publish directory：`dist`
4. 在 **Site settings → Environment variables** 添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. 点 **Deploy site**，得到 `https://xxx.netlify.app` 网址。

> `netlify.toml` 里已配置 SPA 重定向，刷新子路由不会 404。

---

## 六、项目结构

```
sugar-job-system/
├─ public/sugar-logo.png        # 品牌 Logo
├─ supabase/schema.sql          # 建表 + RLS（在 Supabase SQL Editor 运行）
├─ supabase/migration_*.sql     # 旧库升级迁移
├─ src/
│  ├─ components/               # 复用组件（图标、背景、弹窗、表单、导航等）
│  ├─ contexts/                 # Auth / Theme / AppShell 全局状态
│  ├─ hooks/                    # useCollection(通用 CRUD) / useProfile / useResumeFiles
│  ├─ layouts/AppLayout.tsx     # 响应式主框架（侧边栏 + 顶栏 + 底部导航）
│  ├─ lib/                      # supabase 客户端 / 业务助手
│  ├─ pages/                    # 10 个业务页面
│  ├─ styles/theme.ts           # 5 套主题配色
│  └─ types/                    # TypeScript 类型定义
├─ .env.example                 # 环境变量模板
├─ vercel.json / netlify.toml   # 部署配置
└─ ...
```

---

## 七、常见问题

**Q：登录页提示「未检测到 Supabase 配置」？**
A：还没建 `.env` 或没填对。复制 `.env.example` 为 `.env`，填入 URL 和 anon key，然后**重启** `npm run dev`（Vite 环境变量改动需重启）。

**Q：注册后登录提示邮箱未确认？**
A：去注册邮箱点确认链接；或在 Supabase 关闭 Email 的「Confirm email」。

**Q：登录后看不到数据 / 报权限错误？**
A：确认已在 SQL Editor 按顺序跑过 `supabase/schema.sql` 和后续 migration（含 RLS 策略）。数据是按用户隔离的，新账号本来就是空的，点右上角「新增」录入即可。

**Q：AI 设置保存失败？**
A：检查是否已执行 `supabase/migration_api_keys.sql`，并确认 `user_api_keys` 表存在且 RLS 策略已创建。

**Q：AI 生成面试稿件保存失败？**
A：检查是否已执行 `supabase/migration_resume_files_ai_scripts.sql`，并确认 `resume_files` 包含 `content` / `source` 字段，`file_path` 允许为空。

**Q：上传失败？**
A：确认 Supabase Storage 中存在私有 bucket `resumes`，并检查 `storage.objects` 的 RLS policy 是否已由 `schema.sql` / `migration_resume_files.sql` 创建。系统目前只支持上传 PDF / DOCX 文件。

**Q：看板、JD 字段或提醒字段保存失败？**
A：检查是否已执行 `supabase/migration_application_status_and_p0_fields.sql`，并确认 `applications` 表包含 JD、下一步动作、截止时间和优先级字段。

**Q：换了设备 / 浏览器，数据还在吗？**
A：在。投递、公司、简历、面试都存在 Supabase 云端，用同一账号登录任意设备都能看到。（头像和昵称是轻量本地偏好，存在本地浏览器。）

**Q：线上登录跳转异常？**
A：在 Supabase **Authentication → URL Configuration** 把线上域名加入 Site URL / Redirect URLs。

**Q：简历能上传文件吗？**
A：可以。简历库使用 Supabase Storage 上传 PDF / DOCX 文件，并可基于已上传简历生成 AI 面试稿件。
