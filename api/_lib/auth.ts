import { createClient, type User } from '@supabase/supabase-js';
import { sha256Hex } from './crypto';

function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is not configured`); return value; }
export function getServiceSupabase() { return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { autoRefreshToken: false, persistSession: false } }); }
export function getAnonSupabase(token?: string) { return createClient(required('SUPABASE_URL'), required('SUPABASE_ANON_KEY'), { auth: { autoRefreshToken: false, persistSession: false }, global: token ? { headers: { Authorization: `Bearer ${token}` } } : {} }); }
export async function requireUserFromJwt(request: Request): Promise<User> {
  const value = request.headers.get('authorization') ?? ''; const token = value.startsWith('Bearer ') ? value.slice(7) : '';
  if (!token) throw new Error('Unauthorized');
  const { data, error } = await getAnonSupabase(token).auth.getUser(token);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user;
}
export type DeviceAuth = { deviceId: string; userId: string; scopes: string[] };
export async function requireDeviceToken(request: Request, neededScope?: string): Promise<DeviceAuth> {
  const header = request.headers.get('x-device-token') || (request.headers.get('authorization') ?? '').replace(/^Device\s+/i, '');
  if (!header) throw new Error('Unauthorized device');
  const tokenHash = await sha256Hex(header); const service = getServiceSupabase();
  const { data, error } = await service.from('extension_device_tokens').select('device_id,scopes,revoked_at,expires_at,extension_devices!inner(user_id,revoked_at)').eq('token_hash', tokenHash).maybeSingle();
  const device = data as unknown as { device_id: string; scopes: string[]; revoked_at: string | null; expires_at: string | null; extension_devices: { user_id: string; revoked_at: string | null } | Array<{ user_id: string; revoked_at: string | null }> } | null;
  const owner = device && (Array.isArray(device.extension_devices) ? device.extension_devices[0] : device.extension_devices);
  if (error || !device || !owner || device.revoked_at || owner.revoked_at || (device.expires_at && new Date(device.expires_at) <= new Date()) || (neededScope && !device.scopes.includes(neededScope))) throw new Error('Unauthorized device');
  await service.from('extension_device_tokens').update({ last_used_at: new Date().toISOString() }).eq('token_hash', tokenHash);
  return { deviceId: device.device_id, userId: owner.user_id, scopes: device.scopes };
}
export async function requireUserOrDevice(request: Request, scope?: string) {
  if ((request.headers.get('authorization') ?? '').startsWith('Bearer ')) return { user: await requireUserFromJwt(request), device: null };
  const device = await requireDeviceToken(request, scope); return { user: { id: device.userId } as User, device };
}
