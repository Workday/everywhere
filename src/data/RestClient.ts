import { HttpClient, type HttpRequestOptions } from './HttpClient.js';

export type RestRequestOptions = Pick<HttpRequestOptions, 'headers' | 'signal'>;

export class RestClient {
  private readonly http: HttpClient;

  constructor(client: HttpClient | string = '') {
    this.http = typeof client === 'string' ? new HttpClient(client) : client;
  }

  get<T>(path: string, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'GET',
      headers: opts.headers,
      signal: opts.signal,
    });
  }

  post<T>(path: string, body?: unknown, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'POST',
      body,
      headers: opts.headers,
      signal: opts.signal,
    });
  }

  put<T>(path: string, body?: unknown, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'PUT',
      body,
      headers: opts.headers,
      signal: opts.signal,
    });
  }

  patch<T>(path: string, body?: unknown, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'PATCH',
      body,
      headers: opts.headers,
      signal: opts.signal,
    });
  }

  delete<T>(path: string, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'DELETE',
      headers: opts.headers,
      signal: opts.signal,
    });
  }
}
