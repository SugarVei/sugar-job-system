import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultSyncScope, emptyResumeProfile, normalizeImportedJson, stripSensitiveFields } from '../lib/resumeAssistantProfile';
import { resumeAssistantApi } from '../lib/resumeAssistantApi';
import type { ResumeProfile, SyncScope } from '../types/resumeAssistant';

const DRAFT_KEY = 'sugar.autofill_profile.draft';

export function useAutofillProfile() {
  const [profile, setProfile] = useState<ResumeProfile>(() => emptyResumeProfile());
  const [syncScope, setSyncScope] = useState<SyncScope>(() => defaultSyncScope());
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);

  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try { const parsed = JSON.parse(draft); setProfile(normalizeImportedJson(parsed.profile ?? parsed)); if (parsed.syncScope) setSyncScope(parsed.syncScope); }
      catch { localStorage.removeItem(DRAFT_KEY); }
    }
    resumeAssistantApi.getAutofillProfile()
      .then(({ profile: remote }) => { if (remote) { setProfile(normalizeImportedJson(remote.profile)); setSyncScope(remote.sync_scope); setRevision(remote.revision); } })
      .catch(() => setLocalOnly(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify({ profile, syncScope })); }, [profile, syncScope]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const { profile: saved } = await resumeAssistantApi.saveAutofillProfile(profile, syncScope);
      setProfile(normalizeImportedJson(saved.profile)); setSyncScope(saved.sync_scope); setRevision(saved.revision); setLocalOnly(false);
      return true;
    } catch { setLocalOnly(true); return false; }
    finally { setSaving(false); }
  }, [profile, syncScope]);

  const preview = useMemo(() => stripSensitiveFields(profile), [profile]);
  return { profile, setProfile, syncScope, setSyncScope, revision, loading, saving, localOnly, save, preview };
}
