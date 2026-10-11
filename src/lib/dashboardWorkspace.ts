import type { Application, Interview, Resume, ResumeFile } from '../types';

export type WorkspaceActivityKind = 'application' | 'resume' | 'interview';
export interface WorkspaceVersion {
  resume: Resume;
  files: ResumeFile[];
  updatedAt: number;
  links: number;
}
export interface WorkspaceActivity {
  id: string;
  kind: WorkspaceActivityKind;
  title: string;
  subtitle: string;
  updatedAt: number;
  resumeId?: string;
  fileId?: string;
  query: string;
  interviewDate?: string;
  fields: [string, string][];
}

export function workspaceTime(value: string | null | undefined): number {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}
export function workspaceDate(time: number): string {
  return time ? new Date(time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '时间未记录';
}

/** Only merge records belonging to the current account, including during account changes. */
export function buildDashboardWorkspace(userId: string | undefined, resumes: Resume[], files: ResumeFile[], applications: Application[], interviews: Interview[]) {
  const ownResumes = resumes.filter(r => userId && r.user_id === userId);
  const ownApps = applications.filter(a => userId && a.user_id === userId);
  const ownInterviews = interviews.filter(i => userId && i.user_id === userId);
  const filesByResume = new Map<string, ResumeFile[]>();
  const resumeIds = new Set(ownResumes.map(r => r.id));
  for (const file of files) {
    if (!userId || file.user_id !== userId || !resumeIds.has(file.resume_id)) continue;
    const list = filesByResume.get(file.resume_id) ?? [];
    list.push(file);
    filesByResume.set(file.resume_id, list);
  }
  const links = new Map<string, number>();
  for (const app of ownApps) if (app.resume_id) links.set(app.resume_id, (links.get(app.resume_id) ?? 0) + 1);
  const versions: WorkspaceVersion[] = ownResumes.map(resume => {
    const materials = (filesByResume.get(resume.id) ?? []).sort((a, b) => workspaceTime(b.created_at) - workspaceTime(a.created_at) || a.id.localeCompare(b.id));
    return { resume, files: materials, updatedAt: Math.max(workspaceTime(resume.updated_at), workspaceTime(resume.created_at), workspaceTime(materials[0]?.created_at)), links: links.get(resume.id) ?? 0 };
  }).sort((a, b) => b.updatedAt - a.updatedAt || a.resume.id.localeCompare(b.resume.id));

  const activities: WorkspaceActivity[] = [];
  for (const version of versions) {
    const { resume, files: materials, updatedAt } = version;
    const latest = materials[0];
    const fileIsLatest = latest && workspaceTime(latest.created_at) >= Math.max(workspaceTime(resume.updated_at), workspaceTime(resume.created_at));
    // One latest update per record: these tables do not contain historical status transitions.
    activities.push({ id: `resume:${resume.id}`, kind: 'resume', title: fileIsLatest ? latest.file_name : resume.resume_name,
      subtitle: fileIsLatest ? `${latest.kind === 'script' ? '自我介绍稿' : '简历文件'} · ${latest.source === 'ai' ? '内容已更新' : '文件已添加'}` : '简历资料更新',
      updatedAt, resumeId: resume.id, fileId: fileIsLatest ? latest.id : undefined, query: resume.resume_name,
      fields: [['简历版本', resume.resume_name], ['目标岗位', resume.target_position || '未填写'], ['关联投递', `${version.links} 条`], ['最近更新', workspaceDate(updatedAt)]] });
  }
  for (const app of ownApps) {
    const updatedAt = Math.max(workspaceTime(app.updated_at), workspaceTime(app.created_at));
    activities.push({ id: `application:${app.id}`, kind: 'application', title: app.company_name, subtitle: `${app.position_name || '职位未填写'} · ${app.status}`,
      updatedAt, resumeId: app.resume_id && resumeIds.has(app.resume_id) ? app.resume_id : undefined, query: app.company_name,
      fields: [['公司', app.company_name], ['职位', app.position_name || '未填写'], ['当前状态', app.status], ['投递日期', app.apply_date || '未填写'], ['下一步', app.next_action || '未填写'], ['最近更新', workspaceDate(updatedAt)]] });
  }
  const appsById = new Map(ownApps.map(app => [app.id, app]));
  for (const interview of ownInterviews) {
    const updatedAt = Math.max(workspaceTime(interview.updated_at), workspaceTime(interview.created_at));
    const resumeId = interview.application_id ? appsById.get(interview.application_id)?.resume_id : undefined;
    const scheduled = workspaceTime(interview.interview_time);
    const date = scheduled ? new Date(scheduled) : null;
    const interviewDate = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : undefined;
    activities.push({ id: `interview:${interview.id}`, kind: 'interview', title: interview.company_name, subtitle: `${interview.round || '面试'} · 安排更新`,
      updatedAt, resumeId: resumeId && resumeIds.has(resumeId) ? resumeId : undefined, query: interview.company_name, interviewDate,
      fields: [['公司', interview.company_name], ['职位', interview.position_name || '未填写'], ['面试轮次', interview.round || '未填写'], ['面试时间', workspaceDate(scheduled)], ['面试方式', interview.interview_type || '未填写'], ['最近更新', workspaceDate(updatedAt)]] });
  }
  return { versions, activities: activities.filter(a => a.updatedAt > 0).sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id)) };
}
