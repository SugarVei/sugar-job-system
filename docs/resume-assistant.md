# 智能填表助手

入口为 `#/resume-assistant`；旧的 `#/interview-reviews` 会兼容跳转到此页。网页负责管理标准资料和设备，浏览器插件负责在招聘页面填写。

安全边界：不会自动点击提交或投递、不会上传附件或处理验证码；证件号、护照号、详细地址等字段在写入云端和 AI 请求前都会剥离；配对码、设备令牌仅保存 SHA-256 hash；AI Key 仅以服务端 AES-256-GCM 密文保存；填写记录不保存字段答案。

## 启用后端

1. 在 Supabase SQL Editor 执行 `supabase/migration_autofill_extension.sql`。它只新增表和策略，**不会删除** `interview_reviews` 或其历史数据。
2. 在 Vercel 配置 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`AI_CREDENTIAL_MASTER_KEY`、`ALLOWED_ORIGIN`。前端只需要 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`；不得将 service-role 或主密钥设为 `VITE_*`。
3. 本地运行 `npm run build`、`npm run lint`。没有 Supabase 配置时，页面会提供演示会话和浏览器本机草稿，便于先验收 UI。

## 插件协议

插件通过 `POST /api/extension-pair-exchange` 用一次性 6 位码换取 device token，之后携带 `X-Device-Token`。可用 scope 固定为 `profile:read`、`ai:invoke`、`run:write`、`device:heartbeat`。协议版本为 1，资料 schema 版本为 4；插件必须拒绝大于 4 的资料 schema。

插件端还必须复用 Action Plan 白名单：`set_text`、`open_control`、`choose_option`、`toggle_choice`、`choose_date`、`expand_section`、`add_repeat_item`、`wait_for_change`、`verify_value`、`mark_manual`。必须拒绝提交、上传、验证码、任意脚本及自定义 selector/xpath/css。当前仓库未包含插件代码；对接时请按 `CODEX_REPLICATE_RESUME_ASSISTANT.md` 的 MV3 文件结构在插件仓库实现，不要将扩展权限或 token 写入 Sugar 前端。
