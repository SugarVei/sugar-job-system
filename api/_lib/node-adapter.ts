type NodeRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type NodeResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: Uint8Array): void;
};

export function toWebRequest(request: NodeRequest) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach(item => headers.append(name, item));
    else if (typeof value === 'string') headers.set(name, value);
  }
  const host = headers.get('host') ?? 'localhost';
  const protocol = headers.get('x-forwarded-proto') ?? 'https';
  const method = request.method ?? 'GET';
  const body = method === 'GET' || method === 'HEAD'
    ? undefined
    : typeof request.body === 'string' || request.body instanceof Uint8Array
      ? request.body
      : JSON.stringify(request.body ?? {});
  return new Request(`${protocol}://${host}${request.url ?? '/'}`, { method, headers, body });
}

export async function sendWebResponse(response: NodeResponse, webResponse: Response) {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => response.setHeader(name, value));
  response.end(new Uint8Array(await webResponse.arrayBuffer()));
}
