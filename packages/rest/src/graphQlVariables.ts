export type GraphQlVariableDefinition = {
  name: string;
  type: string;
};

export function extractGraphQlVariableDefinitions(text: string): GraphQlVariableDefinition[] {
  if (!text) return [];

  const cleaned = text.replace(/#[^\n]*/g, '');
  const regex = /\$([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^=,)\n]+)/g;
  const names = new Set<string>();
  const definitions: GraphQlVariableDefinition[] = [];

  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(cleaned))) {
    const name = match[1];
    if (names.has(name)) continue;
    names.add(name);
    definitions.push({
      name,
      type: match[2].trim(),
    });
  }

  return definitions;
}

function unwrapNonNull(typeText: string): string {
  let current = (typeText || '').trim();
  while (current.endsWith('!')) {
    current = current.slice(0, -1).trim();
  }
  return current;
}

function isListType(typeText: string): boolean {
  const unwrapped = unwrapNonNull(typeText);
  return unwrapped.startsWith('[') && unwrapped.endsWith(']');
}

function getInnerListType(typeText: string): string {
  const unwrapped = unwrapNonNull(typeText);
  if (!(unwrapped.startsWith('[') && unwrapped.endsWith(']'))) return unwrapped;
  return unwrapped.slice(1, -1).trim();
}

function getBaseType(typeText: string): string {
  let current = unwrapNonNull(typeText);
  while (current.startsWith('[') && current.endsWith(']')) {
    current = current.slice(1, -1).trim();
    current = unwrapNonNull(current);
  }
  return current;
}

function parseJsonIfPossible(raw: string): any {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

function toInt(raw: string): number | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
}

function toFloat(raw: string): number | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return num;
}

function toBoolean(raw: string): boolean | null {
  const lowered = (raw || '').trim().toLowerCase();
  if (!lowered) return null;
  if (['true', '1', 'yes', 'y', 'on'].includes(lowered)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(lowered)) return false;
  return null;
}

function convertByGraphQlTypeValue(raw: any, graphQlType: string): any {
  if (raw == null) return null;

  if (isListType(graphQlType)) {
    const innerType = getInnerListType(graphQlType);
    const parsed = typeof raw === 'string' ? parseJsonIfPossible(raw) : raw;
    const arrayValue = Array.isArray(parsed) ? parsed : [parsed];
    return arrayValue.map(item => convertByGraphQlTypeValue(item, innerType));
  }

  const baseType = getBaseType(graphQlType);
  const stringValue = typeof raw === 'string' ? raw : JSON.stringify(raw);

  if (baseType === 'Int') return toInt(stringValue);
  if (baseType === 'Float') return toFloat(stringValue);
  if (baseType === 'Boolean') return toBoolean(stringValue);
  if (baseType === 'String' || baseType === 'ID') return String(raw);

  if (typeof raw === 'string') {
    return parseJsonIfPossible(raw);
  }
  return raw;
}

export function convertGraphQlVariablesForRequest(
  queryText: string,
  rawVariables: Record<string, string> = {}
): Record<string, any> {
  const definitions = extractGraphQlVariableDefinitions(queryText || '');
  const next: Record<string, any> = {};

  for (const definition of definitions) {
    const raw = rawVariables?.[definition.name] ?? '';
    next[definition.name] = convertByGraphQlTypeValue(raw, definition.type);
  }

  return next;
}
