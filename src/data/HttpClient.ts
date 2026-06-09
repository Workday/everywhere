export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown,
    message?: string
  ) {
    super(message ?? `HTTP ${status} ${statusText}`);
    this.name = 'HttpError';
  }
}

export class HttpAuthError extends HttpError {
  constructor(status: number, statusText: string, body?: unknown) {
    super(
      status,
      statusText,
      body,
      `HTTP ${status} ${statusText} — token expired or invalid. Run: npx @workday/everywhere auth login`
    );
    this.name = 'HttpAuthError';
  }
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class HttpClient {
  constructor(private readonly baseUrl: string = '') {}

  async request<T>(path: string, opts: HttpRequestOptions = {}): Promise<T> {
    const url = this.baseUrl ? `${this.baseUrl}${path}` : path;

    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(opts.headers ?? {}),
    };

    const appId = (globalThis as { __WE_APP_ID__?: string }).__WE_APP_ID__;
    if (typeof appId === 'string') headers['x-app-id'] = appId;

    const response = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    if (response.ok) return body as T;

    if (response.status === 401 || response.status === 403) {
      throw new HttpAuthError(response.status, response.statusText, body);
    }
    throw new HttpError(response.status, response.statusText, body);
  }
}
