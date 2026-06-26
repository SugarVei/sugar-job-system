// ============================================================
// 全局类型定义
// ============================================================

/** 投递状态（与原设计 pipeline 对齐） */
export type ApplicationStatus =
  | '已投递'
  | '笔试'
  | '面试'
  | 'Offer'
  | '拒绝'
  | '待跟进';

/** 面试形式 */
export type InterviewType = '电话' | '视频' | '现场';

/** 投递记录 */
export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  position_name: string;
  city: string | null;
  channel: string | null;
  apply_date: string | null; // ISO date (YYYY-MM-DD)
  status: ApplicationStatus;
  salary_range: string | null;
  job_url: string | null;
  notes: string | null;
  /** 关联的简历版本（指向 resumes.id），可空 */
  resume_id: string | null;
  created_at: string;
  updated_at: string;
}

/** 公司库 */
export interface Company {
  id: string;
  user_id: string;
  company_name: string;
  industry: string | null;
  city: string | null;
  scale: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** 简历库 */
export interface Resume {
  id: string;
  user_id: string;
  resume_name: string;
  target_position: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** 简历附件文件（存于 Supabase Storage） */
export type ResumeFileKind = 'resume' | 'script';
export interface ResumeFile {
  id: string;
  user_id: string;
  resume_id: string;
  file_name: string;
  /** Storage 中的对象路径 */
  file_path: string;
  /** resume = 简历本体；script = 面试稿件 */
  kind: ResumeFileKind;
  size: number | null;
  created_at: string;
}

/** 面试日历事件 */
export interface Interview {
  id: string;
  user_id: string;
  company_name: string;
  position_name: string | null;
  interview_time: string | null; // ISO datetime
  round: string | null;
  interview_type: InterviewType | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** 表单提交时去掉系统字段后的负载 */
export type NewRecord<T> = Omit<
  T,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

/** 应用内导航的页面键 */
export type ScreenKey =
  | 'dashboard'
  | 'overview'
  | 'applications'
  | 'companies'
  | 'resumes'
  | 'interviews';
