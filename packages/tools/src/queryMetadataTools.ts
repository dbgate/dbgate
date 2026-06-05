const CLAUSE_KEYWORDS = new Set(['where', 'order', 'limit', 'offset', 'fetch', 'for']);
const BLOCKED_KEYWORDS = [
  'join',
  'group',
  'having',
  'distinct',
  'union',
  'with',
  'insert',
  'update',
  'delete',
  'merge',
];
const AGGREGATE_FUNCTIONS = ['count', 'sum', 'avg', 'min', 'max'];
const JOIN_TYPE_KEYWORDS = new Set(['inner', 'left', 'right', 'full', 'cross', 'outer']);
const TABLE_ALIAS_STOP_KEYWORDS = new Set([
  ...CLAUSE_KEYWORDS,
  'join',
  'inner',
  'left',
  'right',
  'full',
  'cross',
  'outer',
  'on',
]);

type Token = {
  text: string;
  lower: string;
};

type ColumnSourceMetadata = {
  tableName: string;
  schemaName?: string;
  sourceColumnName: string;
};

function stripCommentsAndStrings(sql: string) {
  let result = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch == '-' && next == '-') {
      while (i < sql.length && sql[i] != '\n') i++;
      result += ' ';
      continue;
    }
    if (ch == '/' && next == '*') {
      i += 2;
      while (i < sql.length && !(sql[i] == '*' && sql[i + 1] == '/')) i++;
      i += 2;
      result += ' ';
      continue;
    }
    if (ch == "'") {
      result += ' ';
      i++;
      while (i < sql.length) {
        if (sql[i] == "'" && sql[i + 1] == "'") {
          i += 2;
          continue;
        }
        if (sql[i] == "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    result += ch;
    i++;
  }
  return result;
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch == '"' || ch == '`') {
      const quote = ch;
      let text = '';
      i++;
      while (i < sql.length) {
        if (sql[i] == quote && sql[i + 1] == quote) {
          text += quote;
          i += 2;
          continue;
        }
        if (sql[i] == quote) {
          i++;
          break;
        }
        text += sql[i];
        i++;
      }
      tokens.push({ text, lower: text.toLowerCase() });
      continue;
    }

    if (ch == '[') {
      let text = '';
      i++;
      while (i < sql.length) {
        if (sql[i] == ']' && sql[i + 1] == ']') {
          text += ']';
          i += 2;
          continue;
        }
        if (sql[i] == ']') {
          i++;
          break;
        }
        text += sql[i];
        i++;
      }
      tokens.push({ text, lower: text.toLowerCase() });
      continue;
    }

    if (/[A-Za-z_@$#]/.test(ch)) {
      let text = ch;
      i++;
      while (i < sql.length && /[A-Za-z0-9_@$#]/.test(sql[i])) {
        text += sql[i];
        i++;
      }
      tokens.push({ text, lower: text.toLowerCase() });
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let text = ch;
      i++;
      while (i < sql.length && /[0-9.]/.test(sql[i])) {
        text += sql[i];
        i++;
      }
      tokens.push({ text, lower: text.toLowerCase() });
      continue;
    }

    tokens.push({ text: ch, lower: ch });
    i++;
  }

  return tokens;
}

function splitTopLevelStatements(tokens: Token[]) {
  const statements: Token[][] = [];
  let current: Token[] = [];
  for (const token of tokens) {
    if (token.text == ';') {
      if (current.length > 0) statements.push(current);
      current = [];
    } else {
      current.push(token);
    }
  }
  if (current.length > 0) statements.push(current);
  return statements;
}

function tokenMatches(tokens: Token[], index: number, text: string) {
  return tokens[index]?.lower == text;
}

function parseQualifiedIdentifier(tokens: Token[], start: number) {
  const parts: string[] = [];
  let index = start;

  if (!tokens[index] || !/^[A-Za-z_@$#][A-Za-z0-9_@$#]*$/.test(tokens[index].text)) return null;
  parts.push(tokens[index].text);
  index++;

  while (tokens[index]?.text == '.') {
    index++;
    if (!tokens[index] || !/^[A-Za-z_@$#][A-Za-z0-9_@$#]*$/.test(tokens[index].text)) return null;
    parts.push(tokens[index].text);
    index++;
  }

  return { parts, index };
}

function getSingleStatementTokens(sql: string) {
  const cleanSql = stripCommentsAndStrings(sql).trim();
  const tokens = tokenize(cleanSql);
  const statements = splitTopLevelStatements(tokens);
  return statements.length == 1 ? statements[0] : null;
}

function hasBlockedConstruct(tokens: Token[], allowJoin = false) {
  if (tokens[0]?.lower == 'with') return true;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (allowJoin && token.lower == 'join') continue;
    if (BLOCKED_KEYWORDS.includes(token.lower)) return true;
    if (token.lower == 'select' && i > 0) return true;
    if (token.text == '(' || token.text == ')') return true;
    if (AGGREGATE_FUNCTIONS.includes(token.lower) && tokens[i + 1]?.text == '(') return true;
  }

  return false;
}

function validateSelectList(tokens: Token[], selectIndex: number, fromIndex: number) {
  return extractSimpleSelectColumnSources(tokens, selectIndex, fromIndex) != null;
}

function isIdentifierToken(token: Token) {
  return !!token && /^[A-Za-z_@$#][A-Za-z0-9_@$#]*$/.test(token.text);
}

function splitSelectListItems(tokens: Token[], selectIndex: number, fromIndex: number) {
  if (fromIndex <= selectIndex + 1) return null;

  let current: Token[] = [];
  const items: Token[][] = [];
  for (let i = selectIndex + 1; i < fromIndex; i++) {
    if (tokens[i].text == ',') {
      if (current.length == 0) return false;
      items.push(current);
      current = [];
    } else {
      current.push(tokens[i]);
    }
  }
  if (current.length == 0) return false;
  items.push(current);

  return items;
}

function parseSelectListItem(item: Token[]) {
  if (item.length == 1 && item[0].text == '*') return { wildcard: true };

  const parsed = parseQualifiedIdentifier(item, 0);
  if (!parsed || parsed.parts.length < 1 || parsed.parts.length > 2) return null;

  const sourceColumnName = parsed.parts[parsed.parts.length - 1];
  let resultColumnName = sourceColumnName;
  let index = parsed.index;

  if (item[index]?.lower == 'as') {
    index++;
    if (!isIdentifierToken(item[index])) return null;
    resultColumnName = item[index].text;
    index++;
  } else if (item[index]) {
    if (!isIdentifierToken(item[index])) return null;
    resultColumnName = item[index].text;
    index++;
  }

  if (index != item.length) return null;
  return { sourceColumnName, resultColumnName };
}

function parseQualifiedSelectListItem(item: Token[]) {
  const parsed = parseQualifiedIdentifier(item, 0);
  if (!parsed || parsed.parts.length < 2 || parsed.parts.length > 3) return null;

  const sourceColumnName = parsed.parts[parsed.parts.length - 1];
  const qualifier = parsed.parts.slice(0, -1).join('.');
  let resultColumnName = sourceColumnName;
  let index = parsed.index;

  if (item[index]?.lower == 'as') {
    index++;
    if (!isIdentifierToken(item[index])) return null;
    resultColumnName = item[index].text;
    index++;
  } else if (item[index]) {
    if (!isIdentifierToken(item[index])) return null;
    resultColumnName = item[index].text;
    index++;
  }

  if (index != item.length) return null;
  return { qualifier, sourceColumnName, resultColumnName };
}

function extractSimpleSelectColumnSources(tokens: Token[], selectIndex: number, fromIndex: number) {
  const items = splitSelectListItems(tokens, selectIndex, fromIndex);
  if (!items) return null;

  const result: { resultColumnName: string; sourceColumnName: string }[] = [];
  for (const item of items) {
    const parsed = parseSelectListItem(item);
    if (!parsed) return null;
    if (!parsed.wildcard) {
      result.push({
        resultColumnName: parsed.resultColumnName,
        sourceColumnName: parsed.sourceColumnName,
      });
    }
  }

  return result;
}

function getTableNameFromParts(parts: string[]) {
  return {
    schemaName: parts.length >= 2 ? parts[parts.length - 2] : undefined,
    tableName: parts[parts.length - 1],
  };
}

function addResolvedTable(resolvedTables: Map<string, ColumnSourceMetadata[]>, key: string, table: ColumnSourceMetadata) {
  const lowerKey = key.toLowerCase();
  const existingTables = resolvedTables.get(lowerKey) || [];
  if (existingTables.some(item => item.schemaName == table.schemaName && item.tableName == table.tableName)) return;
  resolvedTables.set(lowerKey, [...existingTables, table]);
}

function parseFromTables(tokens: Token[], fromIndex: number) {
  const resolvedTables = new Map<string, ColumnSourceMetadata[]>();
  let index = fromIndex + 1;
  let expectTable = true;

  while (index < tokens.length) {
    const token = tokens[index];
    if (CLAUSE_KEYWORDS.has(token.lower)) break;

    if (token.lower == 'on') {
      expectTable = false;
      index++;
      continue;
    }
    if (token.lower == 'join') {
      expectTable = true;
      index++;
      continue;
    }
    if (JOIN_TYPE_KEYWORDS.has(token.lower)) {
      index++;
      continue;
    }

    if (!expectTable) {
      index++;
      continue;
    }

    const parsed = parseQualifiedIdentifier(tokens, index);
    if (!parsed || parsed.parts.length < 1 || parsed.parts.length > 3) return null;

    const { schemaName, tableName } = getTableNameFromParts(parsed.parts);
    const table = { schemaName, tableName, sourceColumnName: null };
    addResolvedTable(resolvedTables, tableName, table);
    if (schemaName) addResolvedTable(resolvedTables, `${schemaName}.${tableName}`, table);
    addResolvedTable(resolvedTables, parsed.parts.join('.'), table);

    index = parsed.index;
    if (tokens[index]?.lower == 'as') index++;
    if (tokens[index] && !TABLE_ALIAS_STOP_KEYWORDS.has(tokens[index].lower) && tokens[index].text != ',') {
      if (!isIdentifierToken(tokens[index])) return null;
      addResolvedTable(resolvedTables, tokens[index].text, table);
      index++;
    }
    expectTable = false;
  }

  return resolvedTables;
}

function resolveTable(resolvedTables: Map<string, ColumnSourceMetadata[]>, qualifier: string) {
  const matchingTables = resolvedTables.get(qualifier.toLowerCase()) || [];
  if (matchingTables.length != 1) return null;
  return matchingTables[0];
}

function extractJoinColumnMetadata(tokens: Token[], selectIndex: number, fromIndex: number) {
  const items = splitSelectListItems(tokens, selectIndex, fromIndex);
  if (!items) return null;
  const resolvedTables = parseFromTables(tokens, fromIndex);
  if (!resolvedTables) return null;

  const result: { resultColumnName: string; metadata: ColumnSourceMetadata }[] = [];
  for (const item of items) {
    const parsed = parseQualifiedSelectListItem(item);
    if (!parsed) continue;
    const table = resolveTable(resolvedTables, parsed.qualifier);
    if (!table) continue;
    result.push({
      resultColumnName: parsed.resultColumnName,
      metadata: {
        schemaName: table.schemaName,
        tableName: table.tableName,
        sourceColumnName: parsed.sourceColumnName,
      },
    });
  }

  return result;
}

export function extractSingleTableFromSql(sql: string): { tableName: string; schemaName?: string } | null {
  const tokens = getSingleStatementTokens(sql);
  if (!tokens || hasBlockedConstruct(tokens)) return null;
  if (!tokenMatches(tokens, 0, 'select')) return null;

  const fromIndex = tokens.findIndex(token => token.lower == 'from');
  if (fromIndex <= 0) return null;
  if (!validateSelectList(tokens, 0, fromIndex)) return null;

  const parsedTable = parseQualifiedIdentifier(tokens, fromIndex + 1);
  if (!parsedTable || parsedTable.parts.length < 1 || parsedTable.parts.length > 2) return null;

  let index = parsedTable.index;
  if (tokens[index] && !CLAUSE_KEYWORDS.has(tokens[index].lower)) {
    if (tokens[index].lower == 'as') index++;
    if (!tokens[index] || CLAUSE_KEYWORDS.has(tokens[index].lower)) return null;
    if (tokens[index].text == ',' || tokens[index].text == '.') return null;
    index++;
  }

  if (index < tokens.length && !CLAUSE_KEYWORDS.has(tokens[index].lower)) return null;

  const [schemaName, tableName] =
    parsedTable.parts.length == 2 ? [parsedTable.parts[0], parsedTable.parts[1]] : [undefined, parsedTable.parts[0]];

  return { tableName, schemaName };
}

export function isSimpleSelectQuery(sql: string): boolean {
  return extractSingleTableFromSql(sql) != null;
}

export function extractColumnSourcesFromSql(sql: string): { [resultColumnName: string]: string } | null {
  const tokens = getSingleStatementTokens(sql);
  if (!tokens || hasBlockedConstruct(tokens)) return null;
  if (!tokenMatches(tokens, 0, 'select')) return null;

  const fromIndex = tokens.findIndex(token => token.lower == 'from');
  if (fromIndex <= 0) return null;

  const columns = extractSimpleSelectColumnSources(tokens, 0, fromIndex);
  if (!columns) return null;

  return Object.fromEntries(columns.map(column => [column.resultColumnName, column.sourceColumnName]));
}

export function extractColumnMetadataFromSql(sql: string): { [resultColumnName: string]: ColumnSourceMetadata } | null {
  const tokens = getSingleStatementTokens(sql);
  if (!tokens || hasBlockedConstruct(tokens, true)) return null;
  if (!tokenMatches(tokens, 0, 'select')) return null;

  const fromIndex = tokens.findIndex(token => token.lower == 'from');
  if (fromIndex <= 0) return null;

  const table = extractSingleTableFromSql(sql);
  if (table) {
    const columns = extractSimpleSelectColumnSources(tokens, 0, fromIndex);
    if (!columns) return null;
    return Object.fromEntries(
      columns.map(column => [
        column.resultColumnName,
        {
          tableName: table.tableName,
          schemaName: table.schemaName,
          sourceColumnName: column.sourceColumnName,
        },
      ])
    );
  }

  const columns = extractJoinColumnMetadata(tokens, 0, fromIndex);
  if (!columns) return null;

  return Object.fromEntries(columns.map(column => [column.resultColumnName, column.metadata]));
}
