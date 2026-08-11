import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultSyncScope, emptyResumeProfile, normalizeImportedJson, restoreLocalSensitiveFields, stripSensitiveFields } from '../lib/resumeAssistantProfile';
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
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try { const parsed = JSON.parse(draft); setProfile(normalizeImportedJson(parsed.profile ?? parsed)); if (parsed.syncScope) setSyncScope(parsed.syncScope); }
      catch { localStorage.removeItem(DRAFT_KEY); }
    }
    let attempts = 0;
    const loadRemote = () => {
      attempts += 1;
      resumeAssistantApi.getAutofillProfile()
        .then(({ profile: remote }) => {
          if (cancelled) return;
          if (remote) { setProfile(normalizeImportedJson(remote.profile)); setSyncScope(remote.sync_scope); setRevision(remote.revision); }
          setLocalOnly(false);
        })
        .catch(() => {
          if (cancelled) return;
          setLocalOnly(true);
          if (attempts < 3) retryTimer = setTimeout(loadRemote, attempts * 3000);
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    loadRemote();
    const reconnect = () => { attempts = 0; loadRemote(); };
    window.addEventListener('online', reconnect);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('online', reconnect);
    };
  }, []);

  useEffect(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify({ profile, syncScope })); }, [profile, syncScope]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const { profile: saved } = await resumeAssistantApi.saveAutofillProfile(profile, syncScope);
      setProfile(restoreLocalSensitiveFields(normalizeImportedJson(saved.profile), profile)); setSyncScope(saved.sync_scope); setRevision(saved.revision); setLocalOnly(false);
      return true;
    } catch { setLocalOnly(true); return false; }
    finally { setSaving(false); }
  }, [profile, syncScope]);

  const preview = useMemo(() => stripSensitiveFields(profile), [profile]);
  return { profile, setProfile, syncScope, setSyncScope, revision, loading, saving, localOnly, save, preview };
}
