import type { GraphQLField, GraphQLInputValue, GraphQLIntrospectionResult, GraphQLType, GraphQLTypeRef } from './graphqlIntrospection';

export type GraphQLExplorerOperationType = 'query' | 'mutation' | 'subscription';

export interface GraphQLExplorerFieldNode {
  name: string;
  description?: string;
  typeName: string;
  typeDisplay: string;
  isLeaf: boolean;
  isArgument?: boolean;
  arguments?: GraphQLExplorerFieldNode[];
  children?: GraphQLExplorerFieldNode[];
}

export interface GraphQLExplorerOperation {
  operationType: GraphQLExplorerOperationType;
  rootTypeName: string;
  fields: GraphQLExplorerFieldNode[];
}

interface GraphQLExplorerOptions {
  maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 2;

function getTypeDisplay(typeRef: GraphQLTypeRef | null | undefined): string {
  if (!typeRef) return 'Unknown';
  if (typeRef.kind === 'NON_NULL') return `${getTypeDisplay(typeRef.ofType)}!`;
  if (typeRef.kind === 'LIST') return `[${getTypeDisplay(typeRef.ofType)}]`;
  return typeRef.name || 'Unknown';
}

function unwrapNamedType(typeRef: GraphQLTypeRef | null | undefined): GraphQLTypeRef | null {
  if (!typeRef) return null;
  if (typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') return unwrapNamedType(typeRef.ofType);
  return typeRef;
}

function buildTypeMap(types: GraphQLType[]): Map<string, GraphQLType> {
  return new Map(types.map(type => [type.name, type]));
}

function isCompositeType(type: GraphQLType | undefined): boolean {
  return type?.kind === 'OBJECT' || type?.kind === 'INTERFACE';
}

function buildFieldNode(
  field: GraphQLField,
  typeMap: Map<string, GraphQLType>,
  depth: number,
  maxDepth: number,
  visitedTypes: Set<string>
): GraphQLExplorerFieldNode {
  const namedType = unwrapNamedType(field.type);
  const typeDef = namedType?.name ? typeMap.get(namedType.name) : undefined;
  const composite = isCompositeType(typeDef);
  const nextVisited = new Set(visitedTypes);

  if (typeDef?.name) {
    nextVisited.add(typeDef.name);
  }

  let children: GraphQLExplorerFieldNode[] | undefined;
  if (composite && depth < maxDepth && typeDef?.fields && !visitedTypes.has(typeDef.name)) {
    children = typeDef.fields.map(childField =>
      buildFieldNode(childField, typeMap, depth + 1, maxDepth, nextVisited)
    );
  }

  return {
    name: field.name,
    description: field.description,
    typeName: namedType?.name || 'Unknown',
    typeDisplay: getTypeDisplay(field.type),
    isLeaf: !composite || !children || children.length === 0,
    children,
  };
}

function buildOperationFields(
  rootTypeName: string,
  types: GraphQLType[],
  maxDepth: number
): GraphQLExplorerFieldNode[] {
  const typeMap = buildTypeMap(types);
  const rootType = typeMap.get(rootTypeName);
  if (!rootType?.fields) return [];

  return rootType.fields.map(field => buildFieldNode(field, typeMap, 1, maxDepth, new Set([rootTypeName])));
}

export function buildGraphQlExplorerOperations(
  introspectionResult: GraphQLIntrospectionResult,
  options: GraphQLExplorerOptions = {}
): GraphQLExplorerOperation[] {
  const { __schema } = introspectionResult || {};
  if (!__schema?.types) return [];

  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const operations: GraphQLExplorerOperation[] = [];

  if (__schema.queryType?.name) {
    operations.push({
      operationType: 'query',
      rootTypeName: __schema.queryType.name,
      fields: buildOperationFields(__schema.queryType.name, __schema.types, maxDepth),
    });
  }

  if (__schema.mutationType?.name) {
    operations.push({
      operationType: 'mutation',
      rootTypeName: __schema.mutationType.name,
      fields: buildOperationFields(__schema.mutationType.name, __schema.types, maxDepth),
    });
  }

  if (__schema.subscriptionType?.name) {
    operations.push({
      operationType: 'subscription',
      rootTypeName: __schema.subscriptionType.name,
      fields: buildOperationFields(__schema.subscriptionType.name, __schema.types, maxDepth),
    });
  }

  return operations;
}

export function buildGraphQlQueryText(
  operationType: GraphQLExplorerOperationType,
  selectionPaths: string[],
  options: { operationName?: string; indent?: string } = {}
): string {
  const indent = options.indent ?? '  ';
  const opName = options.operationName?.trim();

  const tree = new Map<string, Map<string, any>>();
  for (const path of selectionPaths) {
    if (!path) continue;
    const parts = path.split('.').filter(Boolean);
    let node = tree;
    for (const part of parts) {
      if (!node.has(part)) {
        node.set(part, new Map());
      }
      node = node.get(part) as Map<string, any>;
    }
  }

  const renderTree = (node: Map<string, any>, level: number): string[] => {
    const lines: string[] = [];
    for (const [name, children] of node.entries()) {
      if (children.size === 0) {
        lines.push(`${indent.repeat(level)}${name}`);
      } else {
        lines.push(`${indent.repeat(level)}${name} {`);
        lines.push(...renderTree(children, level + 1));
        lines.push(`${indent.repeat(level)}}`);
      }
    }
    return lines;
  };

  const header = opName ? `${operationType} ${opName}` : operationType;
  const lines = [`${header} {`];
  if (tree.size > 0) {
    lines.push(...renderTree(tree, 1));
  }
  lines.push('}');

  return lines.join('\n');
}

