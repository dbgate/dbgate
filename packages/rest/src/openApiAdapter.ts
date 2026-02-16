import type { OpenAPIV3_1 } from 'openapi-types';
import { RestApiDefinition, RestApiCategory, RestApiEndpoint, RestApiParameter, RestApiServer } from './restApiDef';

/**
 * Converts an OpenAPI v3.1 document into a simplified REST API definition
 * Organizes endpoints by tags into categories
 */
export function analyseOpenApiDefinition(doc: OpenAPIV3_1.Document): RestApiDefinition {
  const categories = new Map<string, RestApiEndpoint[]>();

  // Process all paths and methods
  if (doc.paths) {
    for (const [path, pathItem] of Object.entries(doc.paths)) {
      if (!pathItem) continue;

      // Process each HTTP method in the path
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;

      for (const method of methods) {
        const operation = (pathItem as any)[method] as OpenAPIV3_1.OperationObject | undefined;
        if (!operation) continue;

        const endpoint: RestApiEndpoint = {
          method: method.toUpperCase() as any,
          path,
          summary: operation.summary,
          description: operation.description,
          parameters: extractParameters(operation, pathItem as any),
        };

        // Use tags to organize into categories
        const tags = operation.tags || ['Other'];
        for (const tag of tags) {
          if (!categories.has(tag)) {
            categories.set(tag, []);
          }
          categories.get(tag)!.push(endpoint);
        }
      }
    }
  }

  // Convert Map to RestApiCategory array
  const categoryArray: RestApiCategory[] = Array.from(categories.entries()).map(([name, endpoints]) => ({
    name,
    endpoints,
  }));

  const servers: RestApiServer[] = (doc.servers || []).map(server => ({
    url: server.url,
    description: server.description,
  }));

  return {
    categories: categoryArray,
    servers,
  };
}

/**
 * Extract parameters from operation and path item
 */
function extractParameters(
  operation: OpenAPIV3_1.OperationObject,
  pathItem: OpenAPIV3_1.PathItemObject
): RestApiParameter[] {
  const parameters: RestApiParameter[] = [];

  // Path item level parameters (apply to all methods)
  if (pathItem.parameters) {
    for (const param of pathItem.parameters) {
      if (!('$ref' in param)) {
        parameters.push(convertParameter(param as OpenAPIV3_1.ParameterObject));
      }
    }
  }

  // Operation level parameters
  if (operation.parameters) {
    for (const param of operation.parameters) {
      if (!('$ref' in param)) {
        parameters.push(convertParameter(param as OpenAPIV3_1.ParameterObject));
      }
    }
  }

  const bodyParameter = convertRequestBodyParameter(operation.requestBody);
  if (bodyParameter) {
    parameters.push(bodyParameter);
  }

  return parameters;
}

function isSchemaObject(schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject | undefined): schema is OpenAPIV3_1.SchemaObject {
  return !!schema && !('$ref' in schema);
}

function isExampleObject(example: OpenAPIV3_1.ExampleObject | OpenAPIV3_1.ReferenceObject | undefined): example is OpenAPIV3_1.ExampleObject {
  return !!example && !('$ref' in example);
}

function cloneValue(value: any) {
  if (value == null) return value;
  if (typeof value !== 'object') return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function extractMediaTypeExample(mediaType: OpenAPIV3_1.MediaTypeObject | undefined): any {
  if (!mediaType) return undefined;

  if (mediaType.example !== undefined) return cloneValue(mediaType.example);

  if (mediaType.examples) {
    const firstExample = Object.values(mediaType.examples)[0];
    if (isExampleObject(firstExample) && firstExample.value !== undefined) {
      return cloneValue(firstExample.value);
    }
  }

  return undefined;
}

function buildSchemaExample(
  schema: OpenAPIV3_1.SchemaObject | undefined,
  recursionDepth = 0
): any {
  if (!schema || recursionDepth > 6) return undefined;

  if (schema.example !== undefined) return cloneValue(schema.example);
  if (schema.default !== undefined) return cloneValue(schema.default);

  if (schema.oneOf?.length) {
    const oneOfSchema = schema.oneOf[0];
    return isSchemaObject(oneOfSchema) ? buildSchemaExample(oneOfSchema, recursionDepth + 1) : undefined;
  }
  if (schema.anyOf?.length) {
    const anyOfSchema = schema.anyOf[0];
    return isSchemaObject(anyOfSchema) ? buildSchemaExample(anyOfSchema, recursionDepth + 1) : undefined;
  }
  if (schema.allOf?.length) {
    const mergedObject = {};
    let hasValue = false;

    for (const item of schema.allOf) {
      if (!isSchemaObject(item)) continue;
      const itemExample = buildSchemaExample(item, recursionDepth + 1);
      if (itemExample && typeof itemExample === 'object' && !Array.isArray(itemExample)) {
        Object.assign(mergedObject, itemExample);
        hasValue = true;
      }
    }

    return hasValue ? mergedObject : undefined;
  }

  if (schema.enum?.length) return cloneValue(schema.enum[0]);

  if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
    const result: Record<string, any> = {};
    let hasAnyProperty = false;

    for (const [propertyName, propertySchema] of Object.entries(schema.properties || {})) {
      if (!isSchemaObject(propertySchema)) continue;
      const propertyValue = buildSchemaExample(propertySchema, recursionDepth + 1);
      if (propertyValue !== undefined) {
        result[propertyName] = propertyValue;
        hasAnyProperty = true;
      }
    }

    if (schema.additionalProperties) {
      if (schema.additionalProperties === true) {
        result.additionalProp1 = 'string';
        hasAnyProperty = true;
      } else if (isSchemaObject(schema.additionalProperties)) {
        result.additionalProp1 = buildSchemaExample(schema.additionalProperties, recursionDepth + 1) ?? 'string';
        hasAnyProperty = true;
      }
    }

    return hasAnyProperty ? result : {};
  }

  if (schema.type === 'array') {
    if (isSchemaObject(schema.items)) {
      const itemValue = buildSchemaExample(schema.items, recursionDepth + 1);
      return itemValue !== undefined ? [itemValue] : [];
    }
    return [];
  }

  if (schema.type === 'number' || schema.type === 'integer') return 0;
  if (schema.type === 'boolean') return true;
  if (schema.type === 'null') return null;

  return 'string';
}

function getSchemaType(schema: OpenAPIV3_1.SchemaObject | undefined): string | undefined {
  if (!schema) return undefined;

  if (schema.type === 'array') {
    if (isSchemaObject(schema.items)) {
      return `array<${schema.items.type || 'any'}>`;
    }
    return 'array';
  }

  if (Array.isArray(schema.type)) return schema.type.join(' | ');
  if (schema.type) return schema.type;
  if (schema.properties) return 'object';

  return undefined;
}

function isStringListSchema(schema: OpenAPIV3_1.SchemaObject | undefined): boolean {
  return schema?.type === 'array' && isSchemaObject(schema.items) && schema.items.type === 'string';
}

function convertRequestBodyParameter(
  requestBody: OpenAPIV3_1.RequestBodyObject | OpenAPIV3_1.ReferenceObject | undefined
): RestApiParameter | null {
  if (!requestBody || '$ref' in requestBody || !requestBody.content) return null;

  const preferredContentTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
  ];
  const availableContentTypes = Object.keys(requestBody.content);
  if (availableContentTypes.length === 0) return null;

  const selectedContentType =
    preferredContentTypes.find(contentType => requestBody.content?.[contentType]) || availableContentTypes[0];
  const mediaType = requestBody.content[selectedContentType];

  if (!mediaType || !isSchemaObject(mediaType.schema)) {
    return {
      name: 'body',
      in: 'body',
      contentType: selectedContentType,
      description: requestBody.description,
      required: requestBody.required,
    };
  }

  const schema = mediaType.schema;
  const mediaTypeExample = extractMediaTypeExample(mediaType);
  const generatedExample = buildSchemaExample(schema);

  return {
    name: 'body',
    in: 'body',
    dataType: getSchemaType(schema),
    contentType: selectedContentType,
    isStringList: isStringListSchema(schema),
    description: requestBody.description,
    required: requestBody.required,
    defaultValue: mediaTypeExample ?? generatedExample,
  };
}

/**
 * Convert OpenAPI parameter to REST API parameter
 */
function convertParameter(param: OpenAPIV3_1.ParameterObject): RestApiParameter {
  const schema = isSchemaObject(param.schema) ? param.schema : undefined;

  return {
    name: param.name,
    in: param.in as any,
    dataType: getSchemaType(schema),
    isStringList: isStringListSchema(schema),
    description: param.description,
    required: param.required,
    defaultValue: schema?.default,
  };
}
