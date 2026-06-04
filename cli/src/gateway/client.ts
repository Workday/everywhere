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

export class GatewayClient {
  private readonly gateway: string;
  private readonly token: string;
  private readonly logger?: VerboseLogger;

  constructor(opts: ClientOptions) {
    this.gateway = opts.gateway;
    this.token = opts.token;
    this.logger = opts.logger;
  }
}
