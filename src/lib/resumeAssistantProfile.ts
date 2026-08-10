import {
  AUTOFILL_SCHEMA_VERSION,
  PROFILE_SECTIONS,
  type ResumeProfile,
  type ResumeProfileSection,
  type SyncScope,
} from '../types/resumeAssistant';

export const SENSITIVE_FIELD_PATHS = [
  'personal.idNumber', 'personal.passportNumber', 'personal.detailedAddress',
  'personal.addressLine1', 'personal.addressLine2', 'personal.streetAddress',
  'identity.idNumber', 'identity.passportNumber', 'contact.detailedAddress',
] as const;

const repeatable = new Set<ResumeProfileSection>(PROFILE_SECTIONS.filter(s => 'repeatable' in s && s.repeatable).map(s => s.key));

export function emptyResumeProfile(): ResumeProfile {
  return Object.fromEntries(PROFILE_SECTIONS.map(({ key }) => [key, repeatable.has(key) ? [] : {}])) as ResumeProfile;
}

export function defaultSyncScope(): SyncScope {
  return Object.fromEntries(PROFILE_SECTIONS.map(({ key, defaultSync }) => [key, defaultSync])) as SyncScope;
}

export function getByPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (
    value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined
  ), source);
}

export function setByPath<T extends Record<string, unknown>>(source: T, path: string, value: unknown): T {
  const clone = structuredClone(source);
  const keys = path.split('.');
  let cursor: Record<string, unknown> = clone;
  keys.slice(0, -1).forEach(key => {
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  });
  cursor[keys[keys.length - 1]] = value;
  return clone;
}

export function stripSensitiveFields(profile: ResumeProfile): ResumeProfile {
  let clean = structuredClone(profile) as ResumeProfile;
  SENSITIVE_FIELD_PATHS.forEach(path => { clean = setByPath(clean as unknown as Record<string, unknown>, path, undefined) as ResumeProfile; });
  return clean;
}

function populated(value: unknown): number {
  if (Array.isArray(value)) return value.length ? 1 : 0;
  if (value && typeof value === 'object') return Object.values(value).some(v => populated(v)) ? 1 : 0;
  return value === 0 || Boolean(value) ? 1 : 0;
}

export function sectionCompleteness(profile: ResumeProfile, section: ResumeProfileSection): number {
  const value = profile[section];
  if (Array.isArray(value)) return value.length ? 100 : 0;
  const entries: unknown[] = Object.values(value as Record<string, unknown>);
  return entries.length ? Math.round(entries.reduce<number>((total, item) => total + populated(item), 0) / entries.length * 100) : 0;
}

export function overallCompleteness(profile: ResumeProfile): number {
  return Math.round(PROFILE_SECTIONS.reduce((total, section) => total + sectionCompleteness(profile, section.key), 0) / PROFILE_SECTIONS.length);
}

export async function hashProfile(profile: ResumeProfile): Promise<string> {
  const stable = JSON.stringify(profile, Object.keys(profile).sort());
  const bytes = new TextEncoder().encode(stable);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export function normalizeImportedJson(input: unknown): ResumeProfile {
  const empty = emptyResumeProfile();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return empty;
  const source = input as Record<string, unknown>;
  for (const section of PROFILE_SECTIONS) {
    const candidate = source[section.key];
    if (repeatable.has(section.key)) empty[section.key] = Array.isArray(candidate) ? candidate.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
    else empty[section.key] = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate as Record<string, unknown> : {};
  }
  return empty;
}

export function summarizeProfile(profile: ResumeProfile) {
  return PROFILE_SECTIONS.map(section => ({ ...section, completeness: sectionCompleteness(profile, section.key) }));
}

export { AUTOFILL_SCHEMA_VERSION };
