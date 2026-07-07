export type ApplicationStatus =
  | '已投递'
  | '笔试'
  | '面试'
  | 'Offer'
  | '拒绝'
  | '待跟进';

export type InterviewType = '电话' | '视频' | '现场';

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  position_name: string;
  city: string | null;
  channel: string | null;
  apply_date: string | null;
  status: ApplicationStatus;
  salary_range: string | null;
  job_url: string | null;
  notes: string | null;
  resume_id: string | null;
  created_at: string;
  updated_at: string;
}

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

export type ResumeFileKind = 'resume' | 'script';

export interface ResumeFile {
  id: string;
  user_id: string;
  resume_id: string;
  file_name: string;
  file_path: string | null;
  kind: ResumeFileKind;
  size: number | null;
  content: string | null;
  source: 'upload' | 'ai';
  created_at: string;
}

export interface Interview {
  id: string;
  user_id: string;
  company_name: string;
  position_name: string | null;
  interview_time: string | null;
  round: string | null;
  interview_type: InterviewType | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewRecord<T> = Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export type ScreenKey =
  | 'dashboard'
  | 'overview'
  | 'applications'
  | 'companies'
  | 'hotCompanies'
  | 'resumes'
  | 'interviews';
