export interface VerboseLogger {
  readonly isVerbose: boolean;
  log(message: string): void;
}

export interface ClientOptions {
  gateway: string;
  token: string;
  logger?: VerboseLogger;
}

export interface GatewayRequestErrorFields {
  method: string;
  url: string;
  status?: number;
  code?: string;
  cause?: Error;
}

export class GatewayRequestError extends Error {
  readonly method: string;
  readonly url: string;
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, fields: GatewayRequestErrorFields) {
    super(message, fields.cause ? { cause: fields.cause } : undefined);
    this.name = 'GatewayRequestError';
    this.method = fields.method;
    this.url = fields.url;
    this.status = fields.status;
    this.code = fields.code;
  }
}

function describeFetchError(err: unknown): { message: string; code?: string; cause: Error } {
  if (!(err instanceof Error)) {
    return { message: String(err), cause: new Error(String(err)) };
  }
  let current: Error = err;
  while (current.cause instanceof Error) {
    current = current.cause;
  }
  const code = (current as { code?: unknown }).code;
  const codeStr = typeof code === 'string' ? code : undefined;
  const message = codeStr ? `${codeStr}: ${current.message}` : current.message;
  return { message, code: codeStr, cause: err };
}

export class GatewayClient {
  private readonly gateway: string;
  private readonly token: string;
  private readonly logger?: VerboseLogger;

  constructor(opts: ClientOptions) {
    this.gateway = opts.gateway;
    this.token = opts.token;
    this.logger = opts.logger;
  }

  async request(opts: {
    method: 'GET' | 'POST' | 'DELETE';
    path: string;
    body?: BodyInit;
    headers?: Record<string, string>;
  }): Promise<Response> {
    const url = new URL(opts.path, this.gateway).toString();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      ...(opts.headers ?? {}),
    };

    if (this.logger?.isVerbose) {
      this.logger.log(`Requesting ${opts.method} ${url}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: opts.method,
        headers,
        body: opts.body,
      });
    } catch (err) {
      const described = describeFetchError(err);
      if (this.logger?.isVerbose) {
        this.logger.log(`Request failed: ${described.message}`);
      }
      throw new GatewayRequestError(`${opts.method} ${url} failed: ${described.message}`, {
        method: opts.method,
        url,
        code: described.code,
        cause: described.cause,
      });
    }

    if (this.logger?.isVerbose) {
      this.logger.log(`Response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      throw new GatewayRequestError(
        `${opts.method} ${url} failed: HTTP ${response.status} ${response.statusText}`,
        { method: opts.method, url, status: response.status }
      );
    }

    return response;
  }
}
