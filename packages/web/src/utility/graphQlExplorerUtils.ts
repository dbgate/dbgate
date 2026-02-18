import type { GraphQLType, GraphQLTypeRef } from 'dbgate-rest';

export function getGraphQlTypeDisplay(typeRef: GraphQLTypeRef | null | undefined): string {
  if (!typeRef) return 'Unknown';
  if (typeRef.kind === 'NON_NULL') return `${getGraphQlTypeDisplay(typeRef.ofType)}!`;
  if (typeRef.kind === 'LIST') return `[${getGraphQlTypeDisplay(typeRef.ofType)}]`;
  return typeRef.name || 'Unknown';
}

export function unwrapNamedGraphQlType(typeRef: GraphQLTypeRef | null | undefined): GraphQLTypeRef | null {
  if (!typeRef) return null;
  if (typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') return unwrapNamedGraphQlType(typeRef.ofType);
  return typeRef;
}

export function unwrapListGraphQlType(typeRef: GraphQLTypeRef | null | undefined): GraphQLTypeRef | null {
  if (!typeRef) return null;
  if (typeRef.kind === 'NON_NULL') return unwrapListGraphQlType(typeRef.ofType);
  if (typeRef.kind === 'LIST') return unwrapNamedGraphQlType(typeRef.ofType);
  return null;
}

export function isCompositeGraphQlKind(kind?: string | null, includeUnion = true): boolean {
  return kind === 'OBJECT' || kind === 'INTERFACE' || (includeUnion && kind === 'UNION');
}

export function isCompositeGraphQlType(type: GraphQLType | undefined, includeUnion = false): boolean {
  return isCompositeGraphQlKind(type?.kind, includeUnion);
}
