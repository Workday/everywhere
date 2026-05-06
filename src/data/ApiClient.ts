export interface ApiClientOptions {
  timeout?: number;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(baseUrl: string, options?: ApiClientOptions) {
    this.baseUrl = baseUrl;
    this.timeout = options?.timeout ?? 30_000;
  }

  get<T>(path?: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path?: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path?: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path?: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  patch<T>(path?: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  private async request<T>(method: string, path?: string, body?: unknown): Promise<T> {
    const url = path
      ? `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
      : this.baseUrl;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    const headers: Record<string, string> = {
      'X-CRID': globalThis.crypto.randomUUID(),
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const init: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    };

    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        throw new Error(`Request failed ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }
}
