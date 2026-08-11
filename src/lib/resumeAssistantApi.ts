import type { AiCredentialStatus, AutofillProfileRecord, AutofillRun, ExtensionDevice, ResumeProfile, SyncScope } from '../types/resumeAssistant';
import { isSupabaseConfigured, supabase } from './supabase';

async function authHeader(forceRefresh = false) {
  if (!isSupabaseConfigured) return {};
  const { data, error } = forceRefresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession();
  if (forceRefresh && (error || !data.session)) {
    await supabase.auth.signOut({ scope: 'local' });
    return {};
  }
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = async (forceRefresh = false) => {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    Object.entries(await authHeader(forceRefresh)).forEach(([key, value]) => headers.set(key, value));
    return fetch(path, { ...init, headers });
  };
  let response = await send();
  if (response.status === 401 && isSupabaseConfigured) response = await send(true);
  if (!response.ok) throw new Error((await response.json().catch(() => ({ error: response.statusText }))).error || '请求失败');
  return response.json() as Promise<T>;
}

export const resumeAssistantApi = {
  requestPairCode: () => apiFetch<{ pair_code: string; expires_at: string; expires_in_seconds: number }>('/api/extension-pair-request', { method: 'POST' }),
  listDevices: () => apiFetch<{ devices: ExtensionDevice[] }>('/api/extension-devices'),
  revokeDevice: (id: string) => apiFetch<{ ok: true }>('/api/extension-devices', { method: 'DELETE', body: JSON.stringify({ id }) }),
  getAutofillProfile: () => apiFetch<{ profile: AutofillProfileRecord | null }>('/api/extension-profile'),
  saveAutofillProfile: (profile: ResumeProfile, sync_scope: SyncScope) => apiFetch<{ profile: AutofillProfileRecord }>('/api/extension-profile', { method: 'PUT', body: JSON.stringify({ profile, sync_scope }) }),
  listAutofillRuns: () => apiFetch<{ runs: AutofillRun[] }>('/api/extension-runs'),
  deleteAutofillRun: (id: string) => apiFetch<{ ok: true }>('/api/extension-runs', { method: 'DELETE', body: JSON.stringify({ id }) }),
  getAiCredentialStatus: () => apiFetch<{ credential: AiCredentialStatus | null }>('/api/ai-credentials-status'),
  saveAiCredential: (provider: string, api_key: string, model?: string) => apiFetch<{ credential: AiCredentialStatus }>('/api/ai-credentials-save', { method: 'POST', body: JSON.stringify({ provider, api_key, model }) }),
  deleteAiCredential: () => apiFetch<{ ok: true }>('/api/ai-credentials-delete', { method: 'DELETE' }),
  testAiCredential: () => apiFetch<{ ok: true }>('/api/ai-credentials-test', { method: 'POST' }),
  parseResumePdf: (file_name: string, file_data: string) => apiFetch<{ text: string }>('/api/profile-resume-parse', { method: 'POST', body: JSON.stringify({ file_name, file_data }) }),
  analyzeResumeProfile: (resume_text: string) => apiFetch<{ profile: ResumeProfile }>('/api/profile-ai-analyze', { method: 'POST', body: JSON.stringify({ resume_text }) }),
};
