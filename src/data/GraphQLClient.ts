import { HttpClient, HttpAuthError } from './HttpClient.js';

const DEFAULT_ENDPOINT = '/api/v1/tenant/graphql/v5';
const AUTH_CODES = new Set(['UNAUTHENTICATED', 'FORBIDDEN', 'UNAUTHORIZED']);

interface GraphQLResponseShape {
  data?: unknown;
  errors?: { message: string; extensions?: { code?: string } }[];
}

export class GraphQLClient {
  private readonly http: HttpClient;
  private readonly endpoint: string;

  constructor(client: HttpClient | string = '', endpoint: string = DEFAULT_ENDPOINT) {
    this.http = typeof client === 'string' ? new HttpClient(client) : client;
    this.endpoint = endpoint;
  }

  async execute<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const body: Record<string, unknown> = { query };
    if (variables !== undefined) body.variables = variables;

    const response = await this.http.request<GraphQLResponseShape>(this.endpoint, {
      method: 'POST',
      body,
    });

    if (response.errors?.length) {
      const isAuth = response.errors.some((e) => AUTH_CODES.has(e.extensions?.code ?? ''));
      const joined = response.errors.map((e) => e.message).join('; ');
      if (isAuth) {
        throw new HttpAuthError(
          401,
          'Unauthorized',
          { errors: response.errors },
          `${joined} — token expired or invalid. Run: npx @workday/everywhere auth login`
        );
      }
      throw new Error(joined);
    }

    return response.data as T;
  }
}
