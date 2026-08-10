export const AUTOFILL_PROTOCOL_VERSION = 1;
export const AUTOFILL_SCHEMA_VERSION = 4;

export const PROFILE_SECTIONS = [
  { key: 'personal', label: '基本信息', defaultSync: true },
  { key: 'contact', label: '联系方式与地址', defaultSync: true, sensitive: true },
  { key: 'identity', label: '证件与资格', defaultSync: false, sensitive: true },
  { key: 'online', label: '在线资料', defaultSync: true },
  { key: 'preferences', label: '求职偏好', defaultSync: true },
  { key: 'skills', label: '技能与亮点', defaultSync: true },
  { key: 'education', label: '教育经历', defaultSync: true, repeatable: true },
  { key: 'internships', label: '实习经历', defaultSync: true, repeatable: true },
  { key: 'work', label: '工作经历', defaultSync: true, repeatable: true },
  { key: 'projects', label: '项目经历', defaultSync: true, repeatable: true },
  { key: 'campus', label: '校园经历', defaultSync: true, repeatable: true },
  { key: 'certificates', label: '证书与认证', defaultSync: true, repeatable: true },
  { key: 'languages', label: '语言能力', defaultSync: true, repeatable: true },
  { key: 'extra', label: '补充信息', defaultSync: true },
] as const;

export type ResumeProfileSection = (typeof PROFILE_SECTIONS)[number]['key'];
export type ResumeProfile = Record<ResumeProfileSection, Record<string, unknown> | Array<Record<string, unknown>>>;
export type SyncScope = Record<ResumeProfileSection, boolean>;
export type ResumeAssistantTab = 'overview' | 'profile' | 'settings' | 'runs';

export interface AutofillProfileRecord {
  id: string;
  user_id: string;
  profile: ResumeProfile;
  revision: number;
  profile_hash: string;
  schema_version: number;
  sync_scope: SyncScope;
  updated_at: string;
}

export interface ExtensionDevice {
  id: string;
  display_name: string;
  browser: string | null;
  platform: string | null;
  extension_version: string | null;
  protocol_version: number;
  last_seen_at: string | null;
  last_sync_revision: number | null;
  created_at: string;
}

export interface AutofillRun {
  id: string;
  origin_host: string;
  page_path_hash: string | null;
  status: 'success' | 'partial' | 'failed' | 'cancelled';
  fields_total: number;
  fields_filled: number;
  fields_manual: number;
  error_codes: string[];
  adapter_names: string[];
  created_at: string;
}

export interface AiCredentialStatus {
  provider: string;
  last4: string;
  model: string | null;
  status: 'configured' | 'missing';
}
