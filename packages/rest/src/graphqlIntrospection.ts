import type { RestApiDefinition } from './restApiDef';
import type { AxiosInstance } from 'axios';

const DEFAULT_INTROSPECTION_DEPTH = 6;

function buildTypeRefSelection(depth: number): string {
  if (depth <= 0) {
    return `
            kind
            name
          `;
  }

  return `
            kind
            name
            ofType {
${buildTypeRefSelection(depth - 1)}
            }
          `;
}

function buildIntrospectionQuery(maxDepth: number): string {
  const typeRefSelection = buildTypeRefSelection(maxDepth);

  return `
  query IntrospectionQuery {
    __schema {
      types {
        kind
        name
        description
        fields {
          name
          description
          type {
${typeRefSelection}
          }
          args {
            name
            description
            type {
${typeRefSelection}
            }
            defaultValue
          }
        }
        inputFields {
          name
          description
          type {
${typeRefSelection}
          }
        }
      }
      queryType {
        name
      }
      mutationType {
        name
      }
      subscriptionType {
        name
      }
    }
  }
`;
}

export interface GraphQLTypeRef {
  kind: string;
  name?: string;
  ofType?: GraphQLTypeRef | null;
}

export interface GraphQLInputValue {
  name: string;
  description?: string;
  type: GraphQLTypeRef;
  defaultValue?: string;
}

export interface GraphQLField {
  name: string;
  description?: string;
  type: GraphQLTypeRef;
  args?: GraphQLInputValue[];
}

export interface GraphQLType {
  kind: string;
  name: string;
  description?: string;
  fields?: GraphQLField[];
  inputFields?: GraphQLField[];
  possibleTypes?: GraphQLTypeRef[];
}

export interface GraphQLIntrospectionResult {
  __schema: {
    types: GraphQLType[];
    queryType?: { name: string };
    mutationType?: { name: string };
    subscriptionType?: { name: string };
  };
}

function getTypeString(type: GraphQLTypeRef | null | undefined): string {
  if (!type) return 'Unknown';
  if (type.kind === 'NON_NULL') return getTypeString(type.ofType) + '!';
  if (type.kind === 'LIST') return '[' + getTypeString(type.ofType) + ']';
  return type.name || 'Unknown';
}

function findType(types: GraphQLType[], name: string): GraphQLType | undefined {
  return types.find(t => t.name === name);
}

function buildOperationEndpoints(
  types: GraphQLType[],
  operationType: 'OBJECT',
  rootTypeName?: string
): Array<{ name: string; description?: string; fields?: string }> {
  if (!rootTypeName) return [];
  const rootType = findType(types, rootTypeName);
  if (!rootType || !rootType.fields) return [];

  return rootType.fields.map(field => ({
    name: field.name,
    description: field.description || '',
    fields: field.description,
  }));
}

export function extractRestApiDefinitionFromGraphQlIntrospectionResult(
  introspectionResult: GraphQLIntrospectionResult
): RestApiDefinition {
  const { __schema } = introspectionResult;
  const categories: any[] = [];

  // Queries
  if (__schema.queryType?.name) {
    const queryEndpoints = buildOperationEndpoints(__schema.types, 'OBJECT', __schema.queryType.name);
    if (queryEndpoints.length > 0) {
      categories.push({
        name: 'Queries',
        endpoints: queryEndpoints.map(q => ({
          method: 'POST',
          path: q.name,
          summary: q.description,
          description: q.fields,
          parameters: [],
        })),
      });
    }
  }

  // Mutations
  if (__schema.mutationType?.name) {
    const mutationEndpoints = buildOperationEndpoints(__schema.types, 'OBJECT', __schema.mutationType.name);
    if (mutationEndpoints.length > 0) {
      categories.push({
        name: 'Mutations',
        endpoints: mutationEndpoints.map(m => ({
          method: 'POST',
          path: m.name,
          summary: m.description,
          description: m.fields,
          parameters: [],
        })),
      });
    }
  }

  // Subscriptions
  if (__schema.subscriptionType?.name) {
    const subscriptionEndpoints = buildOperationEndpoints(__schema.types, 'OBJECT', __schema.subscriptionType.name);
    if (subscriptionEndpoints.length > 0) {
      categories.push({
        name: 'Subscriptions',
        endpoints: subscriptionEndpoints.map(s => ({
          method: 'POST',
          path: s.name,
          summary: s.description,
          description: s.fields,
          parameters: [],
        })),
      });
    }
  }

  return {
    categories,
    servers: [],
  };
}

export async function fetchGraphQLSchema(
  url: string,
  headers: Record<string, string>,
  axios: AxiosInstance,
  maxDepth: number = DEFAULT_INTROSPECTION_DEPTH
): Promise<GraphQLIntrospectionResult> {
  try {
    const query = buildIntrospectionQuery(maxDepth);
    const response = await axios.post(
      url,
      { query },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }
    );

    if (response.data.errors) {
      throw new Error(`GraphQL introspection error: ${JSON.stringify(response.data.errors)}`);
    }

    if (!response.data.data) {
      throw new Error('Invalid introspection response: no data field');
    }

    return response.data.data as GraphQLIntrospectionResult;
  } catch (err: any) {
    throw new Error(`DBGM-00000 Could not fetch GraphQL schema: ${err.message}`);
  }
}
