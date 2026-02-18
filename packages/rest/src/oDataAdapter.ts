import { RestApiDefinition, RestApiEndpoint, RestApiParameter, RestApiServer } from './restApiDef';
import { parseODataMetadataDocument } from './oDataMetadataParser';

export type ODataServiceResource = {
  name?: string;
  kind?: string;
  url?: string;
};

export type ODataServiceDocument = {
  '@odata.context'?: string;
  value?: ODataServiceResource[];
};

export interface ODataMetadataNavigationProperty {
  name: string;
  type?: string;
  containsTarget: boolean;
  nullable: boolean;
}

export interface ODataMetadataEntityType {
  typeName: string;
  fullTypeName: string;
  keyProperties: string[];
  stringProperties: string[];
  navigationProperties: ODataMetadataNavigationProperty[];
}

export interface ODataMetadataEntitySet {
  name: string;
  entityType: string;
  navigationBindings: Record<string, string>;
}

export interface ODataMetadataDocument {
  entityTypes: Record<string, ODataMetadataEntityType>;
  entitySets: Record<string, ODataMetadataEntitySet>;
}

function normalizeServiceRoot(contextUrl: string | undefined, fallbackUrl: string): string {
  const safeFallback = String(fallbackUrl ?? '').trim();

  if (typeof contextUrl === 'string' && contextUrl.trim()) {
    try {
      const resolved = new URL(contextUrl.trim(), safeFallback || undefined);
      resolved.hash = '';
      resolved.search = '';
      resolved.pathname = resolved.pathname.replace(/\/$metadata$/i, '');

      const url = resolved.toString();
      return url.endsWith('/') ? url : `${url}/`;
    } catch {
      // ignore, fallback below
    }
  }

  return safeFallback.endsWith('/') ? safeFallback : `${safeFallback}/`;
}

function normalizeEndpointPath(valueUrl: string | undefined): string | null {
  const input = String(valueUrl ?? '').trim();
  if (!input) return null;

  try {
    const parsed = new URL(input, 'http://odata.local');
    const pathWithQuery = `${parsed.pathname}${parsed.search}`;
    return pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  } catch {
    return input.startsWith('/') ? input : `/${input}`;
  }
}

function inferMethods(kind: string | undefined): RestApiEndpoint['method'][] {
  const normalizedKind = String(kind ?? '').toLowerCase();

  if (normalizedKind === 'actionimport') return ['POST'];
  if (normalizedKind === 'entityset') return ['GET', 'POST'];
  return ['GET'];
}

function toLowerCamelCase(value: string | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function normalizeSingularName(value: string | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/ies$/i.test(text)) return `${text.slice(0, -3)}y`;
  if (/sses$/i.test(text)) return text;
  if (/s$/i.test(text) && text.length > 1) return text.slice(0, -1);
  return text;
}

function normalizePluralName(value: string | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/y$/i.test(text)) return `${text.slice(0, -1)}ies`;
  if (/s$/i.test(text)) return text;
  return `${text}s`;
}

function normalizeEntityTypeName(typeName: string | undefined): string {
  const text = String(typeName ?? '').trim();
  if (!text) return '';

  const collectionMatch = text.match(/^Collection\((.+)\)$/i);
  const unwrapped = collectionMatch ? collectionMatch[1] : text;
  const slashStripped = unwrapped.includes('/') ? unwrapped.split('/').pop() || unwrapped : unwrapped;
  return slashStripped.trim();
}

function buildTypeReferenceKeys(typeReference: string | undefined): string[] {
  const normalizedReference = normalizeEntityTypeName(typeReference);
  if (!normalizedReference) return [];

  const keys = new Set<string>();
  const lower = normalizedReference.toLowerCase();
  keys.add(lower);

  const withoutNamespace = normalizedReference.includes('.')
    ? normalizedReference.split('.').pop() || normalizedReference
    : normalizedReference;
  keys.add(withoutNamespace.toLowerCase());

  return Array.from(keys);
}

function buildEntityTypeLookup(entityTypes: Record<string, ODataMetadataEntityType>): Map<string, ODataMetadataEntityType> {
  const lookup = new Map<string, ODataMetadataEntityType>();

  for (const [entityTypeKey, entityType] of Object.entries(entityTypes || {})) {
    const keys = new Set<string>([
      ...buildTypeReferenceKeys(entityTypeKey),
      ...buildTypeReferenceKeys(entityType.fullTypeName),
      ...buildTypeReferenceKeys(entityType.typeName),
    ]);

    for (const key of keys) {
      if (!lookup.has(key)) {
        lookup.set(key, entityType);
      }
    }
  }

  return lookup;
}

function resolveEntityType(
  entityTypeLookup: Map<string, ODataMetadataEntityType>,
  typeReference: string | undefined
): ODataMetadataEntityType | null {
  const keys = buildTypeReferenceKeys(typeReference);
  for (const key of keys) {
    const found = entityTypeLookup.get(key);
    if (found) return found;
  }
  return null;
}

function resolveLookupPath(entitySetName: string, serviceResourceMap: Map<string, ODataServiceResource>): string {
  const serviceResource = serviceResourceMap.get(entitySetName);
  const resourceUrl = String(serviceResource?.url ?? '').trim();
  if (!resourceUrl) return `/${entitySetName}`;
  return resourceUrl.startsWith('/') ? resourceUrl : `/${resourceUrl}`;
}

function buildServiceResourceNameLookup(resources: ODataServiceResource[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const resource of resources || []) {
    const resourceName = String(resource?.name ?? '').trim();
    if (!resourceName) continue;
    const lower = resourceName.toLowerCase();
    if (!lookup.has(lower)) {
      lookup.set(lower, resourceName);
    }
  }
  return lookup;
}

function resolveServiceResourceNameForEntityType(
  entityType: ODataMetadataEntityType,
  serviceResourceNameLookup: Map<string, string>
): string | null {
  const baseNames = [
    String(entityType?.typeName ?? '').trim(),
    normalizeSingularName(entityType?.typeName),
    normalizeEntityTypeName(entityType?.fullTypeName),
    normalizeSingularName(normalizeEntityTypeName(entityType?.fullTypeName)),
  ].filter(Boolean);

  const candidates = new Set<string>();
  for (const baseName of baseNames) {
    candidates.add(baseName);
    candidates.add(normalizeSingularName(baseName));
    candidates.add(normalizePluralName(baseName));
  }

  for (const candidate of candidates) {
    const matched = serviceResourceNameLookup.get(String(candidate).toLowerCase());
    if (matched) return matched;
  }

  return null;
}

type MandatoryNavigationTargetParameter = {
  name: string;
  lookupEntitySet: string;
  lookupPath: string;
  lookupValueField?: string;
  lookupLabelField?: string;
};

type MandatoryNavigationByTarget = Record<string, MandatoryNavigationTargetParameter[]>;

type ParentNavigationContext = {
  parentEntitySetName: string;
  parentType: ODataMetadataEntityType;
  navigationBindings: Record<string, string>;
};

function deduceMandatoryNavigationByTarget(
  metadataDocument: ODataMetadataDocument | null,
  resources: ODataServiceResource[]
): MandatoryNavigationByTarget {
  if (!metadataDocument) return {};

  const entityTypeLookup = buildEntityTypeLookup(metadataDocument.entityTypes || {});

  const serviceResourceMap = new Map<string, ODataServiceResource>();
  for (const resource of resources) {
    const resourceName = String(resource?.name ?? '').trim();
    if (resourceName) {
      serviceResourceMap.set(resourceName, resource);
    }
  }
  const serviceResourceNameLookup = buildServiceResourceNameLookup(resources);

  const entitySetsByEntityType = new Map<string, string[]>();
  for (const [entitySetName, entitySet] of Object.entries(metadataDocument.entitySets || {})) {
    const typeKeys = buildTypeReferenceKeys(entitySet?.entityType);
    if (typeKeys.length === 0) continue;

    for (const typeKey of typeKeys) {
      const list = entitySetsByEntityType.get(typeKey) || [];
      if (!list.includes(entitySetName)) {
        list.push(entitySetName);
        entitySetsByEntityType.set(typeKey, list);
      }
    }
  }

  const mandatoryByTarget: MandatoryNavigationByTarget = {};
  const parentContexts: ParentNavigationContext[] = [];
  const parentTypeKeysCovered = new Set<string>();

  for (const [parentEntitySetName, parentEntitySet] of Object.entries(metadataDocument.entitySets || {})) {
    const parentType = resolveEntityType(entityTypeLookup, parentEntitySet.entityType);
    if (!parentType) continue;

    parentContexts.push({
      parentEntitySetName,
      parentType,
      navigationBindings: parentEntitySet.navigationBindings || {},
    });

    for (const typeKey of buildTypeReferenceKeys(parentEntitySet.entityType)) {
      parentTypeKeysCovered.add(typeKey);
    }
  }

  for (const entityType of Object.values(metadataDocument.entityTypes || {})) {
    const typeKeys = [
      ...buildTypeReferenceKeys(entityType.fullTypeName),
      ...buildTypeReferenceKeys(entityType.typeName),
    ];
    const alreadyCovered = typeKeys.some(typeKey => parentTypeKeysCovered.has(typeKey));
    if (alreadyCovered) continue;

    if (!Array.isArray(entityType.navigationProperties) || entityType.navigationProperties.length === 0) {
      continue;
    }

    const parentEntitySetName = resolveServiceResourceNameForEntityType(entityType, serviceResourceNameLookup);
    if (!parentEntitySetName) continue;

    parentContexts.push({
      parentEntitySetName,
      parentType: entityType,
      navigationBindings: {},
    });

    for (const typeKey of typeKeys) {
      parentTypeKeysCovered.add(typeKey);
    }
  }

  for (const { parentEntitySetName, parentType, navigationBindings } of parentContexts) {
    const parentParamName =
      toLowerCamelCase(parentType.typeName) ||
      toLowerCamelCase(normalizeSingularName(parentEntitySetName)) ||
      toLowerCamelCase(parentEntitySetName);

    if (!parentParamName) continue;

    for (const navProperty of parentType.navigationProperties || []) {
      if (!navProperty.containsTarget) continue;

      const targetNames = new Set<string>();
      const directBoundTarget = navigationBindings?.[navProperty.name];
      if (directBoundTarget) {
        targetNames.add(directBoundTarget);
      }

      const navTypeKeys = buildTypeReferenceKeys(navProperty.type);
      if (navTypeKeys.length > 0) {
        const typeTargets = navTypeKeys.flatMap(typeKey => entitySetsByEntityType.get(typeKey) || []);
        for (const targetName of typeTargets) {
          targetNames.add(targetName);
        }
      }

      for (const targetEntitySetName of targetNames) {
        const targetList = mandatoryByTarget[targetEntitySetName] || [];
        const exists = targetList.some(item => item.name.toLowerCase() === parentParamName.toLowerCase());
        if (exists) continue;

        targetList.push({
          name: parentParamName,
          lookupEntitySet: parentEntitySetName,
          lookupPath: resolveLookupPath(parentEntitySetName, serviceResourceMap),
          lookupValueField: parentType.keyProperties?.[0],
          lookupLabelField: parentType.stringProperties?.find(prop => /name/i.test(prop)) || parentType.stringProperties?.[0],
        });
        mandatoryByTarget[targetEntitySetName] = targetList;
      }
    }
  }

  return mandatoryByTarget;
}

function buildMandatoryNavigationParameters(
  resource: ODataServiceResource,
  mandatoryByTarget: MandatoryNavigationByTarget
): RestApiParameter[] {
  const resourceName = String(resource?.name ?? '').trim();
  if (!resourceName) return [];

  const mandatoryTargets = mandatoryByTarget[resourceName] || [];
  const mandatoryParameters: RestApiParameter[] = [];
  const seenNames = new Set<string>();

  for (const mandatoryTarget of mandatoryTargets) {
    const normalizedName = mandatoryTarget.name.toLowerCase();
    if (seenNames.has(normalizedName)) continue;

    const description = mandatoryTarget.lookupEntitySet
      ? `Required navigation parameter deduced from OData metadata (lookup: ${mandatoryTarget.lookupEntitySet})`
      : 'Required navigation parameter deduced from OData metadata';

    mandatoryParameters.push({
      name: mandatoryTarget.name,
      in: 'query',
      dataType: 'string',
      required: true,
      description,
      odataLookupPath: mandatoryTarget.lookupPath,
      odataLookupEntitySet: mandatoryTarget.lookupEntitySet,
      odataLookupValueField: mandatoryTarget.lookupValueField,
      odataLookupLabelField: mandatoryTarget.lookupLabelField,
    });
    seenNames.add(normalizedName);
  }

  return mandatoryParameters;
}

function createODataResourceEndpoints(
  resource: ODataServiceResource,
  mandatoryByTarget: MandatoryNavigationByTarget
): RestApiEndpoint[] {
  const path = normalizeEndpointPath(resource.url);
  if (!path) return [];

  const summary = resource.name || resource.url || path;
  const descriptionKind = String(resource.kind ?? '').trim();
  const methods = inferMethods(resource.kind);
  const mandatoryNavigationParameters = buildMandatoryNavigationParameters(resource, mandatoryByTarget);

  return methods.map(method => {
    const parameters: RestApiParameter[] = [...mandatoryNavigationParameters];

    if (method === 'POST') {
      parameters.push({
        name: 'body',
        in: 'body',
        dataType: 'object',
        contentType: 'application/json',
      });
    }

    return {
      method,
      path,
      summary,
      description: descriptionKind ? `OData ${descriptionKind}` : 'OData resource',
      parameters,
    };
  });
}

export function analyseODataDefinition(
  doc: ODataServiceDocument,
  endpointUrl: string,
  metadataDocumentXml?: string | null
): RestApiDefinition {
  const resources = Array.isArray(doc?.value) ? doc.value : [];
  const categoriesByName = new Map<string, RestApiEndpoint[]>();
  const metadataDocument = metadataDocumentXml ? parseODataMetadataDocument(metadataDocumentXml) : null;
  const mandatoryByTarget = deduceMandatoryNavigationByTarget(metadataDocument, resources);

  for (const resource of resources) {
    const endpoints = createODataResourceEndpoints(resource, mandatoryByTarget);
    if (endpoints.length === 0) continue;

    const categoryName = String(resource.kind ?? 'Resources').trim() || 'Resources';
    const existingEndpoints = categoriesByName.get(categoryName) || [];
    existingEndpoints.push(...endpoints);
    categoriesByName.set(categoryName, existingEndpoints);
  }

  const metadataEndpoint: RestApiEndpoint = {
    method: 'GET',
    path: '/$metadata',
    summary: '$metadata',
    description: 'OData service metadata',
    parameters: [],
  };

  const metadataCategory = categoriesByName.get('Metadata') || [];
  metadataCategory.push(metadataEndpoint);
  categoriesByName.set('Metadata', metadataCategory);

  const serviceRoot = normalizeServiceRoot(doc?.['@odata.context'], endpointUrl);
  const servers: RestApiServer[] = serviceRoot ? [{ url: serviceRoot }] : [];

  return {
    categories: Array.from(categoriesByName.entries()).map(([name, endpoints]) => ({
      name,
      endpoints,
    })),
    servers,
  };
}
