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

function unwrapNamedTypeRef(typeRef: GraphQLTypeRef | null | undefined): GraphQLTypeRef | null {
  if (!typeRef) return null;
  if (typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') return unwrapNamedTypeRef(typeRef.ofType);
  return typeRef;
}

function unwrapListTypeRef(typeRef: GraphQLTypeRef | null | undefined): GraphQLTypeRef | null {
  if (!typeRef) return null;
  if (typeRef.kind === 'NON_NULL') return unwrapListTypeRef(typeRef.ofType);
  if (typeRef.kind === 'LIST') return unwrapNamedTypeRef(typeRef.ofType);
  return null;
}

function buildTypeMap(types: GraphQLType[]): Map<string, GraphQLType> {
  return new Map((types || []).map(type => [type.name, type]));
}

function isScalarLikeField(field: GraphQLField, typeMap: Map<string, GraphQLType>): boolean {
  const namedType = unwrapNamedTypeRef(field.type);
  if (!namedType?.name) return false;
  const type = typeMap.get(namedType.name);
  if (!type) return namedType.kind === 'SCALAR' || namedType.kind === 'ENUM';
  return type.kind === 'SCALAR' || type.kind === 'ENUM';
}

function scoreFieldName(name: string): number {
  const lowerName = (name || '').toLowerCase();
  const exactOrder = [
    'id',
    'name',
    'title',
    'email',
    'username',
    'status',
    'createdat',
    'updatedat',
    'type',
    'code',
    'key',
  ];

  const exactIndex = exactOrder.indexOf(lowerName);
  if (exactIndex >= 0) {
    return 500 - exactIndex;
  }

  if (lowerName.endsWith('id')) return 300;
  if (lowerName.includes('name')) return 280;
  if (lowerName.includes('title')) return 260;
  if (lowerName.includes('email')) return 240;
  if (lowerName.includes('status')) return 220;
  if (lowerName.includes('date') || lowerName.endsWith('at')) return 200;
  return 100;
}

function chooseUsefulNodeAttributes(nodeType: GraphQLType | undefined, typeMap: Map<string, GraphQLType>): string[] {
  if (!nodeType?.fields?.length) return ['__typename'];

  const scalarFields = nodeType.fields.filter(field => isScalarLikeField(field, typeMap));
  if (scalarFields.length === 0) return ['__typename'];

  return scalarFields
    .map((field, index) => ({
      field,
      score: scoreFieldName(field.name),
      index,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    })
    .slice(0, 10)
    .map(item => item.field.name);
}

function stringifyArgumentValue(argumentTypeRef: GraphQLTypeRef | null | undefined, value: number): string {
  const namedType = unwrapNamedTypeRef(argumentTypeRef);
  if (!namedType?.name) return `${value}`;

  const typeName = namedType.name.toLowerCase();
  if (typeName === 'int' || typeName === 'float') return `${value}`;
  return `"${value}"`;
}

function buildFirstTenArgs(field: GraphQLField): string {
  const args = field.args || [];
  if (args.length === 0) return '';

  const candidates = ['first', 'limit', 'pagesize', 'perpage', 'take', 'size', 'count', 'maxresults'];
  const arg = args.find(item => candidates.includes((item.name || '').toLowerCase()));
  if (!arg) return '';

  return `(${arg.name}: ${stringifyArgumentValue(arg.type, 10)})`;
}

type GraphQLConnectionProjection =
  | {
      kind: 'edges';
      nodeTypeName: string;
      hasPageInfo: boolean;
    }
  | {
      kind: 'listField';
      listFieldName: string;
      nodeTypeName: string;
    };

function detectConnectionProjection(
  field: GraphQLField,
  typeMap: Map<string, GraphQLType>
): GraphQLConnectionProjection | null {
  const fieldTypeRef = unwrapNamedTypeRef(field.type);
  if (!fieldTypeRef?.name) return null;

  const returnType = typeMap.get(fieldTypeRef.name);
  if (!returnType || returnType.kind !== 'OBJECT' || !returnType.fields?.length) return null;

  const edgesField = returnType.fields.find(item => item.name === 'edges');
  if (edgesField) {
    const edgeTypeRef = unwrapListTypeRef(edgesField.type);
    if (edgeTypeRef?.name) {
      const edgeType = typeMap.get(edgeTypeRef.name);
      const nodeField = edgeType?.fields?.find(item => item.name === 'node');
      const nodeTypeRef = unwrapNamedTypeRef(nodeField?.type);
      if (nodeTypeRef?.name) {
        const hasPageInfo = !!returnType.fields.find(item => item.name === 'pageInfo');
        return {
          kind: 'edges',
          nodeTypeName: nodeTypeRef.name,
          hasPageInfo,
        };
      }
    }
  }

  const listFieldNames = ['nodes', 'items', 'results', 'data'];
  for (const listFieldName of listFieldNames) {
    const listField = returnType.fields.find(item => item.name === listFieldName);
    if (!listField) continue;
    const listItemTypeRef = unwrapListTypeRef(listField.type);
    if (!listItemTypeRef?.name) continue;
    return {
      kind: 'listField',
      listFieldName,
      nodeTypeName: listItemTypeRef.name,
    };
  }

  return null;
}

function buildConnectionQuery(field: GraphQLField, typeMap: Map<string, GraphQLType>): string | null {
  const projection = detectConnectionProjection(field, typeMap);
  if (!projection) return null;

  const nodeType = typeMap.get(projection.nodeTypeName);
  const selectedAttributes = chooseUsefulNodeAttributes(nodeType, typeMap);
  const argsString = buildFirstTenArgs(field);
  const attributeBlock = selectedAttributes.map(attr => `      ${attr}`).join('\n');

  if (projection.kind === 'edges') {
    const pageInfoBlock = projection.hasPageInfo
      ? `
    pageInfo {
      hasNextPage
      endCursor
    }`
      : '';

    return `query {
  ${field.name}${argsString} {
    edges {
      node {
${attributeBlock}
      }
    }${pageInfoBlock}
  }
}`;
  }

  return `query {
  ${field.name}${argsString} {
    ${projection.listFieldName} {
${attributeBlock}
    }
  }
}`;
}

function buildConnectionEndpoints(
  types: GraphQLType[],
  rootTypeName?: string
): Array<{
  name: string;
  description?: string;
  fields?: string;
  connectionQuery?: string;
}> {
  if (!rootTypeName) return [];

  const rootType = findType(types, rootTypeName);
  if (!rootType?.fields?.length) return [];

  const typeMap = buildTypeMap(types);
  const connectionEndpoints = [];

  for (const field of rootType.fields) {
    const connectionQuery = buildConnectionQuery(field, typeMap);
    if (!connectionQuery) continue;

    connectionEndpoints.push({
      name: field.name,
      description: field.description || '',
      fields: field.description,
      connectionQuery,
    });
  }

  return connectionEndpoints;
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

  // Connections (query fields returning connection-like payloads)
  if (__schema.queryType?.name) {
    const connectionEndpoints = buildConnectionEndpoints(__schema.types, __schema.queryType.name);
    if (connectionEndpoints.length > 0) {
      categories.push({
        name: 'Connections',
        endpoints: connectionEndpoints.map(connection => ({
          method: 'POST',
          path: connection.name,
          summary: connection.description,
          description: connection.fields,
          parameters: [],
          connectionQuery: connection.connectionQuery,
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
    throw new Error(`DBGM-00312 Could not fetch GraphQL schema: ${err.message}`);
  }
}
