export type NodeRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type NodeResponse = {
  status(code: number): NodeResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
  end(): void;
};

export function header(request: NodeRequest, name: string) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function setNodeCors(request: NodeRequest, response: NodeResponse) {
  const origin = header(request, 'origin');
  const allowed = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080']);
  if (process.env.ALLOWED_ORIGIN) allowed.add(process.env.ALLOWED_ORIGIN);
  if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);
  if (allowed.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Device-Token');
  response.setHeader('Access-Control-Expose-Headers', 'X-Device-Token');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Origin');
}

export function nodeClientIp(request: NodeRequest) {
  return header(request, 'x-forwarded-for').split(',')[0]?.trim() || header(request, 'x-real-ip') || 'unknown';
}

export function parseNodeBody<T>(request: NodeRequest): T {
  return (typeof request.body === 'string' ? JSON.parse(request.body) : request.body ?? {}) as T;
}
