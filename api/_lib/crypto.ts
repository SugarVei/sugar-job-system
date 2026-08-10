const encoder = new TextEncoder();
const bytesToHex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
export async function sha256Hex(value: string) { return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))); }
export function randomPairCode() { const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); return String(100000 + (bytes[0] % 900000)); }
export function randomToken() { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return base64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
async function key() { const master = process.env.AI_CREDENTIAL_MASTER_KEY; if (!master || !/^[0-9a-f]{64}$/i.test(master)) throw new Error('AI credential encryption is not configured'); return crypto.subtle.importKey('raw', Uint8Array.from(master.match(/.{2}/g)!.map(byte => parseInt(byte, 16))), 'AES-GCM', false, ['encrypt', 'decrypt']); }
export async function encryptSecret(secret: string) { const iv = new Uint8Array(12); crypto.getRandomValues(iv); const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), encoder.encode(secret))); return `${base64(iv)}.${base64(encrypted)}`; }
export async function decryptSecret(value: string) { const [iv, ciphertext] = value.split('.'); if (!iv || !ciphertext) throw new Error('Invalid encrypted credential'); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, await key(), fromBase64(ciphertext))); }
export const last4 = (value: string) => value.slice(-4);
