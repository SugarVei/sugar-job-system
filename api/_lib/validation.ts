export const ALLOWED_ACTIONS = new Set(['set_text', 'open_control', 'choose_option', 'toggle_choice', 'choose_date', 'expand_section', 'add_repeat_item', 'wait_for_change', 'verify_value', 'mark_manual']);
const FORBIDDEN = /submit|upload|file|password|captcha|eval|javascript|execute|selector|xpath|css|script/i;
export function validateActionPlan(input: unknown) {
  const actions = Array.isArray(input) ? input : (input as { actions?: unknown })?.actions;
  if (!Array.isArray(actions) || actions.length > 400) throw new Error('Invalid action plan');
  const perField = new Map<string, number>();
  for (const action of actions) {
    if (!action || typeof action !== 'object') throw new Error('Invalid action');
    const item = action as Record<string, unknown>; const op = String(item.op ?? ''); const field = String(item.fieldId ?? item.field ?? '');
    if (!ALLOWED_ACTIONS.has(op) || Object.keys(item).some(key => FORBIDDEN.test(key)) || FORBIDDEN.test(op)) throw new Error('Unsafe action rejected');
    if (op === 'wait_for_change' && Number(item.timeoutMs ?? 0) > 5000) throw new Error('Wait exceeds limit');
    if (Number(item.retry ?? 0) > 3) throw new Error('Retry exceeds limit');
    perField.set(field, (perField.get(field) ?? 0) + 1); if (perField.size > 120 || (perField.get(field) ?? 0) > 12) throw new Error('Action plan exceeds limits');
  }
  return { actions };
}
