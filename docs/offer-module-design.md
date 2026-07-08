# Offer 管理模块设计

## 1. 模块定位

Offer 管理模块用于记录、对比和决策多个 Offer，不只是记录是否拿到 Offer。它应该承接投递流程中状态为 `Offer` 的记录，进一步管理薪资结构、工作强度、城市选择、发展空间、风险点和回复截止时间，帮助用户在多个机会之间做理性比较。

该模块与现有 `applications`、`interviews`、`resumes` 保持关联：投递记录负责求职过程，面试记录负责过程复盘，Offer 模块负责最终选择。

## 2. 核心页面

### Offer 列表页

用于集中查看所有 Offer。建议默认展示公司、岗位、城市、状态、年包估算、回复截止时间、综合评分和关联投递。

列表需要支持按状态、城市、回复截止时间、年包区间、综合评分排序和筛选。临近回复截止的 Offer 应有明显提示。

### Offer 详情页

用于查看和编辑单个 Offer 的完整信息，包括薪资结构、入职时间、试用期、福利、作息、户口/住房支持、风险备注和决策备注。

详情页应保留与投递记录、面试记录、面试复盘的入口，避免 Offer 决策脱离上下文。

### Offer 对比页

用于横向比较多个 Offer。建议以表格形式展示公司、岗位、城市、年包、试用期、工作强度、发展空间、稳定性、风险、回复截止时间等关键指标。

对比页应支持选择 2-5 个 Offer，并突出每个维度的高低差异。

### Offer 决策评分页

用于给 Offer 打分并形成最终建议。评分维度建议包括薪资、城市、成长性、稳定性、工作强度、岗位匹配度和风险。

评分结果只作为辅助决策，不直接替代用户选择。页面应保留 `decision_notes`，记录最终选择理由。

## 3. 推荐数据表：offers

建议新增 `public.offers` 表，开启 RLS，并与 `auth.users`、`applications` 关联。

字段建议：

| 字段 | 类型建议 | 说明 |
|---|---|---|
| id | uuid | 主键，默认 `gen_random_uuid()` |
| user_id | uuid | 关联 `auth.users(id)`，用于 RLS 隔离 |
| application_id | uuid | 可选，关联 `applications(id)` |
| company_name | text | 公司名称 |
| position_name | text | 岗位名称 |
| city | text | 工作城市 |
| offer_status | text | Offer 状态 |
| base_salary | numeric | 月基本工资 |
| salary_months | numeric | 薪资月数 |
| bonus | numeric | 奖金 |
| subsidy | numeric | 补贴 |
| annual_package | numeric | 年包估算，可自动计算后允许手动修正 |
| probation_months | int | 试用期月数 |
| probation_salary_ratio | numeric | 试用期薪资比例 |
| start_date | date | 入职日期 |
| reply_deadline | timestamptz | HR 回复截止时间 |
| work_hours | text | 作息/加班描述 |
| social_insurance | text | 社保说明 |
| housing_fund | text | 公积金说明 |
| housing_support | text | 住房支持 |
| hukou_support | text | 户口支持 |
| growth_score | int | 成长性评分，0-100 |
| stability_score | int | 稳定性评分，0-100 |
| salary_score | int | 薪资评分，0-100 |
| city_score | int | 城市评分，0-100 |
| workload_score | int | 工作强度评分，0-100 |
| match_score | int | 岗位匹配评分，0-100 |
| risk_score | int | 风险评分，0-100 |
| decision_notes | text | 决策备注 |
| risk_notes | text | 风险备注 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

约束建议：

- `offer_status` 限定为：`待考虑`、`谈薪中`、`已接受`、`已拒绝`、`已过期`
- 各评分字段限制在 0-100
- `user_id` 必填，并开启按 `auth.uid() = user_id` 的 select / insert / update / delete 策略
- `application_id` 删除时建议 `on delete set null`，避免误删投递记录导致 Offer 历史丢失

## 4. 状态建议

- `待考虑`：已收到 Offer，尚未进入谈薪或最终决策
- `谈薪中`：正在沟通薪资、入职时间、福利或岗位细节
- `已接受`：用户已确认接受
- `已拒绝`：用户已主动拒绝
- `已过期`：超过 HR 回复截止时间且未接受

状态变化建议记录在未来的操作日志中，但首版可以只保存当前状态。

## 5. 需要支持的功能

1. 从 `applications` 中状态为 `Offer` 的记录一键创建 Offer
2. 手动新增 Offer
3. 编辑 Offer
4. 删除 Offer
5. Offer 横向对比
6. 自动估算年包
7. 记录 HR 回复截止时间
8. Dashboard 显示临近回复截止的 Offer
9. 导出 Offer 对比 Excel
10. 与投递记录、面试记录、面试复盘关联

## 6. 与现有模块的关系

### Applications

当投递状态变为 `Offer` 后，应用可显示“创建 Offer”入口。创建时可从投递记录带入公司、岗位、城市、JD 匹配信息和备注。

### Interviews

Offer 详情中应能查看该公司的面试记录和复盘摘要，辅助判断团队、岗位真实性和风险。

### Dashboard

Dashboard 应新增临近 Offer 回复截止提醒。排序优先级建议为：已过期 > 今天截止 > 3 天内截止 > 谈薪中 > 待考虑。

### Export

Offer 对比导出应独立于投递记录导出，适合生成一个结构化 Excel：基础信息、薪资福利、评分对比、风险备注。

## 7. 后续开发建议

首版建议分三步实现：

1. 数据层：新增 `offers` 表、RLS、类型定义、`useCollection` 支持或专用 hook。
2. 基础 CRUD：新增 Offer 列表、编辑弹窗、从投递记录一键创建 Offer。
3. 决策增强：加入对比页、评分页、年包自动计算、Dashboard 截止提醒和 Excel 导出。

暂不建议首版实现复杂工作流、谈薪历史日志或自动 AI 决策。Offer 模块应先保证数据结构稳定、录入顺畅、对比清晰，再逐步加入自动分析能力。
