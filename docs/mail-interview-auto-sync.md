# 面试邮件自动同步

已实现邮箱收件箱增量检查、使用账号已配置的 AI 提取面试安排、自动写入现有面试日历，以及待确认、暂停、历史补充、来源跳转和取消记录。网页关闭后由数据库定时任务继续处理。

## 用户操作

1. 在原有 AI 设置中选择服务商并保存 API Key；该选择自动同步到后台。
2. 在面试邮件中连接邮箱。新绑定账号默认开启自动加入面试日历，可随时暂停。
3. 系统每 5 分钟检查收件箱。明确的新面试自动加入；明确改期和取消在关联可靠时更新原安排。
4. 日期不明确、正文与日历附件冲突、可能重复或与手动修改冲突的安排进入待确认。
5. “同步记录”可以补充最近 7 天邮件；已过期时间作为候选等待确认。“查看来源邮件”会返回对应邮箱与邮件。

已有多套 Key 的用户刷新网站一次，后台即可接续网页当前选用的服务商。新功能上线时仅对本次请求的账号开启；其他已有用户可在自己的开关中启用。当前监控收件箱；只有图片/PDF、复杂重复日程或多个难以区分的事件会要求人工核对。

## 后台实现

- `api/mail-interview-sync.ts`：登录认证、邮箱元数据与安全保存、同步状态、设置、确认建议、内部调度；`verify` 仅供具有调度 token 的内部验收，调用真实 AI 处理示例邮件，不写入日历。
- `api/mailbox-fetch.ts`：用户 JWT + 账号 ID；后端从 Vault 加载授权信息，浏览器请求与响应不携带授权码。
- `api/_lib/mail-sync-*`：有界 IMAP 读取、MIME/HTML 安全解析、AI 适配器、来源标识、持久化任务消费。
- `src/lib/mailSyncRules.ts`：日期、时区、夏令时、原文证据、附件和取消校验。复用已有公司名称规范化规则生成业务指纹。
- `public.mail_sync_settings`：每邮箱扫描游标、下次检查、配置版本和租约。
- `public.mail_sync_messages`：持久化待处理任务、有限证据、识别状态与建议；扫描游标和任务同事务提交。
- `public.interview_mail_sources`：来源关联、字段快照和删除抑制。
- `public.interview_change_log`：新增、变更、取消及删除历史。
- `mail_sync_private.credentials` + Vault：已有邮箱和 AI 凭据的加密副本，保持原有 AI 功能兼容。

`mail-interview-auto-sync` 每分钟唤醒，只有到期扫描或待处理任务时才请求生产接口；每邮箱间隔 5 分钟。4 个扫描并发，单邮箱租约互斥；每个请求设内部截止时间。任务失败退避重试，旧配置/租约不能提交。记录字段快照与实际值不同则进入人工确认；业务指纹的事务锁防止并发重复创建；同线程不同轮次分别保存。

浏览器每 30 秒检查日历的轻量数据版本，版本变化才静默刷新；编辑状态保留。取消记录排除在有效日历与统计之外。来源删除后保留抑制信息，重复通知不会重新添加。

## 部署和验证

需要现有服务端 `SUPABASE_URL`（或 `VITE_SUPABASE_URL`）和 `SUPABASE_SERVICE_ROLE_KEY`；不要求用户重新创建 AI Key。内部调度 token 在数据库 Vault 内生成和校验，不写入源码或浏览器。迁移文件按顺序应用；调度在生产接口验证后启用。

```sql
-- 查看运行状况，不返回凭据
select jobname, schedule, active from cron.job where jobname like 'mail-interview%';
select enabled, provider, last_success_at, error_code, next_scan_at from public.mail_sync_settings;

-- 暂停或恢复后台调度，已保存的安排保留
select cron.alter_job(jobid, active := false) from cron.job where jobname = 'mail-interview-auto-sync';
select cron.alter_job(jobid, active := true) from cron.job where jobname = 'mail-interview-auto-sync';
```

验证包括 `npm test`、构建、独立后端 TypeScript 检查、改动文件 ESLint、桌面/手机交互，以及真实数据库事务测试。事务测试覆盖去重、手动修改保护、取消、删除抑制、配置暂停和同线程多轮面试，测试数据全部回滚。线上另外验证实际 JS/CSS、接口认证、真实后台收件箱检查和当前服务商调用。

仅有构建成功、平台 READY、HTTP 200 或本地示例交互不证明真实新面试邮件已自动保存。最终完整流程需要真实新通知到达后，确认后台记录、日历持久化与来源一致；此边界必须在交付说明中如实记录。
