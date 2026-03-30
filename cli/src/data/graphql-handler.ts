import { LocalStore } from './local-store.js';

interface GraphQLRequest {
  query: string;
  variables: Record<string, unknown>;
}

type GraphQLResponse = { data: unknown } | { error: string };

export async function handleGraphQL(
  dataDir: string,
  request: GraphQLRequest
): Promise<GraphQLResponse> {
  const store = new LocalStore(dataDir);
  const { query, variables } = request;
  const type = variables.type as string;

  try {
    switch (query) {
      case 'find':
        return {
          data: await store.find(type, variables.filter as Record<string, unknown> | undefined),
        };
      case 'findOne':
        return { data: await store.findOne(type, variables.id as string) };
      case 'create':
        return { data: await store.create(type, variables.data as Record<string, unknown>) };
      case 'update':
        return {
          data: await store.update(
            type,
            variables.id as string,
            variables.data as Record<string, unknown>
          ),
        };
      case 'delete':
        await store.remove(type, variables.id as string);
        return { data: null };
      default:
        return { error: `Unknown operation: ${query}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
