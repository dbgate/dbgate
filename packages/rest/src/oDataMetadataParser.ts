import type { ODataMetadataDocument, ODataMetadataEntitySet, ODataMetadataEntityType, ODataMetadataNavigationProperty } from './oDataAdapter';

function decodeXmlEntities(value: string): string {
  return String(value ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseXmlAttributes(attributesText: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const regex = /([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match = regex.exec(attributesText || '');

  while (match) {
    const rawName = match[1];
    const localName = rawName.includes(':') ? rawName.split(':').pop() || rawName : rawName;
    const rawValue = match[3] ?? match[4] ?? '';
    const decoded = decodeXmlEntities(rawValue);
    attributes[rawName] = decoded;
    attributes[localName] = decoded;
    match = regex.exec(attributesText || '');
  }

  return attributes;
}

function extractXmlElements(xml: string, elementName: string): Array<{ attributes: Record<string, string>; innerXml: string }> {
  const elements: Array<{ attributes: Record<string, string>; innerXml: string }> = [];
  const fullTagRegex = new RegExp(
    `<(?:[A-Za-z_][A-Za-z0-9_.-]*:)?${elementName}\\b([^>]*)>([\\s\\S]*?)<\\/(?:[A-Za-z_][A-Za-z0-9_.-]*:)?${elementName}>`,
    'gi'
  );
  const selfClosingRegex = new RegExp(
    `<(?:[A-Za-z_][A-Za-z0-9_.-]*:)?${elementName}\\b([^>]*)\\/>`,
    'gi'
  );

  let fullMatch = fullTagRegex.exec(xml || '');
  while (fullMatch) {
    elements.push({
      attributes: parseXmlAttributes(fullMatch[1] || ''),
      innerXml: fullMatch[2] || '',
    });
    fullMatch = fullTagRegex.exec(xml || '');
  }

  let selfClosingMatch = selfClosingRegex.exec(xml || '');
  while (selfClosingMatch) {
    elements.push({
      attributes: parseXmlAttributes(selfClosingMatch[1] || ''),
      innerXml: '',
    });
    selfClosingMatch = selfClosingRegex.exec(xml || '');
  }

  return elements;
}

function toBoolAttribute(value: string | undefined): boolean {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

function normalizeEntitySetName(value: string | undefined): string {
  const input = String(value ?? '').trim();
  if (!input) return '';

  const noContainer = input.includes('/') ? input.split('/').pop() || '' : input;
  return noContainer.includes('.') ? noContainer.split('.').pop() || noContainer : noContainer;
}

export function parseODataMetadataDocument(metadataXml: string): ODataMetadataDocument {
  const schemas = extractXmlElements(metadataXml || '', 'Schema');

  const entityTypes: Record<string, ODataMetadataEntityType> = {};
  const entitySets: Record<string, ODataMetadataEntitySet> = {};

  for (const schema of schemas) {
    const namespace = String(schema.attributes.Namespace || '').trim();

    for (const entityTypeNode of extractXmlElements(schema.innerXml, 'EntityType')) {
      const typeName = String(entityTypeNode.attributes.Name || '').trim();
      if (!typeName) continue;

      const fullTypeName = namespace ? `${namespace}.${typeName}` : typeName;
      const keyProperties: string[] = [];
      const stringProperties: string[] = [];
      const navigationProperties: ODataMetadataNavigationProperty[] = [];

      for (const keyNode of extractXmlElements(entityTypeNode.innerXml, 'Key')) {
        for (const propRef of extractXmlElements(keyNode.innerXml, 'PropertyRef')) {
          const keyName = String(propRef.attributes.Name || '').trim();
          if (keyName && !keyProperties.includes(keyName)) {
            keyProperties.push(keyName);
          }
        }
      }

      for (const propertyNode of extractXmlElements(entityTypeNode.innerXml, 'Property')) {
        const propName = String(propertyNode.attributes.Name || '').trim();
        const propType = String(propertyNode.attributes.Type || '').trim();
        if (propName && /^Edm\.String$/i.test(propType)) {
          stringProperties.push(propName);
        }
      }

      for (const navNode of extractXmlElements(entityTypeNode.innerXml, 'NavigationProperty')) {
        const navName = String(navNode.attributes.Name || '').trim();
        if (!navName) continue;

        navigationProperties.push({
          name: navName,
          type: String(navNode.attributes.Type || '').trim(),
          containsTarget: toBoolAttribute(navNode.attributes.ContainsTarget),
          nullable: navNode.attributes.Nullable === undefined ? true : toBoolAttribute(navNode.attributes.Nullable),
        });
      }

      entityTypes[fullTypeName] = {
        typeName,
        fullTypeName,
        keyProperties,
        stringProperties,
        navigationProperties,
      };
    }

    for (const entitySetNode of extractXmlElements(schema.innerXml, 'EntitySet')) {
      const setName = String(entitySetNode.attributes.Name || '').trim();
      const entityType = String(entitySetNode.attributes.EntityType || '').trim();
      if (!setName || !entityType) continue;

      const navigationBindings: Record<string, string> = {};

      for (const bindingNode of extractXmlElements(entitySetNode.innerXml, 'NavigationPropertyBinding')) {
        const path = String(bindingNode.attributes.Path || '').trim();
        const target = normalizeEntitySetName(bindingNode.attributes.Target);
        if (!path || !target) continue;

        navigationBindings[path] = target;
        const pathLastSegment = path.split('/').pop();
        if (pathLastSegment && !navigationBindings[pathLastSegment]) {
          navigationBindings[pathLastSegment] = target;
        }
      }

      entitySets[setName] = {
        name: setName,
        entityType,
        navigationBindings,
      };
    }
  }

  return {
    entityTypes,
    entitySets,
  };
}
