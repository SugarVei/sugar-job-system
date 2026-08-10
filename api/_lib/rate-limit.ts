const buckets = new Map<string, { count: number; reset: number }>();
export function clientIp(request: Request) { return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'; }
export function rateLimit(key: string, max = 10, windowMs = 60_000) { const now = Date.now(); const current = buckets.get(key); if (!current || current.reset <= now) { buckets.set(key, { count: 1, reset: now + windowMs }); return true; } current.count += 1; return current.count <= max; }
