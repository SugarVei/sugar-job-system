import { useCallback, useEffect, useState } from 'react';
import { resumeAssistantApi } from '../lib/resumeAssistantApi';
import type { AutofillRun } from '../types/resumeAssistant';

export function useAutofillRuns() {
  const [runs, setRuns] = useState<AutofillRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [localOnly, setLocalOnly] = useState(false);
  const refresh = useCallback(async () => {
    try { const { runs: next } = await resumeAssistantApi.listAutofillRuns(); setRuns(next); setLocalOnly(false); }
    catch { setLocalOnly(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const remove = useCallback(async (id: string) => { await resumeAssistantApi.deleteAutofillRun(id); setRuns(current => current.filter(run => run.id !== id)); }, []);
  return { runs, loading, localOnly, refresh, remove };
}
