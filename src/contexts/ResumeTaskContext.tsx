import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAppShell } from './AppShellContext';

export interface ResumeTask {
  step: 'select' | 'working' | 'done' | 'error'; phase: 'read' | 'generate' | 'save'; progress: string;
  text: string; selectedId: string | null; fileName: string; error: string; saveId: string;
}
const emptyTask: ResumeTask = { step: 'select', phase: 'read', progress: '', text: '', selectedId: null, fileName: '', error: '', saveId: '' };
type Patch = Partial<ResumeTask> | ((task: ResumeTask) => Partial<ResumeTask>);
const Context = createContext<{ tasks: Record<string, ResumeTask>; patch: (id: string, patch: Patch) => void; lock: (id: string) => boolean; unlock: (id: string) => void; signal: (id: string) => AbortSignal | undefined } | null>(null);

export function ResumeTaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Record<string, ResumeTask>>({});
  const busy = useRef(new Set<string>());
  const controllers = useRef(new Map<string, AbortController>());
  useEffect(() => { const active = controllers.current; return () => { active.forEach(c => c.abort()); active.clear(); }; }, []);
  const patch = useCallback((id: string, change: Patch) => setTasks(prev => {
    const before = prev[id] ?? emptyTask;
    return { ...prev, [id]: { ...before, ...(typeof change === 'function' ? change(before) : change) } };
  }), []);
  const lock = useCallback((id: string) => { if (busy.current.has(id)) return false; busy.current.add(id); controllers.current.set(id, new AbortController()); return true; }, []);
  const unlock = useCallback((id: string) => { busy.current.delete(id); controllers.current.delete(id); }, []);
  const signal = useCallback((id: string) => controllers.current.get(id)?.signal, []);
  const value = useMemo(() => ({ tasks, patch, lock, unlock, signal }), [tasks, patch, lock, unlock, signal]);
  return <Context.Provider value={value}>{children}<ResumeTaskTray /></Context.Provider>;
}
function ResumeTaskTray() {
  const ctx = useContext(Context)!;
  const { screen, navigate } = useAppShell();
  const tasks = Object.values(ctx.tasks).filter(t => t.step === 'working' || t.step === 'error');
  if (screen === 'resumes' || !tasks.length) return null;
  const task = tasks[0];
  return <button className="sugar-task-tray" onClick={() => navigate('resumes')}>
    {task.step === 'working' && <span className="sugar-spinner" aria-hidden="true" />}
    <span>{task.step === 'error' ? '稿件任务需要重试' : task.progress} · 返回简历库{tasks.length > 1 ? `（${tasks.length} 个任务）` : ''}</span>
  </button>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useResumeTask(id: string) {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('ResumeTaskProvider missing');
  return { task: ctx.tasks[id] ?? emptyTask, patch: (change: Patch) => ctx.patch(id, change), lock: () => ctx.lock(id), unlock: () => ctx.unlock(id), signal: () => ctx.signal(id) };
}
