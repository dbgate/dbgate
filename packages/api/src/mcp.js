const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const connections = require('./controllers/connections');
const serverConnections = require('./controllers/serverConnections');
const databaseConnections = require('./controllers/databaseConnections');
const { maskConnection } = require('./utility/crypting');
const { isProApp } = require('./utility/checkLicense');
const requireEngineDriver = require('./utility/requireEngineDriver');
const {
  storageCheckMcpConnectionAccess,
  storageReadRolePermissions,
  readComplexRolePermissions,
  resolvePermissionConnectionIds,
} = require('./controllers/storageDb');
const {
  getDatabasePermissionRole,
  getTablePermissionRole,
  getTablePermissionRoleLevelIndex,
} = require('./utility/hasPermission');
const authController = require('./controllers/auth');
const { getAuthProviders, getDefaultAuthProvider } = require('./auth/authProvider');
const { getTokenSecret, getTokenLifetime } = require('./auth/authCommon');
const { markTokenAsLoggedIn } = require('./utility/loginchecker');
const getExpressPath = require('./utility/getExpressPath');
const { readMcpConfig, getPublicBaseUrl, getMcpResourceUrl } = require('./utility/mcpAuth');

const protocolVersion = '2025-06-18';
const mcpRoleId = -4;
const objectTypes = ['tables', 'collections', 'views', 'procedures', 'functions', 'triggers'];
const defaultDataLimit = 100;
const maxDataLimit = 1000;
const oauthAuthorizationCodes = new Map();
const oauthClients = new Map();
const oauthCodeLifetimeMs = 5 * 60 * 1000;
const filterOperators = ['eq', 'ne', '<', '<=', '>', '>=', 'contains', 'startsWith', 'endsWith', 'in', 'isNull', 'isNotNull'];
const filterSyntaxDescription = [
  'Optional JSON filter. Valid shapes:',
  `Comparison: {"column":"<columnName>","op":"${filterOperators
    .filter(op => !['in', 'isNull', 'isNotNull'].includes(op))
    .join('|')}","value":<value>}.`,
  'IN: {"column":"<columnName>","op":"in","values":[<value1>,<value2>]}.',
  'Null check: {"column":"<columnName>","op":"isNull"} or {"column":"<columnName>","op":"isNotNull"}.',
  'Compound: {"and":[<filter>,<filter>]} or {"or":[<filter>,<filter>]}. Compound filters may be nested.',
  'Examples: {"column":"status","op":"eq","value":"open"}; {"and":[{"column":"status","op":"eq","value":"open"},{"column":"created_at","op":">=","value":"2026-01-01"}]}.',
].join(' ');

function base64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sha256Base64Url(value) {
  return base64Url(crypto.createHash('sha256').update(value).digest());
}

function createOAuthId() {
  return base64Url(crypto.randomBytes(32));
}

function getOAuthAuthorizationServerUrl(req) {
  return getPublicBaseUrl(req);
}

function getOAuthEndpoint(req, path) {
  return `${getPublicBaseUrl(req)}${getExpressPath(path)}`;
}

function getOAuthProtectedResourceMetadataUrl(req) {
  return getOAuthEndpoint(req, '/.well-known/oauth-protected-resource');
}

async function requireOAuthMode(res) {
  let config;
  try {
    config = await readMcpConfig();
  } catch (err) {
    res.status(500).json({ apiErrorMessage: 'DBGM-00000 Could not load MCP authentication configuration' });
    return false;
  }
  if (!config.enabled) {
    res.status(403).json({ apiErrorMessage: 'DBGM-00000 MCP server is disabled' });
    return false;
  }
  if (config.authMode != 'oauth') {
    res.status(404).json({ apiErrorMessage: 'DBGM-00000 MCP OAuth is not enabled' });
    return false;
  }
  return true;
}

function isSafeRedirectUri(redirectUri) {
  try {
    const url = new URL(redirectUri);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  } catch (err) {
    return false;
  }
}

function assertValidOAuthRedirect(clientId, redirectUri) {
  const client = oauthClients.get(clientId);
  if (client) {
    if (!client.redirect_uris?.includes(redirectUri)) {
      throw new Error('DBGM-00000 Invalid redirect_uri');
    }
    return;
  }
  if (!clientId || !isSafeRedirectUri(redirectUri)) {
    throw new Error('DBGM-00000 Invalid OAuth client');
  }
}

function pruneOAuthAuthorizationCodes() {
  const now = Date.now();
  for (const [code, data] of oauthAuthorizationCodes.entries()) {
    if (data.expiresAt <= now) {
      oauthAuthorizationCodes.delete(code);
    }
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderOAuthAuthorizePage(params, error = null) {
  const providers = getAuthProviders().filter(provider => !provider.skipInList);
  const defaultProvider = params.amoid || getDefaultAuthProvider()?.amoid || providers[0]?.amoid || 'none';
  const hiddenFields = [
    'response_type',
    'client_id',
    'redirect_uri',
    'scope',
    'state',
    'code_challenge',
    'code_challenge_method',
    'resource',
  ]
    .map(name => `<input type="hidden" name="${name}" value="${htmlEscape(params[name])}" />`)
    .join('\n');
  const providerOptions = providers
    .map(
      provider =>
        `<option value="${htmlEscape(provider.amoid)}"${provider.amoid === defaultProvider ? ' selected' : ''}>${htmlEscape(
          provider.name || provider.amoid
        )}</option>`
    )
    .join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>DbGate MCP Login</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 40px; max-width: 420px; }
    label { display: block; margin-top: 16px; }
    input, select, button { box-sizing: border-box; font: inherit; width: 100%; padding: 8px; }
    button { margin-top: 20px; }
    .error { color: #b00020; margin: 16px 0; }
  </style>
</head>
<body>
  <h1>DbGate MCP Login</h1>
  <p>Sign in to allow this MCP client to use DbGate with your account.</p>
  ${error ? `<div class="error">${htmlEscape(error)}</div>` : ''}
  <form method="post" action="${htmlEscape(getExpressPath('/mcp/oauth/authorize'))}">
    ${hiddenFields}
    <label>Provider
      <select name="amoid">${providerOptions}</select>
    </label>
    <label>Login
      <input name="login" autocomplete="username" autofocus />
    </label>
    <label>Password
      <input name="password" type="password" autocomplete="current-password" />
    </label>
    <button type="submit">Authorize MCP client</button>
  </form>
</body>
</html>`;
}

function createConnectionDatabaseInputSchema() {
  return {
    type: 'object',
    properties: {
      conid: {
        type: 'string',
        description: 'DbGate connection ID.',
      },
      database: {
        type: 'string',
        description: 'Database name.',
      },
    },
    required: ['conid', 'database'],
    additionalProperties: false,
  };
}

const listConnectionsTool = {
  name: 'list_connections',
  title: 'List DbGate Connections',
  description: 'List DbGate connections available to the current user.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      connections: {
        type: 'array',
        items: {
          type: 'object',
        },
      },
    },
    required: ['connections'],
  },
};

const listDatabasesTool = {
  name: 'list_databases',
  title: 'List DbGate Databases',
  description: 'List databases for a DbGate connection.',
  inputSchema: {
    type: 'object',
    properties: {
      conid: {
        type: 'string',
        description: 'DbGate connection ID.',
      },
    },
    required: ['conid'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      databases: {
        type: 'array',
        items: {
          type: 'object',
        },
      },
    },
    required: ['databases'],
  },
};

const listObjectsTool = {
  name: 'list_objects',
  title: 'List DbGate Database Objects',
  description: 'List all tables, collections, views, procedures, functions, and triggers in a DbGate database.',
  inputSchema: createConnectionDatabaseInputSchema(),
  outputSchema: {
    type: 'object',
    properties: objectTypes.reduce(
      (res, objectType) => ({
        ...res,
        [objectType]: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      }),
      {}
    ),
    required: objectTypes,
  },
};

const getTableInfoTool = {
  name: 'get_table_info',
  title: 'Get DbGate Table Info',
  description: 'Get details and columns for one DbGate table.',
  inputSchema: {
    type: 'object',
    properties: {
      conid: {
        type: 'string',
        description: 'DbGate connection ID.',
      },
      database: {
        type: 'string',
        description: 'Database name.',
      },
      schemaName: {
        type: 'string',
        description: 'Table schema name. Optional when the table name is unique.',
      },
      pureName: {
        type: 'string',
        description: 'Table name without schema.',
      },
    },
    required: ['conid', 'database', 'pureName'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'object',
      },
    },
    required: ['table'],
  },
};

const getTableDataTool = {
  name: 'get_table_data',
  title: 'Get DbGate Table Or Collection Data',
  description:
    'Get rows/documents from one DbGate table or NoSQL collection with optional JSON filter, selected fields, ordering, and pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      conid: {
        type: 'string',
        description: 'DbGate connection ID.',
      },
      database: {
        type: 'string',
        description: 'Database name.',
      },
      schemaName: {
        type: 'string',
        description: 'Table schema name. Optional when the table/collection name is unique.',
      },
      pureName: {
        type: 'string',
        description: 'Table or collection name without schema.',
      },
      columns: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Optional list of column/field names to return. Defaults to all table columns for SQL tables and all returned document fields for collections.',
      },
      filter: {
        type: 'object',
        description: filterSyntaxDescription,
        properties: {
          column: {
            type: 'string',
            description: 'Column name for comparison, in, and null-check filters.',
          },
          op: {
            type: 'string',
            enum: filterOperators,
            description: 'Filter operator. Defaults to eq when omitted for a single-column filter.',
          },
          value: {
            description: 'Value for comparison operators except in, isNull, and isNotNull.',
          },
          values: {
            type: 'array',
            description: 'Values array required when op is in.',
          },
          and: {
            type: 'array',
            items: {
              type: 'object',
            },
            description: 'Array of nested filters combined with AND.',
          },
          or: {
            type: 'array',
            items: {
              type: 'object',
            },
            description: 'Array of nested filters combined with OR.',
          },
        },
      },
      orderBy: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            column: {
              type: 'string',
            },
            direction: {
              type: 'string',
              enum: ['asc', 'desc', 'ASC', 'DESC'],
            },
          },
          required: ['column'],
          additionalProperties: false,
        },
      },
      limit: {
        type: 'number',
        description: `Maximum rows to return. Defaults to ${defaultDataLimit}, capped at ${maxDataLimit}.`,
      },
      offset: {
        type: 'number',
        description: 'Rows to skip. Defaults to 0.',
      },
    },
    required: ['conid', 'database', 'pureName'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      rows: {
        type: 'array',
        items: {
          type: 'object',
        },
      },
      columns: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      limit: {
        type: 'number',
      },
      offset: {
        type: 'number',
      },
    },
    required: ['rows', 'columns', 'limit', 'offset'],
  },
};

const executeQueryTool = {
  name: 'execute_query',
  title: 'Execute DbGate Query',
  description:
    'Execute a SQL query against a DbGate database. This tool is available only with a Team Premium license.',
  inputSchema: {
    type: 'object',
    properties: {
      conid: {
        type: 'string',
        description: 'DbGate connection ID.',
      },
      database: {
        type: 'string',
        description: 'Database name.',
      },
      sql: {
        type: 'string',
        description: 'SQL query to execute.',
      },
    },
    required: ['conid', 'database', 'sql'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      response: {
        description: 'Raw query response returned by DbGate.',
      },
    },
    required: ['response'],
  },
};

function createTableMutationInputProperties(pureNameDescription = 'Table name.') {
  return {
    conid: {
      type: 'string',
      description: 'DbGate connection ID.',
    },
    database: {
      type: 'string',
      description: 'Database name.',
    },
    schemaName: {
      type: 'string',
      description: 'Optional table schema name.',
    },
    pureName: {
      type: 'string',
      description: pureNameDescription,
    },
  };
}

const insertRowsTool = {
  name: 'insert_rows',
  title: 'Insert DbGate Rows',
  description:
    'Insert rows into a DbGate SQL table or documents into a MongoDB collection. Always pass rows as an array; for one row/document, pass an array with one object. SQL table rows must use the same columns; MongoDB collection documents may use different fields. This tool is available only with a Team Premium license.',
  inputSchema: {
    type: 'object',
    properties: {
      ...createTableMutationInputProperties('Table or collection name.'),
      rows: {
        type: 'array',
        description:
          'Rows or MongoDB documents to insert, as [{"columnName": value}] or [{"fieldName": value}]. Must be a non-empty array. SQL table rows must use the same columns; MongoDB collection documents may use different fields.',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    required: ['conid', 'database', 'pureName', 'rows'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      response: {
        description: 'Raw save response returned by DbGate.',
      },
    },
    required: ['response'],
  },
};

const updateRowsTool = {
  name: 'update_rows',
  title: 'Update DbGate Rows',
  description:
    'Update rows in a DbGate SQL table or documents in a MongoDB collection. SQL tables use an equality WHERE condition object; MongoDB collections use the condition object as the MongoDB update filter. This tool is available only with a Team Premium license.',
  inputSchema: {
    type: 'object',
    properties: {
      ...createTableMutationInputProperties('Table or collection name.'),
      fields: {
        type: 'object',
        description: 'Column values or MongoDB document fields to update, as {"columnName": value} or {"fieldName": value}.',
        additionalProperties: true,
      },
      condition: {
        type: 'object',
        description:
          'Required condition. For SQL tables, pass an equality WHERE condition as {"columnName": value}; all provided columns are combined with AND. For MongoDB collections, pass the MongoDB update filter object, for example {"_id": {"$oid": "..."}} or {"email": "a@example.com"}.',
        additionalProperties: true,
      },
    },
    required: ['conid', 'database', 'pureName', 'fields', 'condition'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      response: {
        description: 'Raw save response returned by DbGate.',
      },
    },
    required: ['response'],
  },
};

function createObjectListTool(objectType) {
  return {
    name: `list_${objectType}`,
    title: `List DbGate ${objectType}`,
    description: `List ${objectType} in a DbGate database.`,
    inputSchema: createConnectionDatabaseInputSchema(),
    outputSchema: {
      type: 'object',
      properties: {
        [objectType]: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      },
      required: [objectType],
    },
  };
}

const objectListTools = objectTypes.map(createObjectListTool);
const tools = [
  listConnectionsTool,
  listDatabasesTool,
  listObjectsTool,
  getTableInfoTool,
  getTableDataTool,
  ...objectListTools,
];
const teamPremiumTools = [executeQueryTool, insertRowsTool, updateRowsTool];

function hasTeamPremiumLicense() {
  return isProApp();
}

function requireTeamPremiumLicense() {
  if (!hasTeamPremiumLicense()) {
    throw new Error('DBGM-00000 Tool requires Team Premium license');
  }
}

function getAvailableTools() {
  return [...tools, ...(hasTeamPremiumLicense() ? teamPremiumTools : [])];
}

function jsonRpcResult(id, result) {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

function jsonRpcError(id, code, message) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message: withDbgmCode(message),
    },
  };
}

function withDbgmCode(message) {
  if (typeof message !== 'string' || message.startsWith('DBGM-')) {
    return message;
  }
  return `DBGM-00000 ${message}`;
}

function isMcpEnabledValue(value) {
  return [true, 1, '1', 'true'].includes(value);
}

function getMcpConnectionId(connection) {
  return connection?._id ?? connection?.conid;
}

async function loadMcpRolePermissions(req) {
  if (!process.env.STORAGE_DATABASE) {
    return null;
  }
  if (!req.__mcpRolePermissions) {
    req.__mcpRolePermissions = (await storageReadRolePermissions(mcpRoleId)) ?? [];
  }
  return req.__mcpRolePermissions;
}

async function loadMcpDatabasePermissions(req) {
  if (!process.env.STORAGE_DATABASE) {
    return null;
  }
  if (!req.__mcpDatabasePermissions) {
    req.__mcpDatabasePermissions = await resolvePermissionConnectionIds(
      (await readComplexRolePermissions(mcpRoleId, 'role_databases')) ?? []
    );
  }
  return req.__mcpDatabasePermissions;
}

async function loadMcpTablePermissions(req) {
  if (!process.env.STORAGE_DATABASE) {
    return null;
  }
  if (!req.__mcpTablePermissions) {
    req.__mcpTablePermissions = await resolvePermissionConnectionIds(
      (await readComplexRolePermissions(mcpRoleId, 'role_tables')) ?? []
    );
  }
  return req.__mcpTablePermissions;
}

async function mcpHasPermission(permission, req) {
  if (!process.env.STORAGE_DATABASE) {
    return true;
  }
  const permissions = (await loadMcpRolePermissions(req)) ?? [];
  if (permissions.includes(`~${permission}`) || permissions.includes('~*')) {
    return false;
  }
  return permissions.includes(permission) || permissions.includes('*');
}

async function isMcpConnectionEnabled(connection, req) {
  if (!connection) {
    return false;
  }
  if (process.env.STORAGE_DATABASE) {
    if (await mcpHasPermission('all-connections', req)) {
      return true;
    }
    return storageCheckMcpConnectionAccess(req, getMcpConnectionId(connection));
  }
  return isMcpEnabledValue(connection.mcpEnabled);
}

async function filterMcpConnections(list, req) {
  const enabled = await Promise.all(list.map(connection => isMcpConnectionEnabled(connection, req)));
  return list.filter((connection, index) => enabled[index]);
}

async function requireMcpConnection(conid, req) {
  const list = (await connections.list({}, req)) ?? [];
  const connection = list.find(item => getMcpConnectionId(item) === conid);
  if (!(await isMcpConnectionEnabled(connection, req))) {
    throw new Error(`DBGM-00000 Connection is not enabled for MCP: ${conid}`);
  }
  return connection;
}

async function getMcpDatabaseRole(conid, database, req) {
  if (!process.env.STORAGE_DATABASE) {
    return 'run_script';
  }
  return getDatabasePermissionRole(conid, database, await loadMcpDatabasePermissions(req));
}

function getDatabaseRoleLevelIndex(roleName) {
  if (!roleName) return 6;
  if (roleName == 'run_script') return 5;
  if (roleName == 'write_data') return 4;
  if (roleName == 'read_content') return 3;
  if (roleName == 'view') return 2;
  if (roleName == 'deny') return 1;
  return 6;
}

async function requireMcpDatabase(conid, database, req, requiredRole = 'view') {
  if (!process.env.STORAGE_DATABASE) {
    return;
  }
  if (await mcpHasPermission('all-databases', req)) {
    return;
  }
  const role = await getMcpDatabaseRole(conid, database, req);
  if (getDatabaseRoleLevelIndex(role) < getDatabaseRoleLevelIndex(requiredRole)) {
    throw new Error(`DBGM-00000 Database is not enabled for MCP: ${database}`);
  }
}

async function filterMcpDatabases(conid, databases, req) {
  if (!process.env.STORAGE_DATABASE || (await mcpHasPermission('all-databases', req))) {
    return databases;
  }
  const databasePermissions = await loadMcpDatabasePermissions(req);
  return databases.filter(database => getDatabasePermissionRole(conid, database.name, databasePermissions) != 'deny');
}

async function getMcpTableRole(conid, database, objectTypeField, schemaName, pureName, req) {
  const databasePermissionRole = (await mcpHasPermission('all-databases', req))
    ? 'deny'
    : await getMcpDatabaseRole(conid, database, req);
  return getTablePermissionRole(
    conid,
    database,
    objectTypeField,
    schemaName,
    pureName,
    await loadMcpTablePermissions(req),
    databasePermissionRole
  );
}

async function requireMcpObject(conid, database, objectTypeField, schemaName, pureName, req, requiredRole = 'read') {
  if (!process.env.STORAGE_DATABASE) {
    return;
  }
  if (await mcpHasPermission('all-tables', req)) {
    return;
  }
  const role = await getMcpTableRole(conid, database, objectTypeField, schemaName, pureName, req);
  if (getTablePermissionRoleLevelIndex(role) < getTablePermissionRoleLevelIndex(requiredRole)) {
    throw new Error(`DBGM-00000 Object is not enabled for MCP: ${schemaName ? `${schemaName}.` : ''}${pureName}`);
  }
}

async function filterMcpStructure(conid, database, structure, req) {
  if (!process.env.STORAGE_DATABASE || (await mcpHasPermission('all-tables', req))) {
    return structure;
  }

  async function filterObjects(list = [], objectTypeField) {
    const result = [];
    for (const item of list) {
      const role = await getMcpTableRole(conid, database, objectTypeField, item.schemaName, item.pureName, req);
      if (role != 'deny') {
        result.push({
          ...item,
          tablePermissionRole: role,
        });
      }
    }
    return result;
  }

  return {
    ...structure,
    tables: await filterObjects(structure.tables, 'tables'),
    collections: await filterObjects(structure.collections, 'collections'),
    views: await filterObjects(structure.views, 'views'),
    procedures: await filterObjects(structure.procedures, 'procedures'),
    functions: await filterObjects(structure.functions, 'functions'),
    triggers: await filterObjects(structure.triggers, 'triggers'),
  };
}

async function callListConnectionsTool(req) {
  const list = (await connections.list({}, req)) ?? [];
  const maskedConnections = (await filterMcpConnections(list, req)).map(connection => maskConnection(connection));

  return createToolResult({
    connections: maskedConnections,
  });
}

async function callListDatabasesTool(args, req) {
  const conid = args?.conid;
  if (!conid) {
    throw new Error('DBGM-00000 Missing required argument: conid');
  }
  await requireMcpConnection(conid, req);

  const databases = (await serverConnections.listDatabases({ conid }, req)) ?? [];

  return createToolResult({
    databases: await filterMcpDatabases(conid, databases, req),
  });
}

function requireConnectionDatabaseArgs(args) {
  if (!args?.conid) {
    throw new Error('DBGM-00000 Missing required argument: conid');
  }
  if (!args?.database) {
    throw new Error('DBGM-00000 Missing required argument: database');
  }
}

function requireTableInfoArgs(args) {
  requireConnectionDatabaseArgs(args);
  if (!args?.pureName) {
    throw new Error('DBGM-00000 Missing required argument: pureName');
  }
}

function requireExecuteQueryArgs(args) {
  requireConnectionDatabaseArgs(args);
  if (!args?.sql || typeof args.sql !== 'string') {
    throw new Error('DBGM-00000 Missing required argument: sql');
  }
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function requireNonEmptyObject(value, argName) {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    throw new Error(`DBGM-00000 ${argName} must be a non-empty object`);
  }
}

async function createMutationDumper(conid) {
  const connection = await connections.getCore({ conid });
  const driver = requireEngineDriver(connection);
  if (!driver?.createDumper) {
    throw new Error('DBGM-00000 SQL mutation tools are not supported by this connection driver');
  }
  return driver.createDumper();
}

function getTableName(args) {
  return {
    pureName: args.pureName,
    ...(args.schemaName == null ? {} : { schemaName: args.schemaName }),
  };
}

function getInsertRowsColumns(rows) {
  const columns = Object.keys(rows[0]);
  for (const row of rows) {
    const rowColumns = Object.keys(row);
    if (
      rowColumns.length !== columns.length ||
      rowColumns.some(column => !columns.includes(column)) ||
      columns.some(column => !rowColumns.includes(column))
    ) {
      throw new Error('DBGM-00000 All rows must use the same columns');
    }
  }
  return columns;
}

function buildInsertRowsSql(dmp, args) {
  const columns = getInsertRowsColumns(args.rows);
  dmp.put('^insert ^into %f (%,i) ^values ', getTableName(args), columns);
  dmp.putCollection(', ', args.rows, row => dmp.put('(%,v)', columns.map(column => row[column])));
  return dmp.s;
}

function buildCollectionInsertChangeSet(collection, rows) {
  const collectionName = getCollectionName(collection);
  return {
    inserts: rows.map((fields, index) => ({
      ...collectionName,
      insertId: index + 1,
      fields,
    })),
    updates: [],
    deletes: [],
  };
}

function getCollectionName(collection) {
  const collectionName = {
    pureName: collection.pureName,
  };
  if (collection.schemaName != null) {
    collectionName.schemaName = collection.schemaName;
  }
  return collectionName;
}

function buildCollectionUpdateChangeSet(collection, args) {
  return {
    inserts: [],
    updates: [
      {
        ...getCollectionName(collection),
        fields: args.fields,
        condition: args.condition,
      },
    ],
    deletes: [],
  };
}

function buildUpdateSql(dmp, args) {
  const fields = Object.keys(args.fields);
  const conditionColumns = Object.keys(args.condition);
  dmp.put('^update %f ^set ', getTableName(args));
  dmp.putCollection(', ', fields, column => dmp.put('%i = %v', column, args.fields[column]));
  dmp.put(' ^where ');
  dmp.putCollection(' ^and ', conditionColumns, column => {
    if (args.condition[column] === null) {
      dmp.put('%i ^is ^null', column);
    } else {
      dmp.put('%i = %v', column, args.condition[column]);
    }
  });
  return dmp.s;
}

function requireInsertRowsArgs(args) {
  requireTableInfoArgs(args);
  if (!Array.isArray(args?.rows) || args.rows.length === 0) {
    throw new Error('DBGM-00000 rows must be a non-empty array');
  }
  args.rows.forEach((row, index) => requireNonEmptyObject(row, `rows[${index}]`));
}

function requireUpdateRowsArgs(args) {
  requireTableInfoArgs(args);
  requireNonEmptyObject(args?.fields, 'fields');
  requireNonEmptyObject(args?.condition, 'condition');
}

function normalizeLimit(limit) {
  if (limit == null) {
    return defaultDataLimit;
  }
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('DBGM-00000 limit must be a positive integer');
  }
  return Math.min(parsed, maxDataLimit);
}

function normalizeOffset(offset) {
  if (offset == null) {
    return 0;
  }
  const parsed = Number(offset);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('DBGM-00000 offset must be a non-negative integer');
  }
  return parsed;
}

function createToolResult(data) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data,
    isError: false,
  };
}

function pickObjectNames(array = []) {
  return array
    .map(({ pureName, schemaName }) => ({ pureName, schemaName }))
    .sort((a, b) => `${a.schemaName}.${a.pureName}`.localeCompare(`${b.schemaName}.${b.pureName}`));
}

async function loadDatabaseObjects(args, req) {
  requireConnectionDatabaseArgs(args);
  await requireMcpConnection(args.conid, req);
  await requireMcpDatabase(args.conid, args.database, req);
  const structure = await loadMcpStructure(args, req);

  return objectTypes.reduce(
    (res, objectType) => ({
      ...res,
      [objectType]: pickObjectNames(structure[objectType]),
    }),
    {}
  );
}

async function callListObjectsTool(args, req) {
  return createToolResult(await loadDatabaseObjects(args, req));
}

async function callObjectListTool(objectType, args, req) {
  const objects = await loadDatabaseObjects(args, req);
  return createToolResult({
    [objectType]: objects[objectType],
  });
}

async function callGetTableInfoTool(args, req) {
  const { table, tables } = await loadTableInfo(args, req);
  const dependencies = getTableDependencies(table, tables);

  return createToolResult({
    table: {
      ...table,
      columns: table.columns ?? [],
      foreignKeys: table.foreignKeys ?? [],
      dependencies,
    },
  });
}

async function loadTableInfo(args, req) {
  requireTableInfoArgs(args);
  await requireMcpConnection(args.conid, req);
  await requireMcpDatabase(args.conid, args.database, req);
  const structure = await loadMcpStructure(args, req);
  const tables = structure.tables ?? [];
  const matchingTables = findMatchingNamedObject(tables, args);

  if (matchingTables.length === 0) {
    throw new Error(`DBGM-00000 Table not found: ${args.schemaName ? `${args.schemaName}.` : ''}${args.pureName}`);
  }
  if (matchingTables.length > 1) {
    throw new Error(`DBGM-00000 Ambiguous table name, provide schemaName: ${args.pureName}`);
  }

  return {
    table: matchingTables[0],
    tables,
  };
}

async function loadMcpStructure(args, req) {
  const structure = process.env.STORAGE_DATABASE
    ? await databaseConnections.structure({ conid: args.conid, database: args.database }, req)
    : (await databaseConnections.ensureOpened(args.conid, args.database))?.structure;
  return filterMcpStructure(args.conid, args.database, structure ?? {}, req);
}

function getTableDependencies(table, tables) {
  return tables
    .flatMap(item => item.foreignKeys ?? [])
    .filter(item => item.refSchemaName === table.schemaName && item.refTableName === table.pureName);
}

function getColumnInfoByName(table) {
  return new Map((table.columns ?? []).map(column => [column.columnName, column]));
}

function requireColumn(columnInfoByName, columnName) {
  const column = columnInfoByName.get(columnName);
  if (!column) {
    throw new Error(`DBGM-00000 Unknown column: ${columnName}`);
  }
  return column;
}

function createDynamicColumn(columnName) {
  if (!columnName || typeof columnName !== 'string') {
    throw new Error('DBGM-00000 Filter column is required');
  }
  return {
    columnName,
  };
}

function createColumnExpression(column) {
  return {
    exprType: 'column',
    columnName: column.columnName,
    source: {
      alias: 'basetbl',
    },
  };
}

function createValueExpression(value, column) {
  return {
    exprType: 'value',
    value,
    dataType: column?.dataType,
  };
}

function buildFilterCondition(filter, columnInfoByName) {
  if (!filter) {
    return null;
  }
  if (Array.isArray(filter)) {
    throw new Error('DBGM-00000 filter must be an object');
  }
  if (filter.and != null || filter.or != null) {
    const key = filter.and != null ? 'and' : 'or';
    if (!Array.isArray(filter[key])) {
      throw new Error(`DBGM-00000 ${key} filter must be an array`);
    }
    const conditions = filter[key].map(item => buildFilterCondition(item, columnInfoByName)).filter(Boolean);
    if (conditions.length === 0) {
      return null;
    }
    return {
      conditionType: key,
      conditions,
    };
  }

  const column = requireColumn(columnInfoByName, filter.column);
  const expr = createColumnExpression(column);
  const op = filter.op ?? 'eq';

  switch (op) {
    case 'eq':
      return {
        conditionType: 'binary',
        operator: '=',
        left: expr,
        right: createValueExpression(filter.value, column),
      };
    case 'ne':
      return {
        conditionType: 'binary',
        operator: '<>',
        left: expr,
        right: createValueExpression(filter.value, column),
      };
    case '<':
    case '<=':
    case '>':
    case '>=':
      return {
        conditionType: 'binary',
        operator: op,
        left: expr,
        right: createValueExpression(filter.value, column),
      };
    case 'contains':
      return {
        conditionType: 'like',
        left: expr,
        right: createValueExpression(`%${filter.value ?? ''}%`, column),
      };
    case 'startsWith':
      return {
        conditionType: 'like',
        left: expr,
        right: createValueExpression(`${filter.value ?? ''}%`, column),
      };
    case 'endsWith':
      return {
        conditionType: 'like',
        left: expr,
        right: createValueExpression(`%${filter.value ?? ''}`, column),
      };
    case 'in':
      if (!Array.isArray(filter.values)) {
        throw new Error('DBGM-00000 in filter requires values array');
      }
      return {
        conditionType: 'in',
        expr,
        values: filter.values,
      };
    case 'isNull':
      return {
        conditionType: 'isNull',
        expr,
      };
    case 'isNotNull':
      return {
        conditionType: 'isNotNull',
        expr,
      };
    default:
      throw new Error(`DBGM-00000 Unsupported filter operator: ${op}`);
  }
}

function buildCollectionFilterCondition(filter) {
  const dynamicColumns = {
    get(columnName) {
      return createDynamicColumn(columnName);
    },
  };
  return buildFilterCondition(filter, dynamicColumns);
}

function buildTableDataSelect(args, table) {
  const columnInfoByName = getColumnInfoByName(table);
  const selectedColumnNames = args.columns?.length ? args.columns : (table.columns ?? []).map(column => column.columnName);
  if (!Array.isArray(selectedColumnNames) || selectedColumnNames.length === 0) {
    throw new Error('DBGM-00000 No columns selected');
  }

  const selectedColumns = selectedColumnNames.map(columnName => requireColumn(columnInfoByName, columnName));
  const limit = normalizeLimit(args.limit);
  const offset = normalizeOffset(args.offset);
  const select = {
    commandType: 'select',
    from: {
      name: {
        schemaName: table.schemaName,
        pureName: table.pureName,
      },
      alias: 'basetbl',
    },
    columns: selectedColumns.map(column => ({
      ...createColumnExpression(column),
      alias: column.columnName,
    })),
    range: {
      limit,
      offset,
    },
  };

  const where = buildFilterCondition(args.filter, columnInfoByName);
  if (where) {
    select.where = where;
  }

  if (args.orderBy != null) {
    if (!Array.isArray(args.orderBy)) {
      throw new Error('DBGM-00000 orderBy must be an array');
    }
    select.orderBy = args.orderBy.map(item => {
      const column = requireColumn(columnInfoByName, item.column);
      return {
        ...createColumnExpression(column),
        direction: String(item.direction ?? 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      };
    });
  }

  return {
    select,
    columns: selectedColumns.map(column => column.columnName),
    limit,
    offset,
  };
}

function findMatchingNamedObject(list = [], args) {
  return list.filter(item => {
    if (item.pureName !== args.pureName) {
      return false;
    }
    return args.schemaName == null || item.schemaName === args.schemaName;
  });
}

async function loadDataTarget(args, req, options = {}) {
  requireTableInfoArgs(args);
  await requireMcpConnection(args.conid, req);
  await requireMcpDatabase(args.conid, args.database, req);
  const structure = await loadMcpStructure(args, req);
  const matchingTables = findMatchingNamedObject(structure.tables, args);
  const matchingCollections = findMatchingNamedObject(structure.collections, args);

  if (options.preferCollections) {
    if (matchingCollections.length > 1) {
      throw new Error(`DBGM-00000 Ambiguous collection name, provide schemaName: ${args.pureName}`);
    }
    if (matchingCollections.length === 1) {
      return {
        objectTypeField: 'collections',
        collection: matchingCollections[0],
      };
    }
  }

  if (matchingTables.length > 1) {
    throw new Error(`DBGM-00000 Ambiguous table name, provide schemaName: ${args.pureName}`);
  }
  if (matchingTables.length === 1) {
    return {
      objectTypeField: 'tables',
      table: matchingTables[0],
    };
  }

  if (matchingCollections.length > 1) {
    throw new Error(`DBGM-00000 Ambiguous collection name, provide schemaName: ${args.pureName}`);
  }
  if (matchingCollections.length === 1) {
    return {
      objectTypeField: 'collections',
      collection: matchingCollections[0],
    };
  }

  throw new Error(`DBGM-00000 Table or collection not found: ${args.schemaName ? `${args.schemaName}.` : ''}${args.pureName}`);
}

function inferRowColumns(rows) {
  const columns = [];
  const used = new Set();
  for (const row of rows) {
    for (const column of Object.keys(row ?? {})) {
      if (!used.has(column)) {
        columns.push(column);
        used.add(column);
      }
    }
  }
  return columns;
}

function projectRows(rows, columns) {
  if (!columns?.length) {
    return rows;
  }
  return rows.map(row =>
    columns.reduce(
      (res, column) => ({
        ...res,
        [column]: row?.[column],
      }),
      {}
    )
  );
}

function buildCollectionDataOptions(args) {
  const limit = normalizeLimit(args.limit);
  const offset = normalizeOffset(args.offset);
  const options = {
    pureName: args.pureName,
    condition: buildCollectionFilterCondition(args.filter),
    skip: offset,
    limit,
  };

  if (args.orderBy != null) {
    if (!Array.isArray(args.orderBy)) {
      throw new Error('DBGM-00000 orderBy must be an array');
    }
    options.sort = args.orderBy.map(item => ({
      columnName: item.column,
      direction: String(item.direction ?? 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    }));
  }

  return {
    options,
    limit,
    offset,
  };
}

async function callGetTableDataTool(args, req) {
  const target = await loadDataTarget(args, req);
  if (target.objectTypeField === 'collections') {
    const { options, limit, offset } = buildCollectionDataOptions(args);
    const response = await databaseConnections.collectionData(
      {
        conid: args.conid,
        database: args.database,
        options,
        auditLogSessionGroup: 'mcp.getTableData',
      },
      req
    );
    const rows = projectRows(response?.rows ?? [], args.columns);
    return createToolResult({
      rows,
      columns: args.columns?.length ? args.columns : inferRowColumns(rows),
      limit,
      offset,
    });
  }

  const { table } = target;
  const { select, columns, limit, offset } = buildTableDataSelect(args, table);
  const response = await databaseConnections.sqlSelect(
    {
      conid: args.conid,
      database: args.database,
      select,
      auditLogSessionGroup: 'mcp.getTableData',
    },
    req
  );

  return createToolResult({
    rows: response?.rows ?? [],
    columns,
    limit,
    offset,
  });
}

async function callExecuteQueryTool(args, req) {
  requireTeamPremiumLicense();
  requireExecuteQueryArgs(args);
  await requireMcpConnection(args.conid, req);
  await requireMcpDatabase(args.conid, args.database, req, 'run_script');
  const response = await databaseConnections.queryData(
    {
      conid: args.conid,
      database: args.database,
      sql: args.sql,
    },
    req
  );
  return createToolResult({
    response: response ?? null,
  });
}

async function callInsertRowsTool(args, req) {
  requireTeamPremiumLicense();
  requireInsertRowsArgs(args);
  const target = await loadDataTarget(args, req, { preferCollections: true });
  if (target.objectTypeField === 'collections') {
    await requireMcpObject(args.conid, args.database, 'collections', target.collection.schemaName, target.collection.pureName, req, 'create_update_delete');
    const response = await databaseConnections.updateCollection(
      {
        conid: args.conid,
        database: args.database,
        changeSet: buildCollectionInsertChangeSet(target.collection, args.rows),
      },
      req
    );
    return createToolResult({
      response: response ?? null,
    });
  }

  await requireMcpObject(args.conid, args.database, 'tables', target.table.schemaName, target.table.pureName, req, 'create_update_delete');
  const sql = buildInsertRowsSql(await createMutationDumper(args.conid), {
    ...args,
    schemaName: target.table.schemaName,
    pureName: target.table.pureName,
  });
  const response = await databaseConnections.queryData(
    {
      conid: args.conid,
      database: args.database,
      sql,
    },
    req
  );
  return createToolResult({
    response: response ?? null,
  });
}

async function callUpdateRowsTool(args, req) {
  requireTeamPremiumLicense();
  requireUpdateRowsArgs(args);
  const target = await loadDataTarget(args, req, { preferCollections: true });
  if (target.objectTypeField === 'collections') {
    await requireMcpObject(args.conid, args.database, 'collections', target.collection.schemaName, target.collection.pureName, req, 'update_only');
    const response = await databaseConnections.updateCollection(
      {
        conid: args.conid,
        database: args.database,
        changeSet: buildCollectionUpdateChangeSet(target.collection, args),
      },
      req
    );
    return createToolResult({
      response: response ?? null,
    });
  }

  await requireMcpObject(args.conid, args.database, 'tables', target.table.schemaName, target.table.pureName, req, 'update_only');
  const sql = buildUpdateSql(await createMutationDumper(args.conid), {
    ...args,
    schemaName: target.table.schemaName,
    pureName: target.table.pureName,
  });
  const response = await databaseConnections.queryData(
    {
      conid: args.conid,
      database: args.database,
      sql,
    },
    req
  );
  return createToolResult({
    response: response ?? null,
  });
}

function getToolHandler(name) {
  const handlers = {
    [listConnectionsTool.name]: (args, req) => callListConnectionsTool(req),
    [listDatabasesTool.name]: callListDatabasesTool,
    [listObjectsTool.name]: callListObjectsTool,
    [getTableInfoTool.name]: callGetTableInfoTool,
    [getTableDataTool.name]: callGetTableDataTool,
    [executeQueryTool.name]: callExecuteQueryTool,
    [insertRowsTool.name]: callInsertRowsTool,
    [updateRowsTool.name]: callUpdateRowsTool,
    ...Object.fromEntries(objectTypes.map(objectType => [`list_${objectType}`, (args, req) => callObjectListTool(objectType, args, req)])),
  };
  return handlers[name];
}

async function handleJsonRpcRequest(body, req, res) {
  const id = body?.id ?? null;

  if (body?.jsonrpc !== '2.0' || typeof body?.method !== 'string') {
    return res.status(400).json(jsonRpcError(id, -32600, 'Invalid Request'));
  }

  if (body.id == null) {
    if (body.method === 'notifications/initialized') {
      return res.status(204).end();
    }
    return res.status(400).json(jsonRpcError(null, -32600, 'Invalid Request'));
  }

  switch (body.method) {
    case 'initialize':
      return res.json(
        jsonRpcResult(id, {
          protocolVersion,
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: 'dbgate',
            title: 'DbGate',
            version: '1.0.0',
          },
        })
      );
    case 'tools/list':
      return res.json(
        jsonRpcResult(id, {
          tools: getAvailableTools(),
        })
      );
    case 'tools/call':
      const toolHandler = getToolHandler(body.params?.name);
      if (!toolHandler) {
        return res.json(jsonRpcError(id, -32602, `Unknown tool: ${body.params?.name ?? ''}`));
      }
      try {
        return res.json(jsonRpcResult(id, await toolHandler(body.params?.arguments, req)));
      } catch (err) {
        return res.json(jsonRpcError(id, -32602, err.message));
      }
    default:
      return res.json(jsonRpcError(id, -32601, `Method not found: ${body.method}`));
  }
}

async function handleMcpRequest(req, res) {
  if (req.body?.jsonrpc === '2.0') {
    return handleJsonRpcRequest(req.body, req, res);
  }

  return res.status(400).json({ apiErrorMessage: 'DBGM-00000 Unsupported MCP message' });
}

async function handleOAuthProtectedResourceMetadata(req, res) {
  if (!(await requireOAuthMode(res))) return;
  try {
    return res.json({
      resource: getMcpResourceUrl(req),
      authorization_servers: [getOAuthAuthorizationServerUrl(req)],
      bearer_methods_supported: ['header'],
    });
  } catch (error) {
    return res.status(500).json({ apiErrorMessage: withDbgmCode(error.message) });
  }
}

async function handleOAuthAuthorizationServerMetadata(req, res) {
  if (!(await requireOAuthMode(res))) return;
  try {
    return res.json({
      issuer: getOAuthAuthorizationServerUrl(req),
      authorization_endpoint: getOAuthEndpoint(req, '/mcp/oauth/authorize'),
      token_endpoint: getOAuthEndpoint(req, '/mcp/oauth/token'),
      registration_endpoint: getOAuthEndpoint(req, '/mcp/oauth/register'),
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['mcp'],
    });
  } catch (error) {
    return res.status(500).json({ apiErrorMessage: withDbgmCode(error.message) });
  }
}

async function handleOAuthRegister(req, res) {
  if (!(await requireOAuthMode(res))) return;
  const redirectUris = Array.isArray(req.body?.redirect_uris) ? req.body.redirect_uris : [];
  if (redirectUris.length === 0 || redirectUris.some(uri => !isSafeRedirectUri(uri))) {
    return res.status(400).json({
      error: 'invalid_redirect_uri',
      error_description: 'DBGM-00000 redirect_uris must contain localhost HTTP or HTTPS URLs',
    });
  }

  const clientId = createOAuthId();
  const client = {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: req.body?.client_name || 'MCP client',
    redirect_uris: redirectUris,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  };
  oauthClients.set(clientId, client);
  return res.status(201).json(client);
}

async function handleOAuthAuthorize(req, res) {
  if (!(await requireOAuthMode(res))) return;
  const params = {
    ...req.query,
    ...req.body,
  };

  try {
    if (params.response_type !== 'code') {
      throw new Error('DBGM-00000 Unsupported response_type');
    }
    if (!params.redirect_uri || !params.client_id) {
      throw new Error('DBGM-00000 Missing OAuth client parameters');
    }
    assertValidOAuthRedirect(params.client_id, params.redirect_uri);
    if (!params.code_challenge || params.code_challenge_method !== 'S256') {
      throw new Error('DBGM-00000 PKCE S256 code challenge is required');
    }
    const resource = getMcpResourceUrl(req);
    if (params.resource && params.resource !== resource) {
      throw new Error('DBGM-00000 Invalid OAuth resource');
    }

    if (req.method === 'GET') {
      return res.type('html').send(renderOAuthAuthorizePage(params));
    }

    const loginResult = await authController.login(
      {
        amoid: params.amoid || getDefaultAuthProvider()?.amoid,
        login: params.login,
        password: params.password,
      },
      req
    );
    if (!loginResult?.accessToken) {
      return res.status(401).type('html').send(renderOAuthAuthorizePage(params, withDbgmCode(loginResult?.error || 'Login failed')));
    }

    const payload = jwt.decode(loginResult.accessToken) || {};
    const licenseUid = payload.licenseUid || `mcp:${payload.login || 'oauth'}`;
    const accessToken = jwt.sign(
      {
        amoid: 'mcp',
        roleId: mcpRoleId,
        login: payload.login || 'mcp-oauth',
        licenseUid,
        tokenUse: 'mcp',
        aud: resource,
      },
      getTokenSecret(),
      { expiresIn: getTokenLifetime() }
    );
    markTokenAsLoggedIn(licenseUid, accessToken);

    pruneOAuthAuthorizationCodes();
    const code = createOAuthId();
    oauthAuthorizationCodes.set(code, {
      accessToken,
      clientId: params.client_id,
      redirectUri: params.redirect_uri,
      codeChallenge: params.code_challenge,
      resource,
      expiresAt: Date.now() + oauthCodeLifetimeMs,
    });

    const redirectUrl = new URL(params.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (params.state) {
      redirectUrl.searchParams.set('state', params.state);
    }
    return res.redirect(redirectUrl.toString());
  } catch (err) {
    if (req.method === 'GET') {
      return res.status(400).type('html').send(renderOAuthAuthorizePage(params, withDbgmCode(err.message)));
    }
    return res.status(400).json({
      error: 'invalid_request',
      error_description: withDbgmCode(err.message),
    });
  }
}

async function handleOAuthToken(req, res) {
  if (!(await requireOAuthMode(res))) return;
  const params = {
    ...req.body,
    ...req.query,
  };
  if (params.grant_type !== 'authorization_code') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'DBGM-00000 Unsupported grant_type',
    });
  }

  pruneOAuthAuthorizationCodes();
  const codeData = oauthAuthorizationCodes.get(params.code);
  oauthAuthorizationCodes.delete(params.code);
  if (!codeData) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'DBGM-00000 Invalid or expired authorization code',
    });
  }
  if (codeData.clientId !== params.client_id || codeData.redirectUri !== params.redirect_uri) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'DBGM-00000 Authorization code was issued for a different client',
    });
  }
  if (sha256Base64Url(params.code_verifier || '') !== codeData.codeChallenge) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'DBGM-00000 Invalid PKCE verifier',
    });
  }

  return res.json({
    access_token: codeData.accessToken,
    token_type: 'Bearer',
    expires_in: 24 * 60 * 60,
    scope: 'mcp',
  });
}

module.exports = {
  handleMcpRequest,
  handleOAuthProtectedResourceMetadata,
  handleOAuthAuthorizationServerMetadata,
  handleOAuthRegister,
  handleOAuthAuthorize,
  handleOAuthToken,
  getOAuthProtectedResourceMetadataUrl,
};
