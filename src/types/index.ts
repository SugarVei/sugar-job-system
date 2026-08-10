export type ApplicationStatus =
  | '待投递'
  | '已投递'
  | '在线测评'
  | 'AI面'
  | 'HR面'
  | '一面'
  | '二面'
  | 'Offer'
  | '已拒绝'
  | '已放弃'
  | '人才库'
  | '待跟进';

export type ApplicationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type InterviewType = '电话' | '视频' | '现场';

export interface Application {
  id: string;
  user_id: string;
  company_id: string | null;
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
  jd_text: string | null;
  jd_keywords: string[] | null;
  match_score: number | null;
  match_summary: string | null;
  next_action: string | null;
  next_action_at: string | null;
  deadline_at: string | null;
  priority: ApplicationPriority;
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

export type ReferralCodeStatus = '可用' | '即将过期' | '已使用';

export interface ReferralCode {
  id: string;
  user_id: string;
  company_id: string | null;
  company_name: string;
  industry: string | null;
  position_name: string | null;
  city: string | null;
  referral_code: string;
  referrer_name: string | null;
  source: string | null;
  status: ReferralCodeStatus;
  expires_at: string | null;
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
export type NewApplication = NewRecord<Application>;
export type NewResume = NewRecord<Resume>;
export type NewCompany = NewRecord<Company>;
export type NewReferralCode = Pick<ReferralCode, 'company_name' | 'referral_code'> &
  Partial<Omit<NewRecord<ReferralCode>, 'company_name' | 'referral_code'>>;
export type NewInterview = NewRecord<Interview>;

export type OfferStatus = '待考虑' | '谈薪中' | '已接受' | '已拒绝' | '已过期';
export interface Offer {
  id: string; user_id: string; application_id: string | null; company_name: string; position_name: string;
  city: string | null; department: string | null; manager_or_contact: string | null; workplace: string | null;
  work_schedule: string | null; join_date: string | null; reply_deadline: string | null; offer_status: OfferStatus;
  base_salary: number | null; salary_months: number | null; bonus: number | null; subsidy: number | null;
  annual_package: number | null; social_security: string | null; housing_fund: string | null;
  stock_or_options: string | null; probation_months: number | null; probation_ratio: number | null;
  overtime_policy: string | null; salary_score: number | null; match_score: number | null;
  growth_score: number | null; stability_score: number | null; city_score: number | null;
  workload_score: number | null; total_score: number | null; hr_offer: string | null; expect: string | null;
  negotiation_notes: string | null; next_action: string | null; next_action_at: string | null;
  is_big_week: boolean; is_overtime: boolean; is_remote: boolean; probation_cut: boolean; has_penalty: boolean;
  risk_notes: string | null; decision_notes: string | null; final_decision: string | null; notes: string | null;
  created_at: string; updated_at: string;
}
export type InterviewRound = '一面' | '二面' | '技术面' | '主管面' | 'HR面';
export type InterviewReviewResult = '通过' | '未通过' | '待通知' | '主动放弃';
export type QuestionType = '自我介绍' | '项目经历' | '实习经历' | '专业问题' | '行为面试' | 'HR问题' | '反问' | '其他';
export type MasteryStatus = '需练习' | '已掌握' | '高频题';
export interface InterviewReview {
  id: string; user_id: string; application_id: string | null; interview_id: string | null; company_name: string;
  position_name: string | null; round: InterviewRound | null; interviewer_role: string | null;
  interview_time: string | null; interview_form: InterviewType | null; result: InterviewReviewResult;
  reviewed: boolean; mistake_tags: string[] | null; performance_score: number | null; clarity_score: number | null;
  matching_score: number | null; storytelling_score: number | null; logic_score: number | null;
  confidence_score: number | null; question_quality_score: number | null; star_s: string | null; star_t: string | null;
  star_a: string | null; star_r: string | null; star_resume_ref: string | null; good_points: string | null;
  weak_points: string | null; improve_knowledge: string | null; improve_answers: string | null;
  improve_prep: string | null; improvement_plan: string | null; next_action: string | null;
  next_action_at: string | null; notes: string | null; created_at: string; updated_at: string;
}
export interface InterviewReviewQuestion {
  id: string; user_id: string; review_id: string; question_text: string; question_type: QuestionType | null;
  my_answer: string | null; better_answer: string | null; answer_score: number | null; problem: string | null;
  issue_tags: string[] | null; add_to_question_bank: boolean; mastery_status: MasteryStatus;
  star_situation: string | null; star_task: string | null; star_action: string | null; star_result: string | null;
  created_at: string; updated_at: string;
}
export type NewOffer = NewRecord<Offer>;
export type NewInterviewReview = NewRecord<InterviewReview>;

export type MailboxProvider = 'netease163' | 'qq' | 'gmail' | 'outlook' | 'custom';

/** 邮箱账号配置（授权码仅本人可读，受 RLS 保护） */
export interface MailboxAccount {
  id: string;
  user_id: string;
  provider: MailboxProvider;
  email: string;
  /** 客户端授权码 / 应用专用密码；仅通过 RLS 隔离，前端勿打印 */
  auth_code: string;
  display_name: string | null;
  imap_host: string | null;
  imap_port: number | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}
export type NewMailboxAccount = Pick<MailboxAccount, 'provider' | 'email' | 'auth_code'> &
  Partial<Pick<MailboxAccount, 'display_name' | 'last_synced_at' | 'imap_host' | 'imap_port'>>;

export interface MailboxMessage {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
  snippet: string;
  /** 净化后的 HTML 正文（详情用） */
  html?: string;
  seen: boolean;
  hasAttachment: boolean;
}

export type ScreenKey =
  | 'dashboard'
  | 'overview'
  | 'applications'
  | 'companies'
  | 'referralCodes'
  | 'hotCompanies'
  | 'resumes'
  | 'interviews'
  | 'offers'
  | 'interviewReviews'
  | 'mailbox'
  | 'resumeAssistant';
