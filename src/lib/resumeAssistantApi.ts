import type { AiCredentialStatus, AutofillProfileRecord, AutofillRun, ExtensionDevice, ResumeProfile, SyncScope } from '../types/resumeAssistant';
import { isSupabaseConfigured, supabase } from './supabase';

async function authHeader() {
  if (!isSupabaseConfigured) return {};
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  Object.entries(await authHeader()).forEach(([key, value]) => headers.set(key, value));
  const response = await fetch(path, { ...init, headers });
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
};
