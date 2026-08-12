import type { ApplicationStatus } from './index';

export type JobAssistRoute = 'campus' | 'social';
export type JobAssistConfidence = 'high' | 'medium' | 'low';

export interface JobAssistDirection {
  title: string;
  typical_titles: string[];
  reason: string;
  gaps: string[];
  primary?: boolean;
}

export interface JobAssistProfile {
  snapshot: string[];
  strengths: Array<{ conclusion: string; evidence: string }>;
  weaknesses: Array<{ gap: string; impact: string }>;
  directions: JobAssistDirection[];
  needs_confirmation: string[];
}

export interface JobAssistPreferences {
  cities: string;
  directions: string;
  industries: string;
  preferred_companies: string;
  excluded_companies: string;
  daily_quota: number;
  graduation_year?: string;
  recruitment_season?: string;
  job_type?: string;
  education_constraints?: string;
  years_experience?: string;
  target_level?: string;
  switch_industry?: string;
  availability?: string;
  remote_preference?: string;
}

export interface JobAssistCampaign {
  id: string;
  user_id: string;
  resume_id: string;
  resume_file_id: string | null;
  route: JobAssistRoute;
  profile: JobAssistProfile | Record<string, never>;
  profile_confirmed: boolean;
  confirmed_facts: string[];
  preferences: JobAssistPreferences | Record<string, never>;
  created_at: string;
  updated_at: string;
}

export interface HardRequirement {
  requirement: string;
  passed: boolean | null;
  evidence: string;
}

export interface JobAssistJdAnalysis {
  eligible: boolean;
  hard_requirements: HardRequirement[];
  match_score: number | null;
  match_level: '高匹配' | '中匹配' | '低匹配';
  score_breakdown: Record<string, number>;
  coverage: number;
  confidence: JobAssistConfidence;
  evidence: string[];
  presentation_gaps: string[];
  information_gaps: string[];
  capability_gaps: string[];
  next_steps: string[];
  summary: string;
  jd_requirements: string[];
  skill_keywords: string[];
}

export interface JobAssistJdMatch extends JobAssistJdAnalysis {
  id: string;
  user_id: string;
  campaign_id: string | null;
  application_id: string | null;
  resume_id: string | null;
  company_name: string | null;
  position_name: string | null;
  city: string | null;
  jd_text: string;
  job_url: string | null;
  channel: string | null;
  tailoring_suggestions: string[];
  tailored_draft: string | null;
  created_at: string;
  updated_at: string;
}

export interface TailoringResult {
  suggestions: string[];
  revised_draft: string;
  questions_to_confirm: string[];
}

export interface MockInterviewQuestion {
  type: string;
  question: string;
  focus: string;
}

export interface InterviewFeedback {
  scores: {
    relevance: number;
    evidence: number;
    structure: number;
    role_fit: number;
    clarity: number;
  };
  total_score: number;
  effective_point: string;
  main_issue: string;
  recommended_structure: string;
  improved_example: string;
  issue_tags: string[];
  improvement_summary: string;
}

export interface JobAssistInterviewSession {
  id: string;
  user_id: string;
  campaign_id: string;
  resume_id: string;
  jd_match_id: string | null;
  application_id: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  current_question: number;
  total_questions: number;
  plan: MockInterviewQuestion[];
  summary: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDraft {
  company_name: string;
  position_name: string;
  city: string;
  status: ApplicationStatus;
  notes: string;
}

